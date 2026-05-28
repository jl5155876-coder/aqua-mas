
import React, { useState } from 'react';
import { useERPData } from '../hooks/useERPData';
import { ModuleHeader, RoundedCard, ActionButton } from './ui/Cards';
import { Employee, ViewType, Task, Attendance, Role } from '../types';

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

const AVAILABLE_ROLES: Role[] = ['Administrador', 'Repartidor', 'Planta'];

export const EmployeesModule: React.FC<{ onBack: () => void; currentUser: Employee }> = ({ onBack, currentUser }) => {
  const { employees, saveEmployee, deleteEmployee, tasks, addTask, updateTaskStatus, updateTask, deleteTask, clearTasksByDate, attendance, recordAttendance } = useERPData();
  const [activeTab, setActiveTab] = useState<'roster' | 'assignments' | 'attendance'>('roster');
  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee> | null>(null);
  const [assigningTo, setAssigningTo] = useState<Employee | null>(null);
  const [customTaskTitle, setCustomTaskTitle] = useState('');
  
  // Validation States
  const [validatingTask, setValidatingTask] = useState<Task | null>(null);
  const [validationDate, setValidationDate] = useState('');
  
  // New state for task status on creation
  const [markAsCompleted, setMarkAsCompleted] = useState(false);

  // Custom Confirmation Modal State
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
    variant?: 'danger' | 'primary';
  }>({ isOpen: false, title: '', message: '', action: () => {}, variant: 'primary' });

  const isAdmin = currentUser.roles.includes('Administrador');
  
  // Robust Local Date
  const today = (() => {
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
  })();

  const rosterModules: { id: ViewType; label: string; icon: string }[] = [
    { id: 'pos', label: 'Ventas', icon: 'fa-cash-register' },
    { id: 'orders', label: 'Pedidos', icon: 'fa-clipboard-list' },
    { id: 'customers', label: 'Clientes', icon: 'fa-address-book' },
    { id: 'inventory', label: 'Inventario', icon: 'fa-box-open' },
    { id: 'supplies', label: 'Insumos', icon: 'fa-boxes-stacked' },
    { id: 'logistics', label: 'Flota', icon: 'fa-truck-moving' },
    { id: 'whatsapp', label: 'Preventa', icon: 'fa-brands fa-whatsapp' },
    { id: 'messages', label: 'Mensajes', icon: 'fa-comments' },
    { id: 'production', label: 'Producción', icon: 'fa-industry' },
    { id: 'quality', label: 'Bitácoras', icon: 'fa-book-medical' },
    { id: 'scanner', label: 'Scanner', icon: 'fa-qrcode' },
    { id: 'employees', label: 'Equipo', icon: 'fa-users-gear' },
    { id: 'reports', label: 'Reportes', icon: 'fa-chart-pie' },
    { id: 'tickets', label: 'Tickets', icon: 'fa-ticket' },
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

  const getTaskStats = (empId: string) => {
    const todaysTasks = tasks.filter(t => t.employeeId === empId && t.date === today);
    return {
      total: todaysTasks.length,
      pending: todaysTasks.filter(t => t.status === 'pendiente').length
    };
  };

  const handleSaveEmployee = () => {
    if (!editingEmployee?.name || !editingEmployee?.pin || !editingEmployee?.roles || editingEmployee.roles.length === 0) {
      alert("Nombre, PIN y al menos un Rol son obligatorios.");
      return;
    }
    const empToSave: Employee = {
      id: editingEmployee.id || `EMP-${Date.now().toString().slice(-4)}`,
      name: editingEmployee.name,
      roles: editingEmployee.roles,
      phone: editingEmployee.phone || '',
      pin: editingEmployee.pin,
      permissions: editingEmployee.permissions || ['dashboard']
    };
    saveEmployee(empToSave);
    setEditingEmployee(null);
  };

  const handleDeleteEmployee = () => {
    if (!editingEmployee?.id) return;
    if (editingEmployee.id === currentUser.id) {
        alert("No puedes eliminar tu propio usuario.");
        return;
    }
    
    setConfirmation({
        isOpen: true,
        title: "Eliminar Colaborador",
        message: `¿Estás seguro de eliminar a ${editingEmployee.name}? Esta acción es irreversible.`,
        variant: 'danger',
        action: () => {
            deleteEmployee(editingEmployee.id!);
            setEditingEmployee(null);
        }
    });
  };

  const togglePermission = (modId: ViewType) => {
    if (!editingEmployee) return;
    const currentPerms = editingEmployee.permissions || [];
    const newPerms = currentPerms.includes(modId)
      ? currentPerms.filter(p => p !== modId)
      : [...currentPerms, modId];
    setEditingEmployee({ ...editingEmployee, permissions: newPerms });
  };

  const toggleRole = (role: Role) => {
    if (!editingEmployee) return;
    const currentRoles = editingEmployee.roles || [];
    const newRoles = currentRoles.includes(role)
        ? currentRoles.filter(r => r !== role)
        : [...currentRoles, role];
    setEditingEmployee({ ...editingEmployee, roles: newRoles });
  };

  const handleAddTask = (preset: typeof TASK_PRESETS[0] | { title: string, desc: string }) => {
    if (!assigningTo) return;
    
    addTask({
      employeeId: assigningTo.id,
      title: preset.title,
      description: preset.desc,
      date: today,
      status: markAsCompleted ? 'completada' : 'pendiente'
    });
    setAssigningTo(null);
    setCustomTaskTitle('');
    setMarkAsCompleted(false); // Reset to default
  };

  const initiateValidation = (task: Task) => {
    if (isAdmin) {
        setValidatingTask(task);
        setValidationDate(today);
    } else {
        updateTaskStatus(task.id, 'completada');
    }
  };

  const confirmValidation = () => {
    if (validatingTask && validationDate) {
        updateTask({
            ...validatingTask,
            status: 'completada',
            date: validationDate
        });
        setValidatingTask(null);
    }
  };

  const handleClearDay = () => {
    setConfirmation({
        isOpen: true,
        title: "Limpiar Día",
        message: "ADVERTENCIA: ¿Eliminar TODAS las tareas asignadas para hoy?",
        variant: 'danger',
        action: () => {
            clearTasksByDate(today);
        }
    });
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
             
             <div>
                <label className="text-[10px] font-black text-sky-400 uppercase ml-3 mb-1 block">PIN de Acceso</label>
                <input maxLength={4} className="w-full bg-white p-5 rounded-[2rem] outline-none shadow-sm font-black text-sky-900 text-center tracking-[0.5em] focus:ring-2 ring-sky-300" placeholder="0000" value={editingEmployee.pin || ''} onChange={e => setEditingEmployee({...editingEmployee, pin: e.target.value})}/>
             </div>

             <section className="space-y-3">
                <label className="text-[10px] font-black text-sky-400 uppercase ml-3 block">Roles Asignados</label>
                <div className="flex flex-wrap gap-2">
                   {AVAILABLE_ROLES.map(role => {
                     const isSelected = editingEmployee.roles?.includes(role);
                     return (
                        <button 
                          key={role}
                          onClick={() => toggleRole(role)}
                          className={`flex-1 py-3 px-4 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all border ${isSelected ? `${getRoleColor(role)} text-white border-transparent shadow-lg` : 'bg-white text-slate-400 border-slate-100'}`}
                        >
                          {role}
                        </button>
                     );
                   })}
                </div>
             </section>

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
          
          <div className="pt-4 space-y-3">
             <ActionButton onClick={handleSaveEmployee}>Guardar Cambios</ActionButton>
             {editingEmployee.id && (
                <button 
                    onClick={handleDeleteEmployee}
                    className="w-full py-4 text-rose-500 font-black uppercase text-[10px] tracking-widest bg-rose-50 rounded-[1.5rem] border border-rose-100 shadow-sm active:scale-[0.97] transition-all flex items-center justify-center gap-2 hover:bg-rose-100"
                >
                    <i className="fas fa-trash-can"></i> Eliminar Colaborador
                </button>
             )}
          </div>
        </div>
        
        {/* Render Confirmation Modal inside editing view if needed */}
        {confirmation.isOpen && (
            <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn">
                <div className="bg-white rounded-[2rem] p-6 w-full max-w-xs shadow-2xl border border-white/50">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 mx-auto ${confirmation.variant === 'danger' ? 'bg-red-100 text-red-500' : 'bg-sky-100 text-sky-500'}`}>
                        <i className={`fas ${confirmation.variant === 'danger' ? 'fa-triangle-exclamation' : 'fa-circle-question'} text-2xl`}></i>
                    </div>
                    <h3 className="text-lg font-black text-slate-800 text-center mb-2">{confirmation.title}</h3>
                    <p className="text-xs font-medium text-slate-500 text-center mb-6 leading-relaxed">{confirmation.message}</p>
                    <div className="flex gap-3">
                        <button onClick={() => setConfirmation({ ...confirmation, isOpen: false })} className="flex-1 py-3 rounded-xl font-black text-[10px] uppercase bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors">Cancelar</button>
                        <button onClick={() => { confirmation.action(); setConfirmation({ ...confirmation, isOpen: false }); }} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase text-white shadow-lg active:scale-95 transition-all ${confirmation.variant === 'danger' ? 'bg-red-500 shadow-red-200' : 'bg-sky-500 shadow-sky-200'}`}>Confirmar</button>
                    </div>
                </div>
            </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full bg-sky-50 flex flex-col animate-fadeIn overflow-hidden pb-24 relative">
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
            <div className="bg-sky-900 text-white rounded-[2.5rem] p-6 shadow-xl flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-[2rem] flex items-center justify-center text-3xl">
                  <i className="fas fa-users-viewfinder"></i>
                </div>
                <div>
                  <h3 className="text-xl font-black">Capital Humano</h3>
                  <p className="text-[10px] font-bold uppercase opacity-60 tracking-widest">{employees.length} Colaboradores Activos</p>
                </div>
            </div>

            {employees.map(e => {
              const stats = getTaskStats(e.id);
              const mainRole = e.roles[0] || 'Planta';
              return (
                <RoundedCard key={e.id} className="py-4 border-none shadow-sm group">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 ${getRoleColor(mainRole)} text-white rounded-3xl flex items-center justify-center text-xl shadow-lg shadow-sky-100`}>
                        <i className={`fas ${mainRole === 'Administrador' ? 'fa-user-tie' : mainRole === 'Repartidor' ? 'fa-truck-fast' : 'fa-industry'}`}></i>
                      </div>
                      <div>
                        <h4 className="font-black text-sky-900 text-sm">{e.name}</h4>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {e.roles.map(r => (
                             <span key={r} className={`text-[8px] font-black uppercase text-white px-2 py-0.5 rounded-full ${getRoleColor(r)}`}>{r}</span>
                          ))}
                          {stats.total > 0 && (
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${stats.pending === 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                              {stats.pending > 0 ? `${stats.pending} Pendientes` : 'Todo Listo'}
                            </span>
                          )}
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
              );
            })}
            
            {isAdmin && (
              <button 
                onClick={() => setEditingEmployee({ roles: ['Repartidor'], permissions: ['dashboard'] })}
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
                <div className="flex justify-between items-center px-2">
                  <h4 className="text-[10px] font-black uppercase text-sky-400 tracking-widest">Asignar Tarea ({today})</h4>
                  <div className="flex gap-2">
                    <button onClick={handleClearDay} className="text-[9px] font-black uppercase bg-white text-rose-400 border border-rose-100 px-3 py-1.5 rounded-full flex items-center gap-1 active:scale-95 transition-transform">
                      <i className="fas fa-trash-can"></i> Limpiar
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {employees.filter(e => !e.roles.includes('Administrador') || e.roles.length > 1).map(e => (
                    <button key={e.id} onClick={() => setAssigningTo(e)} className="bg-white p-4 rounded-[1.8rem] border border-sky-50 flex items-center gap-3 active:scale-95 transition-all text-left">
                       <div className={`w-8 h-8 ${getRoleColor(e.roles[0])} rounded-xl flex items-center justify-center text-white text-[10px]`}><i className="fas fa-user"></i></div>
                       <span className="text-[10px] font-black text-sky-900 uppercase truncate">{e.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-4">
              <h4 className="text-[10px] font-black uppercase text-sky-400 tracking-widest px-2">Tareas de Hoy</h4>
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
                       <div className="flex items-center gap-2">
                         {/* UPDATE: Permitir que el admin complete tareas de otros o el usuario complete las suyas */}
                         {(t.employeeId === currentUser.id || isAdmin) && t.status === 'pendiente' && (
                           <button 
                             onClick={() => initiateValidation(t)} 
                             className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg shadow-emerald-100 active:scale-95 transition-transform"
                           >
                             {t.employeeId === currentUser.id ? 'Completar' : 'Validar'}
                           </button>
                         )}
                         {t.status === 'completada' && (
                           <span className="text-[10px] font-black text-emerald-600 uppercase">Lista <i className="fas fa-circle-check ml-1"></i></span>
                         )}
                         {isAdmin && (
                            <button onClick={() => deleteTask(t.id)} className="w-8 h-8 bg-rose-50 text-rose-400 rounded-xl flex items-center justify-center active:bg-rose-100 transition-colors">
                              <i className="fas fa-trash-can text-xs"></i>
                            </button>
                         )}
                       </div>
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
                  {employees.filter(e => !e.roles.includes('Administrador') || e.roles.length > 1).map(e => {
                    const record = attendance.find(a => a.employeeId === e.id && a.date === today);
                    return (
                      <div key={e.id} className="flex items-center justify-between p-3 bg-sky-50/50 rounded-2xl border border-sky-50">
                        <div className="flex items-center gap-3">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs ${getRoleColor(e.roles[0])} shadow-sm`}>
                              <i className="fas fa-user"></i>
                           </div>
                           <span className="text-xs font-black text-sky-900 uppercase truncate max-w-[100px]">{e.name.split(' ')[0]}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => recordAttendance(e.id, 'presente')} className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm transition-all ${record?.status === 'presente' ? 'bg-emerald-500 text-white shadow-md' : 'bg-white text-emerald-500 border border-emerald-100'}`} title="Presente"><i className="fas fa-check"></i></button>
                          <button onClick={() => recordAttendance(e.id, 'retardo')} className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm transition-all ${record?.status === 'retardo' ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-amber-500 border border-amber-100'}`} title="Retardo"><i className="fas fa-clock"></i></button>
                          <button onClick={() => recordAttendance(e.id, 'falta')} className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm transition-all ${record?.status === 'falta' ? 'bg-red-500 text-white shadow-md' : 'bg-white text-red-500 border border-red-100'}`} title="Falta"><i className="fas fa-times"></i></button>
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
              <div className="flex justify-between items-center mb-6">
                 <div>
                    <h3 className="text-xl font-black text-sky-900">Asignar Tarea</h3>
                    <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Para: {assigningTo.name}</p>
                 </div>
                 <button onClick={() => setAssigningTo(null)} className="w-12 h-12 bg-sky-50 text-sky-400 rounded-full flex items-center justify-center active:scale-90 transition-all"><i className="fas fa-times"></i></button>
              </div>

              {/* TOGGLE STATUS */}
              <div 
                className={`flex items-center gap-3 mb-6 p-4 rounded-[1.5rem] border transition-all cursor-pointer ${markAsCompleted ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`} 
                onClick={() => setMarkAsCompleted(!markAsCompleted)}
              >
                  <div className={`w-12 h-6 rounded-full p-1 transition-colors ${markAsCompleted ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${markAsCompleted ? 'translate-x-6' : ''}`}></div>
                  </div>
                  <div>
                      <span className={`text-[10px] font-black uppercase block ${markAsCompleted ? 'text-emerald-600' : 'text-slate-600'}`}>
                        {markAsCompleted ? 'Registrar como Completada' : 'Asignar como Pendiente'}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400">
                        {markAsCompleted ? 'Se guardará en el historial directamente' : 'El colaborador deberá marcarla'}
                      </span>
                  </div>
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

      {/* VALIDATION MODAL */}
      {validatingTask && (
        <div className="fixed inset-0 bg-sky-900/60 backdrop-blur-md z-[100] flex items-end">
           <div className="w-full bg-white rounded-t-[2.5rem] p-8 animate-fadeIn">
              <div className="flex justify-between items-center mb-6">
                 <div>
                    <h3 className="text-xl font-black text-sky-900">Validar Cumplimiento</h3>
                    <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Fecha de Realización</p>
                 </div>
                 <button onClick={() => setValidatingTask(null)} className="w-12 h-12 bg-sky-50 text-sky-400 rounded-full flex items-center justify-center active:scale-90 transition-all"><i className="fas fa-times"></i></button>
              </div>

              <div className="bg-sky-50 p-4 rounded-2xl mb-6">
                 <p className="font-black text-sky-900 text-sm mb-1">{validatingTask.title}</p>
                 <p className="text-[10px] text-sky-500 font-bold">Asignada originalmente: {validatingTask.date}</p>
              </div>

              <div className="space-y-4">
                 <label className="text-[10px] font-black text-slate-400 uppercase block ml-2">¿Cuándo se realizó?</label>
                 <input 
                    type="date" 
                    className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-sky-900 border border-slate-100 focus:ring-2 ring-sky-300"
                    value={validationDate}
                    onChange={(e) => setValidationDate(e.target.value)}
                 />
                 <ActionButton onClick={confirmValidation}>
                    Confirmar Cumplimiento
                 </ActionButton>
              </div>
           </div>
        </div>
      )}

      {/* GLOBAL CONFIRMATION MODAL */}
      {confirmation.isOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn">
            <div className="bg-white rounded-[2rem] p-6 w-full max-w-xs shadow-2xl border border-white/50">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 mx-auto ${confirmation.variant === 'danger' ? 'bg-red-100 text-red-500' : 'bg-sky-100 text-sky-500'}`}>
                    <i className={`fas ${confirmation.variant === 'danger' ? 'fa-triangle-exclamation' : 'fa-circle-question'} text-2xl`}></i>
                </div>
                <h3 className="text-lg font-black text-slate-800 text-center mb-2">{confirmation.title}</h3>
                <p className="text-xs font-medium text-slate-500 text-center mb-6 leading-relaxed">{confirmation.message}</p>
                <div className="flex gap-3">
                    <button onClick={() => setConfirmation({ ...confirmation, isOpen: false })} className="flex-1 py-3 rounded-xl font-black text-[10px] uppercase bg-slate-50 text-slate-400 hover:bg-slate-100 transition-colors">Cancelar</button>
                    <button onClick={() => { confirmation.action(); setConfirmation({ ...confirmation, isOpen: false }); }} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase text-white shadow-lg active:scale-95 transition-all ${confirmation.variant === 'danger' ? 'bg-red-500 shadow-red-200' : 'bg-sky-500 shadow-sky-200'}`}>Confirmar</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
