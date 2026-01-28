import React, { useState } from 'react';
import { useERPData } from '../hooks/useERPData';
import { ModuleHeader, RoundedCard, ActionButton } from './ui/Cards';
import { Employee, ViewType, TicketConfig } from '../types';

export const SettingsModule: React.FC<{ onBack: () => void; currentUser: Employee }> = ({ onBack, currentUser }) => {
  const { employees, saveEmployee, ticketConfig, setTicketConfig } = useERPData();
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [editingTicket, setEditingTicket] = useState(false);
  const [tempTicket, setTempTicket] = useState<TicketConfig>(ticketConfig);

  const modules: { id: ViewType; label: string; icon: string }[] = [
    { id: 'pos', label: 'Ventas', icon: 'fa-cash-register' },
    { id: 'customers', label: 'Clientes', icon: 'fa-users' },
    { id: 'logistics', label: 'Logística', icon: 'fa-truck-fast' },
    { id: 'whatsapp', label: 'Preventa', icon: 'fa-brands fa-whatsapp' },
    { id: 'production', label: 'Planta', icon: 'fa-industry' },
    { id: 'employees', label: 'Equipo', icon: 'fa-id-card' },
    { id: 'reports', label: 'Reportes', icon: 'fa-chart-pie' },
    { id: 'sync', label: 'Nube Sync', icon: 'fa-cloud' },
    { id: 'settings', label: 'Ajustes', icon: 'fa-gear' },
  ];

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 200000) {
        alert("La imagen es muy pesada. Intenta con una menor a 200kb.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempTicket({ ...tempTicket, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveTicketConfig = () => {
    setTicketConfig(tempTicket);
    setEditingTicket(false);
    alert("Identidad del ticket actualizada correctamente.");
  };

  if (editingTicket) {
    return (
      <div className="h-full bg-sky-50 animate-fadeIn overflow-y-auto no-scrollbar pb-32">
        <ModuleHeader title="Identidad del Ticket" onBack={() => setEditingTicket(false)} />
        <div className="px-6 space-y-6">
           
           {/* Vista Previa del Logo */}
           <div className="flex flex-col items-center justify-center py-6">
              <label className="relative group cursor-pointer">
                <div className="w-32 h-32 bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center overflow-hidden border-4 border-white ring-4 ring-sky-100">
                  {tempTicket.logoUrl ? (
                    <img src={tempTicket.logoUrl} className="w-full h-full object-contain p-4" alt="Preview Logo" />
                  ) : (
                    <i className="fas fa-image text-sky-100 text-5xl"></i>
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleLogoUpload} 
                  className="hidden" 
                />
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-sky-600 text-white rounded-2xl flex items-center justify-center shadow-lg pointer-events-none">
                  <i className="fas fa-camera text-sm"></i>
                </div>
              </label>
              <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest mt-6">Logotipo de la Empresa</p>
           </div>

           <RoundedCard className="space-y-5">
              <h4 className="text-[10px] font-black text-sky-300 uppercase tracking-widest border-b border-sky-50 pb-2">Información Básica</h4>
              
              <div className="grid grid-cols-1 gap-4">
                 <div>
                    <label className="text-[9px] font-black text-sky-400 uppercase tracking-widest ml-1 mb-1 block">Nombre Comercial</label>
                    <input className="w-full bg-sky-50 p-4 rounded-2xl outline-none font-bold text-sky-900 focus:ring-2 ring-sky-200" value={tempTicket.businessName} onChange={e => setTempTicket({...tempTicket, businessName: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[9px] font-black text-sky-400 uppercase tracking-widest ml-1 mb-1 block">Slogan (Opcional)</label>
                    <input className="w-full bg-sky-50 p-4 rounded-2xl outline-none font-bold text-sky-900 focus:ring-2 ring-sky-200" value={tempTicket.slogan || ''} onChange={e => setTempTicket({...tempTicket, slogan: e.target.value})} placeholder="Ej: Pureza en cada gota" />
                 </div>
                 <div>
                    <label className="text-[9px] font-black text-sky-400 uppercase tracking-widest ml-1 mb-1 block">RFC / Registro</label>
                    <input className="w-full bg-sky-50 p-4 rounded-2xl outline-none font-bold text-sky-900 focus:ring-2 ring-sky-200" value={tempTicket.rfc} onChange={e => setTempTicket({...tempTicket, rfc: e.target.value})} />
                 </div>
              </div>
           </RoundedCard>

           <RoundedCard className="space-y-5">
              <h4 className="text-[10px] font-black text-sky-300 uppercase tracking-widest border-b border-sky-50 pb-2">Contacto y Ubicación</h4>
              
              <div className="grid grid-cols-1 gap-4">
                 <div>
                    <label className="text-[9px] font-black text-sky-400 uppercase tracking-widest ml-1 mb-1 block">Dirección Completa</label>
                    <textarea className="w-full bg-sky-50 p-4 rounded-2xl outline-none font-bold text-sky-900 h-24 focus:ring-2 ring-sky-200" value={tempTicket.address} onChange={e => setTempTicket({...tempTicket, address: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-[9px] font-black text-sky-400 uppercase tracking-widest ml-1 mb-1 block">Teléfono</label>
                       <input className="w-full bg-sky-50 p-4 rounded-2xl outline-none font-bold text-sky-900 focus:ring-2 ring-sky-200" value={tempTicket.phone} onChange={e => setTempTicket({...tempTicket, phone: e.target.value})} />
                    </div>
                    <div>
                       <label className="text-[9px] font-black text-sky-400 uppercase tracking-widest ml-1 mb-1 block">Sitio Web</label>
                       <input className="w-full bg-sky-50 p-4 rounded-2xl outline-none font-bold text-sky-900 focus:ring-2 ring-sky-200" value={tempTicket.website || ''} onChange={e => setTempTicket({...tempTicket, website: e.target.value})} placeholder="www..." />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-[9px] font-black text-sky-400 uppercase tracking-widest ml-1 mb-1 block">Redes Sociales</label>
                       <input className="w-full bg-sky-50 p-4 rounded-2xl outline-none font-bold text-sky-900 focus:ring-2 ring-sky-200" value={tempTicket.socialMedia || ''} onChange={e => setTempTicket({...tempTicket, socialMedia: e.target.value})} placeholder="@user" />
                    </div>
                    <div>
                       <label className="text-[9px] font-black text-sky-400 uppercase tracking-widest ml-1 mb-1 block">Email</label>
                       <input className="w-full bg-sky-50 p-4 rounded-2xl outline-none font-bold text-sky-900 focus:ring-2 ring-sky-200" value={tempTicket.email || ''} onChange={e => setTempTicket({...tempTicket, email: e.target.value})} placeholder="contacto@..." />
                    </div>
                 </div>
              </div>
           </RoundedCard>

           <RoundedCard className="space-y-5">
              <h4 className="text-[10px] font-black text-sky-300 uppercase tracking-widest border-b border-sky-50 pb-2">Personalización del Pie</h4>
              
              <div className="grid grid-cols-1 gap-4">
                 <div>
                    <label className="text-[9px] font-black text-sky-400 uppercase tracking-widest ml-1 mb-1 block">Mensaje de Agradecimiento</label>
                    <input className="w-full bg-sky-50 p-4 rounded-2xl outline-none font-bold text-sky-900 focus:ring-2 ring-sky-200" value={tempTicket.footerMessage} onChange={e => setTempTicket({...tempTicket, footerMessage: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[9px] font-black text-sky-400 uppercase tracking-widest ml-1 mb-1 block">Nota Adicional (Ej: Políticas de Cambio)</label>
                    <input className="w-full bg-sky-50 p-4 rounded-2xl outline-none font-bold text-sky-900 focus:ring-2 ring-sky-200" value={tempTicket.extraNote || ''} onChange={e => setTempTicket({...tempTicket, extraNote: e.target.value})} />
                 </div>
              </div>
           </RoundedCard>

           <div className="flex gap-4 pb-10">
              <button onClick={() => setEditingTicket(false)} className="flex-1 bg-white text-sky-400 py-6 rounded-[2rem] font-black uppercase text-xs">Cancelar</button>
              <button onClick={handleSaveTicketConfig} className="flex-[2] bg-sky-600 text-white py-6 rounded-[2rem] font-black uppercase text-xs shadow-xl shadow-sky-100">Guardar Cambios</button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-sky-50 overflow-y-auto no-scrollbar pb-32">
      <ModuleHeader title="Configuración" onBack={onBack} />
      <div className="px-6 space-y-6">
        
        {/* Ticket Identity Card (Only for Admin) */}
        {currentUser.role === 'Administrador' && (
          <RoundedCard onClick={() => setEditingTicket(true)} className="border-l-4 border-l-sky-600 shadow-md">
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center">
                      <i className="fas fa-id-card"></i>
                   </div>
                   <div>
                      <h4 className="font-black text-sky-900 text-sm">Identidad del Ticket</h4>
                      <p className="text-[9px] font-bold text-sky-400 uppercase">Logo, Datos y Pie de página</p>
                   </div>
                </div>
                <div className="bg-sky-50 px-3 py-1 rounded-full">
                  <i className="fas fa-pen text-sky-400 text-[10px]"></i>
                </div>
             </div>
          </RoundedCard>
        )}

        {/* Permission Management (Only for Admin) */}
        {currentUser.role === 'Administrador' && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <i className="fas fa-shield-halved text-sky-400 text-xs"></i>
              <h4 className="text-[10px] font-black uppercase text-sky-400 tracking-widest">Gestión de Permisos</h4>
            </div>
            <div className="space-y-3">
              {employees.map(emp => (
                <div key={emp.id} className="space-y-2">
                  <button onClick={() => setSelectedEmp(selectedEmp?.id === emp.id ? null : emp)} className={`w-full bg-white p-5 rounded-[2rem] shadow-sm flex items-center justify-between transition-all ${selectedEmp?.id === emp.id ? 'ring-2 ring-sky-300' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-xs"><i className="fas fa-user"></i></div>
                      <span className="font-black text-sky-900 text-xs">{emp.name}</span>
                    </div>
                    <i className={`fas fa-chevron-down text-sky-200 transition-transform ${selectedEmp?.id === emp.id ? 'rotate-180' : ''}`}></i>
                  </button>
                  {selectedEmp?.id === emp.id && (
                    <div className="bg-white/50 p-6 rounded-[2.5rem] grid grid-cols-2 gap-2 animate-fadeIn">
                      {modules.map(mod => (
                        <button key={mod.id} onClick={() => saveEmployee({ ...emp, permissions: emp.permissions.includes(mod.id) ? emp.permissions.filter(p => p !== mod.id) : [...emp.permissions, mod.id] })} className={`flex items-center gap-2 p-3 rounded-2xl transition-all ${emp.permissions.includes(mod.id) ? 'bg-sky-600 text-white shadow-md' : 'bg-white text-sky-300 border border-sky-50'}`}>
                          <i className={`fas ${mod.icon} text-[10px]`}></i>
                          <span className="text-[9px] font-black uppercase tracking-tighter">{mod.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <i className="fas fa-gear text-sky-400 text-xs"></i>
            <h4 className="text-[10px] font-black uppercase text-sky-400 tracking-widest">Sistema</h4>
          </div>
          <RoundedCard>
            <div className="flex justify-between items-center mb-3">
               <span className="text-xs font-bold text-sky-600">Sincronización Nube</span>
               <div className="w-10 h-6 bg-sky-600 rounded-full relative"><div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div></div>
            </div>
            <p className="text-[10px] text-sky-300 italic leading-relaxed font-bold">Respaldo automático vía internet (Firebase).</p>
          </RoundedCard>
        </section>

        <div className="pt-6">
          <button onClick={() => window.location.reload()} className="w-full bg-sky-100 text-sky-600 py-6 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all">
            <i className="fas fa-rotate"></i> Reiniciar Aplicación
          </button>
        </div>
      </div>
    </div>
  );
};