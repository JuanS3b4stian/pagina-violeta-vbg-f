
import React, { useState, useEffect } from 'react';
import { storage } from '../services/storage';
import { CaseRecord, CaseStatus, User, ManagementNote, MonthlyReport } from '../types';
import { ICONS, VIOLENCE_TYPES } from '../constants';

interface Props {
  user: User;
}

const DashboardDespachos: React.FC<Props> = ({ user }) => {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);
  const [activity, setActivity] = useState({ text: '', file: '' });
  const [reclassifyReason, setReclassifyReason] = useState('');
  const [closureReason, setClosureReason] = useState('');
  const [reportContent, setReportContent] = useState('');
  const [managementNoteText, setManagementNoteText] = useState('');
  const [monthlyObservations, setMonthlyObservations] = useState('');
  const [showReclassifyForm, setShowReclassifyForm] = useState(false);
  const [showClosureForm, setShowClosureForm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showAttachmentForm, setShowAttachmentForm] = useState(false);
  const [showMonthlyReportForm, setShowMonthlyReportForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [noteLoading, setNoteLoading] = useState(false);
  const [newAttachments, setNewAttachments] = useState<{name: string, data: string, type: string}[]>([]);

  useEffect(() => { refresh(); }, [user.officeName]);

  const refresh = () => {
    const all = storage.getCases();
    const filtered = all.filter(c => c.despachoAsignado === user.officeName);
    setCases(filtered);
    if (selectedCase) {
      const updated = filtered.find(f => f.id === selectedCase.id);
      if (updated) setSelectedCase(updated);
    }
  };

  const handleAddActivity = () => {
    if (!selectedCase || !activity.text) return;
    const updated: CaseRecord = {
      ...selectedCase,
      estado: CaseStatus.EN_GESTION,
      historial: [...selectedCase.historial, { id: `h-${Date.now()}`, date: new Date().toISOString(), user: user.officeName || 'Despacho', description: activity.text }]
    };
    storage.updateCase(updated);
    setActivity({ text: '', file: '' });
    refresh();
  };

  const handleSendReport = async () => {
    if (!selectedCase || !reportContent) return;
    const reportNum = !selectedCase.informe1Url ? 1 : !selectedCase.informe2Url ? 2 : 0;
    if (reportNum === 0) return alert("Máximo de 2 informes alcanzado.");
    
    setLoading(true);
    const res: any = await storage.saveReport(selectedCase, reportNum, reportContent, user.officeName || 'Despacho');
    if (res?.success) {
      const updated: CaseRecord = {
        ...selectedCase,
        [reportNum === 1 ? 'informe1Url' : 'informe2Url']: res.pdfUrl,
        historial: [...selectedCase.historial, { id: `h-${Date.now()}`, date: new Date().toISOString(), user: user.officeName || 'Despacho', description: `Carga de Informe #${reportNum}.` }]
      };
      storage.updateCase(updated);
      alert(`Informe enviado.`);
      setReportContent('');
      setShowReportForm(false);
      refresh();
    }
    setLoading(false);
  };

  const handleRequestReclassification = async () => {
    if (!selectedCase || !reclassifyReason) return;
    setLoading(true);
    const res = await storage.requestReclassification(selectedCase, reclassifyReason, user.officeName || '');
    if (res?.success) {
      const updated: CaseRecord = {
        ...selectedCase,
        estado: CaseStatus.RECLASIFICACION_SOLICITADA,
        historial: [...selectedCase.historial, { id: `h-${Date.now()}`, date: new Date().toISOString(), user: user.officeName || 'Despacho', description: `Solicitud de Reclasificación: ${reclassifyReason}` }]
      };
      storage.updateCase(updated);
      setShowReclassifyForm(false);
      setReclassifyReason('');
      setSelectedCase(null);
      refresh();
    }
    setLoading(false);
  };

  const handleRequestClosure = async () => {
    if (!selectedCase || !closureReason) return;
    setLoading(true);
    const res = await storage.requestClosure(selectedCase, closureReason, user.officeName || '');
    if (res?.success) {
      const updated: CaseRecord = {
        ...selectedCase,
        estado: CaseStatus.CIERRE_SOLICITADO,
        historial: [...selectedCase.historial, { id: `h-${Date.now()}`, date: new Date().toISOString(), user: user.officeName || 'Despacho', description: `Solicitud de Cierre: ${closureReason}` }]
      };
      storage.updateCase(updated);
      setShowClosureForm(false);
      setClosureReason('');
      setSelectedCase(null);
      refresh();
    }
    setLoading(false);
  };

  const handleUploadNewAttachments = async () => {
    if (!selectedCase || newAttachments.length === 0) return;
    setLoading(true);
    const res = await storage.addAttachments(selectedCase.id, newAttachments);
    if (res?.success) {
      alert("Adjuntos cargados.");
      setNewAttachments([]);
      setShowAttachmentForm(false);
      refresh();
    }
    setLoading(false);
  };

  const handleSendManagementNote = async () => {
    if (!managementNoteText) return;
    setNoteLoading(true);
    const newNote: ManagementNote = {
      id: `note-${Date.now()}`,
      officeName: user.officeName || 'Despacho',
      date: new Date().toISOString(),
      content: managementNoteText
    };
    await storage.saveNote(newNote);
    setNoteLoading(false);
    setManagementNoteText('');
    alert("Nota quincenal enviada exitosamente.");
  };

  const handleSendMonthlyReport = async () => {
    if (!monthlyObservations) return;
    setLoading(true);
    const counts: Record<string, number> = {};
    VIOLENCE_TYPES.forEach(v => counts[v] = 0);
    cases.forEach(c => { if(counts[c.tipoViolencia] !== undefined) counts[c.tipoViolencia]++ });
    const tipologias = Object.entries(counts).filter(([_, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(", ");
    const now = new Date();
    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const report: MonthlyReport = {
      id: `REP-${Date.now()}`,
      fechaRegistro: now.toISOString(),
      mesAño: `${months[now.getMonth()]} ${now.getFullYear()}`,
      despacho: user.officeName || 'Despacho',
      tipologias: tipologias || "Sin tipologías registradas",
      totalAtendidos: cases.length,
      casosCerrados: cases.filter(c => c.estado === CaseStatus.CERRADO).length,
      casosEnGestion: cases.filter(c => c.estado === CaseStatus.EN_GESTION || c.estado === CaseStatus.ASIGNADO).length,
      observaciones: monthlyObservations
    };
    const res = await storage.saveMonthlyReport(report);
    if (res?.success) {
      alert("Reporte mensual enviado.");
      setShowMonthlyReportForm(false);
      setMonthlyObservations('');
    }
    setLoading(false);
  };

  const renderAttachments = (urls?: string) => {
    if (!urls || urls === "Sin adjuntos") return <span className="text-gray-400 italic">No hay adjuntos</span>;
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {urls.split(", ").map((url, i) => (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="bg-pink-50 text-pink-700 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 border border-pink-100 hover:bg-pink-100">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
            Soporte {i + 1}
          </a>
        ))}
      </div>
    );
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white p-6 rounded-[2rem] border border-violet-100 shadow-sm space-y-4">
          <h3 className="text-[10px] font-black text-violet-500 uppercase tracking-widest px-2">Panel Operativo</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-violet-50 p-4 rounded-2xl text-center"><p className="text-2xl font-black text-violet-700">{cases.length}</p><p className="text-[8px] font-bold text-violet-400 uppercase">Total</p></div>
            <div className="bg-green-50 p-4 rounded-2xl text-center"><p className="text-2xl font-black text-green-700">{cases.filter(c => c.estado === CaseStatus.CERRADO).length}</p><p className="text-[8px] font-bold text-green-400 uppercase">Cerrados</p></div>
            <div className="bg-blue-50 p-4 rounded-2xl text-center"><p className="text-2xl font-black text-blue-700">{cases.filter(c => c.estado === CaseStatus.EN_GESTION || c.estado === CaseStatus.ASIGNADO).length}</p><p className="text-[8px] font-bold text-blue-400 uppercase">Gestión</p></div>
            <div className="bg-orange-50 p-4 rounded-2xl text-center"><p className="text-2xl font-black text-orange-700">{cases.filter(c => c.estado === CaseStatus.PENDIENTE || c.estado === CaseStatus.RECLASIFICACION_SOLICITADA || c.estado === CaseStatus.CIERRE_SOLICITADO).length}</p><p className="text-[8px] font-bold text-orange-400 uppercase">Alertas</p></div>
          </div>
        </div>

        <div className="bg-violet-600 text-white p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-bold uppercase tracking-tight">{user.officeName}</h2>
          <p className="text-violet-100 text-[10px] font-black uppercase tracking-widest mt-1">Gestión Institucional</p>
        </div>

        <div className="bg-purple-50/50 p-6 rounded-[2rem] border-2 border-purple-100 space-y-3">
          <h3 className="text-xs font-black text-purple-700 uppercase tracking-widest">Reporte Mensual</h3>
          <p className="text-[9px] text-purple-400 font-bold leading-tight">Consolidado quincenal/mensual obligatorio.</p>
          <button onClick={() => setShowMonthlyReportForm(true)} className="w-full bg-purple-600 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-purple-700 transition-all">Generar Reporte Mensual</button>
        </div>

        <div className="bg-blue-50/50 p-6 rounded-[2rem] border-2 border-blue-100 space-y-4">
          <h3 className="text-xs font-black text-blue-700 uppercase tracking-widest">Nota Quincenal</h3>
          <p className="text-[9px] text-blue-400 font-bold leading-tight">Reporte rápido de gestiones administrativas.</p>
          <textarea className="w-full p-4 bg-white rounded-2xl border-none text-sm font-medium" rows={3} placeholder="Describa gestiones rápidas..." value={managementNoteText} onChange={e => setManagementNoteText(e.target.value)} />
          <button disabled={noteLoading || !managementNoteText} onClick={handleSendManagementNote} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-blue-700">Enviar Nota</button>
        </div>

        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] px-2">Bandeja de Casos</h3>
          {cases.map(c => (
            <button key={c.id} onClick={() => { setSelectedCase(c); setShowClosureForm(false); setShowReclassifyForm(false); setShowReportForm(false); setShowAttachmentForm(false); }} className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${selectedCase?.id === c.id ? 'bg-violet-50 border-violet-400' : 'bg-white border-gray-100 hover:border-violet-100'}`}>
              <div className="flex justify-between items-center mb-1"><span className="text-violet-600 font-mono text-xs font-black">#{c.id}</span><span className="text-[8px] font-bold uppercase px-2 py-0.5 bg-gray-100 rounded-full">{c.estado}</span></div>
              <p className="text-sm font-black text-gray-800 uppercase truncate">{c.usuariaNombre}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2">
        {showMonthlyReportForm ? (
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-purple-100 overflow-hidden animate-in zoom-in-95">
            <div className="p-8 bg-purple-600 text-white text-center"><h2 className="text-2xl font-black uppercase tracking-tighter">Reporte Mensual Institucional</h2><p className="text-purple-100 text-[10px] font-bold uppercase mt-1">Consolidado de Gestión y Tipologías de VBG</p></div>
            <div className="p-10 space-y-8">
              <textarea rows={6} className="w-full p-6 bg-gray-50 rounded-3xl border-none font-medium leading-relaxed" placeholder="Describa dificultades, necesidades y alertas detectadas..." value={monthlyObservations} onChange={e => setMonthlyObservations(e.target.value)} />
              <div className="flex gap-4"><button onClick={() => setShowMonthlyReportForm(false)} className="flex-1 py-4 text-gray-400 font-black uppercase text-xs">Cancelar</button><button disabled={loading || !monthlyObservations} onClick={handleSendMonthlyReport} className="flex-2 bg-purple-600 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-purple-700 transition-all">Finalizar y Notificar</button></div>
            </div>
          </div>
        ) : selectedCase ? (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-violet-50 overflow-hidden animate-in fade-in">
            <div className="p-8 border-b border-violet-50 flex flex-wrap gap-4 justify-between items-center bg-gray-50/50">
              <div><h3 className="text-2xl font-black text-gray-900 tracking-tighter">Folio: #{selectedCase.id}</h3><p className="text-violet-600 text-[10px] font-black uppercase">Estado: {selectedCase.estado}</p></div>
              <div className="flex flex-wrap gap-2">
                {selectedCase.expedientePdfUrl && <a href={selectedCase.expedientePdfUrl} target="_blank" rel="noopener noreferrer" className="bg-violet-100 text-violet-700 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase border border-violet-200 inline-flex items-center gap-2"><ICONS.PdfIcon /> Expediente PDF</a>}
                {selectedCase.estado !== CaseStatus.CERRADO && (
                  <>
                    <button onClick={() => { setShowAttachmentForm(!showAttachmentForm); setShowReportForm(false); setShowReclassifyForm(false); setShowClosureForm(false); }} className="bg-pink-600 text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-sm">Adjuntos</button>
                    <button onClick={() => { setShowReportForm(!showReportForm); setShowReclassifyForm(false); setShowClosureForm(false); setShowAttachmentForm(false); }} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-sm">Informe Caso</button>
                    <button onClick={() => { setShowReclassifyForm(!showReclassifyForm); setShowClosureForm(false); setShowReportForm(false); setShowAttachmentForm(false); }} className="bg-pink-100 text-pink-700 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase hover:bg-pink-200">Reclasificación</button>
                    <button onClick={() => { setShowClosureForm(!showClosureForm); setShowReclassifyForm(false); setShowReportForm(false); setShowAttachmentForm(false); }} className="bg-orange-100 text-orange-700 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase hover:bg-orange-200">Solicitar Cierre</button>
                  </>
                )}
              </div>
            </div>

            {/* FORMULARIOS ACCIÓN */}
            {showAttachmentForm && (
              <div className="p-8 bg-pink-50 border-b border-pink-100"><h4 className="text-xs font-black text-pink-700 uppercase mb-4 tracking-widest">Añadir Soportes Adicionales</h4><input type="file" multiple onChange={(e) => { const files = e.target.files; if(files) Array.from(files).forEach((f: File) => { const r = new FileReader(); r.onloadend = () => setNewAttachments(p => [...p, {name: f.name, data: r.result as string, type: f.type}]); r.readAsDataURL(f); }); }} className="text-xs mb-4" /><div className="flex justify-end gap-3"><button onClick={() => {setShowAttachmentForm(false); setNewAttachments([])}} className="text-[10px] uppercase font-black text-gray-400">Cancelar</button><button disabled={newAttachments.length === 0 || loading} onClick={handleUploadNewAttachments} className="bg-pink-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase">Subir Adjuntos</button></div></div>
            )}
            {showReportForm && (
              <div className="p-8 bg-blue-50 border-b border-blue-100"><div className="flex justify-between items-center mb-4"><h4 className="text-xs font-black text-blue-700 uppercase tracking-widest">Informe de Seguimiento</h4><span className="text-[10px] font-black text-blue-400 uppercase bg-white px-3 py-1 rounded-full border border-blue-100 shadow-sm">Límite: 2 informes por expediente</span></div><textarea className="w-full p-4 rounded-xl text-sm mb-4 font-medium" placeholder="Redacte los avances técnicos o jurídicos..." rows={5} value={reportContent} onChange={e => setReportContent(e.target.value)} /><div className="flex justify-end gap-3"><button onClick={() => setShowReportForm(false)} className="text-[10px] uppercase font-black text-gray-400">Cancelar</button><button disabled={!reportContent || loading} onClick={handleSendReport} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase">Enviar Informe</button></div></div>
            )}
            {showReclassifyForm && (
              <div className="p-8 bg-pink-50 border-b border-pink-100"><h4 className="text-xs font-black text-pink-700 uppercase mb-3 tracking-widest">Motivación de Reclasificación</h4><textarea className="w-full p-4 rounded-xl text-sm mb-4 font-medium" placeholder="Explique por qué este despacho no es competente..." rows={3} value={reclassifyReason} onChange={e => setReclassifyReason(e.target.value)} /><div className="flex justify-end gap-3"><button onClick={() => setShowReclassifyForm(false)} className="text-[10px] uppercase font-black text-gray-400">Cancelar</button><button disabled={!reclassifyReason || loading} onClick={handleRequestReclassification} className="bg-pink-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase">Enviar Solicitud</button></div></div>
            )}
            {showClosureForm && (
              <div className="p-8 bg-orange-50 border-b border-orange-100"><h4 className="text-xs font-black text-orange-700 uppercase mb-3 tracking-widest">Solicitud de Cierre</h4><textarea className="w-full p-4 rounded-xl text-sm mb-4 font-medium" placeholder="Describa el cumplimiento total de la ruta..." rows={3} value={closureReason} onChange={e => setClosureReason(e.target.value)} /><div className="flex justify-end gap-3"><button onClick={() => setShowClosureForm(false)} className="text-[10px] uppercase font-black text-gray-400">Cancelar</button><button disabled={!closureReason || loading} onClick={handleRequestClosure} className="bg-orange-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase">Solicitar Cierre</button></div></div>
            )}

            <div className="p-10 space-y-10">
              <div><h4 className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-1">Soportes Documentales</h4><div className="bg-white p-4 rounded-2xl border border-pink-50 mt-2 shadow-sm">{renderAttachments(selectedCase.adjuntoOriginalUrl)}</div></div>
              <div><h4 className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-1">Historial del Expediente</h4><div className="relative pl-8 border-l-4 border-violet-100 space-y-8 mt-6">{selectedCase.historial.map((h, i) => (<div key={i} className="bg-violet-50/50 p-6 rounded-2xl border border-violet-100 shadow-sm"><div className="flex justify-between items-center mb-2"><span className="font-black text-violet-700 text-xs uppercase">{h.user}</span><span className="text-[10px] text-gray-400 font-bold">{new Date(h.date).toLocaleString()}</span></div><p className="text-sm text-gray-700 leading-relaxed font-medium">{h.description}</p></div>))}</div></div>
              {selectedCase.estado !== CaseStatus.CERRADO && (<div className="bg-gray-900 p-8 rounded-[2.5rem] border border-gray-800 space-y-4 shadow-2xl mt-8"><h4 className="text-[10px] font-black text-violet-400 uppercase tracking-widest ml-1">Nueva Actuación Operativa</h4><textarea rows={3} className="w-full p-6 bg-gray-800 rounded-3xl border-none text-white text-sm" placeholder="Describa la actuación jurídica o psicosocial realizada..." value={activity.text} onChange={e => setActivity({...activity, text: e.target.value})} /><button onClick={handleAddActivity} disabled={!activity.text} className="w-full bg-violet-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-violet-700 transition-all">Guardar Actuación</button></div>)}
            </div>
          </div>
        ) : (
          <div className="h-full bg-white rounded-[3rem] flex flex-col items-center justify-center text-center p-20 border-4 border-dotted border-violet-50 text-gray-300"><p className="text-[10px] font-black uppercase tracking-[0.3em]">Seleccione un folio para iniciar la gestión operativa institucional</p></div>
        )}
      </div>
    </div>
  );
};

export default DashboardDespachos;
