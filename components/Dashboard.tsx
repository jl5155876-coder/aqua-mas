
import React, { useState, useEffect } from 'react';
import { ViewType, Employee } from '../types';
import { useERPData } from '../hooks/useERPData';
import { NotificationCenter } from './NotificationCenter';

interface DashboardProps {
  setView: (view: ViewType) => void;
  user: Employee;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setView, user, onLogout }) => {
  const { sales, notifications } = useERPData();
  const totalToday = sales.filter(s => s.timestamp >= new Date().setHours(0,0,0,0)).reduce((acc, s) => acc + s.total, 0);
  const [greeting, setGreeting] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Buenos días');
    else if (hour < 18) setGreeting('Buenas tardes');
    else setGreeting('Buenas noches');
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const allMenuItems = [
    { id: 'pos', name: 'Ventas', icon: 'fa-cash-register', color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'orders', name: 'Pedidos', icon: 'fa-clipboard-list', color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { id: 'customers', name: 'Clientes', icon: 'fa-users', color: 'text-pink-500', bg: 'bg-pink-50' },
    { id: 'whatsapp', name: 'Difusión', icon: 'fa-bullhorn', color: 'text-teal-500', bg: 'bg-teal-50' },
    
    { id: 'logistics', name: 'Flota', icon: 'fa-truck-fast', color: 'text-sky-600', bg: 'bg-sky-50' },
    { id: 'fuel', name: 'Gasolina', icon: 'fa-gas-pump', color: 'text-amber-500', bg: 'bg-amber-50' },
    { id: 'production', name: 'Planta', icon: 'fa-industry', color: 'text-slate-600', bg: 'bg-slate-100' },
    { id: 'inventory', name: 'Inventario', icon: 'fa-boxes-stacked', color: 'text-violet-500', bg: 'bg-violet-50' },
    
    { id: 'quality', name: 'Calidad', icon: 'fa-check-double', color: 'text-cyan-500', bg: 'bg-cyan-50' },
    { id: 'tickets', name: 'Tickets', icon: 'fa-ticket', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'supplies', name: 'Insumos', icon: 'fa-dolly', color: 'text-orange-500', bg: 'bg-orange-50' },
    { id: 'scanner', name: 'Scanner', icon: 'fa-qrcode', color: 'text-fuchsia-500', bg: 'bg-fuchsia-50' },
    
    { id: 'messages', name: 'Chat', icon: 'fa-comments', color: 'text-lime-600', bg: 'bg-lime-50' },
    { id: 'reports', name: 'Finanzas', icon: 'fa-chart-pie', color: 'text-rose-500', bg: 'bg-rose-50' },
    { id: 'employees', name: 'Equipo', icon: 'fa-id-card', color: 'text-indigo-400', bg: 'bg-indigo-50' },
    { id: 'sync', name: 'Nube', icon: 'fa-cloud', color: 'text-blue-400', bg: 'bg-blue-50' },
    { id: 'settings', name: 'Ajustes', icon: 'fa-gear', color: 'text-slate-400', bg: 'bg-slate-50' },
  ];

  // Agrupar módulos visualmente
  const groups = [
    { title: 'Comercial', items: ['pos', 'orders', 'customers', 'whatsapp'] },
    { title: 'Operaciones', items: ['logistics', 'fuel', 'production', 'inventory'] },
    { title: 'Gestión', items: ['quality', 'tickets', 'supplies', 'scanner', 'messages'] },
    { title: 'Administración', items: ['reports', 'employees', 'sync', 'settings'] },
  ];

  return (
    <div className="px-6 py-8 animate-fadeIn h-full bg-transparent overflow-y-auto no-scrollbar flex flex-col">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between shrink-0">
        <div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-0.5">{greeting},</p>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            {user.name.split(' ')[0]}
          </h1>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setShowNotifications(true)} className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-sky-500 active:scale-90 transition-transform relative">
                <i className="fas fa-bell text-sm"></i>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-[8px] font-black text-white flex items-center justify-center animate-pulse border border-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>
            <button onClick={onLogout} className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-rose-400 active:scale-90 transition-transform">
                <i className="fas fa-power-off text-sm"></i>
            </button>
        </div>
      </header>

      {/* Stats Card */}
      <div className="bg-gradient-to-br from-sky-500 to-indigo-600 text-white p-7 rounded-[2.5rem] shadow-xl shadow-sky-500/20 mb-8 relative overflow-hidden shrink-0 group cursor-default">
        <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-24 h-24 bg-indigo-500/30 rounded-full blur-xl"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-2">
             <div className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10 inline-flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-bold uppercase tracking-wide">Caja al momento</span>
             </div>
             <i className="fas fa-wallet text-white/50 text-xl"></i>
          </div>
          
          <p className="text-4xl font-black tracking-tighter drop-shadow-sm mb-4">
            ${totalToday.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          
          <div className="flex gap-2">
            <div className="bg-black/20 px-3 py-1.5 rounded-xl text-[10px] font-bold backdrop-blur-sm">
               <i className="fas fa-receipt mr-1 opacity-70"></i>
               {sales.filter(s => s.timestamp >= new Date().setHours(0,0,0,0)).length} Ventas
            </div>
            <div className="bg-black/20 px-3 py-1.5 rounded-xl text-[10px] font-bold backdrop-blur-sm">
               <i className="fas fa-calendar-day mr-1 opacity-70"></i>
               Hoy
            </div>
          </div>
        </div>
      </div>

      {/* Módulos Agrupados */}
      <div className="space-y-6 pb-24">
        {groups.map((group, groupIdx) => {
          // Filtrar items que pertenecen a este grupo Y que el usuario tiene permiso de ver
          const groupItems = allMenuItems.filter(item => 
            group.items.includes(item.id) && 
            (user.permissions.includes(item.id as ViewType) || user.roles.includes('Administrador'))
          );

          if (groupItems.length === 0) return null;

          return (
            <div key={groupIdx} className="animate-slideUp" style={{ animationDelay: `${groupIdx * 50}ms` }}>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">{group.title}</h3>
              <div className="grid grid-cols-4 gap-3">
                {groupItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setView(item.id as ViewType)}
                    className="flex flex-col items-center justify-center p-2 bg-white rounded-[1.5rem] shadow-sm border border-transparent active:scale-95 transition-all hover:shadow-md aspect-square"
                  >
                    <div className={`w-10 h-10 ${item.bg} ${item.color} rounded-xl flex items-center justify-center text-lg mb-2`}>
                      <i className={`fas ${item.icon}`}></i>
                    </div>
                    <span className="font-bold text-slate-600 text-[9px] uppercase tracking-tight text-center leading-tight">
                      {item.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Footer */}
      <div className="mt-auto text-center opacity-40 pb-6">
         <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Aqua+ Fundadores</p>
      </div>

      {showNotifications && (
        <NotificationCenter 
            onClose={() => setShowNotifications(false)} 
            onNavigate={(view) => { setShowNotifications(false); setView(view); }} 
        />
      )}
    </div>
  );
};
