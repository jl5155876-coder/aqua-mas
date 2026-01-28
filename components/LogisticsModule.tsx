
import React, { useState } from 'react';
import { useERPData } from '../hooks/useERPData';
import { ModuleHeader, RoundedCard, ActionButton } from './ui/Cards';
import { Vehicle } from '../types';

export const LogisticsModule: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { vehicles, setVehicles, loadVehicle } = useERPData();
  const [editingVehicle, setEditingVehicle] = useState<Partial<Vehicle> | null>(null);

  const saveVehicle = () => {
    if (!editingVehicle?.plate || !editingVehicle?.description) return alert("Completa los datos.");
    setVehicles(prev => {
      const exists = prev.find(v => v.id === editingVehicle.id);
      if (exists) return prev.map(v => v.id === editingVehicle.id ? editingVehicle as Vehicle : v);
      return [...prev, { ...editingVehicle, id: Date.now().toString(), currentLoad: 0 } as Vehicle];
    });
    setEditingVehicle(null);
  };

  if (editingVehicle) {
    return (
      <div className="h-full bg-sky-50 animate-fadeIn">
        <ModuleHeader title={editingVehicle.id ? "Editar Vehículo" : "Nueva Unidad"} onBack={() => setEditingVehicle(null)} />
        <div className="px-6 space-y-5">
           <input className="w-full bg-white p-5 rounded-[2rem] shadow-sm outline-none font-bold" placeholder="Placa" value={editingVehicle.plate || ''} onChange={e => setEditingVehicle({...editingVehicle, plate: e.target.value})}/>
           <input className="w-full bg-white p-5 rounded-[2rem] shadow-sm outline-none font-bold" placeholder="Descripción (Ej: Nissan Blanca)" value={editingVehicle.description || ''} onChange={e => setEditingVehicle({...editingVehicle, description: e.target.value})}/>
           <div className="space-y-1">
              <label className="text-[10px] font-black text-sky-400 uppercase ml-4">Capacidad de Garrafones</label>
              <input type="number" className="w-full bg-white p-5 rounded-[2rem] shadow-sm outline-none font-black text-sky-600 text-xl" value={editingVehicle.loadCapacity || ''} onChange={e => setEditingVehicle({...editingVehicle, loadCapacity: Number(e.target.value)})}/>
           </div>
           <ActionButton onClick={saveVehicle}>Guardar Unidad</ActionButton>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-sky-50 overflow-y-auto no-scrollbar pb-24">
      <ModuleHeader title="Gestión de Flota" onBack={onBack} />
      <div className="px-6 space-y-6">
        <RoundedCard className="bg-sky-100/50 border-sky-200">
           <div className="flex items-start gap-4">
              <i className="fas fa-info-circle text-sky-500 mt-1"></i>
              <p className="text-[10px] font-bold text-sky-700 leading-tight">
                Nota: Al aumentar la carga de un vehículo, el stock se descontará automáticamente del inventario central de planta.
              </p>
           </div>
        </RoundedCard>

        {vehicles.map(v => (
          <RoundedCard key={v.id} className="relative overflow-hidden border-none shadow-xl bg-white group active:scale-[0.98] transition-all">
             <div className="flex justify-between items-start mb-6">
               <div className="flex gap-4">
                 <div className="w-14 h-14 bg-sky-900 text-white rounded-[1.5rem] flex items-center justify-center text-xl shadow-lg shadow-sky-100">
                    <i className="fas fa-truck-pickup"></i>
                 </div>
                 <div>
                   <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest leading-none block mb-1">{v.plate}</span>
                   <h3 className="text-xl font-black text-sky-900 leading-tight">{v.description}</h3>
                 </div>
               </div>
               <button onClick={() => setEditingVehicle(v)} className="w-10 h-10 bg-sky-50 text-sky-400 rounded-full flex items-center justify-center hover:bg-sky-100 transition-colors"><i className="fas fa-edit"></i></button>
             </div>
             
             <div className="flex items-end justify-between mb-4">
               <div>
                 <p className="text-[10px] font-black text-sky-400 uppercase tracking-tighter mb-1">Carga Actual</p>
                 <p className="text-4xl font-black text-sky-600 tracking-tighter">{v.currentLoad} <span className="text-xs font-bold text-sky-300 ml-1">UNIDADES</span></p>
               </div>
               <div className="flex gap-3">
                 <button onClick={() => loadVehicle(v.id, -1)} className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600 font-black text-2xl shadow-sm active:bg-sky-100 transition-all">-</button>
                 <button onClick={() => loadVehicle(v.id, 1)} className="w-14 h-14 bg-sky-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-sky-100 active:scale-90 transition-all">+</button>
               </div>
             </div>

             <div className="w-full bg-sky-50 h-3 rounded-full overflow-hidden border border-sky-100">
               <div className="h-full bg-gradient-to-r from-sky-400 to-sky-600 transition-all duration-700 ease-out" style={{ width: `${(v.currentLoad/v.loadCapacity)*100}%` }}></div>
             </div>
             <div className="flex justify-between mt-2">
                <span className="text-[9px] font-black text-sky-300 uppercase">Límite: {v.loadCapacity}</span>
                <span className="text-[9px] font-black text-sky-500 uppercase">{Math.round((v.currentLoad/v.loadCapacity)*100)}% Capacidad</span>
             </div>
          </RoundedCard>
        ))}
        
        <button 
          onClick={() => setEditingVehicle({})}
          className="w-full py-7 border-2 border-dashed border-sky-200 rounded-[2.5rem] text-sky-400 font-black text-sm uppercase hover:bg-white hover:text-sky-600 transition-all group"
        >
          <i className="fas fa-plus mr-2 group-hover:scale-125 transition-transform"></i> Registrar Nueva Unidad
        </button>
      </div>
    </div>
  );
};
