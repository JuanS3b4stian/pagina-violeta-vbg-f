
import React from 'react';
import { User } from '../types';

interface DashboardHeaderProps {
  user: User;
  onLogout: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="bg-white border-b border-gray-200 h-16 px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <h2 className="font-bold text-gray-800 hidden md:block">Sistema de Gestión Violeta</h2>
        <div className="h-6 w-px bg-gray-200 hidden md:block"></div>
        <div className="text-sm text-gray-500">
          Rol: <span className="font-semibold text-violet-600">{user.role}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-bold text-gray-800 leading-none">{user.username}</p>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>
        <button onClick={onLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default DashboardHeader;
