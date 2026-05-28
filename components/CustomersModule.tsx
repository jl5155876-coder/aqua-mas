
import React, { useState, useRef } from 'react';
import { Customer, GarrafonType } from '../types';
import { useERPData } from '../hooks/useERPData';
import { ModuleHeader, RoundedCard, ActionButton } from './ui/Cards';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

const GARRAFON_TYPES: { type: GarrafonType, color: string, label: string }[] = [
  { type: 'Aqua', color: 'bg-indigo-500', label: 'Aqua+' },
  { type: 'Bonafont', color: 'bg-orange-400', label: 'Bonafont' },
  { type: 'Ciel', color: 'bg-sky-400', label: 'Ciel' },
  { type: 'E-Pura', color: 'bg-blue-600', label: 'Epura' },
  { type: 'Generico', color: 'bg-slate-400', label: 'Genérico' }
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

  // --- LÓGICA DE NAVEGACIÓN INTELIGENTE ---
  const handleBackNavigation = () => {
    if (editingCustomer || viewingHistory) {
      setEditingCustomer(null);
      setViewingHistory(null);
    } else {
      onBack();
    }
  };

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
      address: editingCustomer.address || '',
      specialPrice: editingCustomer.specialPrice || undefined,
      garrafonType: editingCustomer.garrafonType || 'Generico',
      jugsOnLoan: editingCustomer.jugsOnLoan || 0,
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

    const onSuccess = (position: GeolocationPosition) => {
        // Al setear el estado, React re-renderiza y el botón cambiará a modo "Bloqueado" automáticamente
        setEditingCustomer(prev => prev ? ({
          ...prev,
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }) : null);
    };

    const onError = (error: GeolocationPositionError) => {
        console.error("GPS Error:", error);
        if(btn) {
          btn.innerHTML = '<i class="fas fa-triangle-exclamation"></i> Reintentar';
          btn.classList.remove('opacity-50', 'pointer-events-none');
        }
        alert(`No se pudo obtener la ubicación precise (Error ${error.code}). Verifica que el GPS esté encendido.`);
    };

    // Intento 1: Alta Precisión
    navigator.geolocation.getCurrentPosition(
      onSuccess,
      () => {
        console.warn("High accuracy failed, trying low accuracy...");
        // Intento 2: Baja Precisión (Fallback)
        navigator.geolocation.getCurrentPosition(onSuccess, onError, { 
            enableHighAccuracy: false, 
            timeout: 10000, 
            maximumAge: 0 
        });
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
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

  const handleExportCSV = async () => {
    const headers = ["ID", "Nombre", "Alias", "Telefono", "Direccion", "Saldo", "Precio Especial", "Tipo Garrafon", "Garrafones Prestados", "Lat", "Lng"];
    const rows = customers.map(c => [
      c.id,
      `"${c.name}"`,
      `"${c.alias}"`,
      c.phone || '',
      `"${c.address || ''}"`,
      c.balance,
      c.specialPrice || '',
      c.garrafonType || 'Generico',
      c.jugsOnLoan || 0,
      c.lat || '',
      c.lng || ''
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const fileName = `Clientes_Aqua_${new Date().getTime()}.csv`;

    try {
        // Intento 1: Guardar en Sistema de Archivos (Android/iOS)
        await Filesystem.writeFile({
            path: fileName,
            data: csvContent,
            directory: Directory.Documents,
            encoding: Encoding.UTF8
        });
        alert('Archivo CSV guardado exitosamente en la carpeta "Documentos" de tu dispositivo.');
    } catch (e) {
        console.warn("Filesystem write failed, falling back to browser download", e);
        
        // Intento 2: Descarga Web Clásica (Fallback)
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
  };

  // Helper para extraer dirección
  const extractAddress = (contact: any) => {
      if (contact.address && contact.address.length > 0) {
          const a = contact.address[0];
          // Intenta obtener la línea de dirección, o combina ciudad/estado
          if (a.addressLine) return Array.isArray(a.addressLine) ? a.addressLine.join(', ') : a.addressLine;
          return [a.street, a.city, a.region].filter(Boolean).join(', ');
      }
      return '';
  };

  // --- IMPORTAR CONTACTOS (BULK) ---
  const handleImportContacts = async () => {
    const nav = navigator as any;
    
    // Verificar soporte de la API de Selección de Contactos (Chrome Android / PWA)
    if ('contacts' in nav && 'select' in nav.contacts) {
      try {
        const props = ['name', 'tel', 'address'];
        const opts = { multiple: true };
        
        const contacts = await nav.contacts.select(props, opts);
        
        if (contacts.length > 0) {
           const newCustomers: Customer[] = contacts.map((c: any) => ({
             id: Math.random().toString(36).substr(2, 9),
             name: c.name[0] || 'Desconocido',
             alias: c.name[0] || 'Desconocido',
             phone: c.tel ? c.tel[0] : '',
             address: extractAddress(c),
             balance: 0,
             garrafonType: 'Generico'
           }));
           
           importCustomers(newCustomers);
           alert(`Se importaron ${newCustomers.length} contactos exitosamente.`);
        }
      } catch (ex) {
        console.log("Importación cancelada o fallida:", ex);
      }
    } else {
      alert("Tu dispositivo no soporta la selección directa de contactos. Por favor usa la opción de 'Importar CSV' o agrega manualmente.");
    }
  };

  // --- SELECCIONAR CONTACTO INDIVIDUAL (FORM) ---
  const handlePickContactForForm = async () => {
    const nav = navigator as any;
    if ('contacts' in nav && 'select' in nav.contacts) {
      try {
        const props = ['name', 'tel', 'address'];
        const opts = { multiple: false };
        
        const contacts = await nav.contacts.select(props, opts);
        
        if (contacts.length > 0) {
           const c = contacts[0];
           const name = c.name ? c.name[0] : '';
           const phone = c.tel ? c.tel[0] : '';
           const address = extractAddress(c);

           setEditingCustomer(prev => ({
               ...prev,
               name: name || prev?.name,
               alias: name || prev?.alias,
               phone: phone || prev?.phone,
               address: address || prev?.address
           }));
        }
      } catch (ex) {
        console.log("Selección cancelada", ex);
      }
    } else {
        alert("La selección de contactos no está disponible en este navegador/dispositivo.");
    }
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

        if (file.name.toLowerCase().endsWith('.csv')) {
          const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
          if (lines.length > 0) {
            const headerLine = lines[0].toLowerCase();
            const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
            
            const idxNombre = headers.findIndex(h => h.includes('nombre'));
            const idxAlias = headers.findIndex(h => h.includes('alias') || h.includes('comercial'));
            const idxTelefono = headers.findIndex(h => h.includes('telefono') || h.includes('celular') || h.includes('whatsapp'));
            const idxDireccion = headers.findIndex(h => h.includes('direccion') || h.includes('domicilio'));
            const idxSaldo = headers.findIndex(h => h.includes('saldo'));
            const idxPrecio = headers.findIndex(h => h.includes('precio'));

            lines.slice(1).forEach(line => {
              if (!line.trim()) return;
              const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
              const finalName = (idxNombre !== -1 ? cols[idxNombre] : '') || (idxAlias !== -1 ? cols[idxAlias] : '') || 'Importado';
              const finalAlias = (idxAlias !== -1 ? cols[idxAlias] : '') || finalName;

              if (finalAlias) {
                newCustomers.push({
                  id: Math.random().toString(36).substr(2, 9),
                  name: finalName,
                  alias: finalAlias,
                  phone: idxTelefono !== -1 ? cols[idxTelefono] : '',
                  address: idxDireccion !== -1 ? cols[idxDireccion] : '',
                  balance: idxSaldo !== -1 ? (parseFloat(cols[idxSaldo]) || 0) : 0,
                  specialPrice: idxPrecio !== -1 ? (parseFloat(cols[idxPrecio]) || undefined) : undefined,
                  garrafonType: 'Generico',
                });
                importedCount++;
              }
            });
          }
        }

        if (importedCount > 0) {
          importCustomers(newCustomers);
          alert(`¡Éxito! Se importaron ${importedCount} clientes.`);
        } else {
          alert("No se encontraron datos válidos en el CSV.");
        }
      } catch (err) {
        alert("Error al procesar el archivo.");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // --- UI RENDER ---

  if (viewingHistory) {
    const customerSales = sales.filter(s => s.customerId === viewingHistory.id);
    const hasDebt = viewingHistory.balance > 0;
    const hasCredit = viewingHistory.balance < 0;
    const garrafon = GARRAFON_TYPES.find(g => g.type === (viewingHistory.garrafonType || 'Generico'));

    return (
      <div className="h-full bg-sky-50 overflow-y-auto no-scrollbar pb-24">
        <ModuleHeader title={`Perfil: ${viewingHistory.alias}`} onBack={handleBackNavigation} />
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

          {viewingHistory.address && (
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-sky-50 flex items-start gap-3">
              <i className="fas fa-map-location-dot text-sky-300 mt-1"></i>
              <div>
                 <span className="text-[9px] font-black text-sky-400 uppercase block mb-1">Dirección Registrada</span>
                 <p className="text-sm font-bold text-sky-900 leading-tight">{viewingHistory.address}</p>
              </div>
            </div>
          )}

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

          {/* Preferencia de Garrafón Visualización */}
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-sky-50 flex items-center justify-between">
              <div>
                  <span className="text-[9px] font-black text-sky-400 uppercase block mb-1">Envases en Poder</span>
                  <p className="text-sm font-bold text-sky-900 flex items-center gap-2">
                    <span className="text-2xl">{viewingHistory.jugsOnLoan || 0}</span>
                    <span className={`text-[10px] text-white px-2 py-0.5 rounded uppercase ${garrafon?.color || 'bg-slate-400'}`}>{garrafon?.label || 'Genérico'}</span>
                  </p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${garrafon?.color || 'bg-slate-400'}`}>
                  <i className="fas fa-bottle-water"></i>
              </div>
          </div>

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
        <ModuleHeader title={editingCustomer.id ? "Editar Perfil" : "Nuevo Cliente"} onBack={handleBackNavigation} />
        <div className="px-6 space-y-5">
          <div className="space-y-4">
            
            {/* --- BOTÓN CARGA RÁPIDA DE CONTACTOS --- */}
            <div className="flex justify-end">
                <button onClick={handlePickContactForForm} className="text-[9px] font-bold text-sky-500 flex items-center gap-1 bg-white px-4 py-2 rounded-full shadow-sm active:scale-95 transition-transform border border-sky-100">
                   <i className="fas fa-address-book"></i> Cargar de Agenda
                </button>
            </div>

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
            <div>
               <label className="text-[10px] font-black text-sky-400 uppercase ml-3 mb-1 block">Dirección / Domicilio</label>
               <input className="w-full bg-white p-5 rounded-[2rem] outline-none shadow-sm text-sky-900 focus:ring-2 ring-sky-300 transition-all" placeholder="Calle, Número, Colonia..." value={editingCustomer.address || ''} onChange={e => setEditingCustomer({...editingCustomer, address: e.target.value})}/>
            </div>
            
            {/* Sección de Geolocalización Actualizada */}
            <div>
               <label className="text-[10px] font-black text-sky-400 uppercase ml-3 mb-1 block">Ubicación de Entrega</label>
               <div className="flex gap-2">
                 {editingCustomer.lat && editingCustomer.lng ? (
                    // ESTADO BLOQUEADO: Se muestra cuando ya hay coordenadas
                    <>
                       <div className="flex-1 bg-emerald-50 text-emerald-600 p-4 rounded-[2rem] font-bold text-[10px] uppercase flex items-center justify-center gap-2 border border-emerald-100 shadow-sm">
                          <i className="fas fa-lock"></i> GPS Asignado
                       </div>
                       
                       {/* Botón para Desbloquear/Borrar */}
                       <button
                         onClick={() => {
                            if(confirm("¿Desbloquear ubicación para actualizar?")) {
                                setEditingCustomer(prev => ({...prev, lat: undefined, lng: undefined}));
                            }
                         }}
                         className="w-14 bg-white border border-slate-100 text-slate-400 rounded-[1.5rem] flex items-center justify-center text-lg active:scale-90 transition-transform shadow-sm"
                         title="Cambiar Ubicación"
                       >
                         <i className="fas fa-pen text-xs"></i>
                       </button>
                    </>
                 ) : (
                    // ESTADO CAPTURA: Se muestra cuando no hay coordenadas
                    <button 
                      id="gps-btn"
                      onClick={handleGetLocation} 
                      className="flex-1 bg-sky-50 text-sky-600 p-4 rounded-[2rem] font-bold text-[10px] uppercase flex items-center justify-center gap-2 border border-sky-100 shadow-sm active:scale-95 transition-all"
                    >
                      <i className="fas fa-location-crosshairs"></i> Capturar GPS
                    </button>
                 )}

                 {/* Botón Mapa (Siempre visible si existen coordenadas) */}
                 {editingCustomer?.lat && (
                   <button 
                     onClick={() => openGoogleMaps(editingCustomer.lat, editingCustomer.lng)} 
                     className="w-14 bg-white border border-sky-100 text-sky-500 rounded-[1.5rem] flex items-center justify-center text-lg active:scale-90 transition-transform shadow-sm"
                   >
                     <i className="fas fa-map-location-dot text-red-500"></i>
                   </button>
                 )}
               </div>
            </div>

            {/* Selector de Marca de Garrafón */}
            <div>
               <label className="text-[10px] font-black text-sky-400 uppercase ml-3 mb-1 block">Marca de Garrafón Preferida</label>
               <div className="bg-white p-3 rounded-[2rem] shadow-sm border border-slate-50">
                 <div className="flex flex-wrap gap-2">
                    {GARRAFON_TYPES.map(g => {
                       const isSelected = editingCustomer.garrafonType === g.type;
                       return (
                         <button
                           key={g.type}
                           onClick={() => setEditingCustomer({...editingCustomer, garrafonType: g.type})}
                           className={`flex-1 min-w-[30%] py-3 px-2 rounded-2xl text-[9px] font-black uppercase transition-all flex flex-col items-center gap-1 border ${
                             isSelected 
                               ? `${g.color} text-white border-transparent shadow-md transform scale-105` 
                               : 'bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100'
                           }`}
                         >
                           <i className={`fas ${isSelected ? 'fa-check-circle' : 'fa-circle'} opacity-50`}></i>
                           {g.label}
                         </button>
                       );
                    })}
                 </div>
               </div>
            </div>

            <div className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-50 space-y-4">
               <div>
                 <label className="text-[10px] font-black text-sky-400 uppercase ml-3 mb-1 block">Garrafones en Préstamo (Inicial/Ajuste)</label>
                 <div className="flex items-center gap-4 bg-sky-50 p-2 rounded-2xl">
                    <button 
                      onClick={() => setEditingCustomer(prev => ({...prev, jugsOnLoan: Math.max(0, (prev?.jugsOnLoan || 0) - 1)}))}
                      className="w-10 h-10 bg-white rounded-xl shadow-sm text-sky-600 flex items-center justify-center font-black active:scale-90 transition-transform"
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      className="flex-1 bg-transparent text-center font-black text-2xl text-sky-900 outline-none"
                      value={editingCustomer.jugsOnLoan || 0}
                      onChange={e => setEditingCustomer({...editingCustomer, jugsOnLoan: parseInt(e.target.value) || 0})}
                    />
                    <button 
                      onClick={() => setEditingCustomer(prev => ({...prev, jugsOnLoan: (prev?.jugsOnLoan || 0) + 1}))}
                      className="w-10 h-10 bg-sky-600 rounded-xl shadow-lg text-white flex items-center justify-center font-black active:scale-90 transition-transform"
                    >
                      +
                    </button>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-[10px] font-black text-sky-400 uppercase ml-3 mb-1 block">Precio Especial</label>
                     <input type="number" className="w-full bg-sky-50 p-4 rounded-2xl outline-none font-black text-sky-600 text-lg focus:ring-2 ring-sky-300" placeholder="0.00" value={editingCustomer.specialPrice || ''} onChange={e => setEditingCustomer({...editingCustomer, specialPrice: Number(e.target.value)})}/>
                  </div>
                  <div>
                     <label className="text-[10px] font-black text-sky-400 uppercase ml-3 mb-1 block">Saldo (Deuda)</label>
                     <input type="number" className="w-full bg-sky-50 p-4 rounded-2xl outline-none font-black text-sky-900 text-lg focus:ring-2 ring-sky-300" placeholder="0.00" value={editingCustomer.balance || ''} onChange={e => setEditingCustomer({...editingCustomer, balance: Number(e.target.value)})}/>
                  </div>
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
      <ModuleHeader title="Directorio" onBack={handleBackNavigation} />
      <div className="px-6 space-y-4">
        
        {/* PANEL DE HERRAMIENTAS DE DATOS */}
        <div className="bg-indigo-600 rounded-[2.5rem] p-6 text-white shadow-lg shadow-indigo-200">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-black uppercase tracking-tight">Base de Datos</h4>
            <i className="fas fa-database opacity-50"></i>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={handleImportContacts} className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl flex flex-col items-center gap-2 transition-colors">
               <i className="fas fa-mobile-screen-button text-xl"></i>
               <span className="text-[8px] font-bold uppercase text-center">Desde Agenda</span>
            </button>
            <button onClick={handleExportCSV} className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl flex flex-col items-center gap-2 transition-colors">
               <i className="fas fa-file-export text-xl"></i>
               <span className="text-[8px] font-bold uppercase text-center">Exportar CSV</span>
            </button>
            <label className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl flex flex-col items-center gap-2 transition-colors cursor-pointer relative">
               <i className="fas fa-file-import text-xl"></i>
               <span className="text-[8px] font-bold uppercase text-center">Importar CSV</span>
               <input 
                 type="file" 
                 ref={fileInputRef}
                 accept=".csv" 
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
                    {c.alias ? c.alias.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div>
                    <h4 className="font-black text-sky-900 leading-tight">{c.alias}</h4>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {c.address && (
                         <span className="bg-violet-100 text-violet-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                           <i className="fas fa-map-pin text-[8px]"></i> {c.address.slice(0, 10)}...
                         </span>
                      )}
                      {c.balance > 0 && (
                        <span className="bg-red-100 text-red-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase border border-red-200">
                          Adeudo: ${c.balance}
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
