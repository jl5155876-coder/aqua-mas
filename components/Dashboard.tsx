import React from 'react';
import { ViewType, Employee } from '../types';
import { useERPData } from '../hooks/useERPData';
import { RoundedCard } from './ui/Cards';

interface DashboardProps {
  setView: (view: ViewType) => void;
  user: Employee;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setView, user, onLogout }) => {
  const { sales } = useERPData();
  const totalToday = sales.filter(s => s.timestamp >= new Date().setHours(0,0,0,0)).reduce((acc, s) => acc + s.total, 0);

  const menuItems = [
    { id: 'pos', name: 'Ventas', icon: 'fa-cart-plus', color: 'bg-blue-500' },
    { id: 'orders', name: 'Pedidos', icon: 'fa-rectangle-list', color: 'bg-indigo-600' },
    { id: 'inventory', name: 'Inventario', icon: 'fa-box-open', color: 'bg-violet-500' },
    { id: 'customers', name: 'Clientes', icon: 'fa-address-card', color: 'bg-pink-500' },
    { id: 'logistics', name: 'Flota', icon: 'fa-truck-fast', color: 'bg-sky-600' },
    { id: 'whatsapp', name: 'Preventa', icon: 'fa-message', color: 'bg-emerald-500' },
    { id: 'production', name: 'Producción', icon: 'fa-gears', color: 'bg-indigo-500' },
    { id: 'quality', name: 'Bitácoras', icon: 'fa-clipboard-check', color: 'bg-teal-500' },
    { id: 'scanner', name: 'Scanner', icon: 'fa-expand', color: 'bg-purple-600' },
    { id: 'employees', name: 'Equipo', icon: 'fa-users-gear', color: 'bg-amber-500' },
    { id: 'reports', name: 'Reportes', icon: 'fa-chart-simple', color: 'bg-rose-500' },
    { id: 'sync', name: 'Aqua Cloud', icon: 'fa-cloud', color: 'bg-cyan-500' },
    { id: 'settings', name: 'Ajustes', icon: 'fa-sliders', color: 'bg-slate-500' },
    // Only for admin usually, but we check permissions below
    { id: 'tickets', name: 'Admin Tickets', icon: 'fa-ticket', color: 'bg-slate-700' },
  ];

  // Filter items based on user permissions
  const visibleItems = menuItems.filter(item => user.permissions.includes(item.id as ViewType));

  return (
    <div className="px-6 py-8 animate-fadeIn h-full bg-sky-50 overflow-y-auto no-scrollbar">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-sky-900 tracking-tight leading-tight">Aqua+ Fundadores</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="bg-sky-100 text-sky-600 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-sky-200">{user.role}</span>
            <p className="text-sky-400 font-bold text-[10px] uppercase tracking-wider">{user.name.split(' ')[0]}</p>
          </div>
        </div>
        <button onClick={onLogout} className="bg-white p-3.5 rounded-2xl shadow-sm border border-white flex items-center justify-center text-red-400 active:scale-90 transition-transform">
          <i className="fas fa-power-off text-xl"></i>
        </button>
      </header>

      {/* Main Stats Card */}
      <div className="bg-sky-600 text-white p-7 rounded-[2.5rem] shadow-2xl shadow-sky-200 mb-8 relative overflow-hidden group">
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase opacity-70 tracking-widest mb-1">Caja del Día</p>
          <p className="text-4xl font-black tracking-tighter">${totalToday.toLocaleString()}</p>
          <div className="mt-4 flex gap-2">
            <span className="bg-white/20 px-3 py-1 rounded-full text-[9px] font-bold">Ventas: {sales.filter(s => s.timestamp >= new Date().setHours(0,0,0,0)).length}</span>
            <span className="bg-emerald-400/30 px-3 py-1 rounded-full text-[9px] font-bold">Online</span>
          </div>
        </div>
        <i className="fas fa-wallet absolute -bottom-6 -right-6 text-9xl text-white/10 rotate-12 group-hover:scale-110 transition-transform duration-500"></i>
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-3 gap-3">
        {visibleItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as ViewType)}
            className="flex flex-col items-center justify-center p-5 bg-white/80 backdrop-blur-md rounded-[2.2rem] shadow-sm border border-white active:scale-90 transition-all group relative overflow-hidden"
          >
            <div className={`${item.color} w-11 h-11 rounded-2xl flex items-center justify-center text-white mb-2.5 shadow-lg group-hover:rotate-6 transition-transform`}>
              <i className={`fas ${item.icon} text-lg`}></i>
            </div>
            <span className="font-black text-sky-900 text-[9px] uppercase tracking-tighter text-center leading-none">{item.name}</span>
            <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-sky-200/50"></div>
          </button>
        ))}
      </div>
      
      {/* Dynamic Status Bar */}
      <div className="mt-8 space-y-3">
         <RoundedCard className="border-l-4 border-emerald-500 py-5 bg-white/90">
            <div className="flex justify-between items-center mb-1">
              <h4 className="font-black text-sky-900 text-[11px] uppercase tracking-wider text-left">Nube Aqua+ Activa</h4>
              <i className="fas fa-cloud text-emerald-500 text-xs animate-pulse"></i>
            </div>
            <p className="text-[10px] text-sky-500 font-bold text-left">Sincronización automática habilitada</p>
         </RoundedCard>

         {user.permissions.includes('production') && (
           <RoundedCard className="border-l-4 border-amber-500 py-5 bg-white/90" onClick={() => setView('production')}>
              <div className="flex justify-between items-center mb-1">
                <h4 className="font-black text-sky-900 text-xs uppercase tracking-wider text-left">Estado de Planta</h4>
                <i className="fas fa-industry text-amber-500 text-xs"></i>
              </div>
              <p className="text-[10px] text-sky-500 font-bold text-left">Próximo Retrolavado: Hoy 6:00 PM</p>
           </RoundedCard>
         )}
      </div>

      <div className="mt-10 mb-20 text-center">
        <p className="text-[10px] font-black text-sky-200 uppercase tracking-[0.2em]">Aqua+ Fun Pro v3.0.0 Cloud</p>
      </div>
    </div>
  );
};