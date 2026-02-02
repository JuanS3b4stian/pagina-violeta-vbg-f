
/**
 * BACKEND PÁGINA VIOLETA - VERSION 3.5 (2026)
 * Municipio San Pedro de los Milagros
 * Gestión Integral: Casos, Adjuntos, Reportes Mensuales y Notificaciones.
 */

const SPREADSHEET_ID = '1EPE2BlGls0jVpOkRQKXCok_-98LmF1AWH5VenzsG990'; 
const FOLDER_EXPEDIENTES = '1akRMfj6hBUHbo2NQ8zeOeZsB8yJucdEU'; 
const FOLDER_ANALISIS_DECISION = '10iqL_Kc_iHIdQYLix94FLfETybTo1_e5'; 
const FOLDER_INFORMES = '1NXT1FrLL-ybPBiTX2JRsT83yqWUMVBiW'; 
const FOLDER_ADJUNTOS_VIOLETA = '1trMRAKq6cpqLHxPMlD2Gz6Wey8Y0XiPT'; 
const FOLDER_REPORTES_MENSUALES = '1ruN_vcaSCkXuCjrGygI2LUS5h9hDplqi'; 
const TEST_EMAIL = "juan.mun3ra@gmail.com"; 

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // --- HOJA: INFO MENSUAL ---
    if (data.action === 'saveMonthlyReport') {
      const sheet = ss.getSheetByName('Info Mensual');
      const r = data.payload;
      const pdfBlob = createMonthlyReportPdf(r);
      const pdfUrl = saveBlob(pdfBlob, `ReporteMensual_${r.despacho.replace(/ /g, '_')}_${r.mesAño.replace(/ /g, '_')}.pdf`, FOLDER_REPORTES_MENSUALES);
      
      const row = [r.id, r.fechaRegistro, r.mesAño, r.despacho, r.tipologias, r.totalAtendidos, r.casosCerrados, r.casosEnGestion, r.observaciones, pdfUrl];
      sheet.appendRow(row);
      
      const body = `REPORTE MENSUAL REGISTRADO - PROYECTO VIOLETA\n\nEl despacho ${r.despacho} ha enviado el reporte mensual de ${r.mesAño}.\n\nESTADÍSTICAS:\n- Total Atendidos: ${r.totalAtendidos}\n- Casos Cerrados: ${r.casosCerrados}\n- Casos en Gestión: ${r.casosEnGestion}\n\nSe adjunta el documento oficial en PDF.`;
      sendVioletEmail(TEST_EMAIL, `REPORTE MENSUAL: ${r.despacho} (${r.mesAño})`, body, [pdfBlob]);
      
      return response({ success: true, pdfUrl: pdfUrl });
    }

    // --- HOJA: CASOS ---
    const sheetCasos = ss.getSheetByName('Casos');

    if (data.action === 'saveCase') {
      const c = data.payload;
      let adjuntoUrls = [];
      let emailAttachments = [];

      if (c.attachments && c.attachments.length > 0) {
        c.attachments.forEach(fileObj => {
          const blob = Utilities.newBlob(Utilities.base64Decode(fileObj.data.split(",")[1]), fileObj.type, fileObj.name);
          const url = saveBlob(blob, fileObj.name, FOLDER_ADJUNTOS_VIOLETA);
          adjuntoUrls.push(url);
          emailAttachments.push(blob);
        });
      }
      
      const adjuntosString = adjuntoUrls.length > 0 ? adjuntoUrls.join(", ") : "Sin adjuntos";
      const pdfBlob = createCasePdf(c);
      const pdfUrl = saveBlob(pdfBlob, "Expediente_" + c.id + ".pdf", FOLDER_EXPEDIENTES);
      emailAttachments.push(pdfBlob);

      const row = [c.id, c.fecha, c.usuariaNombre, c.usuariaCedula, c.usuariaTelefono, c.tipoViolencia, c.descripcionBreve.substring(0, 150), c.estado, c.despachoAsignado || "Pendiente", c.urgencia, c.profesionalAtendio, adjuntosString, pdfUrl];
      sheetCasos.appendRow(row);
      
      sendVioletEmail(TEST_EMAIL, `NUEVO CASO REGISTRADO: #${c.id}`, `Se ha registrado el caso de ${c.usuariaNombre}. Se adjuntan soportes y expediente PDF.`, emailAttachments);
      return response({ success: true, id: c.id, pdfUrl: pdfUrl, adjuntoUrls: adjuntoUrls });
    }

    if (data.action === 'requestReclassification') {
      const { caseRecord, reason, office } = data.payload;
      updateColumn(sheetCasos, caseRecord.id, 8, "Reclasificación Solicitada");
      sendVioletEmail(TEST_EMAIL, `SOLICITUD RECLASIFICACIÓN: #${caseRecord.id}`, `El despacho [${office}] solicita reclasificar el caso de ${caseRecord.usuariaNombre}.\n\nMotivo informado: ${reason}`);
      return response({ success: true });
    }

    if (data.action === 'requestClosure') {
      const { caseRecord, reason, office } = data.payload;
      updateColumn(sheetCasos, caseRecord.id, 8, "Cierre Solicitado");
      sendVioletEmail(TEST_EMAIL, `SOLICITUD CIERRE: #${caseRecord.id}`, `El despacho [${office}] solicita cierre del caso #${caseRecord.id}.\n\nJustificación: ${reason}`);
      return response({ success: true });
    }

    if (data.action === 'updateCase') {
      const c = data.payload;
      const rows = sheetCasos.getDataRange().getValues();
      let oldStatus = "";
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === c.id) {
          oldStatus = rows[i][7];
          break;
        }
      }

      updateColumn(sheetCasos, c.id, 8, c.estado);
      updateColumn(sheetCasos, c.id, 9, c.despachoAsignado);
      updateColumn(sheetCasos, c.id, 10, c.urgencia);

      // Evitar duplicados comprobando que el estado anterior no sea ya "Asignado"
      if (c.estado === "Asignado" && c.despachoAsignado && oldStatus !== "Asignado") {
        const body = `ASIGNACIÓN DE CASO - PÁGINA VIOLETA\n\nSe ha asignado el caso #${c.id} (${c.usuariaNombre}) a su despacho: ${c.despachoAsignado}.\n\nPor favor revise la plataforma institucional.`;
        sendVioletEmail(TEST_EMAIL, `NUEVO CASO ASIGNADO: #${c.id}`, body);
      }
      return response({ success: true });
    }

    if (data.action === 'saveReport') {
      const { caseRecord, reportNumber, content, office } = data.payload;
      const reportBlob = createCaseReportPdf(caseRecord, reportNumber, content, office);
      const pdfUrl = saveBlob(reportBlob, `Informe${reportNumber}_${caseRecord.id}.pdf`, FOLDER_INFORMES);
      updateColumn(sheetCasos, caseRecord.id, reportNumber === 1 ? 16 : 17, pdfUrl);
      sendVioletEmail(TEST_EMAIL, `NUEVO INFORME: #${caseRecord.id}`, `Se ha cargado el Informe #${reportNumber} por parte de ${office}.`, [reportBlob]);
      return response({ success: true, pdfUrl: pdfUrl });
    }

    if (data.action === 'escalateToAdmin2') {
      const { caseRecord, analysis } = data.payload;
      const blob = createAnalysisPdf(caseRecord, analysis);
      const pdfUrl = saveBlob(blob, "Analisis_" + caseRecord.id + ".pdf", FOLDER_ANALISIS_DECISION);
      updateColumn(sheetCasos, caseRecord.id, 8, "Pendiente Decisión Sec. Gobierno"); 
      updateColumn(sheetCasos, caseRecord.id, 14, pdfUrl); 
      sendVioletEmail(TEST_EMAIL, `RECLASIFICACIÓN ESCALADA: #${caseRecord.id}`, `Coordinación ha emitido análisis técnico. Pendiente fallo de Sec. Gobierno.`, [blob]);
      return response({ success: true, pdfUrl: pdfUrl });
    }

    if (data.action === 'resolveReclassification') {
      const { caseRecord, decision, justification, newOffice } = data.payload;
      const blob = createDecisionPdf(caseRecord, decision, justification, newOffice);
      const pdfUrl = saveBlob(blob, "Resolucion_" + caseRecord.id + ".pdf", FOLDER_ANALISIS_DECISION);
      const nuevoEstado = decision === 'Aceptada' ? "Asignado" : "En Gestión";
      const despachoFinal = decision === 'Aceptada' ? newOffice : caseRecord.despachoAsignado;
      
      updateColumn(sheetCasos, caseRecord.id, 8, nuevoEstado);
      updateColumn(sheetCasos, caseRecord.id, 9, despachoFinal);
      updateColumn(sheetCasos, caseRecord.id, 15, pdfUrl); 
      
      // Notificación al NUEVO despacho si la reclasificación fue aceptada para asegurar que el aviso llegue
      if (decision === 'Aceptada' && newOffice) {
        const bodyAsignacion = `NUEVA ASIGNACIÓN POR RECLASIFICACIÓN - PÁGINA VIOLETA\n\n` +
                               `Se les informa que tras el fallo de Secretaría de Gobierno, el caso #${caseRecord.id} (${caseRecord.usuariaNombre}) ha sido asignado a su despacho: ${newOffice}.\n\n` +
                               `Por favor, inicien las actuaciones correspondientes en la plataforma.`;
        sendVioletEmail(TEST_EMAIL, `NUEVO CASO ASIGNADO (RECLASIFICACIÓN): #${caseRecord.id}`, bodyAsignacion, [blob]);
      } else {
        sendVioletEmail(TEST_EMAIL, `RESOLUCIÓN DE COMPETENCIA: #${caseRecord.id}`, `Se ha emitido el fallo: ${decision.toUpperCase()}.`, [blob]);
      }
      
      return response({ success: true, pdfUrl: pdfUrl });
    }

    if (data.action === 'acceptClosure') {
      const { caseRecord, office } = data.payload;
      updateColumn(sheetCasos, caseRecord.id, 8, "Cerrado");
      sendVioletEmail(TEST_EMAIL, `CIERRE APROBADO: #${caseRecord.id}`, `El cierre del caso de ${caseRecord.usuariaNombre} ha sido aceptado por Coordinación.`);
      return response({ success: true });
    }

    if (data.action === 'denyClosure') {
      const { caseRecord, justification, office } = data.payload;
      const blob = createDenialClosurePdf(caseRecord, justification);
      const pdfUrl = saveBlob(blob, "NegativaCierre_" + caseRecord.id + ".pdf", FOLDER_ANALISIS_DECISION);
      updateColumn(sheetCasos, caseRecord.id, 8, "En Gestión");
      sendVioletEmail(TEST_EMAIL, `CIERRE DENEGADO: #${caseRecord.id}`, `La solicitud de cierre ha sido negada por Coordinación.`, [blob]);
      return response({ success: true, pdfUrl: pdfUrl });
    }

    if (data.action === 'addAttachments') {
      const { caseId, newAttachments } = data.payload;
      let addedUrls = [];
      newAttachments.forEach(fileObj => {
        const blob = Utilities.newBlob(Utilities.base64Decode(fileObj.data.split(",")[1]), fileObj.type, fileObj.name);
        addedUrls.push(saveBlob(blob, fileObj.name, FOLDER_ADJUNTOS_VIOLETA));
      });
      const rows = sheetCasos.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === caseId) {
          let current = rows[i][11] || "";
          let updated = current && current !== "Sin adjuntos" ? current + ", " + addedUrls.join(", ") : addedUrls.join(", ");
          sheetCasos.getRange(i + 1, 12).setValue(updated);
          break;
        }
      }
      return response({ success: true, addedUrls: addedUrls });
    }

  } catch (err) {
    return response({ success: false, error: err.toString() });
  }
}

