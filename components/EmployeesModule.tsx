
import React, { useState } from 'react';
import { useERPData } from '../hooks/useERPData';
import { ModuleHeader, RoundedCard, ActionButton } from './ui/Cards';
import { Employee, ViewType, Task, Attendance } from '../types';

const TASK_PRESETS = [
  { title: 'Reparto', icon: 'fa-truck-fast', desc: 'Ruta de entrega programada' },
  { title: 'Lavado y Llenado', icon: 'fa-faucet-drip', desc: 'Higienización y llenado de garrafones' },
  { title: 'Apertura de Local', icon: 'fa-door-open', desc: 'Protocolo de apertura 8:00 AM' },
  { title: 'Cierre de Local', icon: 'fa-door-closed', desc: 'Protocolo de cierre y corte de caja' },
  { title: 'Lavado de Tinacos', icon: 'fa-circle-dot', desc: 'Mantenimiento preventivo de tinacos' },
  { title: 'Regeneración', icon: 'fa-flask-vial', desc: 'Regeneración química de resinas' },
  { title: 'Retrolavado', icon: 'fa-water-ladder', desc: 'Limpieza de filtros multimedia' },
  { title: 'Mantenimiento General', icon: 'fa-tools', desc: 'Revisión técnica de equipos' },
];

export const EmployeesModule: React.FC<{ onBack: () => void; currentUser: Employee }> = ({ onBack, currentUser }) => {
  const { employees, saveEmployee, tasks, addTask, updateTaskStatus, attendance, recordAttendance } = useERPData();
  const [activeTab, setActiveTab] = useState<'roster' | 'assignments' | 'attendance'>('roster');
  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee> | null>(null);
  const [assigningTo, setAssigningTo] = useState<Employee | null>(null);
  const [customTaskTitle, setCustomTaskTitle] = useState('');

  const isAdmin = currentUser.role === 'Administrador';
  const today = new Date().toISOString().split('T')[0];

  const rosterModules: { id: ViewType; label: string; icon: string }[] = [
    { id: 'pos', label: 'Ventas', icon: 'fa-cash-register' },
    { id: 'orders', label: 'Pedidos', icon: 'fa-clipboard-list' },
    { id: 'customers', label: 'Clientes', icon: 'fa-address-book' },
    { id: 'logistics', label: 'Flota', icon: 'fa-truck-moving' },
    { id: 'whatsapp', label: 'Preventa', icon: 'fa-brands fa-whatsapp' },
    { id: 'production', label: 'Producción', icon: 'fa-industry' },
    { id: 'quality', label: 'Bitácoras', icon: 'fa-book-medical' },
    { id: 'scanner', label: 'Scanner', icon: 'fa-qrcode' },
    { id: 'employees', label: 'Equipo', icon: 'fa-users-gear' },
    { id: 'reports', label: 'Reportes', icon: 'fa-chart-pie' },
    { id: 'sync', label: 'P2P Sync', icon: 'fa-cloud-arrow-up' },
    { id: 'settings', label: 'Ajustes', icon: 'fa-sliders' },
  ];

  const getRoleColor = (role: string) => {
    switch(role) {
      case 'Administrador': return 'bg-rose-500';
      case 'Repartidor': return 'bg-sky-500';
      case 'Planta': return 'bg-amber-500';
      default: return 'bg-slate-500';
    }
  };

  const handleSaveEmployee = () => {
    if (!editingEmployee?.name || !editingEmployee?.pin || !editingEmployee?.role) {
      alert("Nombre, PIN y Rol son obligatorios.");
      return;
    }
    const empToSave: Employee = {
      id: editingEmployee.id || `EMP-${Date.now().toString().slice(-4)}`,
      name: editingEmployee.name,
      role: editingEmployee.role as any,
      phone: editingEmployee.phone || '',
      pin: editingEmployee.pin,
      permissions: editingEmployee.permissions || ['dashboard']
    };
    saveEmployee(empToSave);
    setEditingEmployee(null);
  };

  const togglePermission = (modId: ViewType) => {
    if (!editingEmployee) return;
    const currentPerms = editingEmployee.permissions || [];
    const newPerms = currentPerms.includes(modId)
      ? currentPerms.filter(p => p !== modId)
      : [...currentPerms, modId];
    setEditingEmployee({ ...editingEmployee, permissions: newPerms });
  };

  const handleAddTask = (preset: typeof TASK_PRESETS[0] | { title: string, desc: string }) => {
    if (!assigningTo) return;
    addTask({
      employeeId: assigningTo.id,
      title: preset.title,
      description: preset.desc,
      date: today
    });
    setAssigningTo(null);
    setCustomTaskTitle('');
  };

  if (editingEmployee) {
    return (
      <div className="h-full bg-sky-50 overflow-y-auto no-scrollbar pb-32">
        <ModuleHeader title={editingEmployee.id ? "Editar Colaborador" : "Nuevo Colaborador"} onBack={() => setEditingEmployee(null)} />
        <div className="px-6 space-y-6 animate-fadeIn">
          <div className="space-y-4">
             <div>
                <label className="text-[10px] font-black text-sky-400 uppercase ml-3 mb-1 block">Nombre Completo</label>
                <input className="w-full bg-white p-5 rounded-[2rem] outline-none shadow-sm font-bold text-sky-900 focus:ring-2 ring-sky-300 transition-all" placeholder="Ej: Juan Pérez" value={editingEmployee.name || ''} onChange={e => setEditingEmployee({...editingEmployee, name: e.target.value})}/>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-[10px] font-black text-sky-400 uppercase ml-3 mb-1 block">PIN de Acceso</label>
                   <input maxLength={4} className="w-full bg-white p-5 rounded-[2rem] outline-none shadow-sm font-black text-sky-900 text-center tracking-[0.5em] focus:ring-2 ring-sky-300" placeholder="0000" value={editingEmployee.pin || ''} onChange={e => setEditingEmployee({...editingEmployee, pin: e.target.value})}/>
                </div>
                <div>
                   <label className="text-[10px] font-black text-sky-400 uppercase ml-3 mb-1 block">Rol</label>
                   <select 
                     className="w-full bg-white p-5 rounded-[2rem] outline-none shadow-sm font-bold text-sky-900 appearance-none focus:ring-2 ring-sky-300"
                     value={editingEmployee.role || ''}
                     onChange={e => setEditingEmployee({...editingEmployee, role: e.target.value as any})}
                   >
                     <option value="">Seleccionar...</option>
                     <option value="Administrador">Administrador</option>
                     <option value="Repartidor">Repartidor</option>
                     <option value="Planta">Planta</option>
                   </select>
                </div>
             </div>

             <div>
                <label className="text-[10px] font-black text-sky-400 uppercase ml-3 mb-1 block">WhatsApp</label>
                <input className="w-full bg-white p-5 rounded-[2rem] outline-none shadow-sm text-sky-900 focus:ring-2 ring-sky-300" placeholder="33..." value={editingEmployee.phone || ''} onChange={e => setEditingEmployee({...editingEmployee, phone: e.target.value})}/>
             </div>

             <section className="space-y-3">
                <label className="text-[10px] font-black text-sky-400 uppercase ml-3 block">Permisos de Módulo</label>
                <div className="grid grid-cols-2 gap-2">
                   {rosterModules.map(mod => (
                     <button 
                        key={mod.id} 
                        onClick={() => togglePermission(mod.id)}
                        className={`flex items-center gap-2 p-3 rounded-2xl transition-all ${editingEmployee.permissions?.includes(mod.id) ? 'bg-sky-600 text-white shadow-md' : 'bg-white text-sky-300 border border-sky-50'}`}
                      >
                       <i className={`fas ${mod.icon} text-[10px]`}></i>
                       <span className="text-[9px] font-black uppercase tracking-tighter">{mod.label}</span>
                     </button>
                   ))}
                </div>
             </section>
          </div>
          
          <div className="pt-4">
             <ActionButton onClick={handleSaveEmployee}>Guardar Cambios</ActionButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-sky-50 flex flex-col animate-fadeIn overflow-hidden pb-24">
      <ModuleHeader title="Gestión de Equipo" onBack={onBack} />
      
      {/* Tab Selector */}
      <div className="px-6 flex gap-2 mb-6 shrink-0">
        <button onClick={() => setActiveTab('roster')} className={`flex-1 py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'roster' ? 'bg-sky-600 text-white shadow-lg shadow-sky-100' : 'bg-white text-sky-400'}`}>Roster</button>
        <button onClick={() => setActiveTab('assignments')} className={`flex-1 py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'assignments' ? 'bg-sky-600 text-white shadow-lg shadow-sky-100' : 'bg-white text-sky-400'}`}>Tareas</button>
        <button onClick={() => setActiveTab('attendance')} className={`flex-1 py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'attendance' ? 'bg-sky-600 text-white shadow-lg shadow-sky-100' : 'bg-white text-sky-400'}`}>Asistencias</button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-6 no-scrollbar pb-10">
        
        {/* ROSTER TAB */}
        {activeTab === 'roster' && (
          <div className="space-y-4">
            <RoundedCard className="bg-sky-900 text-white border-none shadow-xl">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-[2rem] flex items-center justify-center text-3xl">
                  <i className="fas fa-users-viewfinder"></i>
                </div>
                <div>
                  <h3 className="text-xl font-black">Capital Humano</h3>
                  <p className="text-[10px] font-bold uppercase opacity-60 tracking-widest">{employees.length} Colaboradores Activos</p>
                </div>
              </div>
            </RoundedCard>

            {employees.map(e => (
              <RoundedCard key={e.id} className="py-4 border-none shadow-sm group">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 ${getRoleColor(e.role)} text-white rounded-3xl flex items-center justify-center text-xl shadow-lg shadow-sky-100`}>
                      <i className={`fas ${e.role === 'Administrador' ? 'fa-user-tie' : e.role === 'Repartidor' ? 'fa-truck-fast' : 'fa-industry'}`}></i>
                    </div>
                    <div>
                      <h4 className="font-black text-sky-900 text-sm">{e.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[8px] font-black uppercase text-white px-2 py-0.5 rounded-full ${getRoleColor(e.role)}`}>{e.role}</span>
                        <span className="text-[8px] font-bold text-sky-400 uppercase tracking-widest">ID: {e.id.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isAdmin && (
                      <button onClick={() => setEditingEmployee(e)} className="w-10 h-10 bg-sky-50 text-sky-500 rounded-xl flex items-center justify-center active:bg-sky-200"><i className="fas fa-pen"></i></button>
                    )}
                    <a href={`https://wa.me/52${e.phone}`} className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center active:bg-emerald-200"><i className="fab fa-whatsapp"></i></a>
                  </div>
                </div>
              </RoundedCard>
            ))}
            
            {isAdmin && (
              <button 
                onClick={() => setEditingEmployee({ role: 'Repartidor', permissions: ['dashboard'] })}
                className="w-full py-6 border-2 border-dashed border-sky-200 rounded-[2.5rem] text-sky-400 font-black text-xs uppercase tracking-widest hover:bg-white transition-all"
              >
                + Registrar Colaborador
              </button>
            )}
          </div>
        )}

        {/* ASSIGNMENTS TAB */}
        {activeTab === 'assignments' && (
          <div className="space-y-6">
            {isAdmin && (
              <section className="space-y-3">
                <h4 className="text-[10px] font-black uppercase text-sky-400 tracking-widest px-2">Asignar Tarea Diaria</h4>
                <div className="grid grid-cols-2 gap-3">
                  {employees.filter(e => e.role !== 'Administrador').map(e => (
                    <button key={e.id} onClick={() => setAssigningTo(e)} className="bg-white p-4 rounded-[1.8rem] border border-sky-50 flex items-center gap-3 active:scale-95 transition-all text-left">
                       <div className={`w-8 h-8 ${getRoleColor(e.role)} rounded-xl flex items-center justify-center text-white text-[10px]`}><i className="fas fa-user"></i></div>
                       <span className="text-[10px] font-black text-sky-900 uppercase truncate">{e.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-4">
              <h4 className="text-[10px] font-black uppercase text-sky-400 tracking-widest px-2">Tareas de Hoy ({today})</h4>
              {tasks.filter(t => t.date === today).length === 0 ? (
                <div className="text-center py-20 text-sky-300 italic flex flex-col items-center gap-4">
                  <i className="fas fa-list-check text-5xl opacity-20"></i>
                  No hay tareas asignadas para hoy.
                </div>
              ) : (
                tasks.filter(t => t.date === today).map(t => (
                  <RoundedCard key={t.id} className={`py-4 border-none shadow-sm relative overflow-hidden ${t.status === 'completada' ? 'opacity-60 bg-emerald-50' : 'bg-white'}`}>
                    <div className="flex justify-between items-center">
                       <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${t.status === 'completada' ? 'bg-emerald-400' : 'bg-sky-600 shadow-lg shadow-sky-100'}`}>
                             <i className={`fas ${t.status === 'completada' ? 'fa-check' : 'fa-thumbtack'}`}></i>
                          </div>
                          <div>
                             <h4 className={`font-black text-sky-900 text-sm ${t.status === 'completada' ? 'line-through' : ''}`}>{t.title}</h4>
                             <p className="text-[10px] text-sky-400 font-bold uppercase">{employees.find(e => e.id === t.employeeId)?.name || 'Anónimo'}</p>
                          </div>
                       </div>
                       {t.employeeId === currentUser.id && t.status === 'pendiente' && (
                         <button onClick={() => updateTaskStatus(t.id, 'completada')} className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg shadow-emerald-100">Completar</button>
                       )}
                       {t.status === 'completada' && (
                         <span className="text-[10px] font-black text-emerald-600 uppercase">Lista <i className="fas fa-circle-check ml-1"></i></span>
                       )}
                    </div>
                  </RoundedCard>
                ))
              )}
            </section>
          </div>
        )}

        {/* ATTENDANCE TAB */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <RoundedCard className="bg-white border-l-4 border-l-emerald-500 p-6 shadow-sm">
               <div className="flex justify-between items-center mb-1">
                  <h4 className="text-lg font-black text-sky-900">Registro de Hoy</h4>
                  <span className="text-[10px] font-black text-emerald-600 uppercase bg-emerald-50 px-3 py-1 rounded-full">{today}</span>
               </div>
               <p className="text-[11px] text-sky-400 font-bold mb-6 italic">Marca la asistencia de los colaboradores al llegar a la planta.</p>
               
               <div className="space-y-3">
                  {employees.filter(e => e.role !== 'Administrador').map(e => {
                    const record = attendance.find(a => a.employeeId === e.id && a.date === today);
                    return (
                      <div key={e.id} className="flex items-center justify-between p-3 bg-sky-50/50 rounded-2xl border border-sky-50">
                        <div className="flex items-center gap-3">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs ${getRoleColor(e.role)} shadow-sm`}>
                              <i className="fas fa-user"></i>
                           </div>
                           <span className="text-xs font-black text-sky-900 uppercase truncate max-w-[100px]">{e.name.split(' ')[0]}</span>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => recordAttendance(e.id, 'presente')} className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] transition-all ${record?.status === 'presente' ? 'bg-emerald-500 text-white shadow-md' : 'bg-white text-emerald-500 border border-emerald-100'}`} title="Presente"><i className="fas fa-check"></i></button>
                          <button onClick={() => recordAttendance(e.id, 'retardo')} className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] transition-all ${record?.status === 'retardo' ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-amber-500 border border-amber-100'}`} title="Retardo"><i className="fas fa-clock"></i></button>
                          <button onClick={() => recordAttendance(e.id, 'falta')} className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] transition-all ${record?.status === 'falta' ? 'bg-red-500 text-white shadow-md' : 'bg-white text-red-500 border border-red-100'}`} title="Falta"><i className="fas fa-times"></i></button>
                        </div>
                      </div>
                    );
                  })}
               </div>
            </RoundedCard>

            <section className="space-y-3">
              <h4 className="text-[10px] font-black uppercase text-sky-400 tracking-widest px-2">Historial de Puntualidad</h4>
              <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-sky-50">
                 {attendance.length === 0 ? (
                   <p className="text-center text-sky-300 text-xs italic py-10">No hay registros históricos.</p>
                 ) : (
                   <div className="space-y-4 max-h-60 overflow-y-auto no-scrollbar">
                     {attendance.sort((a,b) => b.timestamp - a.timestamp).slice(0, 10).map(a => (
                       <div key={a.id} className="flex justify-between items-center border-b border-sky-50 pb-3 last:border-none">
                          <div className="flex flex-col">
                             <span className="text-[10px] font-black text-sky-900 uppercase">{employees.find(e => e.id === a.employeeId)?.name || '??'}</span>
                             <span className="text-[8px] font-bold text-sky-300">{a.date}</span>
                          </div>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${a.status === 'presente' ? 'bg-emerald-100 text-emerald-600' : a.status === 'retardo' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                             {a.status}
                          </span>
                       </div>
                     ))}
                   </div>
                 )}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {assigningTo && (
        <div className="fixed inset-0 bg-sky-900/60 backdrop-blur-md z-[100] flex items-end">
           <div className="w-full bg-white rounded-t-[2.5rem] p-8 animate-fadeIn max-h-[90vh] overflow-y-auto no-scrollbar">
              <div className="flex justify-between items-center mb-8">
                 <div>
                    <h3 className="text-xl font-black text-sky-900">Asignar Tarea</h3>
                    <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Para: {assigningTo.name}</p>
                 </div>
                 <button onClick={() => setAssigningTo(null)} className="w-12 h-12 bg-sky-50 text-sky-400 rounded-full flex items-center justify-center active:scale-90 transition-all"><i className="fas fa-times"></i></button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-8">
                 {TASK_PRESETS.map(preset => (
                   <button 
                    key={preset.title} 
                    onClick={() => handleAddTask(preset)}
                    className="bg-sky-50 p-5 rounded-[2rem] text-left border border-white hover:border-sky-300 active:scale-95 transition-all group"
                   >
                     <i className={`fas ${preset.icon} text-sky-600 mb-3 text-lg group-hover:rotate-12 transition-transform`}></i>
                     <h5 className="text-[10px] font-black text-sky-900 uppercase leading-none mb-1">{preset.title}</h5>
                     <p className="text-[8px] font-bold text-sky-400 leading-tight">{preset.desc}</p>
                   </button>
                 ))}
              </div>

              <div className="space-y-4 pt-6 border-t border-sky-50">
                 <h4 className="text-[10px] font-black uppercase text-sky-400 tracking-widest">Tarea Personalizada</h4>
                 <input 
                  type="text" 
                  className="w-full bg-sky-50 border-none rounded-2xl p-5 text-sky-900 font-bold outline-none focus:ring-2 ring-sky-300" 
                  placeholder="Título de la tarea..." 
                  value={customTaskTitle}
                  onChange={e => setCustomTaskTitle(e.target.value)}
                 />
                 <ActionButton onClick={() => handleAddTask({ title: customTaskTitle, desc: 'Tarea personalizada asignada por administrador' })} disabled={!customTaskTitle}>Asignar Personalizada</ActionButton>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
