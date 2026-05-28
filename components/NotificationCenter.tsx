import React, { useState } from 'react';
import { useERPData } from '../hooks/useERPData';
import { AppNotification, ViewType } from '../types';
import { RoundedCard, ActionButton } from './ui/Cards';

interface NotificationCenterProps {
  onClose: () => void;
  onNavigate: (view: ViewType) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onClose, onNavigate }) => {
  const { notifications, markNotificationRead, deleteNotification, clearAllNotifications, addNotification } = useERPData();
  const [activeTab, setActiveTab] = useState<'alerts' | 'alarms'>('alerts');
  const [alarmForm, setAlarmForm] = useState({ title: '', time: '' });

  const sortedNotifications = [...notifications].sort((a, b) => b.timestamp - a.timestamp);
  
  const alerts = sortedNotifications.filter(n => n.type !== 'alarm');
  const alarms = sortedNotifications.filter(n => n.type === 'alarm');

  const handleCreateAlarm = () => {
    if (!alarmForm.title || !alarmForm.time) return;
    
    // Parse time to today's date + selected time
    const [hours, minutes] = alarmForm.time.split(':').map(Number);
    const scheduleDate = new Date();
    scheduleDate.setHours(hours, minutes, 0, 0);
    
    // If time passed today, schedule for tomorrow
    if (scheduleDate.getTime() < Date.now()) {
        scheduleDate.setDate(scheduleDate.getDate() + 1);
    }

    addNotification({
        title: 'Recordatorio',
        message: alarmForm.title,
        type: 'alarm',
        scheduledFor: scheduleDate.getTime()
    });

    setAlarmForm({ title: '', time: '' });
    alert(`Alarma configurada para las ${alarmForm.time}`);
  };

  const getIcon = (type: string) => {
    switch(type) {
        case 'urgent': return 'fa-triangle-exclamation text-rose-500';
        case 'warning': return 'fa-circle-exclamation text-amber-500';
        case 'alarm': return 'fa-clock text-indigo-500';
        default: return 'fa-circle-info text-sky-500';
    }
  };

  const getBg = (type: string) => {
    switch(type) {
        case 'urgent': return 'bg-rose-50 border-rose-100';
        case 'warning': return 'bg-amber-50 border-amber-100';
        case 'alarm': return 'bg-indigo-50 border-indigo-100';
        default: return 'bg-white border-sky-50';
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex justify-end animate-fadeIn">
      <div className="w-full max-w-sm h-full bg-sky-50 shadow-2xl flex flex-col animate-slideRight">
        
        {/* Header */}
        <div className="p-6 bg-white border-b border-sky-100 flex justify-between items-center">
            <div>
                <h3 className="text-xl font-black text-sky-900">Notificaciones</h3>
                <p className="text-[10px] text-sky-400 font-bold uppercase tracking-widest">Centro de Alertas</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:bg-rose-100 hover:text-rose-500 transition-colors">
                <i className="fas fa-times"></i>
            </button>
        </div>

        {/* Tabs */}
        <div className="p-4 flex gap-2">
            <button onClick={() => setActiveTab('alerts')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${activeTab === 'alerts' ? 'bg-sky-500 text-white shadow-lg' : 'bg-white text-slate-400'}`}>
                Sistema ({alerts.filter(n => !n.read).length})
            </button>
            <button onClick={() => setActiveTab('alarms')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${activeTab === 'alarms' ? 'bg-indigo-500 text-white shadow-lg' : 'bg-white text-slate-400'}`}>
                Alarmas ({alarms.filter(n => !n.read).length})
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-20 no-scrollbar relative">
            
            {activeTab === 'alarms' && (
                <div className="bg-white p-4 rounded-3xl shadow-sm border border-indigo-50 mb-4">
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase mb-3">Nueva Alarma</h4>
                    <div className="flex gap-2 mb-2">
                        <input 
                            type="text" 
                            placeholder="Ej: Llamar a proveedor" 
                            className="flex-1 bg-slate-50 p-3 rounded-xl text-xs font-bold outline-none focus:ring-2 ring-indigo-200"
                            value={alarmForm.title}
                            onChange={e => setAlarmForm({...alarmForm, title: e.target.value})}
                        />
                        <input 
                            type="time" 
                            className="w-20 bg-slate-50 p-3 rounded-xl text-xs font-black outline-none focus:ring-2 ring-indigo-200"
                            value={alarmForm.time}
                            onChange={e => setAlarmForm({...alarmForm, time: e.target.value})}
                        />
                    </div>
                    <button onClick={handleCreateAlarm} className="w-full py-3 bg-indigo-500 text-white rounded-xl font-black text-[9px] uppercase active:scale-95 transition-transform">
                        Configurar Recordatorio
                    </button>
                </div>
            )}

            {activeTab === 'alerts' && alerts.length === 0 && (
                <div className="text-center py-10 opacity-40 flex flex-col items-center">
                    <i className="fas fa-bell-slash text-4xl mb-2 text-slate-300"></i>
                    <p className="text-xs font-bold text-slate-400">Sin notificaciones nuevas</p>
                </div>
            )}

            {(activeTab === 'alerts' ? alerts : alarms).map(n => (
                <div key={n.id} className={`p-4 rounded-3xl border-2 mb-3 relative overflow-hidden transition-all ${getBg(n.type)} ${n.read ? 'opacity-70 grayscale' : 'shadow-md scale-[1.02]'}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <i className={`fas ${getIcon(n.type)} text-lg`}></i>
                            <span className="text-[10px] font-black uppercase text-slate-500">
                                {new Date(n.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                        <button onClick={() => deleteNotification(n.id)} className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-slate-300 hover:text-rose-400">
                            <i className="fas fa-times text-xs"></i>
                        </button>
                    </div>
                    
                    <h4 className="font-black text-slate-800 text-sm leading-tight mb-1">{n.title}</h4>
                    <p className="text-[10px] font-bold text-slate-500 leading-snug">{n.message}</p>
                    
                    {n.actionLink && (
                        <button 
                            onClick={() => { onClose(); onNavigate(n.actionLink!); markNotificationRead(n.id); }}
                            className="mt-3 text-[9px] font-black uppercase text-sky-600 bg-white px-3 py-1.5 rounded-xl border border-sky-100 shadow-sm active:scale-95 transition-transform flex items-center gap-1 w-fit"
                        >
                            Ver Detalle <i className="fas fa-arrow-right"></i>
                        </button>
                    )}

                    {!n.read && (
                        <button 
                            onClick={() => markNotificationRead(n.id)}
                            className="absolute top-0 right-0 bottom-0 left-0 z-0"
                        ></button>
                    )}
                </div>
            ))}

            {notifications.length > 0 && (
                <button onClick={clearAllNotifications} className="w-full py-4 text-center text-[10px] font-bold text-slate-400 uppercase hover:text-rose-400 mt-4">
                    Limpiar Todo
                </button>
            )}
        </div>
      </div>
      <style>{`
        @keyframes slideRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
        }
        .animate-slideRight { animation: slideRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};