function saveBlob(blob, name, folderId) {
  const folder = DriveApp.getFolderById(folderId);
  const file = folder.createFile(blob.setName(name));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function updateColumn(sheet, id, colIndex, value) {
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      sheet.getRange(i + 1, colIndex).setValue(value);
      break;
    }
  }
}

function sendVioletEmail(to, subject, body, attachments) {
  MailApp.sendEmail({ to: to, subject: subject, body: body, attachments: attachments });
}

function response(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

const PDF_STYLE = `
  <style>
    body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1e293b; padding: 0; margin: 0; line-height: 1.6; }
    .header { background-color: #6d28d9; color: white; padding: 40px; text-align: center; border-bottom: 8px solid #4c1d95; }
    .header h1 { margin: 0; font-size: 26px; letter-spacing: 1px; text-transform: uppercase; font-weight: 900; }
    .header p { margin: 10px 0 0; font-size: 13px; opacity: 0.9; font-weight: bold; letter-spacing: 2px; }
    .content { padding: 50px; }
    .section-title { color: #6d28d9; border-left: 5px solid #6d28d9; padding-left: 15px; margin-top: 40px; margin-bottom: 20px; font-size: 18px; text-transform: uppercase; font-weight: 900; }
    .info-box { background: #f8fafc; padding: 25px; border-radius: 15px; border: 1px solid #e2e8f0; margin-bottom: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
    .info-box p { margin: 8px 0; font-size: 14px; }
    .footer { margin-top: 60px; text-align: center; font-size: 11px; color: #64748b; border-top: 2px solid #f1f5f9; padding-top: 30px; }
    .stat-grid { display: table; width: 100%; margin: 30px 0; border-spacing: 10px; }
    .stat-item { display: table-cell; background: #f5f3ff; border-radius: 12px; text-align: center; border: 1px solid #ddd6fe; padding: 20px; }
    .stat-val { font-size: 24px; font-weight: 900; color: #6d28d9; display: block; margin-bottom: 5px; }
    .stat-lbl { font-size: 10px; color: #7c3aed; text-transform: uppercase; font-weight: bold; }
    .narrative { text-align: justify; background: #fff; padding: 15px; border: 1px solid #f1f5f9; border-radius: 10px; }
  </style>
`;

function createMonthlyReportPdf(r) {
  const html = `
    ${PDF_STYLE}
    <div class="header">
      <h1>Reporte de Gestión Mensual</h1>
      <p>Página Violeta • San Pedro de los Milagros</p>
    </div>
    <div class="content">
      <div class="info-box">
        <p><b>Despacho Remitente:</b> ${r.despacho}</p>
        <p><b>Periodo Consolidado:</b> ${r.mesAño}</p>
        <p><b>ID Reporte:</b> ${r.id}</p>
      </div>
      
      <div class="section-title">Resumen Cuantitativo de Actuaciones</div>
      <div class="stat-grid">
        <div class="stat-item"><span class="stat-val">${r.totalAtendidos}</span><span class="stat-lbl">Total Atendidos</span></div>
        <div class="stat-item"><span class="stat-val">${r.casosCerrados}</span><span class="stat-lbl">Casos Cerrados</span></div>
        <div class="stat-item"><span class="stat-val">${r.casosEnGestion}</span><span class="stat-lbl">En Gestión</span></div>
      </div>

      <div class="section-title">Detalle por Tipología de Violencia</div>
      <div class="info-box" style="background: #fdf4ff; border-color: #fae8ff; color: #701a75;">
        ${r.tipologias.split(', ').join('<br>')}
      </div>

      <div class="section-title">Observaciones, Necesidades y Alertas</div>
      <div class="narrative">${r.observaciones}</div>
      
      <div class="footer">Este documento constituye un reporte institucional oficial. <br/> San Pedro de los Milagros - Un compromiso con la vida y la equidad.</div>
    </div>
  `;
  return Utilities.newBlob(html, 'text/html').getAs('application/pdf');
}

function createCasePdf(c) {
  const html = `
    ${PDF_STYLE}
    <div class="header">
      <h1>Expediente Institucional #${c.id}</h1>
      <p>Proyecto Violeta • San Pedro de los Milagros</p>
    </div>
    <div class="content">
      <div class="section-title">Datos Generales de la Usuaria</div>
      <div class="info-box">
        <p><b>Nombre y Apellidos:</b> ${c.usuariaNombre}</p>
        <p><b>Cédula de Ciudadanía:</b> ${c.usuariaCedula}</p>
        <p><b>Contacto Telefónico:</b> ${c.usuariaTelefono}</p>
        <p><b>Fecha de Registro:</b> ${c.fecha}</p>
      </div>

      <div class="section-title">Clasificación Inicial</div>
      <p><b>Tipo de Violencia Detectada:</b> ${c.tipoViolencia}</p>
      <p><b>Derecho Involucrado:</b> ${c.derechoInvolucrado}</p>

      <div class="section-title">Relato de los Hechos</div>
      <div class="narrative">${c.descripcionBreve}</div>

      <div class="footer">DOCUMENTO CONFIDENCIAL - USO EXCLUSIVO INSTITUCIONAL</div>
    </div>
  `;
  return Utilities.newBlob(html, 'text/html').getAs('application/pdf');
}

function createCaseReportPdf(c, n, content, office) {
  const html = `
    ${PDF_STYLE}
    <div class="header" style="background-color: #2563eb; border-bottom-color: #1d4ed8;">
      <h1>Informe de Seguimiento #${n}</h1>
      <p>Expediente #${c.id} • ${office}</p>
    </div>
    <div class="content">
      <div class="info-box">
        <p><b>Usuaria:</b> ${c.usuariaNombre}</p>
        <p><b>Despacho Encargado:</b> ${office}</p>
      </div>
      <div class="section-title">Actuaciones y Avances Técnicos</div>
      <div class="narrative" style="background: #eff6ff;">${content}</div>
      <div class="footer">Informe generado para el seguimiento de la ruta de atención integral VBG.</div>
    </div>
  `;
  return Utilities.newBlob(html, 'text/html').getAs('application/pdf');
}

function createAnalysisPdf(c, analysis) {
  const html = `
    ${PDF_STYLE}
    <div class="header"><h1>Análisis Técnico de Coordinación</h1><p>Caso #${c.id}</p></div>
    <div class="content">
      <div class="section-title">Análisis de la Ruta</div>
      <div class="info-box">${analysis}</div>
    </div>
  `;
  return Utilities.newBlob(html, 'text/html').getAs('application/pdf');
}

function createDecisionPdf(c, d, j, o) {
  const html = `
    ${PDF_STYLE}
    <div class="header" style="background-color: #1e293b; border-bottom-color: #0f172a;"><h1>Resolución Administrativa</h1><p>Secretaría de Gobierno</p></div>
    <div class="content">
      <div class="info-box">
        <p><b>Caso No:</b> #${c.id}</p>
        <p><b>Fallo:</b> ${d.toUpperCase()}</p>
        ${o ? `<p><b>Despacho Asignado:</b> ${o}</p>` : ''}
      </div>
      <div class="section-title">Motivación del Acto</div>
      <div class="narrative">${j}</div>
    </div>
  `;
  return Utilities.newBlob(html, 'text/html').getAs('application/pdf');
}

function createDenialClosurePdf(c, j) {
  const html = `
    ${PDF_STYLE}
    <div class="header" style="background-color: #991b1b; border-bottom-color: #7f1d1d;"><h1>Auto de Negativa de Cierre</h1><p>Caso #${c.id}</p></div>
    <div class="content">
      <div class="section-title">Fundamentos Técnicos</div>
      <div class="narrative">${j}</div>
    </div>
  `;
  return Utilities.newBlob(html, 'text/html').getAs('application/pdf');
}
