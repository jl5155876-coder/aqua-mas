
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useERPData } from '../hooks/useERPData';
import { ModuleHeader } from './ui/Cards';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BACKWASH_SEQUENCE, REGENERATION_SEQUENCE } from '../constants';

const TRANSITION_TIME = 15; 
const STORAGE_KEY = 'aqua_production_state_v4'; 

// --- SVG COMPONENTS FOR VISUALIZATION ---
const FlowLine = ({ isActive, delay = 0 }: { isActive: boolean, delay?: number }) => (
    <div className="flex-1 h-1.5 bg-slate-200 rounded-full relative overflow-hidden self-center mx-[-2px] min-w-[8px] border border-slate-300/50">
        {isActive && (
            <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent animate-[flow_1.5s_infinite_linear] opacity-80"
                style={{ animationDelay: `${delay}s` }}
            ></div>
        )}
    </div>
);

const TankVisual = ({ type, isActive, level, label }: { type: 'multi' | 'carbon' | 'softener', isActive: boolean, level: number, label: string }) => {
    const activeGlow = isActive ? 'shadow-[0_0_25px_rgba(56,189,248,0.15)]' : '';
    
    return (
        <div className={`flex flex-col items-center gap-3 transition-all duration-700 ${isActive ? 'scale-110 opacity-100' : 'scale-95 opacity-60'}`}>
            <div className={`relative w-16 h-28 border-2 rounded-[1.25rem] bg-slate-50 overflow-hidden transition-all duration-500 ${isActive ? 'border-sky-400 shadow-[0_0_30px_rgba(56,189,248,0.3)] ring-2 ring-sky-400/10' : 'border-slate-200'} ${activeGlow}`}>
                {/* Media Level */}
                <div className={`absolute bottom-0 w-full transition-all duration-1000 ${type === 'multi' ? 'bg-amber-800/40' : type === 'carbon' ? 'bg-slate-800' : 'bg-indigo-800/30'}`} style={{ height: '65%' }}>
                    {/* Texture/Grain for media */}
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle,black_1px,transparent_1px)] bg-[size:4px_4px]"></div>
                </div>
                
                {/* Water Flow Animation */}
                {isActive && (
                    <div className="absolute inset-0 bg-sky-500/5 animate-pulse">
                        <div className="w-full h-full flex justify-around px-2">
                            <div className="w-[1px] h-full bg-gradient-to-b from-transparent via-sky-400/30 to-transparent animate-[slideUp_2s_infinite_linear]"></div>
                            <div className="w-[1px] h-full bg-gradient-to-b from-transparent via-sky-400/20 to-transparent animate-[slideUp_1.5s_infinite_linear] delay-300"></div>
                        </div>
                    </div>
                )}

                {/* Valve Head */}
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-10 h-5 rounded-b-xl border-b transition-colors ${isActive ? 'bg-sky-500 border-sky-300' : 'bg-slate-200 border-slate-300'}`}></div>
                
                {/* Status Indicator */}
                <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${isActive ? 'bg-sky-500 animate-pulse shadow-[0_0_8px_rgba(56,189,248,0.8)]' : 'bg-slate-300'}`}></div>
            </div>
            <span className={`text-[8px] font-black uppercase tracking-[0.2em] text-center leading-tight transition-colors ${isActive ? 'text-sky-600' : 'text-slate-400'}`}>{label}</span>
        </div>
    );
};

const UVLampVisual = ({ isActive }: { isActive: boolean }) => (
    <div className={`flex flex-col items-center gap-3 transition-all duration-700 ${isActive ? 'scale-110 opacity-100' : 'scale-95 opacity-60'}`}>
        <div className={`relative w-6 h-24 border-2 rounded-full bg-slate-50 flex items-center justify-center transition-all duration-500 ${isActive ? 'border-violet-500 shadow-[0_0_30px_rgba(139,92,246,0.2)]' : 'border-slate-200'}`}>
            {isActive && <div className="absolute inset-1 bg-violet-500/10 rounded-full animate-pulse"></div>}
            <div className={`w-1 h-16 rounded-full transition-colors duration-500 ${isActive ? 'bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.6)]' : 'bg-slate-200'}`}></div>
        </div>
        <span className={`text-[8px] font-black uppercase tracking-[0.2em] transition-colors ${isActive ? 'text-violet-500' : 'text-slate-400'}`}>UV</span>
    </div>
);

