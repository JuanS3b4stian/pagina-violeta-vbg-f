
import React, { useState, useEffect } from 'react';
import { storage } from '../services/storage';
import { CaseRecord, CaseStatus, UrgencyLevel, ManagementNote, MonthlyReport } from '../types';
import { DESPACHOS_LIST, ICONS } from '../constants';

const DashboardAdmin1: React.FC = () => {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [notes, setNotes] = useState<ManagementNote[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);
  const [viewingReportsOf, setViewingReportsOf] = useState<CaseRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'reclassification' | 'notes' | 'closures' | 'monthly'>('all');
  const [adminAnalysis, setAdminAnalysis] = useState('');
  const [closureJustification, setClosureJustification] = useState('');
  const [loading, setLoading] = useState(false);
  const [assignment, setAssignment] = useState({ 
    despacho: '', 
    urgencia: UrgencyLevel.MEDIA,
    estado: CaseStatus.ASIGNADO
  });

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (selectedCase) {
      setAssignment({
        despacho: selectedCase.despachoAsignado || '',
        urgencia: selectedCase.urgencia || UrgencyLevel.MEDIA,
        estado: selectedCase.estado === CaseStatus.PENDIENTE ? CaseStatus.ASIGNADO : selectedCase.estado
      });
      setClosureJustification('');
      setAdminAnalysis('');
    }
  }, [selectedCase]);

  const refresh = () => {
    setCases(storage.getCases());
    setNotes(storage.getNotes());
    setMonthlyReports(storage.getMonthlyReports());
  };

  const handleEscalateToAdmin2 = async () => {
    if (!selectedCase || !adminAnalysis) return;
    setLoading(true);
    const response: any = await storage.escalateToAdmin2(selectedCase, adminAnalysis);
    const updated: CaseRecord = {
      ...selectedCase,
      estado: CaseStatus.RECLASIFICACION_PENDIENTE_ADMIN2,
      analisisAdmin1Url: response?.pdfUrl || selectedCase.analisisAdmin1Url,
      historial: [...selectedCase.historial, { id: `h-${Date.now()}`, date: new Date().toISOString(), user: 'Coord. Equidad', description: 'Análisis técnico cargado y escalado a Secretaría.' }]
    };
    storage.updateCase(updated);
    setLoading(false);
    setSelectedCase(null);
    refresh();
  };

  const handleAcceptClosure = async () => {
    if (!selectedCase) return;
    setLoading(true);
    await storage.acceptClosure(selectedCase, selectedCase.despachoAsignado);
    const updated: CaseRecord = {
      ...selectedCase,
      estado: CaseStatus.CERRADO,
      historial: [...selectedCase.historial, { id: `h-${Date.now()}`, date: new Date().toISOString(), user: 'Coord. Equidad', description: 'Cierre de caso aceptado definitivamente.' }]
    };
    storage.updateCase(updated);
    setLoading(false);
    setSelectedCase(null);
    refresh();
  };

  const handleDenyClosure = async () => {
    if (!selectedCase || !closureJustification) return;
    setLoading(true);
    await storage.denyClosure(selectedCase, closureJustification, selectedCase.despachoAsignado);
    const updated: CaseRecord = {
      ...selectedCase,
      estado: CaseStatus.EN_GESTION,
      historial: [...selectedCase.historial, { id: `h-${Date.now()}`, date: new Date().toISOString(), user: 'Coord. Equidad', description: `Solicitud de cierre negada: ${closureJustification}` }]
    };
    storage.updateCase(updated);
    setLoading(false);
    setSelectedCase(null);
    refresh();
  };

  const handleAssign = () => {
    if (!selectedCase) return;
    const updated: CaseRecord = {
      ...selectedCase,
      despachoAsignado: assignment.despacho,
      urgencia: assignment.urgencia,
      estado: assignment.despacho && selectedCase.estado === CaseStatus.PENDIENTE ? CaseStatus.ASIGNADO : assignment.estado,
      historial: [...selectedCase.historial, { id: `h-${Date.now()}`, date: new Date().toISOString(), user: 'Coord. Equidad', description: `Gestión de Coordinación: ${assignment.estado} - Despacho: ${assignment.despacho || 'Sin Asignar'}` }]
    };
    storage.updateCase(updated);
    setSelectedCase(null);
    refresh();
  };

  const reclassificationCases = cases.filter(c => c.estado === CaseStatus.RECLASIFICACION_SOLICITADA);
  const closureRequests = cases.filter(c => c.estado === CaseStatus.CIERRE_SOLICITADO);

  const getJustificationFromHistory = (keyword: string) => {
    if (!selectedCase) return "Sin detalle.";
    const lastEntry = selectedCase.historial.slice().reverse().find(h => 
      h.description.toLowerCase().includes(keyword.toLowerCase())
    );
    if (!lastEntry) return "Sin detalle.";
    
    const parts = lastEntry.description.split(': ');
    if (parts.length > 1) {
      return parts.slice(1).join(': ');
    }
    return lastEntry.description;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 border-b border-violet-100">
        <button onClick={() => { setActiveTab('all'); setViewingReportsOf(null); }} className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'all' ? 'text-violet-700 border-b-2 border-violet-700' : 'text-gray-400 hover:text-violet-400'}`}>Bandeja General</button>
        <button onClick={() => { setActiveTab('reclassification'); setViewingReportsOf(null); }} className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'reclassification' ? 'text-pink-700 border-b-2 border-pink-700' : 'text-gray-400 hover:text-pink-400'}`}>Reclasificaciones {reclassificationCases.length > 0 && <span className="bg-pink-600 text-white text-[10px] px-2 py-0.5 rounded-full">{reclassificationCases.length}</span>}</button>
        <button onClick={() => { setActiveTab('closures'); setViewingReportsOf(null); }} className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'closures' ? 'text-orange-700 border-b-2 border-orange-700' : 'text-gray-400 hover:text-orange-400'}`}>Solicitudes Cierre {closureRequests.length > 0 && <span className="bg-orange-600 text-white text-[10px] px-2 py-0.5 rounded-full">{closureRequests.length}</span>}</button>
        <button onClick={() => { setActiveTab('monthly'); setViewingReportsOf(null); }} className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'monthly' ? 'text-purple-700 border-b-2 border-purple-700' : 'text-gray-400 hover:text-purple-400'}`}>Reportes Mensuales {monthlyReports.length > 0 && <span className="bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full">{monthlyReports.length}</span>}</button>
        <button onClick={() => { setActiveTab('notes'); setViewingReportsOf(null); }} className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'notes' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-gray-400 hover:text-blue-400'}`}>Notas Gestión {notes.length > 0 && <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full">{notes.length}</span>}</button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {activeTab === 'monthly' ? (
            <div className="bg-white rounded-[2rem] shadow-sm border border-purple-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-purple-50 text-[10px] font-black uppercase text-purple-800">
                  <tr><th className="px-6 py-4">Despacho</th><th className="px-6 py-4">Mes / Año</th><th className="px-6 py-4">Estadísticas</th><th className="px-6 py-4 text-right">Contenido</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {monthlyReports.map(r => (
                    <tr key={r.id} className="hover:bg-purple-50/20 transition-all">
                      <td className="px-6 py-5 font-black uppercase text-gray-800 tracking-tighter">{r.despacho}</td>
                      <td className="px-6 py-5 font-bold text-gray-500 uppercase">{r.mesAño}</td>
                      <td className="px-6 py-5"><span className="text-xs font-black text-purple-600">{r.totalAtendidos} Atend.</span><br/><span className="text-[10px] text-green-600 font-bold">{r.casosCerrados} Cerrados</span></td>
                      <td className="px-6 py-5 text-right"><a href={r.pdfUrl} target="_blank" rel="noopener noreferrer" className="bg-white border border-purple-100 text-purple-600 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase inline-flex items-center gap-2 shadow-sm"><ICONS.PdfIcon /> Ver Reporte PDF</a></td>
                    </tr>
                  ))}
                  {monthlyReports.length === 0 && (
                    <tr><td colSpan={4} className="p-20 text-center text-gray-300 font-black uppercase text-xs tracking-widest italic">No hay reportes mensuales registrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'notes' ? (
            <div className="bg-white rounded-[2rem] shadow-sm border border-blue-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-blue-50 text-[10px] font-black uppercase text-blue-800">
                  <tr><th className="px-6 py-4">Remitente</th><th className="px-6 py-4">Contenido del Reporte Quincenal</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm font-medium">
                  {notes.map(n => (
                    <tr key={n.id} className="hover:bg-blue-50/20 transition-all">
                      <td className="px-6 py-5 font-black text-blue-700 uppercase tracking-tighter w-48">{n.officeName}<br/><span className="text-[9px] text-gray-400">{new Date(n.date).toLocaleDateString()}</span></td>
                      <td className="px-6 py-5 text-gray-600 italic leading-relaxed">"{n.content}"</td>
                    </tr>
                  ))}
                  {notes.length === 0 && (
                    <tr><td colSpan={2} className="p-20 text-center text-gray-300 font-black uppercase text-xs tracking-widest italic">No hay notas de gestión registradas</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : viewingReportsOf ? (
            <div className="bg-white rounded-[2rem] shadow-sm border border-violet-100 p-8 animate-in fade-in">
              <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black text-violet-900 uppercase tracking-tighter">Informes de Seguimiento: Caso #{viewingReportsOf.id}</h3><button onClick={() => setViewingReportsOf(null)} className="text-[10px] font-black uppercase text-gray-400 border border-gray-100 px-4 py-2 rounded-lg hover:bg-gray-50">Cerrar Vista</button></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <tbody className="divide-y text-sm">
                    <tr><td className="py-4 font-bold text-gray-800">Informe Técnico #1</td><td>{viewingReportsOf.informe1Url ? <a href={viewingReportsOf.informe1Url} target="_blank" rel="noopener noreferrer" className="bg-violet-100 text-violet-700 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase inline-flex items-center gap-2 shadow-sm"><ICONS.PdfIcon /> Ver PDF</a> : <span className="text-gray-300 italic">No disponible aún</span>}</td></tr>
                    <tr><td className="py-4 font-bold text-gray-800">Informe Técnico #2</td><td>{viewingReportsOf.informe1Url ? <a href={viewingReportsOf.informe1Url} target="_blank" rel="noopener noreferrer" className="bg-violet-100 text-violet-700 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase inline-flex items-center gap-2 shadow-sm"><ICONS.PdfIcon /> Ver PDF</a> : <span className="text-gray-300 italic">No disponible aún</span>}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] shadow-sm border border-violet-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-violet-50 text-[10px] font-black uppercase text-violet-800">
                  <tr><th className="px-6 py-5">Expediente</th><th className="px-6 py-5">Usuaria</th><th className="px-6 py-5">Estado</th><th className="px-6 py-5 text-right">Gestión</th></tr>
                </thead>
                <tbody className="divide-y divide-violet-50 text-sm">
                  {cases.filter(c => activeTab === 'all' || 
                    (activeTab === 'reclassification' && c.estado === CaseStatus.RECLASIFICACION_SOLICITADA) ||
                    (activeTab === 'closures' && c.estado === CaseStatus.CIERRE_SOLICITADO)
                  ).map(c => (
                    <tr key={c.id} className="hover:bg-violet-50/20 transition-all">
                      <td className="px-6 py-4 font-mono text-xs text-violet-600 font-black">#{c.id}<br/><span className="text-[9px] text-gray-400 uppercase font-bold">{c.fecha}</span></td>
                      <td className="px-6 py-4 font-bold text-gray-800 uppercase tracking-tighter">{c.usuariaNombre}</td>
                      <td className="px-6 py-4"><span className="text-[9px] font-black uppercase bg-violet-100 text-violet-700 px-3 py-1 rounded-full shadow-sm">{c.estado}</span></td>
                      <td className="px-6 py-4 text-right space-x-2"><button onClick={() => setSelectedCase(c)} className="bg-violet-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-md hover:bg-violet-700">Gestionar</button><button onClick={() => setViewingReportsOf(c)} className="bg-white border border-violet-100 text-violet-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-sm">Ver Informes</button></td>
                    </tr>
                  ))}
                  {cases.length === 0 && (
                    <tr><td colSpan={4} className="p-20 text-center text-gray-300 font-black uppercase text-xs tracking-widest italic">No hay casos que coincidan con el filtro</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {selectedCase && activeTab !== 'monthly' && activeTab !== 'notes' ? (
            <div className="bg-white rounded-[2rem] shadow-2xl border border-violet-100 p-8 space-y-6 sticky top-24 animate-in slide-in-from-right-4">
              <div className="flex justify-between items-start border-b pb-4"><h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Administración de Caso</h3><button onClick={() => setSelectedCase(null)} className="text-gray-300 font-bold hover:text-gray-500 transition-colors">✕</button></div>
              
              {selectedCase.estado === CaseStatus.RECLASIFICACION_SOLICITADA ? (
                <div className="space-y-5">
                  <div className="bg-pink-50 p-5 rounded-2xl text-xs border border-pink-100 shadow-inner"><p className="text-pink-700 font-black uppercase tracking-widest mb-1">Motivación del Despacho ({selectedCase.despachoAsignado}):</p><p className="leading-relaxed italic font-medium">"{getJustificationFromHistory('Reclasificación')}"</p></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Análisis Técnico de Coordinación</label><textarea className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm font-medium" rows={5} placeholder="Redacte el análisis de competencia..." value={adminAnalysis} onChange={e => setAdminAnalysis(e.target.value)} /></div>
                  <button onClick={handleEscalateToAdmin2} disabled={loading || !adminAnalysis} className="w-full bg-violet-700 text-white font-black py-5 rounded-[1.5rem] text-xs uppercase shadow-2xl hover:bg-violet-800 active:scale-95 transition-all">Escalar a Secretaría de Gobierno</button>
                </div>
              ) : selectedCase.estado === CaseStatus.CIERRE_SOLICITADO ? (
                <div className="space-y-6">
                  <div className="bg-orange-50 p-5 rounded-2xl text-xs border border-orange-100 shadow-inner"><p className="text-orange-700 font-black uppercase tracking-widest mb-1">Justificación del Cierre ({selectedCase.despachoAsignado}):</p><p className="leading-relaxed italic font-medium">"{getJustificationFromHistory('Cierre')}"</p></div>
                  <button onClick={handleAcceptClosure} className="w-full bg-green-600 text-white font-black py-4 rounded-[1.5rem] text-xs uppercase shadow-xl hover:bg-green-700 transition-all">Aceptar Cierre Definitivo</button>
                  <div className="space-y-2 pt-4 border-t border-gray-100"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Motivo de Negativa de Cierre</label><textarea className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm font-medium" rows={3} placeholder="Describa por qué el caso no puede cerrarse..." value={closureJustification} onChange={e => setClosureJustification(e.target.value)} /></div>
                  <button onClick={handleDenyClosure} disabled={!closureJustification} className="w-full bg-red-600 text-white font-black py-4 rounded-[1.5rem] uppercase text-xs shadow-xl hover:bg-red-700 transition-all">Negar Cierre de Caso</button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Despacho Asignado</label><select className="w-full p-4 bg-violet-50 rounded-xl text-sm font-black text-violet-900 border-none" value={assignment.despacho} onChange={e => setAssignment({...assignment, despacho: e.target.value})}><option value="">Sin Asignar</option>{DESPACHOS_LIST.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                  <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Nivel de Urgencia</label><select className="w-full p-4 bg-violet-50 rounded-xl text-sm font-black text-violet-900 border-none" value={assignment.urgencia} onChange={e => setAssignment({...assignment, urgencia: e.target.value as UrgencyLevel})}>{Object.values(UrgencyLevel).map(v => <option key={v} value={v}>{v}</option>)}</select></div>
                  <div className="space-y-1"><label className="text-[10px] font-black uppercase text-gray-400 ml-1">Estado de la Ruta</label><select className="w-full p-4 bg-violet-50 rounded-xl text-sm font-black text-violet-900 border-none" value={assignment.estado} onChange={e => setAssignment({...assignment, estado: e.target.value as CaseStatus})}>{Object.values(CaseStatus).filter(s => s !== CaseStatus.RECLASIFICACION_SOLICITADA && s !== CaseStatus.CIERRE_SOLICITADO).map(v => <option key={v} value={v}>{v}</option>)}</select></div>
                  <button onClick={handleAssign} className="w-full bg-violet-700 text-white font-black py-5 rounded-[1.5rem] uppercase text-xs tracking-widest shadow-2xl mt-4 hover:bg-violet-800 active:scale-95 transition-all">Guardar Cambios y Notificar</button>
                </div>
              )}
            </div>
          ) : activeTab === 'all' && (
            <div className="h-64 border-4 border-dotted border-violet-50 rounded-[3rem] flex items-center justify-center text-violet-200 uppercase text-[10px] font-black p-10 text-center leading-relaxed">Seleccione un registro del listado principal para iniciar la gestión administrativa</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardAdmin1;
