import React, { useState, useEffect, useRef } from 'react';
import { useERPData } from '../hooks/useERPData';
import { ModuleHeader, RoundedCard, ActionButton } from './ui/Cards';
import { Vehicle, Product, FuelRecord, Customer, Order } from '../types';
import L from 'leaflet';

// --- HELPER: ICONOS DE MAPA ---
const createIcon = (color: string, iconClass: string, size = 32) => {
    return L.divIcon({
        className: 'custom-marker-icon',
        html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.3); border: 2px solid white;">
                <i class="fas ${iconClass} text-white" style="font-size: ${size * 0.5}px"></i>
               </div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
    });
};

// --- MODALES (Carga y Combustible se mantienen igual para funcionalidad) ---
const LoadingModal = ({ vehicleId, onClose }: { vehicleId: string, onClose: () => void }) => {
  const { vehicles, products, loadVehicle, emptyJugsStock, loadEmptyJugs, unloadEmptyJugs } = useERPData();
  const vehicle = vehicles.find(v => v.id === vehicleId);
  if (!vehicle) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl max-h-[85vh] flex flex-col relative overflow-hidden">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div><h3 className="text-xl font-black text-sky-900">Cargar Unidad</h3><p className="text-[10px] text-sky-400 font-bold uppercase">{vehicle.description}</p></div>
          <button onClick={onClose} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400"><i className="fas fa-times"></i></button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1 pb-4">
          {/* Row for Empty Jugs */}
          <div className="bg-violet-50 p-4 rounded-[1.5rem] flex items-center justify-between border border-violet-100">
            <div>
              <p className="text-[10px] font-black text-violet-900 uppercase">Envases Vacíos</p>
              <span className="text-[8px] text-violet-400 font-bold">Planta: {emptyJugsStock}</span>
            </div>
            <div className="flex items-center gap-3 bg-white rounded-xl p-1">
              <button 
                onClick={() => unloadEmptyJugs(vehicle.id, 1)} 
                disabled={(vehicle.emptyJugs || 0) <= 0}
                className="w-8 h-8 bg-violet-100 text-violet-600 rounded-lg font-bold disabled:opacity-30"
              >-</button>
              <span className="font-black text-violet-900 w-6 text-center">{vehicle.emptyJugs || 0}</span>
              <button 
                onClick={() => loadEmptyJugs(vehicle.id, 1)} 
                disabled={emptyJugsStock <= 0}
                className="w-8 h-8 bg-violet-600 text-white rounded-lg font-bold shadow-lg shadow-violet-200 disabled:opacity-30"
              >+</button>
            </div>
          </div>

          {products.filter(p => p.category !== 'Insumos').map(p => {
            const inVehicle = vehicle.inventory?.find(i => i.id === p.id)?.quantity || 0;
            return (
              <div key={p.id} className="bg-sky-50 p-4 rounded-[1.5rem] flex items-center justify-between">
                <div><p className="text-[10px] font-black text-sky-900 uppercase">{p.name}</p><span className="text-[8px] text-sky-400 font-bold">Planta: {p.stock}</span></div>
                <div className="flex items-center gap-3 bg-white rounded-xl p-1">
                  <button onClick={() => loadVehicle(vehicle.id, p, -1)} className="w-8 h-8 bg-sky-100 text-sky-600 rounded-lg font-bold">-</button>
                  <span className="font-black text-sky-900 w-6 text-center">{inVehicle}</span>
                  <button onClick={() => loadVehicle(vehicle.id, p, 1)} className="w-8 h-8 bg-sky-600 text-white rounded-lg font-bold shadow-lg shadow-sky-200">+</button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-sky-100"><button onClick={onClose} className="w-full py-4 bg-emerald-500 text-white rounded-[1.5rem] font-black uppercase shadow-lg">Listo</button></div>
      </div>
    </div>
  );
};

const FuelModal = ({ vehicleId, onClose }: { vehicleId: string, onClose: () => void }) => {
  const { vehicles, addFuelRecord } = useERPData();
  const [fuelForm, setFuelForm] = useState<Partial<FuelRecord>>({});
  const handleAddFuel = () => {
    if (!fuelForm.mileage || !fuelForm.liters || !fuelForm.cost) return alert("Completa los campos");
    addFuelRecord(vehicleId, { id: Date.now().toString(), date: Date.now(), mileage: fuelForm.mileage, liters: fuelForm.liters, cost: fuelForm.cost, notes: fuelForm.notes } as FuelRecord);
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl">
        <h3 className="text-lg font-black text-sky-900 mb-4">Registro Combustible</h3>
        <div className="space-y-3 mb-4">
           <input type="number" className="w-full bg-slate-50 p-3 rounded-xl font-bold text-slate-700" placeholder="Kilometraje Actual" onChange={e => setFuelForm({...fuelForm, mileage: Number(e.target.value)})}/>
           <input type="number" className="w-full bg-slate-50 p-3 rounded-xl font-bold text-slate-700" placeholder="Litros" onChange={e => setFuelForm({...fuelForm, liters: Number(e.target.value)})}/>
           <input type="number" className="w-full bg-slate-50 p-3 rounded-xl font-bold text-slate-700" placeholder="Costo Total ($)" onChange={e => setFuelForm({...fuelForm, cost: Number(e.target.value)})}/>
        </div>
        <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-400 rounded-xl font-bold uppercase">Cancelar</button>
            <button onClick={handleAddFuel} className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-bold uppercase shadow-lg">Guardar</button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE DE MAPA REAL ---
const LogisticsMap = ({ customers, vehicles, orders, activeVehicleId }: { customers: Customer[], vehicles: Vehicle[], orders: Order[], activeVehicleId: string | null }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersLayer = useRef<any>(null);
  const routeLayer = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Inicializar Mapa
    if (!mapInstance.current) {
        mapInstance.current = L.map(mapRef.current, { zoomControl: false }).setView([20.6766, -103.3468], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(mapInstance.current);
        markersLayer.current = L.layerGroup().addTo(mapInstance.current);
        routeLayer.current = L.layerGroup().addTo(mapInstance.current);
    }

    const map = mapInstance.current;
    const layer = markersLayer.current;
    if (!layer) return;

    layer.clearLayers(); // Limpiar marcadores viejos

    // 1. Renderizar Planta (Centro Fijo)
    // En producción real, esto vendría de Settings. Usamos GDL centro por defecto.
    L.marker([20.6766, -103.3468], { icon: createIcon('#0ea5e9', 'fa-industry', 40) })
     .bindPopup("<b>Planta Matriz</b>")
     .addTo(layer);

    // 2. Renderizar Clientes (Solo los que tienen Geo)
    const bounds = L.latLngBounds([20.6766, -103.3468]);
    let hasPoints = false;

    customers.forEach(c => {
        if (c.lat && c.lng) {
            const hasDebt = c.balance > 0;
            const hasActiveOrder = orders.some(o => o.customerId === c.id && o.status !== 'entregado' && o.status !== 'cancelado');
            
            const color = hasActiveOrder ? '#f59e0b' : (hasDebt ? '#ef4444' : '#10b981');
            const iconClass = hasActiveOrder ? 'fa-box' : (hasDebt ? 'fa-hand-holding-dollar' : 'fa-user');

            L.marker([c.lat, c.lng], { icon: createIcon(color, iconClass, 28) })
             .bindPopup(`<b>${c.alias}</b><br/>${c.address}`)
             .addTo(layer);
            
            bounds.extend([c.lat, c.lng]);
            hasPoints = true;
        }
    });

    // 3. Renderizar Vehículos (SOLO SI TIENEN UBICACIÓN REAL)
    vehicles.forEach(v => {
        // En typescript v.lat puede no existir si no se ha definido en la interfaz extendida, 
        // pero en JS runtime existe si lo guardamos. Asumimos extension.
        const vAny = v as any; 
        if (vAny.lat && vAny.lng) {
            const isMe = v.id === activeVehicleId;
            const markerHtml = `
                <div style="position: relative;">
                    <div style="background-color: ${isMe ? '#6366f1' : '#f59e0b'}; width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
                        <i class="fas fa-truck text-white"></i>
                    </div>
                    ${isMe ? '<div style="position: absolute; top: -5px; right: -5px; width: 12px; height: 12px; background: #22c55e; border-radius: 50%; border: 2px solid white;"></div>' : ''}
                </div>
            `;

            const icon = L.divIcon({
                className: 'custom-vehicle-icon',
                html: markerHtml,
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            });

            L.marker([vAny.lat, vAny.lng], { icon, zIndexOffset: 1000 })
             .bindPopup(`
                <div class="text-center">
                    <p class="font-bold uppercase text-xs mb-1">${v.plate}</p>
                    <p class="text-[9px] text-slate-500">Última act: ${v.lastUpdated ? new Date(v.lastUpdated).toLocaleTimeString() : 'N/A'}</p>
                </div>
             `)
             .addTo(layer);
            
            bounds.extend([vAny.lat, vAny.lng]);
            hasPoints = true;
        }
    });

    if (hasPoints) {
        map.fitBounds(bounds, { padding: [50, 50] });
    }

  }, [customers, vehicles, orders, activeVehicleId]);

  return <div ref={mapRef} className="w-full h-full bg-slate-100 z-0" style={{ filter: 'contrast(0.95)' }} />;
};

export const LogisticsModule: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { vehicles, setVehicles, deleteVehicle, customers, orders, syncData } = useERPData();
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [editingVehicle, setEditingVehicle] = useState<Partial<Vehicle> | null>(null);
  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
  
  // Modales
  const [loadingVehicleId, setLoadingVehicleId] = useState<string | null>(null);
  const [fuelVehicleId, setFuelVehicleId] = useState<string | null>(null);

  // GPS Watch ID reference
  const watchIdRef = useRef<number | null>(null);

  // Limpiar GPS al desmontar
  useEffect(() => {
    return () => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }
    };
  }, []);

  const startTracking = (vehicleId: string) => {
    if (!navigator.geolocation) return alert("GPS no disponible en este dispositivo.");
    
    // Detener tracking anterior si existe
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);

    setActiveVehicleId(vehicleId);
    alert(`📡 Iniciando transmisión de ubicación para unidad: ${vehicles.find(v => v.id === vehicleId)?.plate}`);

    const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude, heading, speed } = position.coords;
            
            // Actualización Optimista Local
            setVehicles((prev: Vehicle[]) => prev.map((v: Vehicle) => {
                if (v.id === vehicleId) {
                    return {
                        ...v,
                        // Extendemos el tipo Vehicle "on the fly" o asumimos que syncData lo maneja
                        lat: latitude,
                        lng: longitude,
                        heading: heading,
                        speed: speed,
                        lastUpdated: Date.now()
                    } as any;
                }
                return v;
            }));

            // La sincronización con la nube (SyncModule) se encargará de subir estos cambios 
            // si el auto-sync está activado o en el siguiente ciclo.
        },
        (error) => {
            console.error("GPS Error:", error);
        },
        options
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
    }
    setActiveVehicleId(null);
    alert("⏹️ Transmisión de ubicación detenida.");
  };

  const saveVehicle = () => {
    if (!editingVehicle?.plate || !editingVehicle?.description) return alert("Completa los datos.");
    setVehicles((prev: Vehicle[]) => {
      const exists = prev.find((v: Vehicle) => v.id === editingVehicle.id);
      if (exists) return prev.map((v: Vehicle) => v.id === editingVehicle.id ? { ...v, ...editingVehicle } as Vehicle : v);
      return [...prev, { ...editingVehicle, id: editingVehicle.id || Date.now().toString(), currentLoad: 0, inventory: [], fuelHistory: [] } as Vehicle];
    });
    setEditingVehicle(null);
  };

  if (editingVehicle) {
    return (
      <div className="h-full bg-sky-50 animate-fadeIn overflow-y-auto no-scrollbar pb-32">
        <ModuleHeader title={editingVehicle.id ? "Editar Unidad" : "Nueva Unidad"} onBack={() => setEditingVehicle(null)} />
        <div className="px-6 space-y-5">
           <input className="w-full bg-white p-5 rounded-[2rem] shadow-sm outline-none font-bold text-sky-900 text-sm focus:ring-2 ring-sky-300" placeholder="Placa / Identificador" value={editingVehicle.plate || ''} onChange={e => setEditingVehicle({...editingVehicle, plate: e.target.value})}/>
           <input className="w-full bg-white p-5 rounded-[2rem] shadow-sm outline-none font-bold text-sky-900 text-sm focus:ring-2 ring-sky-300" placeholder="Descripción (Ej: Nissan Blanca)" value={editingVehicle.description || ''} onChange={e => setEditingVehicle({...editingVehicle, description: e.target.value})}/>
           <div className="bg-white p-5 rounded-[2rem] shadow-sm">
              <label className="text-[10px] font-black text-sky-400 uppercase mb-2 block">Capacidad de Carga</label>
              <input type="number" className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-black text-sky-600 text-2xl text-center" value={editingVehicle.loadCapacity || ''} onChange={e => setEditingVehicle({...editingVehicle, loadCapacity: Number(e.target.value)})}/>
           </div>
           
           <ActionButton onClick={saveVehicle}>Guardar Unidad</ActionButton>
           
           {editingVehicle.id && (
             <button onClick={() => { if (confirm("¿Eliminar unidad?")) { deleteVehicle(editingVehicle.id!); setEditingVehicle(null); } }} className="w-full py-4 text-rose-500 font-black uppercase text-[10px] tracking-widest bg-rose-50 rounded-[2rem] border border-rose-100 shadow-sm active:scale-95 transition-all">
                Eliminar Unidad
             </button>
           )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-sky-50 overflow-y-auto no-scrollbar pb-24 relative flex flex-col">
      <ModuleHeader title="Centro Logístico" onBack={onBack} />
      
      {/* View Switcher */}
      <div className="px-6 flex gap-2 mb-4 shrink-0">
        <button onClick={() => setViewMode('list')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400'}`}>
            <i className="fas fa-list mr-2"></i> Flota
        </button>
        <button onClick={() => setViewMode('map')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'map' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400'}`}>
            <i className="fas fa-map-location-dot mr-2"></i> Mapa Real
        </button>
      </div>

      {viewMode === 'list' ? (
          <div className="px-6 space-y-6 flex-1 overflow-y-auto no-scrollbar pb-32">
            {/* PANEL DE MODO CHOFER */}
            <div className="bg-indigo-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-indigo-200">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">
                        <i className="fas fa-satellite-dish"></i>
                    </div>
                    <div>
                        <h3 className="font-black text-lg">Modo Chofer</h3>
                        <p className="text-[10px] opacity-70 font-bold uppercase tracking-wide">Transmisión GPS</p>
                    </div>
                </div>
                
                {activeVehicleId ? (
                    <div className="bg-white/10 p-4 rounded-2xl border border-white/20">
                        <p className="text-xs font-bold mb-2">Conduciendo: <span className="text-amber-300 uppercase">{vehicles.find(v => v.id === activeVehicleId)?.plate}</span></p>
                        <button onClick={stopTracking} className="w-full py-3 bg-red-500 rounded-xl font-black uppercase text-[10px] shadow-lg active:scale-95 transition-all">
                            Detener Transmisión
                        </button>
                    </div>
                ) : (
                    <div className="bg-white/10 p-4 rounded-2xl border border-white/20">
                        <p className="text-[10px] opacity-70 mb-3">Selecciona la unidad que estás conduciendo hoy para activar el rastreo en tiempo real.</p>
                        <select 
                            className="w-full bg-white text-indigo-900 p-3 rounded-xl font-bold text-xs outline-none mb-3"
                            onChange={(e) => { if(e.target.value) startTracking(e.target.value); }}
                            value=""
                        >
                            <option value="" disabled>Seleccionar Unidad...</option>
                            {vehicles.map(v => (
                                <option key={v.id} value={v.id}>{v.plate} - {v.description}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {vehicles.map(v => {
                const isActive = activeVehicleId === v.id;
                const hasLocation = (v as any).lat && (v as any).lng;

                return (
                    <RoundedCard key={v.id} className={`relative overflow-hidden border-none shadow-xl bg-white group p-0 ${isActive ? 'ring-2 ring-indigo-500' : ''}`}>
                        {isActive && <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[8px] font-black px-3 py-1 rounded-bl-xl z-10">TRANSMITIENDO</div>}
                        <div className="p-6 pb-4">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex gap-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-sky-700 to-slate-800 text-white rounded-[1.5rem] flex items-center justify-center text-2xl shadow-lg shadow-slate-300">
                                    <i className="fas fa-truck-pickup"></i>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest leading-none block mb-1">{v.plate}</span>
                                    <h3 className="text-xl font-black text-sky-900 leading-tight">{v.description}</h3>
                                    {hasLocation && <span className="text-[8px] text-emerald-500 font-bold flex items-center gap-1 mt-1"><i className="fas fa-signal"></i> GPS Activo</span>}
                                </div>
                                </div>
                                <div className="flex gap-2">
                                <button onClick={() => setFuelVehicleId(v.id)} className="w-10 h-10 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center hover:bg-amber-100 transition-colors shadow-sm"><i className="fas fa-gas-pump"></i></button>
                                <button onClick={() => setEditingVehicle(v)} className="w-10 h-10 bg-sky-50 text-sky-400 rounded-full flex items-center justify-center hover:bg-sky-100 transition-colors"><i className="fas fa-pen"></i></button>
                                </div>
                            </div>
                            
                            <div className="flex items-end justify-between mb-4">
                                <div>
                                <p className="text-[10px] font-black text-sky-400 uppercase tracking-tighter mb-1">Carga Actual</p>
                                <p className="text-4xl font-black text-sky-600 tracking-tighter">{v.currentLoad} <span className="text-xs font-bold text-sky-300 ml-1">/{v.loadCapacity}</span></p>
                                </div>
                                <button onClick={() => setLoadingVehicleId(v.id)} className="px-6 py-3 bg-sky-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-sky-200 active:scale-95 transition-all flex items-center gap-2">
                                <i className="fas fa-boxes-packing"></i> Cargar
                                </button>
                            </div>

                            {/* Inventory Tags */}
                            <div className="flex flex-wrap gap-2 mb-5">
                                {(!v.inventory || v.inventory.length === 0) ? (
                                <span className="text-[9px] font-bold text-slate-300 italic px-2">Unidad vacía</span>
                                ) : (
                                v.inventory.map(item => (
                                    <span key={item.id} className="bg-sky-50 text-sky-700 text-[8px] font-bold px-2 py-1 rounded-lg border border-sky-100 uppercase tracking-tight">
                                    {item.quantity}x {item.name.split(' ')[0]}
                                    </span>
                                ))
                                )}
                            </div>

                            {/* Gradient Progress Bar */}
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${Math.min((v.currentLoad/v.loadCapacity)*100, 100)}%` }}></div>
                            </div>
                        </div>
                    </RoundedCard>
                );
            })}
            
            <button onClick={() => setEditingVehicle({})} className="w-full py-7 border-2 border-dashed border-sky-200 rounded-[2.5rem] text-sky-400 font-black text-sm uppercase hover:bg-white hover:text-sky-600 transition-all flex items-center justify-center gap-2">
            <i className="fas fa-plus"></i> Nueva Unidad
            </button>
          </div>
      ) : (
          <div className="flex-1 px-4 pb-6 animate-fadeIn relative h-full">
             <div className="absolute top-0 left-4 z-10 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[9px] font-bold text-slate-500 shadow-sm border border-white/50">
                Mostrando solo unidades con GPS activo
             </div>
             <LogisticsMap customers={customers} vehicles={vehicles} orders={orders} activeVehicleId={activeVehicleId} />
          </div>
      )}

      {loadingVehicleId && <LoadingModal vehicleId={loadingVehicleId} onClose={() => setLoadingVehicleId(null)} />}
      {fuelVehicleId && <FuelModal vehicleId={fuelVehicleId} onClose={() => setFuelVehicleId(null)} />}
    </div>
  );
};