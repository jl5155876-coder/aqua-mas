
import React, { useState, useMemo } from 'react';
import { useERPData } from '../hooks/useERPData';
import { ModuleHeader, RoundedCard, ActionButton } from './ui/Cards';
import { Vehicle, FuelRecord } from '../types';

export const FuelModule: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { vehicles, addFuelRecord } = useERPData();
  const [activeTab, setActiveTab] = useState<'register' | 'history' | 'analytics'>('register');
  
  // Form State
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [mileage, setMileage] = useState<string>('');
  const [liters, setLiters] = useState<string>('');
  const [cost, setCost] = useState<string>('');
  const [notes, setNotes] = useState('');

  const selectedVehicle = useMemo(() => 
    vehicles.find(v => v.id === selectedVehicleId), 
  [vehicles, selectedVehicleId]);

  // --- ANALYTICS ENGINE ---
  const lastRecord = useMemo(() => {
    if (!selectedVehicle || !selectedVehicle.fuelHistory || selectedVehicle.fuelHistory.length === 0) return null;
    return selectedVehicle.fuelHistory[0]; // Newest
  }, [selectedVehicle]);

  // Stats calculation for the selected vehicle
  const vehicleStats = useMemo(() => {
    if (!selectedVehicle || !selectedVehicle.fuelHistory || selectedVehicle.fuelHistory.length < 2) return null;
    
    const history = [...selectedVehicle.fuelHistory].sort((a, b) => b.date - a.date); // Ensure newest first
    let totalKm = 0;
    let totalLiters = 0;
    let totalCost = 0;
    let currentMonthCost = 0;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const efficiencyTrend = [];

    // Calculate efficiencies between consecutive records
    for (let i = 0; i < history.length - 1; i++) {
        const current = history[i];
        const previous = history[i+1];
        
        const kmDelta = current.mileage - previous.mileage;
        
        if (kmDelta > 0 && current.liters > 0) {
            totalKm += kmDelta;
            totalLiters += current.liters;
            totalCost += current.cost;
            
            const eff = kmDelta / current.liters;
            if (i < 10) efficiencyTrend.push(eff); // Store last 10 efficiencies for chart
        }

        // Monthly Cost
        const recDate = new Date(current.date);
        if (recDate.getMonth() === currentMonth && recDate.getFullYear() === currentYear) {
            currentMonthCost += current.cost;
        }
    }

    // Add cost of the oldest record if it falls in current month (since loop stops at length-1)
    const oldest = history[history.length-1];
    if (oldest) {
        const oldestDate = new Date(oldest.date);
        if (oldestDate.getMonth() === currentMonth && oldestDate.getFullYear() === currentYear) {
            currentMonthCost += oldest.cost;
        }
    }

    const avgEfficiency = totalLiters > 0 ? totalKm / totalLiters : 0;
    const costPerKm = totalKm > 0 ? totalCost / totalKm : 0;

    return {
        avgEfficiency,
        costPerKm,
        currentMonthCost,
        efficiencyTrend: efficiencyTrend.reverse() // Oldest to newest for graph
    };
  }, [selectedVehicle]);

  // Real-time calculation for input form
  const currentInputStats = useMemo(() => {
    if (!lastRecord || !mileage || !liters) return null;
    const currentKm = parseFloat(mileage);
    const l = parseFloat(liters);
    const c = parseFloat(cost);
    
    if (isNaN(currentKm) || isNaN(l)) return null;

    const diff = currentKm - lastRecord.mileage;
    if (diff <= 0 || l <= 0) return { efficiency: 0, costPerKm: 0, diff: 0 };
    
    return {
        diff,
        efficiency: diff / l,
        costPerKm: !isNaN(c) && c > 0 ? c / diff : 0
    };
  }, [mileage, liters, cost, lastRecord]);

  const handleSave = () => {
    if (!selectedVehicleId || !mileage || !liters || !cost) {
      alert("Por favor completa todos los campos numéricos.");
      return;
    }

    const currentKm = parseFloat(mileage);
    
    if (lastRecord && currentKm <= lastRecord.mileage) {
      alert(`Error: El kilometraje (${currentKm}) no puede ser menor o igual al anterior (${lastRecord.mileage}).`);
      return;
    }

    // Sanity check
    if (currentInputStats && currentInputStats.efficiency > 25) {
        if (!confirm(`⚠️ ¿Estás seguro? ${currentInputStats.efficiency.toFixed(1)} Km/L parece un error de dedo.`)) return;
    }

    const newRecord: FuelRecord = {
      id: Date.now().toString(),
      date: Date.now(),
      mileage: currentKm,
      liters: parseFloat(liters),
      cost: parseFloat(cost),
      notes: notes
    };

    addFuelRecord(selectedVehicleId, newRecord);
    
    // Reset Form
    setMileage('');
    setLiters('');
    setCost('');
    setNotes('');
    alert("✅ Carga registrada correctamente.");
    setActiveTab('history');
  };

  const getEfficiencyColor = (val: number) => {
      if (val >= 8) return 'text-emerald-500 bg-emerald-50 border-emerald-100';
      if (val >= 5) return 'text-amber-500 bg-amber-50 border-amber-100';
      return 'text-rose-500 bg-rose-50 border-rose-100';
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col animate-fadeIn overflow-hidden pb-24 relative">
      <ModuleHeader title="Control Combustible" onBack={onBack} />
      
      <div className="px-6 flex gap-2 mb-4 shrink-0">
        <button onClick={() => setActiveTab('register')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'register' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-white text-slate-400'}`}>Cargar</button>
        <button onClick={() => setActiveTab('analytics')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'analytics' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-white text-slate-400'}`}>Analítica</button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-white text-slate-400'}`}>Historial</button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-4 no-scrollbar pb-10">
        
        {/* VEHICLE SELECTOR (Shared across tabs) */}
        {!selectedVehicleId && (
             <div className="text-center py-10 opacity-60">
                <i className="fas fa-truck-pickup text-4xl mb-2 text-slate-300"></i>
                <p className="text-xs font-bold text-slate-400">Selecciona una unidad para comenzar</p>
             </div>
        )}
        
        <div className="grid grid-cols-2 gap-3 mb-4">
            {vehicles.map(v => (
            <button 
                key={v.id} 
                onClick={() => setSelectedVehicleId(v.id)}
                className={`p-3 rounded-2xl border-2 transition-all flex items-center gap-3 ${selectedVehicleId === v.id ? 'border-amber-500 bg-amber-50' : 'border-white bg-white shadow-sm'}`}
            >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${selectedVehicleId === v.id ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-300'}`}>
                    <i className="fas fa-truck"></i>
                </div>
                <div className="text-left overflow-hidden">
                    <p className={`text-xs font-black uppercase truncate ${selectedVehicleId === v.id ? 'text-amber-900' : 'text-slate-500'}`}>{v.plate}</p>
                    <p className="text-[8px] font-bold text-slate-400 truncate">{v.description}</p>
                </div>
            </button>
            ))}
        </div>

        {selectedVehicle && (
            <>
                {/* --- TAB: REGISTER --- */}
                {activeTab === 'register' && (
                <div className="space-y-6 animate-fadeIn">
                    
                    {/* Odometer Input */}
                    <RoundedCard className="bg-slate-800 text-white border-none relative overflow-hidden">
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Odómetro Actual</p>
                                {lastRecord && (
                                    <div className="flex items-center gap-1 mt-1">
                                        <i className="fas fa-history text-[8px] text-amber-400"></i>
                                        <p className="text-[9px] text-slate-300">Anterior: <span className="font-mono text-amber-400">{lastRecord.mileage.toLocaleString()} km</span></p>
                                    </div>
                                )}
                            </div>
                            <i className="fas fa-gauge-high text-2xl text-slate-600"></i>
                        </div>
                        <div className="flex items-center gap-2 relative z-10">
                            <input 
                                type="number" 
                                inputMode="numeric"
                                value={mileage}
                                onChange={e => setMileage(e.target.value)}
                                placeholder={lastRecord ? `${Math.round(lastRecord.mileage + 100)}` : '0'}
                                className="w-full bg-transparent text-4xl font-black text-white outline-none placeholder-slate-600"
                            />
                            <span className="text-sm font-bold text-slate-500">KM</span>
                        </div>
                    </RoundedCard>

                    {/* Fuel Details */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-5 rounded-[2rem] shadow-sm">
                            <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Litros</label>
                            <input 
                                type="number" 
                                inputMode="decimal"
                                className="w-full text-2xl font-black text-slate-800 outline-none placeholder-slate-200" 
                                placeholder="0.0"
                                value={liters}
                                onChange={e => setLiters(e.target.value)}
                            />
                        </div>
                        <div className="bg-white p-5 rounded-[2rem] shadow-sm">
                            <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Costo Total</label>
                            <div className="flex items-center">
                                <span className="text-lg font-black text-slate-300 mr-1">$</span>
                                <input 
                                type="number" 
                                inputMode="decimal"
                                className="w-full text-2xl font-black text-emerald-600 outline-none placeholder-slate-200" 
                                placeholder="0.00"
                                value={cost}
                                onChange={e => setCost(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Live Efficiency Preview */}
                    {currentInputStats && currentInputStats.efficiency > 0 && (
                        <div className={`p-4 rounded-2xl border-2 flex items-center justify-between animate-slideUp ${getEfficiencyColor(currentInputStats.efficiency)}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/50 rounded-full flex items-center justify-center text-lg"><i className="fas fa-chart-line"></i></div>
                                <div>
                                    <p className="text-[9px] font-bold uppercase opacity-70">Rendimiento Est.</p>
                                    <p className="text-xl font-black">{currentInputStats.efficiency.toFixed(2)} <span className="text-xs">Km/L</span></p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-bold uppercase opacity-70">Recorrido</p>
                                <p className="text-sm font-black">+{currentInputStats.diff.toFixed(1)} km</p>
                            </div>
                        </div>
                    )}

                    <textarea 
                        className="w-full bg-white p-4 rounded-2xl outline-none font-bold text-slate-600 text-sm resize-none shadow-sm focus:ring-2 ring-amber-200 transition-all"
                        rows={2}
                        placeholder="Notas opcionales (Gasolinera, Ticket #...)"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    ></textarea>

                    <ActionButton onClick={handleSave} variant="primary">
                        Registrar Carga <i className="fas fa-gas-pump ml-2"></i>
                    </ActionButton>
                </div>
                )}

                {/* --- TAB: ANALYTICS --- */}
                {activeTab === 'analytics' && vehicleStats && (
                    <div className="space-y-6 animate-fadeIn">
                        
                        {/* Summary Cards */}
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2.5rem] p-6 text-white shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Eficiencia Global</h4>
                            <div className="flex justify-between items-end mb-6">
                                <div>
                                    <p className="text-4xl font-black tracking-tighter">{vehicleStats.avgEfficiency.toFixed(2)}</p>
                                    <p className="text-xs font-bold text-amber-400 uppercase">Km / Litro</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-black text-emerald-400">${vehicleStats.costPerKm.toFixed(2)}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Costo x Km</p>
                                </div>
                            </div>

                            {/* Monthly Spending */}
                            <div className="bg-white/10 p-4 rounded-2xl flex justify-between items-center backdrop-blur-sm border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-900"><i className="fas fa-calendar-day"></i></div>
                                    <span className="text-[10px] font-bold uppercase">Gasto Mes Actual</span>
                                </div>
                                <span className="font-black text-lg">${vehicleStats.currentMonthCost.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Efficiency Trend Graph */}
                        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50">
                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Tendencia (Últimas 10 Cargas)</h4>
                            <div className="h-32 flex items-end justify-between gap-1 px-2">
                                {vehicleStats.efficiencyTrend.map((eff, i) => {
                                    const height = Math.min((eff / 15) * 100, 100); // Scale to 15 km/L max
                                    const color = eff >= 8 ? 'bg-emerald-400' : eff >= 5 ? 'bg-amber-400' : 'bg-rose-400';
                                    return (
                                        <div key={i} className="flex-1 flex flex-col justify-end items-center gap-1 group">
                                            <span className="text-[8px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity absolute -mt-4">{eff.toFixed(1)}</span>
                                            <div className={`w-full rounded-t-lg transition-all hover:opacity-80 ${color}`} style={{ height: `${height}%` }}></div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="border-t border-slate-100 mt-1 pt-1 flex justify-between text-[8px] text-slate-300 font-bold uppercase">
                                <span>Anterior</span>
                                <span>Reciente</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB: HISTORY --- */}
                {activeTab === 'history' && (
                <div className="space-y-4 animate-fadeIn">
                    {(!selectedVehicle.fuelHistory || selectedVehicle.fuelHistory.length === 0) ? (
                        <p className="text-center text-slate-400 text-xs italic mt-10">Sin registros para esta unidad.</p>
                    ) : (
                        selectedVehicle.fuelHistory.map((rec, idx, arr) => {
                            // Calculate efficiency relative to the NEXT record in the array (older)
                            const prevRecord = arr[idx + 1];
                            const effic = prevRecord ? (rec.mileage - prevRecord.mileage) / rec.liters : 0;
                            const kmDiff = prevRecord ? rec.mileage - prevRecord.mileage : 0;
                            
                            return (
                                <RoundedCard key={rec.id} className="p-4 border-l-4 border-l-amber-400 flex justify-between items-center shadow-sm">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                                        {new Date(rec.date).toLocaleDateString()} <span className="opacity-50 mx-1">|</span> {new Date(rec.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl font-black text-slate-800">{rec.liters} L</span>
                                        <span className="text-xs font-bold text-slate-400">x ${rec.cost.toLocaleString()}</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-500 mt-1">Odo: {rec.mileage.toLocaleString()} km</p>
                                </div>
                                <div className="text-right">
                                    {effic > 0 ? (
                                        <div className={`flex flex-col items-end`}>
                                            <div className={`px-3 py-1 rounded-lg text-xs font-black mb-1 ${effic >= 8 ? 'bg-emerald-100 text-emerald-600' : effic >= 5 ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'}`}>
                                                {effic.toFixed(1)} km/L
                                            </div>
                                            <span className="text-[9px] font-bold text-slate-400">Recorrido: {kmDiff.toFixed(0)} km</span>
                                        </div>
                                    ) : (
                                        <div className="px-3 py-1 rounded-lg text-[9px] font-bold bg-slate-100 text-slate-400 mb-1">Base / Inicial</div>
                                    )}
                                </div>
                                </RoundedCard>
                            );
                        })
                    )}
                </div>
                )}
            </>
        )}
      </div>
    </div>
  );
};
