
import React, { useState, useRef } from 'react';
import { Customer, GarrafonType } from '../types';
import { useERPData } from '../hooks/useERPData';
import { ModuleHeader, RoundedCard, ActionButton } from './ui/Cards';

const GARRAFON_TYPES: { type: GarrafonType, color: string }[] = [
  { type: 'Aqua', color: 'bg-blue-500' },
  { type: 'Bonafont', color: 'bg-orange-500' },
  { type: 'Ciel', color: 'bg-sky-400' },
  { type: 'E-Pura', color: 'bg-red-500' },
  { type: 'Generico', color: 'bg-slate-400' }
];

export const CustomersModule: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { customers, saveCustomer, deleteCustomer, sales, importCustomers } = useERPData();
  const [search, setSearch] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);
  const [viewingHistory, setViewingHistory] = useState<Customer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.alias.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = () => {
    if (!editingCustomer?.name || !editingCustomer?.alias) {
      alert("Nombre y Alias son obligatorios.");
      return;
    }
    const customerToSave: Customer = {
      id: editingCustomer.id || Math.random().toString(36).substr(2, 9),
      name: editingCustomer.name,
      alias: editingCustomer.alias,
      phone: editingCustomer.phone || '',
      specialPrice: editingCustomer.specialPrice || undefined,
      garrafonType: editingCustomer.garrafonType || 'Generico',
      balance: editingCustomer.balance || 0,
      lat: editingCustomer.lat,
      lng: editingCustomer.lng,
    };
    saveCustomer(customerToSave);
    setEditingCustomer(null);
  };

  const handleDelete = () => {
    if (!editingCustomer?.id) return;
    const confirmDelete = window.confirm(
      `¿Estás seguro de eliminar a "${editingCustomer.alias}"?\n\nEsta acción eliminará el registro del cliente permanentemente. Su historial de ventas se mantendrá como anónimo.`
    );
    if (confirmDelete) {
      deleteCustomer(editingCustomer.id);
      setEditingCustomer(null);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Tu dispositivo no soporta geolocalización.");
      return;
    }
    
    const btn = document.getElementById('gps-btn');
    if(btn) {
       btn.innerHTML = '<i class="fas fa-circle-notch animate-spin"></i> Obteniendo...';
       btn.classList.add('opacity-50', 'pointer-events-none');
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setEditingCustomer(prev => prev ? ({
          ...prev,
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }) : null);
        
        if(btn) {
          btn.innerHTML = '<i class="fas fa-check"></i> Ubicación Capturada';
          btn.classList.remove('opacity-50', 'pointer-events-none', 'bg-emerald-50', 'text-emerald-600');
          btn.classList.add('bg-emerald-500', 'text-white');
          setTimeout(() => {
             btn.innerHTML = '<i class="fas fa-location-crosshairs"></i> Actualizar GPS';
             btn.classList.remove('bg-emerald-500', 'text-white');
             btn.classList.add('bg-emerald-50', 'text-emerald-600');
          }, 3000);
        }
      },
      (error) => {
        console.error(error);
        alert("Error al obtener ubicación. Asegúrate de dar permisos de ubicación a la app.");
        if(btn) {
          btn.innerHTML = '<i class="fas fa-triangle-exclamation"></i> Error';
          btn.classList.remove('opacity-50', 'pointer-events-none');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const openGoogleMaps = (lat?: number, lng?: number) => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
    } else {
      alert("Este cliente no tiene ubicación registrada.");
    }
  };

  // --- LOGICA DE EXPORTACIÓN E IMPORTACIÓN ---

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const headers = ["ID", "Nombre", "Alias", "Telefono", "Saldo", "Precio Especial", "Tipo Garrafon", "Lat", "Lng"];
    const rows = customers.map(c => [
      c.id,
      `"${c.name}"`,
      `"${c.alias}"`,
      c.phone || '',
      c.balance,
      c.specialPrice || '',
      c.garrafonType || 'Generico',
      c.lat || '',
      c.lng || ''
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csvContent, `Clientes_Aqua_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  };

  const handleExportVCard = () => {
    let vCardContent = '';
    customers.forEach(c => {
      vCardContent += 'BEGIN:VCARD\nVERSION:3.0\n';
      vCardContent += `FN:Aqua - ${c.alias}\n`;
      vCardContent += `N:Aqua;${c.alias};;;\n`;
      if (c.phone) vCardContent += `TEL;TYPE=CELL:${c.phone}\n`;
      vCardContent += `NOTE:Cliente Aqua+. Saldo: $${c.balance}. Tipo: ${c.garrafonType}\n`;
      vCardContent += 'END:VCARD\n';
    });
    downloadFile(vCardContent, `Contactos_Aqua_${new Date().toISOString().split('T')[0]}.vcf`, 'text/vcard');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        let importedCount = 0;
        const newCustomers: Customer[] = [];

        if (file.name.endsWith('.csv')) {
          // Importar CSV
          const lines = text.split('\n');
          lines.slice(1).forEach(line => {
            if (!line.trim()) return;
            const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim()); // Basic CSV parsing
            if (cols.length >= 3) {
              newCustomers.push({
                id: cols[0] || Math.random().toString(36).substr(2, 9),
                name: cols[1],
                alias: cols[2],
                phone: cols[3],
                balance: parseFloat(cols[4]) || 0,
                specialPrice: parseFloat(cols[5]) || undefined,
                garrafonType: (cols[6] as any) || 'Generico',
                lat: parseFloat(cols[7]) || undefined,
                lng: parseFloat(cols[8]) || undefined
              });
              importedCount++;
            }
          });
        } else if (file.name.endsWith('.vcf') || file.name.endsWith('.vcard')) {
          // Importar vCard (Básico)
          const vcards = text.split('BEGIN:VCARD');
          vcards.forEach(vc => {
            const fnMatch = vc.match(/FN:(.*)/);
            const telMatch = vc.match(/TEL.*:(.*)/);
            if (fnMatch) {
              const name = fnMatch[1].trim();
              const phone = telMatch ? telMatch[1].trim().replace(/[^0-9+]/g, '') : undefined;
              newCustomers.push({
                id: Math.random().toString(36).substr(2, 9),
                name: name,
                alias: name.replace('Aqua - ', ''), // Remove prefix if re-importing
                phone: phone,
                balance: 0,
                garrafonType: 'Generico'
              });
              importedCount++;
            }
          });
        }

        if (importedCount > 0) {
          importCustomers(newCustomers);
          alert(`¡Éxito! Se importaron ${importedCount} clientes.`);
        } else {
          alert("No se encontraron datos válidos para importar.");
        }
      } catch (err) {
        alert("Error al procesar el archivo. Verifique el formato.");
        console.error(err);
      }
      // Limpiar input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // --- FIN LÓGICA IMPORT/EXPORT ---

  if (viewingHistory) {
    const customerSales = sales.filter(s => s.customerId === viewingHistory.id);
    const hasDebt = viewingHistory.balance > 0;
    const hasCredit = viewingHistory.balance < 0;

    return (
      <div className="h-full bg-sky-50 overflow-y-auto no-scrollbar pb-24">
        <ModuleHeader title={`Perfil: ${viewingHistory.alias}`} onBack={() => setViewingHistory(null)} />
        <div className="px-6 space-y-4">
          <RoundedCard className={`${hasDebt ? 'bg-red-500' : hasCredit ? 'bg-emerald-500' : 'bg-sky-600'} text-white shadow-lg border-none transition-colors duration-500`}>
             <div className="flex justify-between items-center">
                <div>
                   <span className="text-[10px] font-black uppercase opacity-70">
                     {hasDebt ? 'Estado: Adeudo' : hasCredit ? 'Estado: Saldo a Favor' : 'Estado: Al Corriente'}
                   </span>
                   <p className="text-3xl font-black">
                     ${Math.abs(viewingHistory.balance).toLocaleString()}
                   </p>
                </div>
                <div className="bg-white/20 p-4 rounded-2xl">
                   <i className={`fas ${hasDebt ? 'fa-hand-holding-dollar' : 'fa-piggy-bank'} text-2xl`}></i>
                </div>
             </div>
          </RoundedCard>

          <div className="grid grid-cols-2 gap-3">
             <div className="bg-white p-4 rounded-3xl shadow-sm border border-sky-50">
                <span className="text-[9px] font-black text-sky-400 uppercase block mb-1">WhatsApp</span>
                <p className="text-xs font-bold text-sky-900">{viewingHistory.phone || 'No registrado'}</p>
             </div>
             <div className="bg-white p-4 rounded-3xl shadow-sm border border-sky-50">
                <span className="text-[9px] font-black text-sky-400 uppercase block mb-1">Precio Esp.</span>
                <p className="text-xs font-bold text-sky-900">{viewingHistory.specialPrice ? `$${viewingHistory.specialPrice}` : 'Precio Base'}</p>
             </div>
          </div>
          
          {viewingHistory.lat && viewingHistory.lng && (
             <button 
               onClick={() => openGoogleMaps(viewingHistory.lat, viewingHistory.lng)}
               className="w-full py-4 bg-white border border-sky-100 rounded-[2rem] flex items-center justify-center gap-2 shadow-sm text-sky-600 font-black uppercase text-[10px] active:scale-95 transition-all"
             >
               <i className="fas fa-map-location-dot text-lg text-red-500"></i>
               Ver Ubicación en Mapa
             </button>
          )}

          <h4 className="text-[10px] font-black uppercase text-sky-400 tracking-widest px-2 mt-4">Transacciones Recientes</h4>
          {customerSales.length === 0 ? (
            <div className="text-center py-20 text-sky-300 italic animate-fadeIn">Sin compras registradas aún.</div>
          ) : (
            customerSales.map(s => (
              <RoundedCard key={s.id} className="py-5 border-none shadow-sm animate-fadeIn">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-sky-900 font-black">{s.id}</span>
                    <p className="text-[10px] text-sky-400 font-bold uppercase">{new Date(s.timestamp).toLocaleDateString()}</p>
                  </div>
                  <span className="font-black text-sky-600 text-xl">${s.total}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {s.items.map(i => <span key={i.id} className="bg-sky-50 text-sky-600 text-[8px] px-3 py-1 rounded-full font-black uppercase">{i.quantity}x {i.name}</span>)}
                </div>
              </RoundedCard>
            ))
          )}
        </div>
      </div>
    );
  }

  if (editingCustomer) {
    return (
      <div className="h-full bg-sky-50 overflow-y-auto no-scrollbar pb-32">
        <ModuleHeader title={editingCustomer.id ? "Editar Perfil" : "Nuevo Cliente"} onBack={() => setEditingCustomer(null)} />
        <div className="px-6 space-y-5">
          <div className="space-y-4">
            <div>
               <label className="text-[10px] font-black text-sky-400 uppercase ml-3 mb-1 block">Nombre Comercial / Alias</label>
               <input className="w-full bg-white p-5 rounded-[2rem] outline-none shadow-sm font-bold text-sky-900 focus:ring-2 ring-sky-300 transition-all" placeholder="Ej: Doña Mary" value={editingCustomer.alias || ''} onChange={e => setEditingCustomer({...editingCustomer, alias: e.target.value})}/>
            </div>
            <div>
               <label className="text-[10px] font-black text-sky-400 uppercase ml-3 mb-1 block">Nombre Legal</label>
               <input className="w-full bg-white p-5 rounded-[2rem] outline-none shadow-sm text-sky-900 focus:ring-2 ring-sky-300 transition-all" placeholder="Ej: María de los Angeles" value={editingCustomer.name || ''} onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})}/>
            </div>
            <div>
               <label className="text-[10px] font-black text-sky-400 uppercase ml-3 mb-1 block">WhatsApp</label>
               <input className="w-full bg-white p-5 rounded-[2rem] outline-none shadow-sm text-sky-900 focus:ring-2 ring-sky-300 transition-all" placeholder="33..." value={editingCustomer.phone || ''} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})}/>
            </div>
            
            {/* Sección de Geolocalización */}
            <div>
               <label className="text-[10px] font-black text-sky-400 uppercase ml-3 mb-1 block">Ubicación de Entrega (Pin Google Maps)</label>
               <div className="flex gap-2">
                 <button 
                   id="gps-btn"
                   onClick={handleGetLocation} 
                   className="flex-1 bg-emerald-50 text-emerald-600 p-4 rounded-[2rem] font-bold text-[10px] uppercase flex items-center justify-center gap-2 border border-emerald-100 shadow-sm active:scale-95 transition-all"
                 >
                   <i className="fas fa-location-crosshairs"></i> Capturar GPS Actual
                 </button>
                 {editingCustomer?.lat && (
                   <button 
                     onClick={() => openGoogleMaps(editingCustomer.lat, editingCustomer.lng)} 
                     className="w-14 bg-sky-50 text-sky-500 rounded-[1.5rem] flex items-center justify-center text-lg active:scale-90 transition-transform shadow-sm"
                   >
                     <i className="fas fa-map-location-dot text-red-500"></i>
                   </button>
                 )}
               </div>
               {editingCustomer.lat !== undefined && editingCustomer.lng !== undefined && (
                 <div className="mt-2 px-4 flex gap-4 text-[9px] font-mono font-bold text-sky-400 bg-white/50 py-2 rounded-xl border border-white">
                   <span>Lat: {editingCustomer.lat.toFixed(6)}</span>
                   <span>Lng: {editingCustomer.lng.toFixed(6)}</span>
                 </div>
               )}
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-sky-400 ml-3 block">Tipo de Garrafón Preferido</label>
              <div className="grid grid-cols-2 gap-3">
                {GARRAFON_TYPES.map(g => (
                  <button 
                    key={g.type}
                    onClick={() => setEditingCustomer({...editingCustomer, garrafonType: g.type})}
                    className={`py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${editingCustomer.garrafonType === g.type ? `${g.color} text-white shadow-lg scale-[1.02]` : 'bg-white text-sky-400 shadow-sm border border-sky-50'}`}
                  >
                    <div className={`w-2 h-2 rounded-full ${editingCustomer.garrafonType === g.type ? 'bg-white' : g.color}`}></div>
                    {g.type}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                 <label className="text-[10px] font-black text-sky-400 uppercase ml-3 mb-1 block">Precio Especial</label>
                 <input type="number" className="w-full bg-white p-5 rounded-[2rem] outline-none shadow-sm font-black text-sky-600 text-xl focus:ring-2 ring-sky-300" placeholder="0.00" value={editingCustomer.specialPrice || ''} onChange={e => setEditingCustomer({...editingCustomer, specialPrice: Number(e.target.value)})}/>
              </div>
              <div>
                 <label className="text-[10px] font-black text-sky-400 uppercase ml-3 mb-1 block">Saldo (Pos=Adeudo)</label>
                 <input type="number" className="w-full bg-white p-5 rounded-[2rem] outline-none shadow-sm font-black text-sky-900 text-xl focus:ring-2 ring-sky-300" placeholder="0.00" value={editingCustomer.balance || ''} onChange={e => setEditingCustomer({...editingCustomer, balance: Number(e.target.value)})}/>
              </div>
            </div>
          </div>
          
          <div className="pt-4 space-y-3">
             <ActionButton onClick={handleSave}>Guardar Cliente</ActionButton>
             
             {editingCustomer.id && (
               <button 
                 onClick={handleDelete}
                 className="w-full py-4 text-rose-500 font-black uppercase text-[10px] tracking-widest bg-rose-50 rounded-[2rem] active:scale-95 transition-all border border-rose-100 shadow-sm hover:bg-rose-100"
               >
                 <i className="fas fa-trash-can mr-2"></i> Eliminar Cliente
               </button>
             )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-sky-50 overflow-y-auto no-scrollbar pb-24">
      <ModuleHeader title="Directorio" onBack={onBack} />
      <div className="px-6 space-y-4">
        
        {/* PANEL DE HERRAMIENTAS DE DATOS */}
        <div className="bg-indigo-600 rounded-[2.5rem] p-6 text-white shadow-lg shadow-indigo-200">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-black uppercase tracking-tight">Herramientas de Datos</h4>
            <i className="fas fa-database opacity-50"></i>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={handleExportCSV} className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl flex flex-col items-center gap-2 transition-colors">
               <i className="fas fa-file-csv text-xl"></i>
               <span className="text-[8px] font-bold uppercase text-center">CSV / Excel</span>
            </button>
            <button onClick={handleExportVCard} className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl flex flex-col items-center gap-2 transition-colors">
               <i className="fas fa-address-book text-xl"></i>
               <span className="text-[8px] font-bold uppercase text-center">Contactos</span>
            </button>
            <label className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl flex flex-col items-center gap-2 transition-colors cursor-pointer relative">
               <i className="fas fa-cloud-arrow-up text-xl"></i>
               <span className="text-[8px] font-bold uppercase text-center">Importar</span>
               <input 
                 type="file" 
                 ref={fileInputRef}
                 accept=".csv, .vcf, .vcard" 
                 className="absolute inset-0 opacity-0 cursor-pointer"
                 onChange={handleImportFile}
               />
            </label>
          </div>
        </div>

        <div className="relative">
          <input type="text" placeholder="Buscar por alias o teléfono..." className="w-full bg-white p-5 rounded-[2rem] outline-none shadow-sm focus:ring-2 ring-sky-300 font-medium" value={search} onChange={e => setSearch(e.target.value)}/>
          <i className="fas fa-search absolute right-6 top-1/2 -translate-y-1/2 text-sky-200"></i>
        </div>

        <div className="space-y-3">
          {filteredCustomers.map(c => (
            <RoundedCard key={c.id} className="py-5 border-none shadow-sm group hover:shadow-md transition-all active:scale-[0.98]">
              <div className="flex justify-between items-center">
                <div className="flex gap-4 items-center flex-1" onClick={() => setViewingHistory(c)}>
                  <div className={`w-14 h-14 rounded-3xl flex items-center justify-center text-white font-black text-xl shadow-lg transition-transform group-active:scale-90 ${GARRAFON_TYPES.find(g => g.type === c.garrafonType)?.color || 'bg-slate-400'}`}>
                    {c.alias[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-black text-sky-900 leading-tight">{c.alias}</h4>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <span className="bg-sky-100 text-sky-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">{c.garrafonType || 'Aqua'}</span>
                      {c.lat && c.lng && (
                         <span className="bg-emerald-100 text-emerald-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                           <i className="fas fa-map-pin text-[8px]"></i> GPS
                         </span>
                      )}
                      {c.balance > 0 && (
                        <span className="bg-red-100 text-red-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase border border-red-200">
                          Adeudo
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setViewingHistory(c)} className="w-10 h-10 bg-sky-50 text-sky-500 rounded-xl flex items-center justify-center text-sm active:bg-sky-200 transition-colors"><i className="fas fa-eye"></i></button>
                  <button onClick={() => setEditingCustomer(c)} className="w-10 h-10 bg-sky-50 text-sky-500 rounded-xl flex items-center justify-center text-sm active:bg-sky-200 transition-colors"><i className="fas fa-pen"></i></button>
                  <a href={`https://wa.me/52${c.phone}`} className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center text-sm active:bg-emerald-200 transition-colors"><i className="fab fa-whatsapp"></i></a>
                </div>
              </div>
            </RoundedCard>
          ))}
        </div>
        <button onClick={() => setEditingCustomer({})} className="w-full py-6 border-2 border-dashed border-sky-200 rounded-[2.5rem] text-sky-400 font-black text-sm uppercase hover:bg-white hover:text-sky-600 transition-all">+ Añadir Nuevo Cliente</button>
      </div>
    </div>
  );
};