const PumpVisual = ({ isActive }: { isActive: boolean }) => (
    <div className={`flex flex-col items-center gap-3 transition-all duration-700 ${isActive ? 'scale-110 opacity-100' : 'scale-95 opacity-60'}`}>
        <div className={`relative w-12 h-12 border-2 rounded-2xl bg-slate-50 flex items-center justify-center transition-all duration-500 ${isActive ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'border-slate-200'}`}>
            <i className={`fas fa-cog text-lg ${isActive ? 'animate-spin text-emerald-500' : 'text-slate-300'}`}></i>
            {isActive && <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-50 animate-ping"></div>}
        </div>
        <span className={`text-[8px] font-black uppercase tracking-[0.2em] transition-colors ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>Bomba</span>
    </div>
);

export const ProductionModule: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { productionConfig, setProductionConfig, qualityRecords, employees, addNotification, emptyJugsStock, setEmptyJugsStock, produceJugs, unloadEmptyJugs, vehicles } = useERPData();
  
  const [activeTab, setActiveTab] = useState<'control' | 'maintenance' | 'history' | 'settings'>('control');
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskInterval, setNewTaskInterval] = useState('30');
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [resetType, setResetType] = useState<'usage' | 'factory' | 'sequence' | 'defaults' | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [unloadQty, setUnloadQty] = useState(0);
  const [purchaseQty, setPurchaseQty] = useState(0);
  const [mode, setMode] = useState<'backwash' | 'regen'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed?.mode || 'backwash';
    } catch {
      return 'backwash';
    }
  });
  
  const [currentStepIdx, setCurrentStepIdx] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed?.currentStepIdx || 0;
    } catch {
      return 0;
    }
  });

  const [isRunning, setIsRunning] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed?.isRunning || false;
    } catch {
      return false;
    }
  });

  const [isTransitioning, setIsTransitioning] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed?.isTransitioning || false;
    } catch {
      return false;
    }
  });

  const [endTime, setEndTime] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed?.endTime || null;
    } catch {
      return null;
    }
  });

  const [timeLeft, setTimeLeft] = useState(0);
  
  // Logic for Hardness Planner
  const [hardnessGPG, setHardnessGPG] = useState(10); 
  const [resinFt3, setResinFt3] = useState(productionConfig.softenerVolumeFt3 || 1.5);
  const [batchInput, setBatchInput] = useState(0);
  const [selectedOperatorId, setSelectedOperatorId] = useState('system');

  const wakeLock = useRef<any>(null);

  const currentSequence = (mode === 'backwash' ? productionConfig.backwashSequence : productionConfig.regenerationSequence) || (mode === 'backwash' ? BACKWASH_SEQUENCE : REGENERATION_SEQUENCE);
  
  // Identify active tank based on stage name
  const currentStageName = currentSequence?.[currentStepIdx]?.stage || '';
  const activeTank = currentStageName.includes('Multicama') ? 'multi' 
                   : currentStageName.includes('Carbón') ? 'carbon' 
                   : currentStageName.includes('Suavizador') ? 'softener' 
                   : 'none';

  // Capacity Calcs
  const totalCapacityLiters = (resinFt3 * 30000 / (hardnessGPG || 1)) * 3.785;
  const currentUsage = productionConfig.currentUsageLiters || 0;
  const percentageUsed = Math.min((currentUsage / totalCapacityLiters) * 100, 100);
  const remainingLiters = Math.max(0, totalCapacityLiters - currentUsage);

  // Production Trends Data
  const trendData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        date: d.toLocaleDateString('es-MX', { weekday: 'short' }),
        fullDate: d.toDateString(),
        total: 0
      };
    });

    (productionConfig.batches || []).forEach(batch => {
      if (!batch.timestamp) return;
      try {
        const batchDate = new Date(batch.timestamp).toDateString();
        const day = last7Days.find(d => d.fullDate === batchDate);
        if (day) day.total += batch.quantity;
      } catch (e) {
        console.warn("Invalid batch timestamp:", batch.timestamp);
      }
    });

    return last7Days;
  }, [productionConfig.batches]);

  // Persistence & Timer Logic (Same as before but refined)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.isRunning && parsed.endTime) {
          const now = Date.now();
          const diff = Math.ceil((parsed.endTime - now) / 1000);
          if (diff > 0) {
            setTimeLeft(diff);
            requestWakeLock();
          } else {
            setTimeLeft(0);
          }
        } else {
          const defaultTime = parsed?.isTransitioning ? TRANSITION_TIME : currentSequence?.[parsed?.currentStepIdx || 0]?.time || 0;
          setTimeLeft(parsed?.savedTimeLeft || defaultTime);
        }
      } else {
        setTimeLeft(currentSequence?.[0]?.time || 0);
      }
    } catch (e) {
      console.error("Error loading production state:", e);
      setTimeLeft(currentSequence?.[0]?.time || 0);
    }
  }, []); // Run once on mount

  // Sync Resin Config
  useEffect(() => {
    if (resinFt3 !== (productionConfig.softenerVolumeFt3 || 0)) {
        setProductionConfig({ ...productionConfig, softenerVolumeFt3: resinFt3 });
    }
  }, [resinFt3]);

  // Save State
  useEffect(() => {
    try {
      const stateToSave = { mode, currentStepIdx, endTime, isRunning, isTransitioning, savedTimeLeft: timeLeft };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.warn("Could not save production state to localStorage:", e);
    }
  }, [mode, currentStepIdx, endTime, isRunning, timeLeft, isTransitioning]);

  const requestWakeLock = async () => {
    try { if ('wakeLock' in navigator && !wakeLock.current) wakeLock.current = await navigator.wakeLock.request('screen'); } 
    catch (err) { console.warn(err); }
  };

  const releaseWakeLock = async () => {
    if (wakeLock.current) { await wakeLock.current.release(); wakeLock.current = null; }
  };

  // Timer Tick
  useEffect(() => {
    let interval: any;
    if (isRunning && endTime) {
      requestWakeLock(); 
      interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.ceil((endTime - now) / 1000);
        
        if (remaining <= 0) {
          if (isTransitioning) {
            setIsTransitioning(false);
            const nextIdx = currentStepIdx + 1;
            setCurrentStepIdx(nextIdx);
            const nextStepTime = currentSequence?.[nextIdx]?.time || 0;
            const newEndTime = Date.now() + nextStepTime * 1000;
            setEndTime(newEndTime);
            setTimeLeft(nextStepTime);
          } else {
            if (navigator.vibrate) {
                try {
                    navigator.vibrate([1000, 500, 1000]);
                } catch (e) {}
            }
            if (currentStepIdx < (currentSequence?.length || 0) - 1) {
              setIsTransitioning(true);
              const newEndTime = Date.now() + TRANSITION_TIME * 1000;
              setEndTime(newEndTime);
              setTimeLeft(TRANSITION_TIME);
            } else {
              // FINISH
              setIsRunning(false);
              setEndTime(null);
              releaseWakeLock();
              try {
                localStorage.removeItem(STORAGE_KEY);
              } catch (e) {
                console.warn("Could not remove production state from localStorage:", e);
              }
              if (mode === 'regen') {
                  setProductionConfig({ ...productionConfig, currentUsageLiters: 0, lastRegenDate: Date.now() });
                  addNotification({
                      title: 'Regeneración Completada',
                      message: 'Contador de uso reiniciado con éxito.',
                      type: 'info'
                  });
              } else {
                  addNotification({
                      title: 'Retrolavado Finalizado',
                      message: 'El proceso de retrolavado ha concluido.',
                      type: 'info'
                  });
              }
            }
          }
        } else {
          setTimeLeft(remaining);
        }
      }, 1000);
    } else {
      releaseWakeLock();
    }
    return () => clearInterval(interval);
  }, [isRunning, endTime, currentStepIdx, currentSequence, mode, isTransitioning]);

  const startSequence = () => {
    const duration = timeLeft > 0 ? timeLeft : (isTransitioning ? TRANSITION_TIME : (currentSequence?.[currentStepIdx]?.time || 0));
    setEndTime(Date.now() + duration * 1000);
    setIsRunning(true);
  };

  const cancelSequence = () => {
    setIsRunning(false);
    setEndTime(null);
    setCurrentStepIdx(0);
    setIsTransitioning(false);
    const firstStepTime = currentSequence?.[0]?.time || 0;
    setTimeLeft(firstStepTime);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn("Could not remove production state from localStorage:", e);
    }
    releaseWakeLock();
  };

  const handleAddBatch = () => {
    if (batchInput <= 0) return;
    
    // Check if we have enough empty jugs
    if (emptyJugsStock < batchInput) {
        addNotification({
            title: 'Error de Producción',
            message: 'No hay suficientes envases vacíos en planta.',
            type: 'alarm'
        });
        return;
    }

    const newBatch = {
        id: `BATCH-${Date.now()}`,
        timestamp: Date.now(),
        quantity: batchInput,
        operatorId: selectedOperatorId,
    };
    
    // Update production config
    setProductionConfig({ 
        ...productionConfig, 
        currentUsageLiters: (productionConfig.currentUsageLiters || 0) + (batchInput * 20),
        batches: [newBatch, ...(productionConfig.batches || [])].slice(0, 50)
    });

    // Call produceJugs to update inventory
    produceJugs(batchInput);

    setBatchInput(0);
    addNotification({
        title: 'Producción Registrada',
        message: `Se han producido ${batchInput} garrafones con éxito.`,
        type: 'info'
    });
  };

  const handleUnloadEmpty = () => {
    if (!selectedVehicleId || unloadQty <= 0) return;
    
    const vehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (!vehicle) return;

    if ((vehicle.emptyJugs || 0) < unloadQty) {
        addNotification({
            title: 'Error de Descarga',
            message: 'La cantidad excede los envases vacíos en el vehículo.',
            type: 'alarm'
        });
        return;
    }

    unloadEmptyJugs(selectedVehicleId, unloadQty);
    setUnloadQty(0);
    setSelectedVehicleId('');
    addNotification({
        title: 'Envases Recibidos',
        message: `Se han descargado ${unloadQty} envases del vehículo ${vehicle.plate}.`,
        type: 'info'
    });
  };

  const handlePurchaseEmpty = () => {
    if (purchaseQty <= 0) return;
    setEmptyJugsStock(prev => prev + purchaseQty);
    addNotification({
        title: 'Compra Registrada',
        message: `Se han agregado ${purchaseQty} envases nuevos al stock.`,
        type: 'info'
    });
    setPurchaseQty(0);
  };

  const handleMaintenanceDone = (taskId: string) => {
    const updatedTasks = (productionConfig.maintenanceTasks || []).map(t => 
        t.id === taskId ? { ...t, lastDate: Date.now(), status: 'ok' as const } : t
    );
    setProductionConfig({ ...productionConfig, maintenanceTasks: updatedTasks });
  };

  const handleAddMaintenanceTask = () => {
    if (newTaskTitle && newTaskInterval) {
        const newTask = {
            id: `MT-${Date.now()}`,
            title: newTaskTitle,
            lastDate: Date.now(),
            intervalDays: parseInt(newTaskInterval),
            status: 'ok' as const
        };
        setProductionConfig({
            ...productionConfig,
            maintenanceTasks: [...(productionConfig.maintenanceTasks || []), newTask]
        });
        setNewTaskTitle('');
        setNewTaskInterval('30');
        setShowTaskModal(false);
        addNotification({
            title: 'Tarea Agregada',
            message: 'Nueva tarea de mantenimiento registrada.',
            type: 'info'
        });
    }
  };

  const handleDeleteMaintenanceTask = (id: string) => {
    setProductionConfig({
        ...productionConfig,
        maintenanceTasks: (productionConfig.maintenanceTasks || []).filter(t => t.id !== id)
    });
    setTaskToDelete(null);
    addNotification({
        title: 'Tarea Eliminada',
        message: 'La tarea ha sido removida del sistema.',
        type: 'info'
    });
  };

  // Initialize Maintenance Tasks if missing
  useEffect(() => {
    if (!productionConfig.maintenanceTasks || productionConfig.maintenanceTasks.length === 0) {
        const defaultTasks = [
            { id: 'm1', title: 'Cambio Filtros Pulidores', lastDate: Date.now() - 86400000 * 15, intervalDays: 30, status: 'ok' as const },
            { id: 'm2', title: 'Limpieza de Membrana', lastDate: Date.now() - 86400000 * 45, intervalDays: 90, status: 'ok' as const },
            { id: 'm3', title: 'Revisión Lámpara UV', lastDate: Date.now() - 86400000 * 180, intervalDays: 365, status: 'ok' as const },
            { id: 'm4', title: 'Lavado de Cisterna', lastDate: Date.now() - 86400000 * 120, intervalDays: 180, status: 'ok' as const },
        ];
        setProductionConfig({ ...productionConfig, maintenanceTasks: defaultTasks });
    }
  }, []);

  const latestQuality = qualityRecords[0];

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="px-6 py-8 animate-fadeIn h-full bg-slate-50 overflow-y-auto pb-24 no-scrollbar text-slate-900 relative">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-sky-500/[0.05] blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/[0.05] blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center active:scale-90 transition-all text-slate-600 shadow-sm">
            <i className="fas fa-arrow-left"></i>
          </button>
          <div className="flex-1">
              <h2 className="text-3xl font-black tracking-tighter leading-none bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500 bg-clip-text text-transparent">Planta</h2>
              <p className="text-[9px] text-sky-600/80 font-black uppercase tracking-[0.4em] mt-1.5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse shadow-[0_0_8px_rgba(14,165,233,0.4)]"></span>
                Sistemas de Purificación
              </p>
          </div>
          <div className="flex bg-slate-200/50 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto no-scrollbar max-w-[220px]">
              <button onClick={() => setActiveTab('control')} className={`px-4 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'control' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Control</button>
              <button onClick={() => setActiveTab('maintenance')} className={`px-4 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'maintenance' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Manto.</button>
              <button onClick={() => setActiveTab('history')} className={`px-4 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Historial</button>
              <button onClick={() => setActiveTab('settings')} className={`px-4 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'settings' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Config</button>
          </div>
        </div>

      <div className="space-y-8">
        
        {activeTab === 'control' && (
          <>
            {/* --- SCHEMATIC VIEW --- */}
            <div className="bg-white p-10 rounded-[4rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-slate-200 relative overflow-hidden group">
                {/* Background Ambient Glow */}
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-sky-500/[0.03] blur-[120px] transition-opacity duration-1000 ${isRunning ? 'opacity-100' : 'opacity-0'}`}></div>
                
                {/* Grid Pattern Overlay */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:24px_24px]"></div>

                <div className="flex justify-between items-center relative z-10 px-4">
                    <PumpVisual isActive={isRunning} />
                    <FlowLine isActive={isRunning} delay={0} />
                    <TankVisual type="multi" isActive={isRunning && activeTank === 'multi'} level={80} label="Multicama" />
                    <FlowLine isActive={isRunning} delay={0.5} />
                    <TankVisual type="carbon" isActive={isRunning && activeTank === 'carbon'} level={80} label="Carbón" />
                    <FlowLine isActive={isRunning} delay={1} />
                    <TankVisual type="softener" isActive={isRunning && activeTank === 'softener'} level={80} label="Suavizador" />
                    <FlowLine isActive={isRunning} delay={1.5} />
                    <UVLampVisual isActive={isRunning} />
                </div>

                {/* Active Flow Status */}
                <div className="mt-10 flex items-center justify-between bg-slate-50 p-5 rounded-[2rem] border border-slate-200 shadow-inner">
                    <div className="flex items-center gap-5">
                        <div className="relative">
                            <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.6)]' : 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]'}`}></div>
                            {isRunning && <div className="absolute inset-0 bg-sky-500 rounded-full animate-ping opacity-40"></div>}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-900">
                                {isRunning ? (isTransitioning ? 'Sincronizando Válvulas' : `Proceso: ${currentStageName}`) : 'Sistema en Reposo'}
                            </span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Estado del Sistema</span>
                        </div>
                    </div>
                    {isRunning && <div className="flex gap-1.5">
                        {[0, 1, 2].map(i => (
                            <div key={i} className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }}></div>
                        ))}
                    </div>}
                </div>
            </div>

            {/* Bento Grid Info */}
            <div className="grid grid-cols-3 gap-6">
                {/* Empty Jugs Stock */}
                <div className="bg-white p-6 rounded-[3rem] border border-slate-200 flex flex-col justify-between group hover:shadow-lg transition-all duration-500 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex flex-col">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Envases Vacíos</h4>
                            <span className="text-[8px] font-bold text-sky-600/60 uppercase tracking-widest">En Planta</span>
                        </div>
                        <div className="w-8 h-8 bg-sky-50 rounded-xl flex items-center justify-center border border-sky-100">
                            <i className="fas fa-box text-xs text-sky-500"></i>
                        </div>
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-black text-slate-900 tracking-tighter">{emptyJugsStock}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase mb-2">Unidades</span>
                    </div>
                    <p className="text-[8px] text-slate-400 uppercase font-black tracking-[0.2em] mt-6">Listos para Producción</p>
                </div>

                {/* Quality Summary */}
                <div className="bg-white p-6 rounded-[3rem] border border-slate-200 flex flex-col justify-between group hover:shadow-lg transition-all duration-500 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex flex-col">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Calidad</h4>
                            <span className="text-[8px] font-bold text-emerald-600/60 uppercase tracking-widest">Monitoreo Real</span>
                        </div>
                        <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100">
                            <i className="fas fa-vial text-xs text-emerald-500"></i>
                        </div>
                    </div>
                    {latestQuality ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">TDS</span>
                                <span className="text-3xl font-black text-emerald-600 tracking-tighter">{latestQuality.tds} <small className="text-[10px] font-black opacity-50 ml-1">PPM</small></span>
                            </div>
                            <div className="flex justify-between items-end">
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">pH</span>
                                <span className="text-3xl font-black text-sky-600 tracking-tighter">{latestQuality.ph}</span>
                            </div>
                            <div className="flex justify-between items-end">
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">Dureza</span>
                                <span className="text-3xl font-black text-amber-600 tracking-tighter">{latestQuality.dureza || 0} <small className="text-[10px] font-black opacity-50 ml-1">mg/L</small></span>
                            </div>
                            <div className="pt-4 border-t border-slate-100">
                                <p className="text-[8px] text-slate-400 uppercase font-black tracking-[0.2em]">
                                    {latestQuality.timestamp ? new Date(latestQuality.timestamp).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '---'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="py-6 text-center">
                            <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest">Sin Datos Recientes</p>
                        </div>
                    )}
                </div>

                {/* Production Efficiency */}
                <div className="bg-white p-6 rounded-[3rem] border border-slate-200 flex flex-col justify-between group hover:shadow-lg transition-all duration-500 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex flex-col">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Eficiencia</h4>
                            <span className="text-[8px] font-bold text-indigo-600/60 uppercase tracking-widest">Rendimiento</span>
                        </div>
                        <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
                            <i className="fas fa-chart-line text-xs text-indigo-500"></i>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-end gap-2">
                            <span className="text-5xl font-black text-slate-900 tracking-tighter">94<small className="text-lg opacity-30 ml-1">%</small></span>
                            <div className="mb-3 flex items-center gap-1 text-emerald-600">
                                <i className="fas fa-caret-up text-xs"></i>
                                <span className="text-[10px] font-black">2.4%</span>
                            </div>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-4 p-0.5 border border-slate-200 shadow-inner">
                            <div className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 w-[94%] rounded-full shadow-[0_0_10px_rgba(56,189,248,0.2)]"></div>
                        </div>
                    </div>
                    <p className="text-[8px] text-slate-400 uppercase font-black tracking-[0.2em] mt-6">Estado: Óptimo</p>
                </div>
            </div>

            {/* --- MAIN CONTROLS --- */}
            {!isRunning ? (
                <div className="space-y-10">
                    {/* Mode Selector */}
                    <div className="flex bg-slate-100 p-2 rounded-[3rem] shadow-sm border border-slate-200">
                        <button 
                            onClick={() => { setMode('backwash'); setCurrentStepIdx(0); setTimeLeft(((productionConfig.backwashSequence || BACKWASH_SEQUENCE)[0] || BACKWASH_SEQUENCE[0]).time); }} 
                            className={`flex-1 py-5 rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.3em] transition-all duration-500 ${mode === 'backwash' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Retrolavado
                        </button>
                        <button 
                            onClick={() => { setMode('regen'); setCurrentStepIdx(0); setTimeLeft(((productionConfig.regenerationSequence || REGENERATION_SEQUENCE)[0] || REGENERATION_SEQUENCE[0]).time); }} 
                            className={`flex-1 py-5 rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.3em] transition-all duration-500 ${mode === 'regen' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Regeneración
                        </button>
                    </div>

                    {/* Hardness & Capacity Dashboard */}
                    <div className="bg-white p-10 rounded-[4rem] border border-slate-200 relative overflow-hidden group shadow-sm">
                        {/* Decorative Gradient */}
                        <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500/[0.03] blur-[80px] rounded-full group-hover:bg-indigo-500/[0.05] transition-all duration-1000"></div>
                        
                        <div className="flex justify-between items-start mb-10 relative z-10">
                            <div>
                                <h3 className="text-[12px] font-black text-indigo-500 uppercase tracking-[0.4em] mb-2">Vida Útil Resina</h3>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Capacidad de Intercambio</p>
                            </div>
                            <div className="text-right">
                                <p className="text-5xl font-black text-slate-900 tracking-tighter">{Math.round(remainingLiters).toLocaleString()}</p>
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500/60 mt-1">Litros Disponibles</p>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="relative h-8 bg-slate-100 rounded-[1.25rem] p-1.5 border border-slate-200 mb-10 shadow-inner">
                            <div 
                                className={`h-full rounded-lg transition-all duration-1000 ease-out relative overflow-hidden ${percentageUsed > 90 ? 'bg-red-500' : percentageUsed > 75 ? 'bg-amber-500' : 'bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400'}`} 
                                style={{ width: `${percentageUsed}%` }}
                            >
                                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[size:24px_24px] animate-[flow_3s_infinite_linear]"></div>
                            </div>
                        </div>

                        {/* Inputs Grid */}
                        <div className="grid grid-cols-2 gap-8 mb-10 relative z-10">
                            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Dureza (GPG)</label>
                                <div className="flex items-center justify-between">
                                    <button onClick={() => setHardnessGPG(Math.max(1, hardnessGPG - 1))} className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-600 active:scale-90 transition-all border border-slate-200 shadow-sm">
                                        <i className="fas fa-minus text-xs"></i>
                                    </button>
                                    <span className="text-2xl font-black text-slate-900 tracking-tighter">{hardnessGPG}</span>
                                    <button onClick={() => setHardnessGPG(hardnessGPG + 1)} className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-600 active:scale-90 transition-all border border-slate-200 shadow-sm">
                                        <i className="fas fa-plus text-xs"></i>
                                    </button>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Operador</label>
                                <div className="relative">
                                    <select 
                                        className="w-full bg-transparent text-[12px] font-black outline-none text-slate-900 cursor-pointer appearance-none"
                                        value={selectedOperatorId}
                                        onChange={e => setSelectedOperatorId(e.target.value)}
                                    >
                                        <option value="system" className="bg-white">Sistema</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id} className="bg-white">{emp.name.split(' ')[0]}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <i className="fas fa-chevron-down text-[10px]"></i>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-200 mb-10 relative z-10 shadow-sm">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-5">Registrar Producción (Llenado)</label>
                            <div className="flex items-center gap-8">
                                <div className="flex-1 relative">
                                    <input 
                                        type="number" 
                                        className="w-full bg-transparent text-5xl font-black outline-none text-slate-900 placeholder:text-slate-200 tracking-tighter"
                                        placeholder="000"
                                        value={batchInput || ''}
                                        onChange={e => setBatchInput(parseInt(e.target.value) || 0)}
                                    />
                                    <span className="absolute right-0 bottom-2 text-[11px] font-black text-sky-600/60 uppercase tracking-widest">Garrafones</span>
                                </div>
                                <button 
                                    onClick={handleAddBatch} 
                                    className="w-16 h-16 bg-white hover:bg-slate-50 border border-slate-200 rounded-3xl flex items-center justify-center text-sky-600 transition-all active:scale-90 shadow-sm"
                                >
                                    <i className="fas fa-plus text-xl"></i>
                                </button>
                            </div>
                            <p className="text-[9px] text-slate-400 mt-4 font-bold">Consumirá envases vacíos, tapas, sellos y liners del inventario.</p>
                        </div>

                        {/* Unload Empty Jugs from Vehicles */}
                        <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-200 mb-10 relative z-10 shadow-sm">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-5">Recepción de Envases Vacíos (Rutas)</label>
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                                    <label className="text-[8px] font-black text-slate-400 uppercase block mb-2">Vehículo</label>
                                    <select 
                                        className="w-full bg-transparent text-[11px] font-black outline-none text-slate-900"
                                        value={selectedVehicleId}
                                        onChange={e => setSelectedVehicleId(e.target.value)}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {vehicles.map(v => (
                                            <option key={v.id} value={v.id}>{v.plate} ({v.emptyJugs || 0} vacíos)</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                                    <label className="text-[8px] font-black text-slate-400 uppercase block mb-2">Cantidad</label>
                                    <input 
                                        type="number" 
                                        className="w-full bg-transparent text-[11px] font-black outline-none text-slate-900"
                                        placeholder="0"
                                        value={unloadQty || ''}
                                        onChange={e => setUnloadQty(parseInt(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                            <button 
                                onClick={handleUnloadEmpty}
                                disabled={!selectedVehicleId || unloadQty <= 0}
                                className="w-full py-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl text-sky-600 font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 disabled:opacity-50"
                            >
                                Descargar Envases a Planta
                            </button>
                        </div>

                        {/* Purchase New Empty Jugs */}
                        <div className="bg-violet-50 p-8 rounded-[3rem] border border-violet-200 mb-10 relative z-10 shadow-sm">
                            <label className="text-[10px] font-black text-violet-400 uppercase tracking-widest block mb-5">Compra de Envases Nuevos</label>
                            <div className="flex items-center gap-4">
                                <div className="flex-1 bg-white p-4 rounded-2xl border border-violet-100">
                                    <label className="text-[8px] font-black text-violet-400 uppercase block mb-2">Cantidad Comprada</label>
                                    <input 
                                        type="number" 
                                        className="w-full bg-transparent text-[11px] font-black outline-none text-violet-900"
                                        placeholder="0"
                                        value={purchaseQty || ''}
                                        onChange={e => setPurchaseQty(parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <button 
                                    onClick={handlePurchaseEmpty}
                                    disabled={purchaseQty <= 0}
                                    className="w-16 h-16 bg-violet-600 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-violet-200 active:scale-90 disabled:opacity-50"
                                >
                                    <i className="fas fa-cart-plus text-xl"></i>
                                </button>
                            </div>
                        </div>

                        <button 
                            onClick={startSequence} 
                            className={`w-full py-7 rounded-[3rem] font-black text-sm uppercase tracking-[0.4em] shadow-lg active:scale-95 transition-all duration-500 ${mode === 'regen' ? 'bg-amber-500 text-white shadow-amber-500/20' : 'bg-sky-500 text-white shadow-sky-500/20'}`}
                        >
                            {(currentStepIdx > 0 || (timeLeft < (currentSequence[currentStepIdx]?.time || 0))) ? 'Reanudar' : 'Iniciar'} {mode === 'backwash' ? 'Retrolavado' : 'Regeneración'}
                        </button>

                        {(currentStepIdx > 0 || (timeLeft < (currentSequence?.[currentStepIdx]?.time || 0))) && (
                            <button 
                                onClick={() => {
                                    setResetType('sequence');
                                    setShowResetConfirm(true);
                                }} 
                                className="w-full py-4 mt-4 rounded-[2rem] bg-slate-50 hover:bg-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] transition-all active:scale-95 border border-slate-200"
                            >
                                Reiniciar Secuencia
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-8 animate-in fade-in zoom-in duration-700">
                    {/* Main Timer Display */}
                    <div className="bg-white p-12 rounded-[4rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                        {/* Animated Background Glow */}
                        <div className={`absolute inset-0 opacity-[0.03] blur-[100px] transition-all duration-1000 ${mode === 'regen' ? 'bg-amber-500' : 'bg-sky-500'}`}></div>
                        
                        <div className="relative z-10 text-center">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-6">Tiempo Restante</h3>
                            <div className="flex items-center justify-center gap-4">
                                <span className="text-8xl font-black text-slate-900 tracking-tighter tabular-nums animate-pulse">
                                    {formatTime(timeLeft)}
                                </span>
                            </div>
                            <div className="mt-8 flex items-center justify-center gap-3">
                                <div className={`w-2.5 h-2.5 rounded-full animate-ping ${mode === 'regen' ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'bg-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.4)]'}`}></div>
                                <span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.25em] bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200">
                                    {isTransitioning ? 'Ajustando Válvulas' : currentSequence?.[currentStepIdx]?.process || 'Procesando'}
                                </span>
                            </div>
                        </div>

                        {/* Circular Progress (Subtle) */}
                        <svg className="absolute inset-0 w-full h-full -rotate-90 opacity-10" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-200" />
                            <circle 
                                cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1" 
                                className={mode === 'regen' ? 'text-amber-500' : 'text-sky-500'}
                                strokeDasharray="301.59"
                                strokeDashoffset={301.59 * (1 - (timeLeft / (isTransitioning ? TRANSITION_TIME : (currentSequence?.[currentStepIdx]?.time || 1))))}
                                strokeLinecap="round"
                            />
                        </svg>
                    </div>

                    {/* Step Progress List */}
                    <div className="bg-slate-100/50 backdrop-blur-xl rounded-[3rem] border border-slate-200 p-8 shadow-sm">
                        <div className="flex justify-between items-center mb-8">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Secuencia de {mode === 'regen' ? 'Regeneración' : 'Retrolavado'}</h4>
                            <span className="text-[10px] font-black text-slate-900 bg-white px-3 py-1 rounded-full shadow-sm">{currentStepIdx + 1} / {currentSequence.length}</span>
                        </div>
                        
                        <div className="space-y-4">
                            {currentSequence.map((step, idx) => (
                                <div 
                                    key={idx} 
                                    className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-500 ${idx === currentStepIdx ? 'bg-white shadow-sm border border-slate-200 scale-[1.02]' : idx < currentStepIdx ? 'opacity-100' : 'opacity-40'}`}
                                >
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black ${idx < currentStepIdx ? 'bg-emerald-100 text-emerald-600' : idx === currentStepIdx ? (mode === 'regen' ? 'bg-amber-500 text-white' : 'bg-sky-500 text-white') : 'bg-slate-200 text-slate-400'}`}>
                                        {idx < currentStepIdx ? <i className="fas fa-check"></i> : idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-wider">{step.process}</p>
                                        <p className="text-[9px] font-bold text-slate-400">{Math.floor(step.time / 60)} min</p>
                                    </div>
                                    {idx === currentStepIdx && !isTransitioning && (
                                        <div className="flex gap-1">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className={`w-1 h-3 rounded-full ${mode === 'regen' ? 'bg-amber-500' : 'bg-sky-500'} animate-bounce`} style={{ animationDelay: `${i * 0.1}s` }}></div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Control Actions */}
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => setIsRunning(false)} 
                            className="py-6 rounded-[2.5rem] bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-900 font-black text-[10px] uppercase tracking-[0.4em] transition-all active:scale-95 shadow-sm flex items-center justify-center gap-3"
                        >
                            <i className="fas fa-pause text-xs"></i>
                            Pausar
                        </button>
                        <button 
                            onClick={() => {
                                setResetType('sequence');
                                setShowResetConfirm(true);
                            }} 
                            className="py-6 rounded-[2.5rem] bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 font-black text-[10px] uppercase tracking-[0.4em] transition-all active:scale-95 shadow-sm flex items-center justify-center gap-3"
                        >
                            <i className="fas fa-stop-circle text-xs"></i>
                            Detener
                        </button>
                    </div>
                </div>
            )}
          </>
        )}

        {activeTab === 'maintenance' && (
            <div className="space-y-6 animate-fadeIn">
                <div className="flex justify-between items-center px-4">
                    <div className="flex flex-col">
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-[0.2em]">Mantenimiento</h3>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Estado de Activos</span>
                    </div>
                    <button onClick={() => setShowTaskModal(true)} className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-sky-600 shadow-sm hover:bg-slate-50 transition-all active:scale-90">
                        <i className="fas fa-plus"></i>
                    </button>
                </div>
                
                <div className="grid gap-6">
                    {(productionConfig.maintenanceTasks || []).map(task => {
                        const daysSince = Math.floor((Date.now() - task.lastDate) / (1000 * 60 * 60 * 24));
                        const progress = Math.min((daysSince / task.intervalDays) * 100, 100);
                        const isUrgent = progress >= 90;
                        
                        return (
                            <div key={task.id} className="bg-white p-8 rounded-[3rem] border border-slate-200 flex flex-col gap-6 shadow-sm group hover:shadow-md transition-all duration-500">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h4 className="font-black text-slate-900 text-base tracking-tight">{task.title}</h4>
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">Frecuencia: {task.intervalDays} días</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${isUrgent ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                            {isUrgent ? 'Urgente' : 'Al Día'}
                                        </div>
                                        <button onClick={() => setTaskToDelete(task.id)} className="text-slate-400 hover:text-red-500 p-2 transition-colors">
                                            <i className="fas fa-trash text-xs"></i>
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="space-y-3">
                                    <div className="flex justify-between text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                                        <span className={isUrgent ? 'text-red-500' : ''}>Hace {daysSince} días</span>
                                        <span>{Math.max(0, task.intervalDays - daysSince)} días restantes</span>
                                    </div>
                                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200 shadow-inner">
                                        <div className={`h-full rounded-full transition-all duration-1000 ${isUrgent ? 'bg-red-500' : 'bg-sky-500'}`} style={{ width: `${progress}%` }}></div>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={() => handleMaintenanceDone(task.id)}
                                    className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-900 text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl border border-slate-200 shadow-sm transition-all active:scale-[0.98]"
                                >
                                    Confirmar Realización
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {activeTab === 'history' && (
            <div className="space-y-8 animate-fadeIn">
                {/* Production Trend Chart */}
                <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
                    <div className="flex flex-col mb-8">
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Tendencia de Producción</h3>
                        <span className="text-[9px] font-bold text-sky-600/60 uppercase tracking-widest mt-1">Últimos 7 Días</span>
                    </div>
                    <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis 
                                    dataKey="date" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} 
                                />
                                <YAxis hide />
                                <Tooltip 
                                    cursor={{ fill: '#f1f5f9' }}
                                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', fontSize: '10px', fontWeight: '900', color: '#0f172a' }}
                                />
                                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                                    {trendData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 6 ? '#0ea5e9' : '#f1f5f9'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex flex-col ml-4">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Registro de Lotes</h3>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Actividad Reciente</span>
                    </div>
                    
                    <div className="grid gap-4">
                        {(productionConfig.batches || []).length > 0 ? (
                            (productionConfig.batches || []).map(batch => (
                                <div key={batch.id} className="bg-white p-5 rounded-[2rem] border border-slate-200 flex justify-between items-center group hover:shadow-md transition-all duration-300 shadow-sm">
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-500 border border-sky-100 shadow-sm group-hover:scale-110 transition-transform">
                                            <i className="fas fa-bottle-water text-lg"></i>
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-900 tracking-tight">{batch.quantity} Garrafones</p>
                                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-0.5">
                                                {batch.timestamp ? new Date(batch.timestamp).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '---'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Operador</span>
                                            <span className="text-[11px] font-black text-sky-600 uppercase tracking-tighter mt-0.5">{employees.find(e => e.id === batch.operatorId)?.name.split(' ')[0] || 'Sistema'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                                    <i className="fas fa-clipboard-list text-2xl text-slate-300"></i>
                                </div>
                                <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-300">Sin historial de producción</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'settings' && (
            <div className="space-y-8 animate-fadeIn">
                <div className="flex flex-col ml-4">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Configuración de Planta</h3>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Parámetros del Sistema</span>
                </div>

                <div className="grid gap-6">
                    {/* Softener Volume */}
                    <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm group hover:shadow-md transition-all duration-500">
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-600 border border-sky-100">
                                    <i className="fas fa-flask"></i>
                                </div>
                                <div className="flex flex-col">
                                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Volumen Suavizador</h4>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Resina de Intercambio</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="number" step="0.01"
                                    className="w-20 text-2xl font-black text-sky-600 tracking-tighter bg-transparent border-b border-sky-200 focus:border-sky-500 outline-none text-right"
                                    value={resinFt3}
                                    onChange={e => setResinFt3(parseFloat(e.target.value) || 0)}
                                />
                                <small className="text-[10px] font-black text-slate-400 uppercase">ft³</small>
                            </div>
                        </div>
                        
                        <div className="relative flex items-center gap-4 group/range">
                            <input 
                                type="range" min="0.5" max="5" step="0.1"
                                className="flex-1 h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-sky-500 hover:accent-sky-400 transition-all"
                                value={resinFt3}
                                onChange={e => setResinFt3(parseFloat(e.target.value))}
                            />
                        </div>
                    </div>

                    {/* Carbon Volume */}
                    <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm group hover:shadow-md transition-all duration-500">
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-200">
                                    <i className="fas fa-filter"></i>
                                </div>
                                <div className="flex flex-col">
                                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Volumen Carbón</h4>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Filtración Orgánica</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="number" step="0.01"
                                    className="w-20 text-2xl font-black text-slate-900 tracking-tighter bg-transparent border-b border-slate-200 focus:border-slate-500 outline-none text-right"
                                    value={productionConfig.carbonVolumeFt3 || 1.5}
                                    onChange={e => setProductionConfig({ ...productionConfig, carbonVolumeFt3: parseFloat(e.target.value) || 0 })}
                                />
                                <small className="text-[10px] font-black text-slate-400 uppercase">ft³</small>
                            </div>
                        </div>
                        
                        <div className="relative flex items-center gap-4 group/range">
                            <input 
                                type="range" min="0.5" max="5" step="0.1"
                                className="flex-1 h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-slate-500 hover:accent-slate-400 transition-all"
                                value={productionConfig.carbonVolumeFt3 || 1.5}
                                onChange={e => setProductionConfig({ ...productionConfig, carbonVolumeFt3: parseFloat(e.target.value) })}
                            />
                        </div>
                    </div>

                    {/* Multimedia Volume */}
                    <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm group hover:shadow-md transition-all duration-500">
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 border border-amber-100">
                                    <i className="fas fa-layer-group"></i>
                                </div>
                                <div className="flex flex-col">
                                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Volumen Multicama</h4>
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Filtración de Sedimentos</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="number" step="0.01"
                                    className="w-20 text-2xl font-black text-amber-600 tracking-tighter bg-transparent border-b border-amber-200 focus:border-amber-500 outline-none text-right"
                                    value={productionConfig.multimediaVolumeFt3 || 1.5}
                                    onChange={e => setProductionConfig({ ...productionConfig, multimediaVolumeFt3: parseFloat(e.target.value) || 0 })}
                                />
                                <small className="text-[10px] font-black text-slate-400 uppercase">ft³</small>
                            </div>
                        </div>
                        
                        <div className="relative flex items-center gap-4 group/range">
                            <input 
                                type="range" min="0.5" max="5" step="0.1"
                                className="flex-1 h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400 transition-all"
                                value={productionConfig.multimediaVolumeFt3 || 1.5}
                                onChange={e => setProductionConfig({ ...productionConfig, multimediaVolumeFt3: parseFloat(e.target.value) })}
                            />
                        </div>
                    </div>

                    {/* Sequence Time Configuration */}
                    <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Tiempos de Secuencia (Segundos)</h4>
                            <button 
                                onClick={() => {
                                    setResetType('defaults');
                                    setShowResetConfirm(true);
                                }}
                                className="text-[8px] font-black text-sky-600 uppercase tracking-widest hover:underline"
                            >
                                Restablecer Defaults
                            </button>
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                <h5 className="text-[9px] font-black text-sky-600 uppercase tracking-widest mb-4">Retrolavado Diario</h5>
                                <div className="space-y-3">
                                    {(productionConfig.backwashSequence || BACKWASH_SEQUENCE).map((step, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-900 uppercase">{step.stage}</span>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase">{step.process}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number"
                                                    className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-black text-right outline-none focus:ring-1 focus:ring-sky-500"
                                                    value={step.time}
                                                    onChange={e => {
                                                        const newSeq = [...(productionConfig.backwashSequence || BACKWASH_SEQUENCE)];
                                                        newSeq[idx] = { ...step, time: parseInt(e.target.value) || 0 };
                                                        setProductionConfig({ ...productionConfig, backwashSequence: newSeq });
                                                    }}
                                                />
                                                <span className="text-[8px] font-black text-slate-400 uppercase">s</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h5 className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-4">Regeneración Resina</h5>
                                <div className="space-y-3">
                                    {(productionConfig.regenerationSequence || REGENERATION_SEQUENCE).map((step, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-900 uppercase">{step.stage}</span>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase">{step.process}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number"
                                                    className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-black text-right outline-none focus:ring-1 focus:ring-amber-500"
                                                    value={step.time}
                                                    onChange={e => {
                                                        const newSeq = [...(productionConfig.regenerationSequence || REGENERATION_SEQUENCE)];
                                                        newSeq[idx] = { ...step, time: parseInt(e.target.value) || 0 };
                                                        setProductionConfig({ ...productionConfig, regenerationSequence: newSeq });
                                                    }}
                                                />
                                                <span className="text-[8px] font-black text-slate-400 uppercase">s</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* System Reset Actions */}
                    <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Acciones de Sistema</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => { setResetType('usage'); setShowResetConfirm(true); }}
                                className="py-4 bg-slate-50 hover:bg-slate-100 text-slate-900 text-[9px] font-black uppercase tracking-[0.2em] rounded-2xl border border-slate-200 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-sm"
                            >
                                <i className="fas fa-redo-alt text-sky-500"></i>
                                Reiniciar Uso
                            </button>
                            <button 
                                onClick={() => { setResetType('factory'); setShowResetConfirm(true); }}
                                className="py-4 bg-red-50 hover:bg-red-100 text-red-600 text-[9px] font-black uppercase tracking-[0.2em] rounded-2xl border border-red-100 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-sm"
                            >
                                <i className="fas fa-exclamation-triangle"></i>
                                Reset Fábrica
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Modals */}
        {showTaskModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-fadeIn">
                <div className="bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl animate-scaleIn">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-6">Nueva Tarea</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre</label>
                            <input 
                                type="text" 
                                value={newTaskTitle}
                                onChange={e => setNewTaskTitle(e.target.value)}
                                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                                placeholder="Ej. Cambio de Filtros"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Intervalo (Días)</label>
                            <input 
                                type="number" 
                                value={newTaskInterval}
                                onChange={e => setNewTaskInterval(e.target.value)}
                                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-8">
                        <button 
                            onClick={() => setShowTaskModal(false)}
                            className="py-4 rounded-2xl bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleAddMaintenanceTask}
                            className="py-4 rounded-2xl bg-sky-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20"
                        >
                            Guardar
                        </button>
                    </div>
                </div>
            </div>
        )}

        {taskToDelete && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-fadeIn">
                <div className="bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl animate-scaleIn text-center">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i className="fas fa-trash-alt text-2xl"></i>
                    </div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-2">¿Eliminar Tarea?</h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed mb-8">Esta acción no se puede deshacer. La tarea será removida permanentemente.</p>
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => setTaskToDelete(null)}
                            className="py-4 rounded-2xl bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                        >
                            No, Volver
                        </button>
                        <button 
                            onClick={() => handleDeleteMaintenanceTask(taskToDelete)}
                            className="py-4 rounded-2xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                        >
                            Sí, Eliminar
                        </button>
                    </div>
                </div>
            </div>
        )}

        {showResetConfirm && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-fadeIn">
                <div className="bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl animate-scaleIn text-center">
                    <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i className="fas fa-exclamation-triangle text-2xl"></i>
                    </div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] mb-2">
                        {resetType === 'usage' ? '¿Reiniciar Contador?' : resetType === 'factory' ? '¿Reset de Fábrica?' : resetType === 'defaults' ? '¿Restablecer Tiempos?' : '¿Detener Proceso?'}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed mb-8">
                        {resetType === 'usage' 
                            ? 'Se pondrá en cero el contador de litros procesados.' 
                            : resetType === 'factory' 
                                ? 'Se borrará toda la configuración y el historial. La aplicación se reiniciará.' 
                                : resetType === 'defaults'
                                    ? 'Se restablecerán los tiempos de secuencia a sus valores originales.'
                                    : 'El proceso actual se detendrá y la secuencia volverá al inicio.'}
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => { setShowResetConfirm(false); setResetType(null); }}
                            className="py-4 rounded-2xl bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={() => {
                                if (resetType === 'usage') setProductionConfig({...productionConfig, currentUsageLiters: 0});
                                else if (resetType === 'factory') { 
                                    try {
                                        localStorage.removeItem(STORAGE_KEY); 
                                    } catch (e) {
                                        console.warn("Could not remove production state from localStorage:", e);
                                    }
                                    try {
                                        window.location.reload(); 
                                    } catch (e) {
                                        window.location.href = window.location.href;
                                    }
                                }
                                else if (resetType === 'sequence') cancelSequence();
                                else if (resetType === 'defaults') {
                                    setProductionConfig({ 
                                        ...productionConfig, 
                                        backwashSequence: BACKWASH_SEQUENCE, 
                                        regenerationSequence: REGENERATION_SEQUENCE 
                                    });
                                }
                                setShowResetConfirm(false);
                                setResetType(null);
                            }}
                            className="py-4 rounded-2xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
      
      <style>{`
        @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(-100%); }
        }
        @keyframes flow {
            from { transform: translateX(-100%); }
            to { transform: translateX(100%); }
        }
        @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};
