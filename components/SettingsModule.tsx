
import React, { useState, useRef } from 'react';
import { useERPData } from '../hooks/useERPData';
import { ModuleHeader, RoundedCard, ActionButton } from './ui/Cards';
import { Employee, ViewType, TicketConfig, ProductionConfig } from '../types';
import { BACKWASH_SEQUENCE, REGENERATION_SEQUENCE } from '../constants';

const COLORS = [
  { name: 'Sky', hex: '#0284c7' },
  { name: 'Rose', hex: '#e11d48' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Amber', hex: '#d97706' },
  { name: 'Indigo', hex: '#4f46e5' },
  { name: 'Slate', hex: '#0f172a' },
];

export const SettingsModule: React.FC<{ onBack: () => void; currentUser: Employee }> = ({ onBack, currentUser }) => {
  const { employees, saveEmployee, ticketConfig, setTicketConfig, productionConfig, setProductionConfig, resetSales, products, customers, sales, orders, vehicles, qualityRecords, tasks, attendance, savedReports, messages, syncData } = useERPData();
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [editingTicket, setEditingTicket] = useState(false);
  const [editingProduction, setEditingProduction] = useState(false);
  const [tempTicket, setTempTicket] = useState<TicketConfig>(ticketConfig);
  const [tempProduction, setTempProduction] = useState<ProductionConfig>(productionConfig);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const modules: { id: ViewType; label: string; icon: string }[] = [
    { id: 'pos', label: 'Ventas', icon: 'fa-cart-plus' },
    { id: 'orders', label: 'Pedidos', icon: 'fa-clipboard-list' },
    { id: 'customers', label: 'Clientes', icon: 'fa-users' },
    { id: 'inventory', label: 'Inventario', icon: 'fa-box-open' },
    { id: 'supplies', label: 'Insumos', icon: 'fa-boxes-stacked' },
    { id: 'logistics', label: 'Logística', icon: 'fa-truck-fast' },
    { id: 'whatsapp', label: 'Preventa', icon: 'fa-brands fa-whatsapp' },
    { id: 'messages', label: 'Mensajes', icon: 'fa-comments' },
    { id: 'production', label: 'Planta', icon: 'fa-industry' },
    { id: 'quality', label: 'Calidad', icon: 'fa-clipboard-check' },
    { id: 'scanner', label: 'Scanner', icon: 'fa-expand' },
    { id: 'employees', label: 'Equipo', icon: 'fa-id-card' },
    { id: 'reports', label: 'Reportes', icon: 'fa-chart-pie' },
    { id: 'tickets', label: 'Tickets', icon: 'fa-ticket' },
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

  const handleSaveProductionConfig = () => {
    setProductionConfig(tempProduction);
    setEditingProduction(false);
    alert("Configuración de planta actualizada correctamente.");
  };

  const handleResetProductionDefaults = () => {
    if(confirm("¿Estás seguro de restaurar los tiempos originales de fábrica? Se perderán las personalizaciones.")) {
        setTempProduction({
            backwashSequence: BACKWASH_SEQUENCE,
            regenerationSequence: REGENERATION_SEQUENCE,
            softenerVolumeFt3: 1.5,
            multimediaVolumeFt3: 1.5,
            carbonVolumeFt3: 1.5
        });
    }
  };

  const updateProductionTime = (type: 'backwash' | 'regen', index: number, newMinutes: number) => {
    const seconds = Math.max(0, newMinutes * 60);
    if (type === 'backwash') {
        const newSeq = [...tempProduction.backwashSequence];
        newSeq[index] = { ...newSeq[index], time: seconds };
        setTempProduction({ ...tempProduction, backwashSequence: newSeq });
    } else {
        const newSeq = [...tempProduction.regenerationSequence];
        newSeq[index] = { ...newSeq[index], time: seconds };
        setTempProduction({ ...tempProduction, regenerationSequence: newSeq });
    }
  };

  const handleResetSales = () => {
    if (confirm("⚠️ ¿Estás seguro de que quieres reiniciar las ventas?\n\nEsta acción eliminará TODOS los tickets del historial. No afecta clientes ni inventario.")) {
      if (confirm("🔴 ÚLTIMA ADVERTENCIA\n\nEsta acción NO se puede deshacer. ¿Proceder con el borrado?")) {
        resetSales();
      }
    }
  };

  // --- BACKUP LOGIC ---
  const handleExportData = () => {
    const backup = {
      timestamp: Date.now(),
      version: "1.0",
      data: {
        products, customers, sales, orders, employees, vehicles, ticketConfig, productionConfig, qualityRecords, tasks, attendance, savedReports, messages
      }
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `Respaldo_Aqua_${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.data) {
           if(confirm("¿Restaurar respaldo? Esto sobrescribirá los datos locales y sincronizará con la nube.")) {
             syncData(json.data);
             alert("Datos restaurados correctamente.");
           }
        } else {
          alert("Formato de archivo inválido. Falta estructura 'data'.");
        }
      } catch (err) {
        alert("Error al leer el archivo JSON.");
      }
    };
    reader.readAsText(file);
  };

  if (editingProduction) {
    return (
      <div className="h-full bg-slate-900 animate-fadeIn overflow-y-auto no-scrollbar pb-32 text-white">
        <ModuleHeader title="Configurar Planta" onBack={() => setEditingProduction(false)} />
        <div className="px-6 space-y-8">
           
           {/* Section 0: Equipment Specs */}
           <section>
              <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <i className="fas fa-microchip"></i> Especificaciones de Equipo
              </h4>
              <div className="space-y-3">
                 {/* Multimedia */}
                 <div className="bg-white/5 p-4 rounded-[2rem] border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-sky-500/20 rounded-xl flex items-center justify-center text-sky-400"><i className="fas fa-filter"></i></div>
                        <div>
                            <p className="text-xs font-black text-white uppercase">Filtro Multicama</p>
                            <p className="text-[9px] font-bold text-slate-400">Zeolita / Arena</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-black/20 p-2 rounded-xl border border-white/5">
                        <input 
                           type="number" step="0.5"
                           className="w-12 bg-transparent text-right font-black text-white outline-none"
                           value={tempProduction.multimediaVolumeFt3 || 1.5}
                           onChange={(e) => setTempProduction({...tempProduction, multimediaVolumeFt3: parseFloat(e.target.value) || 0})}
                        />
                        <span className="text-[9px] font-bold text-slate-500 uppercase mr-1">ft³</span>
                    </div>
                 </div>

                 {/* Carbon */}
                 <div className="bg-white/5 p-4 rounded-[2rem] border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-500/20 rounded-xl flex items-center justify-center text-slate-400"><i className="fas fa-gem"></i></div>
                        <div>
                            <p className="text-xs font-black text-white uppercase">Carbón Activado</p>
                            <p className="text-[9px] font-bold text-slate-400">Decloración</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-black/20 p-2 rounded-xl border border-white/5">
                        <input 
                           type="number" step="0.5"
                           className="w-12 bg-transparent text-right font-black text-white outline-none"
                           value={tempProduction.carbonVolumeFt3 || 1.5}
                           onChange={(e) => setTempProduction({...tempProduction, carbonVolumeFt3: parseFloat(e.target.value) || 0})}
                        />
                        <span className="text-[9px] font-bold text-slate-500 uppercase mr-1">ft³</span>
                    </div>
                 </div>

                 {/* Softener */}
                 <div className="bg-white/5 p-4 rounded-[2rem] border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400"><i className="fas fa-flask"></i></div>
                        <div>
                            <p className="text-xs font-black text-white uppercase">Suavizador</p>
                            <p className="text-[9px] font-bold text-slate-400">Resina Catiónica</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-black/20 p-2 rounded-xl border border-white/5">
                        <input 
                           type="number" step="0.5"
                           className="w-12 bg-transparent text-right font-black text-white outline-none"
                           value={tempProduction.softenerVolumeFt3 || 1.5}
                           onChange={(e) => setTempProduction({...tempProduction, softenerVolumeFt3: parseFloat(e.target.value) || 0})}
                        />
                        <span className="text-[9px] font-bold text-slate-500 uppercase mr-1">ft³</span>
                    </div>
                 </div>
              </div>
              <p className="text-[9px] text-slate-500 mt-2 px-2 leading-relaxed">
                 Define el tamaño de los tanques (en pies cúbicos) para el registro de activos de planta.
              </p>
           </section>

           {/* Section 1: Backwash */}
           <section>
              <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <i className="fas fa-water"></i> Secuencia Retrolavado
              </h4>
              <div className="space-y-3">
                 {tempProduction.backwashSequence.map((step, idx) => (
                    <div key={idx} className="bg-white/5 p-4 rounded-3xl border border-white/10 flex items-center justify-between">
                       <div>
                          <p className="text-xs font-black text-white uppercase">{step.stage}</p>
                          <p className="text-[9px] font-bold text-sky-400 uppercase tracking-wide">{step.process}</p>
                       </div>
                       <div className="flex items-center gap-3">
                          <button 
                            onClick={() => updateProductionTime('backwash', idx, (step.time / 60) - 1)}
                            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
                          >
                            <i className="fas fa-minus text-xs"></i>
                          </button>
                          <div className="text-center w-12">
                             <span className="text-xl font-black">{step.time / 60}</span>
                             <p className="text-[8px] opacity-50 uppercase">Min</p>
                          </div>
                          <button 
                            onClick={() => updateProductionTime('backwash', idx, (step.time / 60) + 1)}
                            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
                          >
                            <i className="fas fa-plus text-xs"></i>
                          </button>
                       </div>
                    </div>
                 ))}
              </div>
           </section>

           {/* Section 2: Regeneration */}
           <section>
              <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <i className="fas fa-flask"></i> Secuencia Regeneración
              </h4>
              <div className="space-y-3">
                 {tempProduction.regenerationSequence.map((step, idx) => (
                    <div key={idx} className="bg-white/5 p-4 rounded-3xl border border-white/10 flex items-center justify-between">
                       <div>
                          <p className="text-xs font-black text-white uppercase">{step.stage}</p>
                          <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wide">{step.process}</p>
                       </div>
                       <div className="flex items-center gap-3">
                          <button 
                            onClick={() => updateProductionTime('regen', idx, (step.time / 60) - 1)}
                            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
                          >
                            <i className="fas fa-minus text-xs"></i>
                          </button>
                          <div className="text-center w-12">
                             <span className="text-xl font-black">{step.time / 60}</span>
                             <p className="text-[8px] opacity-50 uppercase">Min</p>
                          </div>
                          <button 
                            onClick={() => updateProductionTime('regen', idx, (step.time / 60) + 1)}
                            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
                          >
                            <i className="fas fa-plus text-xs"></i>
                          </button>
                       </div>
                    </div>
                 ))}
              </div>
           </section>

           <div className="space-y-4 pb-10 pt-4">
              <div className="flex gap-4">
                <button onClick={() => setEditingProduction(false)} className="flex-1 bg-white/10 text-white/50 py-5 rounded-[2rem] font-black uppercase text-xs">Cancelar</button>
                <button onClick={handleSaveProductionConfig} className="flex-[2] bg-sky-500 text-white py-5 rounded-[2rem] font-black uppercase text-xs shadow-xl shadow-sky-500/20">Guardar Cambios</button>
              </div>
              <button onClick={handleResetProductionDefaults} className="w-full text-[10px] text-sky-400 font-bold uppercase hover:text-white transition-colors">
                 Restaurar valores de fábrica
              </button>
           </div>
        </div>
      </div>
    );
  }

  if (editingTicket) {
    return (
      <div className="h-full bg-slate-50 animate-fadeIn overflow-y-auto no-scrollbar pb-32">
        <ModuleHeader title="Personalizar Ticket" onBack={() => setEditingTicket(false)} />
        <div className="px-6 space-y-6">
           
           {/* Section 1: Visual Identity */}
           <div className="bg-white p-6 rounded-[2.5rem] shadow-sm space-y-6">
              <div className="flex flex-col items-center justify-center">
                  <label className="relative group cursor-pointer mb-4">
                    <div className="w-28 h-28 bg-slate-50 rounded-[2rem] shadow-inner flex items-center justify-center overflow-hidden border-4 border-white ring-2 ring-slate-100">
                      {tempTicket.logoUrl ? (
                        <img src={tempTicket.logoUrl} className="w-full h-full object-contain p-4 mix-blend-multiply" alt="Preview Logo" />
                      ) : (
                        <i className="fas fa-image text-slate-300 text-4xl"></i>
                      )}
                    </div>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-sky-500 text-white rounded-xl flex items-center justify-center shadow-lg pointer-events-none">
                      <i className="fas fa-camera text-xs"></i>
                    </div>
                  </label>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Logo (PNG/JPG)</p>
              </div>

              <div>
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-3 text-center">Color de Acento</label>
                 <div className="flex justify-center gap-3">
                    {COLORS.map(c => (
                       <button
                         key={c.name}
                         onClick={() => setTempTicket({...tempTicket, colorHex: c.hex})}
                         className={`w-8 h-8 rounded-full border-2 transition-transform ${tempTicket.colorHex === c.hex ? 'scale-125 border-slate-400 shadow-md' : 'border-transparent'}`}
                         style={{ backgroundColor: c.hex }}
                         title={c.name}
                       />
                    ))}
                 </div>
              </div>
           </div>

           {/* Section 2: Business Info */}
           <RoundedCard className="space-y-4">
              <h4 className="text-[10px] font-black text-sky-500 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                 <i className="fas fa-building"></i> Datos Fiscales
              </h4>
              <div className="grid grid-cols-1 gap-3">
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block">Nombre Comercial</label>
                    <input className="w-full bg-slate-50 p-3 rounded-xl outline-none font-bold text-slate-700 text-sm focus:ring-2 ring-sky-200" value={tempTicket.businessName} onChange={e => setTempTicket({...tempTicket, businessName: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block">Slogan</label>
                    <input className="w-full bg-slate-50 p-3 rounded-xl outline-none font-bold text-slate-700 text-sm focus:ring-2 ring-sky-200" value={tempTicket.slogan || ''} onChange={e => setTempTicket({...tempTicket, slogan: e.target.value})} placeholder="Ej: Pura Vida" />
                 </div>
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block">RFC</label>
                    <input className="w-full bg-slate-50 p-3 rounded-xl outline-none font-bold text-slate-700 text-sm focus:ring-2 ring-sky-200" value={tempTicket.rfc} onChange={e => setTempTicket({...tempTicket, rfc: e.target.value})} />
                 </div>
              </div>
           </RoundedCard>

           {/* Section 3: Contact */}
           <RoundedCard className="space-y-4">
              <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                 <i className="fas fa-address-book"></i> Contacto y Ubicación
              </h4>
              <div className="grid grid-cols-1 gap-3">
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block">Dirección</label>
                    <input className="w-full bg-slate-50 p-3 rounded-xl outline-none font-bold text-slate-700 text-sm focus:ring-2 ring-emerald-200" value={tempTicket.address} onChange={e => setTempTicket({...tempTicket, address: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block">Teléfono</label>
                    <input type="tel" className="w-full bg-slate-50 p-3 rounded-xl outline-none font-bold text-slate-700 text-sm focus:ring-2 ring-emerald-200" value={tempTicket.phone} onChange={e => setTempTicket({...tempTicket, phone: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block">Email</label>
                        <input type="email" className="w-full bg-slate-50 p-3 rounded-xl outline-none font-bold text-slate-700 text-xs focus:ring-2 ring-emerald-200" value={tempTicket.email || ''} onChange={e => setTempTicket({...tempTicket, email: e.target.value})} placeholder="hola@..." />
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block">Sitio Web</label>
                        <input type="url" className="w-full bg-slate-50 p-3 rounded-xl outline-none font-bold text-slate-700 text-xs focus:ring-2 ring-emerald-200" value={tempTicket.website || ''} onChange={e => setTempTicket({...tempTicket, website: e.target.value})} placeholder="www..." />
                    </div>
                 </div>
              </div>
           </RoundedCard>

           {/* Section 4: Footer */}
           <RoundedCard className="space-y-4">
              <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                 <i className="fas fa-paragraph"></i> Pie de Página
              </h4>
              <div className="grid grid-cols-1 gap-3">
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block">Mensaje de Despedida</label>
                    <textarea rows={2} className="w-full bg-slate-50 p-3 rounded-xl outline-none font-bold text-slate-700 text-xs focus:ring-2 ring-indigo-200 resize-none" value={tempTicket.footerMessage} onChange={e => setTempTicket({...tempTicket, footerMessage: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block">Nota Legal / Política</label>
                    <textarea rows={2} className="w-full bg-slate-50 p-3 rounded-xl outline-none font-bold text-slate-700 text-xs focus:ring-2 ring-indigo-200 resize-none" value={tempTicket.extraNote || ''} onChange={e => setTempTicket({...tempTicket, extraNote: e.target.value})} placeholder="Ej: No se aceptan devoluciones..." />
                 </div>
              </div>
           </RoundedCard>

           {/* Section 5: Hardware Settings (Paper Size & Visibility) */}
           <RoundedCard className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                  <i className="fas fa-print"></i> Configuración de Impresión
              </h4>
              <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block mb-2">Ancho de Papel</label>
                  <div className="flex bg-slate-50 p-1.5 rounded-2xl mb-4">
                    <button 
                      onClick={() => setTempTicket({...tempTicket, paperWidth: '58mm'})}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${tempTicket.paperWidth === '58mm' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-400'}`}
                    >
                      58mm (Portátil)
                    </button>
                    <button 
                      onClick={() => setTempTicket({...tempTicket, paperWidth: '80mm'})}
                      className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${tempTicket.paperWidth === '80mm' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-400'}`}
                    >
                      80mm (Estándar)
                    </button>
                  </div>

                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block mb-2">Elementos Visibles</label>
                  <div className="grid grid-cols-2 gap-2">
                     <button 
                       onClick={() => setTempTicket({...tempTicket, showLogo: !tempTicket.showLogo})}
                       className={`p-3 rounded-xl flex items-center justify-between border-2 transition-all ${tempTicket.showLogo !== false ? 'border-sky-500 bg-sky-50' : 'border-slate-100 bg-white'}`}
                     >
                       <span className={`text-[9px] font-black uppercase ${tempTicket.showLogo !== false ? 'text-sky-700' : 'text-slate-400'}`}>Mostrar Logo</span>
                       <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${tempTicket.showLogo !== false ? 'border-sky-500 bg-sky-500' : 'border-slate-300'}`}>
                          {tempTicket.showLogo !== false && <i className="fas fa-check text-white text-[8px]"></i>}
                       </div>
                     </button>

                     <button 
                       onClick={() => setTempTicket({...tempTicket, showQr: !tempTicket.showQr})}
                       className={`p-3 rounded-xl flex items-center justify-between border-2 transition-all ${tempTicket.showQr !== false ? 'border-sky-500 bg-sky-50' : 'border-slate-100 bg-white'}`}
                     >
                       <span className={`text-[9px] font-black uppercase ${tempTicket.showQr !== false ? 'text-sky-700' : 'text-slate-400'}`}>Mostrar QR</span>
                       <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${tempTicket.showQr !== false ? 'border-sky-500 bg-sky-500' : 'border-slate-300'}`}>
                          {tempTicket.showQr !== false && <i className="fas fa-check text-white text-[8px]"></i>}
                       </div>
                     </button>

                     <button 
                       onClick={() => setTempTicket({...tempTicket, showFooter: !tempTicket.showFooter})}
                       className={`p-3 rounded-xl flex items-center justify-between border-2 transition-all ${tempTicket.showFooter !== false ? 'border-sky-500 bg-sky-50' : 'border-slate-100 bg-white'}`}
                     >
                       <span className={`text-[9px] font-black uppercase ${tempTicket.showFooter !== false ? 'text-sky-700' : 'text-slate-400'}`}>Mostrar Pie Pag.</span>
                       <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${tempTicket.showFooter !== false ? 'border-sky-500 bg-sky-500' : 'border-slate-300'}`}>
                          {tempTicket.showFooter !== false && <i className="fas fa-check text-white text-[8px]"></i>}
                       </div>
                     </button>
                  </div>
              </div>
           </RoundedCard>

           <div className="flex gap-4 pb-10 pt-4">
              <button onClick={() => setEditingTicket(false)} className="flex-1 bg-white text-slate-400 py-5 rounded-[2rem] font-black uppercase text-xs border border-slate-200">Cancelar</button>
              <button onClick={handleSaveTicketConfig} className="flex-[2] bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-xs shadow-xl shadow-slate-300">Guardar Cambios</button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-sky-50 overflow-y-auto no-scrollbar pb-32">
      <ModuleHeader title="Configuración" onBack={onBack} />
      <div className="px-6 space-y-6">
        
        {currentUser.roles.includes('Administrador') && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <RoundedCard onClick={() => setEditingTicket(true)} className="border-none shadow-md cursor-pointer hover:bg-white/80 active:scale-[0.98] transition-all bg-white">
                 <div className="flex flex-col items-center text-center gap-2 py-2">
                    <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center text-xl"><i className="fas fa-ticket"></i></div>
                    <div>
                       <h4 className="font-black text-sky-900 text-xs">Identidad Ticket</h4>
                       <p className="text-[8px] font-bold text-sky-300 uppercase">Logo, Textos, PDF</p>
                    </div>
                 </div>
              </RoundedCard>

              <RoundedCard onClick={() => setEditingProduction(true)} className="border-none shadow-md cursor-pointer hover:bg-white/80 active:scale-[0.98] transition-all bg-white">
                 <div className="flex flex-col items-center text-center gap-2 py-2">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-xl"><i className="fas fa-industry"></i></div>
                    <div>
                       <h4 className="font-black text-sky-900 text-xs">Tiempos Planta</h4>
                       <p className="text-[8px] font-bold text-indigo-300 uppercase">Retrolavado, Regen</p>
                    </div>
                 </div>
              </RoundedCard>
            </div>
          </>
        )}

        {/* Data Management Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <i className="fas fa-database text-sky-400 text-xs"></i>
            <h4 className="text-[10px] font-black uppercase text-sky-400 tracking-widest">Respaldo Local</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleExportData} className="bg-white p-4 rounded-[2rem] shadow-sm flex flex-col items-center gap-2 active:scale-95 transition-all">
               <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center"><i className="fas fa-download"></i></div>
               <span className="text-[10px] font-bold text-slate-600 uppercase">Exportar Datos</span>
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="bg-white p-4 rounded-[2rem] shadow-sm flex flex-col items-center gap-2 active:scale-95 transition-all">
               <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center"><i className="fas fa-upload"></i></div>
               <span className="text-[10px] font-bold text-slate-600 uppercase">Restaurar Datos</span>
               <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportData} />
            </button>
          </div>
        </section>

        {currentUser.roles.includes('Administrador') && (
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

        {currentUser.roles.includes('Administrador') && (
          <section className="space-y-4">
             <div className="flex items-center gap-2 px-2">
               <i className="fas fa-triangle-exclamation text-red-400 text-xs"></i>
               <h4 className="text-[10px] font-black uppercase text-red-400 tracking-widest">Zona de Peligro</h4>
             </div>
             <button onClick={handleResetSales} className="w-full bg-white border border-red-100 text-red-500 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-sm active:bg-red-50 transition-all flex items-center justify-center gap-2">
               <i className="fas fa-trash-can"></i> Reiniciar Ventas
             </button>
          </section>
        )}

        {/* Info & Support */}
        <div className="text-center py-6">
           <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Aqua+ Fundadores Pro</p>
           <p className="text-[9px] text-slate-300">v3.5.0 Enterprise Edition</p>
           <p className="text-[8px] text-slate-200 mt-1">{localStorage.getItem('aqua_device_id') || 'ID Desconocido'}</p>
        </div>

        <div className="pt-2">
          <button onClick={() => window.location.reload()} className="w-full bg-sky-100 text-sky-600 py-6 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all">
            <i className="fas fa-rotate"></i> Reiniciar Aplicación
          </button>
        </div>
      </div>
    </div>
  );
};
