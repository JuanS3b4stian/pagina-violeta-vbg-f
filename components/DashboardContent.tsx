
import React, { useEffect, useState } from 'react';
import { CaseRecord } from '../types';
import { storage } from '../services/storage';

const DashboardContent: React.FC = () => {
  // Fix: changed 'Caso' to 'CaseRecord' as 'Caso' is not exported from types.ts
  const [casos, setCasos] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fix: changed 'getCasos' to 'getCases' and handled synchronous return from storage.ts
    const res = storage.getCases();
    setCasos(res);
    setLoading(false);
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Listado de Casos</h2>
          <p className="text-gray-500">Gestión de la ruta de atención VBG</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm">Exportar Excel</button>
          <button className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 shadow-sm">Actualizar</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Usuaria</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Despacho</th>
                <th className="px-6 py-4">Urgencia</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-400">Cargando información...</td></tr>
              ) : casos.map(caso => (
                <tr key={caso.id} className="hover:bg-violet-50/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-violet-700">{caso.id}</td>
                  <td className="px-6 py-4 text-gray-500">{caso.fecha}</td>
                  {/* Fix: changed 'usuaria' to 'usuariaNombre' to match CaseRecord interface */}
                  <td className="px-6 py-4 font-semibold text-gray-900">{caso.usuariaNombre}</td>
                  <td className="px-6 py-4">{caso.tipoViolencia}</td>
                  {/* Fix: changed 'despacho' to 'despachoAsignado' to match CaseRecord interface */}
                  <td className="px-6 py-4">{caso.despachoAsignado}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${caso.urgencia === 'Alta' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                      {caso.urgencia}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-violet-600 font-medium italic">
                      <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse"></span>
                      {caso.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-violet-600 hover:text-violet-800 font-bold">Ver Detalles</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;
