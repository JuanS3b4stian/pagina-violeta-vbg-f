
import { CaseRecord, User, UserRole, CaseStatus, UrgencyLevel, ManagementNote, MonthlyReport } from '../types';

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx1qhBc41H482OotYfh9FsiBE23X3wuW_IlS35Ilv4yw65Ygn-BJTANePVHh65bmSA4Sw/exec'; 

const USERS_KEY = 'violeta_users';
const CASES_KEY = 'violeta_cases';
const NOTES_KEY = 'violeta_notes';
const MONTHLY_REPORTS_KEY = 'violeta_monthly_reports';

export const storage = {
  init: () => {
    localStorage.removeItem(USERS_KEY); 
    const INITIAL_USERS: User[] = [
      { id: 'u1', username: 'CoordinadorEquidad', password: '928574', name: 'Coordinador de Equidad de Género', role: UserRole.ADMIN1, email: 'genero@sanpedrodelosmilagros-antioquia.gov.co' },
      { id: 'u2', username: 'SecretaríaGobierno', password: '276043', name: 'Secretaría de Gobierno', role: UserRole.ADMIN2, email: 'secgobierno@sanpedrodelosmilagros-antioquia.gov.co' },
      { id: 'u3', username: 'InspeccionPolicía', password: '358256', name: 'Inspección de Policía', role: UserRole.DESPACHO, officeName: 'Inspección de Policía', email: 'inspeccion@sanpedrodelosmilagros-antioquia.gov.co' },
      { id: 'u4', username: 'ComisaríaFamilia', password: '658272', name: 'Comisaría de Familia', role: UserRole.DESPACHO, officeName: 'Comisaría de Familia', email: 'comisaria@sanpedrodelosmilagros-antioquia.gov.co' },
      { id: 'u5', username: 'HospitalSI', password: '764821', name: 'Hospital Santa Isabel', role: UserRole.DESPACHO, officeName: 'Hospital Santa Isabel', email: 'hospital@esesantaisabel.gov.co' },
      { id: 'u6', username: 'SecretaríaSalud', password: '762727', name: 'Secretaría de Salud', role: UserRole.DESPACHO, officeName: 'Secretaría de Salud', email: 'direccionlocalsaludspm@gmail.com' },
    ];
    if (!localStorage.getItem(USERS_KEY)) localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
    if (!localStorage.getItem(CASES_KEY)) localStorage.setItem(CASES_KEY, JSON.stringify([]));
    if (!localStorage.getItem(NOTES_KEY)) localStorage.setItem(NOTES_KEY, JSON.stringify([]));
    if (!localStorage.getItem(MONTHLY_REPORTS_KEY)) localStorage.setItem(MONTHLY_REPORTS_KEY, JSON.stringify([]));
  },

  getUsers: (): User[] => JSON.parse(localStorage.getItem(USERS_KEY) || '[]'),
  getCases: (): CaseRecord[] => JSON.parse(localStorage.getItem(CASES_KEY) || '[]'),
  getNotes: (): ManagementNote[] => JSON.parse(localStorage.getItem(NOTES_KEY) || '[]'),
  getMonthlyReports: (): MonthlyReport[] => JSON.parse(localStorage.getItem(MONTHLY_REPORTS_KEY) || '[]'),

  saveMonthlyReport: async (report: MonthlyReport) => {
    try {
      const resp = await fetch(APPS_SCRIPT_URL, { 
        method: 'POST', 
        body: JSON.stringify({ action: 'saveMonthlyReport', payload: report }) 
      });
      const data = await resp.json();
      if (data.success) {
        const reports = storage.getMonthlyReports();
        report.pdfUrl = data.pdfUrl;
        reports.push(report);
        localStorage.setItem(MONTHLY_REPORTS_KEY, JSON.stringify(reports));
      }
      return data;
    } catch (e) {
      console.warn("Fallo fetch, guardando localmente (CORS/GAS):", e);
      const reports = storage.getMonthlyReports();
      reports.push(report);
      localStorage.setItem(MONTHLY_REPORTS_KEY, JSON.stringify(reports));
      return { success: true };
    }
  },

  saveCase: async (newCase: any) => {
    const cases = storage.getCases();
    cases.push(newCase);
    localStorage.setItem(CASES_KEY, JSON.stringify(cases));
    try {
      const resp = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'saveCase', payload: newCase }) });
      const data = await resp.json();
      if (data.success) {
        newCase.expedientePdfUrl = data.pdfUrl;
        newCase.adjuntoOriginalUrl = data.adjuntoUrls?.join(", ");
        storage.updateCase(newCase);
      }
      return data;
    } catch (e) { return { success: true }; }
  },

  updateCase: (updatedCase: CaseRecord) => {
    const cases = storage.getCases();
    const idx = cases.findIndex(c => c.id === updatedCase.id);
    if (idx !== -1) { 
      cases[idx] = updatedCase; 
      localStorage.setItem(CASES_KEY, JSON.stringify(cases)); 
    }
    fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'updateCase', payload: updatedCase }) });
  },

  addAttachments: async (caseId: string, attachments: any[]) => {
    try {
      const resp = await fetch(APPS_SCRIPT_URL, { 
        method: 'POST', 
        body: JSON.stringify({ action: 'addAttachments', payload: { caseId, newAttachments: attachments } }) 
      });
      const data = await resp.json();
      if (data.success) {
        const cases = storage.getCases();
        const idx = cases.findIndex(c => c.id === caseId);
        if (idx !== -1) {
          const current = cases[idx].adjuntoOriginalUrl || "";
          cases[idx].adjuntoOriginalUrl = current ? current + ", " + data.addedUrls.join(", ") : data.addedUrls.join(", ");
          localStorage.setItem(CASES_KEY, JSON.stringify(cases));
        }
      }
      return data;
    } catch (e) { return null; }
  },

  saveNote: async (note: ManagementNote) => {
    const notes = storage.getNotes();
    notes.push(note);
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  },

  deleteNote: (id: string) => {
    const notes = storage.getNotes();
    const filtered = notes.filter(n => n.id !== id);
    localStorage.setItem(NOTES_KEY, JSON.stringify(filtered));
  },

  requestReclassification: async (caseRecord: CaseRecord, reason: string, office: string) => {
    try {
      const resp = await fetch(APPS_SCRIPT_URL, { 
        method: 'POST', 
        body: JSON.stringify({ action: 'requestReclassification', payload: { caseRecord, reason, office } }) 
      });
      return await resp.json();
    } catch (e) {
      console.warn("GAS Falló, se intentará actualizar localmente:", e);
      return { success: true };
    }
  },

  requestClosure: async (caseRecord: CaseRecord, reason: string, office: string) => {
    try {
      const resp = await fetch(APPS_SCRIPT_URL, { 
        method: 'POST', 
        body: JSON.stringify({ action: 'requestClosure', payload: { caseRecord, reason, office } }) 
      });
      return await resp.json();
    } catch (e) {
      console.warn("GAS Falló, se intentará actualizar localmente:", e);
      return { success: true };
    }
  },

  escalateToAdmin2: async (caseRecord: CaseRecord, analysis: string) => {
    try {
      const resp = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'escalateToAdmin2', payload: { caseRecord, analysis } }) });
      return await resp.json();
    } catch (e) { return null; }
  },

  resolveReclassification: async (caseRecord: CaseRecord, decision: string, justification: string, newOffice: string) => {
    try {
      const resp = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'resolveReclassification', payload: { caseRecord, decision, justification, newOffice } }) });
      return await resp.json();
    } catch (e) { return null; }
  },

  acceptClosure: async (caseRecord: CaseRecord, office: string) => {
    try {
      const resp = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'acceptClosure', payload: { caseRecord, office } }) });
      return await resp.json();
    } catch (e) { return null; }
  },

  denyClosure: async (caseRecord: CaseRecord, justification: string, office: string) => {
    try {
      const resp = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'denyClosure', payload: { caseRecord, justification, office } }) });
      return await resp.json();
    } catch (e) { return null; }
  },

  saveReport: async (caseRecord: CaseRecord, reportNumber: number, content: string, office: string) => {
    try {
      const resp = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'saveReport', payload: { caseRecord, reportNumber, content, office } }) });
      return await resp.json();
    } catch (e) { return null; }
  }
};
