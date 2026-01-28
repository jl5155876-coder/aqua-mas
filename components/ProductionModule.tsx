
import React, { useState, useEffect, useRef } from 'react';
import { useERPData } from '../hooks/useERPData';
import { ModuleHeader, RoundedCard } from './ui/Cards';

const BACKWASH_SEQUENCE = [
  { stage: 'Multicama', process: 'Backwash', time: 300 }, // 5 min
  { stage: 'Multicama', process: 'Enjuague Rápido', time: 180 }, // 3 min
  { stage: 'Carbón Activado', process: 'Backwash', time: 300 },
  { stage: 'Carbón Activado', process: 'Enjuague Rápido', time: 180 },
  { stage: 'Suavizador', process: 'Backwash', time: 300 },
  { stage: 'Suavizador', process: 'Enjuague Rápido', time: 180 },
];

const REGENERATION_SEQUENCE = [
  { stage: 'Suavizador', process: 'Backwash Inicial', time: 300 }, // 5 min
  { stage: 'Suavizador', process: 'Succión Salmuera', time: 1800 }, // 30 min
  { stage: 'Suavizador', process: 'Enjuague Lento', time: 1200 }, // 20 min
  { stage: 'Suavizador', process: 'Enjuague Rápido', time: 180 }, // 3 min
  { stage: 'Tanque Sal', process: 'Relleno Nivel', time: 300 }, // 5 min
];

// Configuración
const TRANSITION_TIME = 15; // Tiempo para ajustar válvulas
const ALARM_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const STORAGE_KEY = 'aqua_production_state_v3'; // Version bumped for new state structure

export const ProductionModule: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  // Inicialización diferida leyendo de localStorage
  const [mode, setMode] = useState<'backwash' | 'regen'>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).mode : 'backwash';
  });
  
  const [currentStepIdx, setCurrentStepIdx] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).currentStepIdx : 0;
  });

  const [isRunning, setIsRunning] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).isRunning : false;
  });

  const [isTransitioning, setIsTransitioning] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).isTransitioning : false;
  });

  const [endTime, setEndTime] = useState<number | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).endTime : null;
  });

  // El timeLeft se calcula al montar basándose en el endTime guardado
  const [timeLeft, setTimeLeft] = useState(0);

  const [hardness, setHardness] = useState(8);
  const [showRegenAlert, setShowRegenAlert] = useState(false);

  const wakeLock = useRef<WakeLockSentinel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentSequence = mode === 'backwash' ? BACKWASH_SEQUENCE : REGENERATION_SEQUENCE;

  // Efecto para restaurar el tiempo correcto al montar el componente
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.isRunning && parsed.endTime) {
        const now = Date.now();
        const diff = Math.ceil((parsed.endTime - now) / 1000);
        if (diff > 0) {
          setTimeLeft(diff);
          requestWakeLock();
        } else {
          setTimeLeft(0);
        }
      } else {
        // Si estaba pausado, recuperar el timeLeft guardado
        const defaultTime = parsed.isTransitioning ? TRANSITION_TIME : currentSequence[parsed.currentStepIdx].time;
        setTimeLeft(parsed.savedTimeLeft || defaultTime);
      }
    } else {
      setTimeLeft(currentSequence[0].time);
    }
  }, []);

  // Efecto para guardar estado en cada cambio importante
  useEffect(() => {
    const stateToSave = {
      mode,
      currentStepIdx,
      endTime,
      isRunning,
      isTransitioning,
      savedTimeLeft: timeLeft
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [mode, currentStepIdx, endTime, isRunning, timeLeft, isTransitioning]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
    audioRef.current = new Audio(ALARM_SOUND_URL);
  }, []);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        if (wakeLock.current) return;
        wakeLock.current = await navigator.wakeLock.request('screen');
      }
    } catch (err) {
      console.warn(`No se pudo bloquear la pantalla: ${err}`);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLock.current) {
      await wakeLock.current.release();
      wakeLock.current = null;
    }
  };

  const triggerAlarm = () => {
    if (navigator.vibrate) navigator.vibrate([1000, 500, 1000, 500, 2000]); 
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log("Interacción requerida:", e));
    }
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Aqua+ Producción", {
        body: "¡Etapa finalizada! Ajuste válvulas.",
        icon: "/vite.svg", 
        vibrate: [200, 100, 200]
      } as any);
    }
  };

  const triggerShortBeep = () => {
    // Sonido corto para indicar fin de pausa y comienzo de proceso
    if (navigator.vibrate) navigator.vibrate([200]);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().then(() => setTimeout(() => audioRef.current?.pause(), 500)).catch(() => {});
    }
  };

  useEffect(() => {
    let interval: any;

    if (isRunning && endTime) {
      requestWakeLock(); 

      interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.ceil((endTime - now) / 1000);

        if (remaining <= 0) {
          // El tiempo llegó a cero
          
          if (isTransitioning) {
            // FIN DE LA PAUSA -> INICIAR SIGUIENTE PASO REAL
            triggerShortBeep();
            setIsTransitioning(false);
            
            // Avanzamos el índice ahora que ya ajustaron las válvulas
            const nextIdx = currentStepIdx + 1;
            setCurrentStepIdx(nextIdx);
            
            const nextStepTime = currentSequence[nextIdx].time;
            const newEndTime = Date.now() + nextStepTime * 1000;
            
            setEndTime(newEndTime);
            setTimeLeft(nextStepTime);

          } else {
            // FIN DEL PASO DE TRABAJO -> INICIAR PAUSA O TERMINAR
            triggerAlarm(); // Alarma fuerte para que vaya a mover válvulas

            if (currentStepIdx < currentSequence.length - 1) {
              // Hay un siguiente paso, iniciamos transición
              setIsTransitioning(true);
              const newEndTime = Date.now() + TRANSITION_TIME * 1000;
              setEndTime(newEndTime);
              setTimeLeft(TRANSITION_TIME);
            } else {
              // Fin total del proceso
              setIsRunning(false);
              setEndTime(null);
              releaseWakeLock();
              localStorage.removeItem(STORAGE_KEY);
              
              const msg = mode === 'backwash' 
                ? "¡PROCESO FINALIZADO! Tren de filtrado listo."
                : "¡REGENERACIÓN COMPLETADA! Suavizador operativo.";
              
              setTimeout(() => alert(msg), 500);

              if (mode === 'regen') {
                setHardness(5); 
                setShowRegenAlert(false);
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
    const duration = timeLeft > 0 ? timeLeft : (isTransitioning ? TRANSITION_TIME : currentSequence[currentStepIdx].time);
    const newEndTime = Date.now() + duration * 1000;
    
    setEndTime(newEndTime);
    setIsRunning(true);
    
    if(audioRef.current) {
      audioRef.current.load();
      audioRef.current.play().then(() => audioRef.current?.pause()).catch(() => {});
    }
  };

  const pauseSequence = () => {
    setIsRunning(false);
    setEndTime(null); 
    releaseWakeLock();
  };

  const changeMode = (newMode: 'backwash' | 'regen') => {
    if (isRunning) {
      if (!confirm("Hay un proceso en curso. ¿Deseas detenerlo para cambiar de modo?")) return;
      pauseSequence();
    }
    setMode(newMode);
    setCurrentStepIdx(0);
    setIsTransitioning(false);
    setTimeLeft(0);
    setEndTime(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const formatTime = (seconds: number) => {
    if (seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // UI Helpers
  const getProgressColor = () => {
    if (isTransitioning) return 'bg-violet-500';
    return mode === 'regen' ? 'bg-amber-500' : 'bg-sky-500';
  };

  const getStepStatus = (idx: number) => {
    if (idx < currentStepIdx) return 'bg-emerald-400'; // Pasado
    if (idx === currentStepIdx) {
      if (isTransitioning) return 'bg-emerald-400'; // Acaba de terminar, estamos en pausa antes del sig
      return mode === 'regen' ? 'bg-amber-500' : 'bg-sky-500'; // En curso
    }
    return 'bg-slate-200'; // Futuro
  };

  return (
    <div className="px-6 py-8 animate-fadeIn h-full bg-sky-50 overflow-y-auto pb-24 no-scrollbar">
      <ModuleHeader title="Planta de Producción" onBack={onBack} />

      <div className="space-y-6">
        
        {/* Mode Selector */}
        <div className="flex bg-white p-1.5 rounded-[2rem] shadow-sm">
          <button 
            onClick={() => changeMode('backwash')}
            disabled={isRunning}
            className={`flex-1 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'backwash' ? 'bg-sky-500 text-white shadow-md' : 'text-sky-300'} ${isRunning ? 'opacity-50' : ''}`}
          >
            Retrolavado
          </button>
          <button 
            onClick={() => changeMode('regen')}
            disabled={isRunning}
            className={`flex-1 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'regen' ? 'bg-amber-500 text-white shadow-md' : 'text-sky-300'} ${isRunning ? 'opacity-50' : ''}`}
          >
            Regeneración
          </button>
        </div>

        {/* Sequence Progress Bar */}
        <div className="flex justify-between gap-1 px-2">
          {currentSequence.map((s, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2">
              <div className={`h-2 w-full rounded-full transition-all duration-500 ${getStepStatus(idx)} ${idx === currentStepIdx && !isTransitioning ? 'scale-y-125 shadow-lg' : ''}`}></div>
            </div>
          ))}
        </div>

        {/* Main Control Card */}
        <RoundedCard className={`text-center border-none shadow-2xl relative overflow-hidden transition-colors duration-500 ${isTransitioning ? 'bg-violet-50 ring-4 ring-violet-200' : 'bg-white'}`}>
          {isRunning && (
            <div className="absolute top-2 right-4 animate-pulse">
               <i className="fas fa-lock text-emerald-500 text-xs"></i> <span className="text-[8px] font-bold text-emerald-600 uppercase">Pantalla Activa</span>
            </div>
          )}
          
          {/* Progress Line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-slate-100">
            <div 
              className={`h-full transition-all duration-1000 ${getProgressColor()}`} 
              style={{ width: `${
                isTransitioning 
                  ? ((TRANSITION_TIME - timeLeft) / TRANSITION_TIME) * 100 
                  : ((currentSequence[currentStepIdx].time - timeLeft) / currentSequence[currentStepIdx].time) * 100
              }%` }}
            ></div>
          </div>
          
          <div className="mb-6 pt-4">
            <div className={`w-fit mx-auto px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border ${
              isTransitioning 
                ? 'bg-violet-100 text-violet-600 border-violet-200 animate-bounce'
                : mode === 'regen' ? 'bg-amber-50 text-amber-500 border-amber-100' : 'bg-sky-50 text-sky-500 border-sky-100'
            }`}>
              {isTransitioning ? 'PAUSA TÉCNICA' : `Paso ${currentStepIdx + 1} de ${currentSequence.length}`}
            </div>
            
            {isTransitioning ? (
              <>
                <h3 className="text-2xl font-black text-violet-900 tracking-tight leading-none mb-2">AJUSTE VÁLVULAS</h3>
                <p className="font-bold text-xs uppercase text-violet-500">
                  Próximo: {currentSequence[currentStepIdx + 1]?.process}
                </p>
                <div className="mt-2 text-[9px] font-black text-violet-400 bg-white/50 inline-block px-3 py-1 rounded-lg">
                  El proceso continuará automáticamente
                </div>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-black text-sky-900 tracking-tight leading-none mb-1">{currentSequence[currentStepIdx].stage}</h3>
                <p className={`font-black uppercase text-xs tracking-widest ${mode === 'regen' ? 'text-amber-500' : 'text-sky-500'}`}>{currentSequence[currentStepIdx].process}</p>
              </>
            )}
          </div>

          <div className={`text-7xl font-mono font-black mb-8 tabular-nums tracking-tighter flex justify-center items-baseline ${isTransitioning ? 'text-violet-600' : 'text-sky-900'}`}>
            {isTransitioning ? timeLeft : formatTime(timeLeft)}
            <span className="text-lg text-sky-300 ml-2 font-sans font-bold">{isTransitioning ? 'seg' : 'min'}</span>
          </div>

          <div className="flex gap-3">
            {!isRunning ? (
              <button 
                onClick={startSequence} 
                className={`flex-1 text-white py-5 rounded-[2.5rem] font-black text-sm shadow-xl active:scale-95 transition-all ${
                  isTransitioning ? 'bg-violet-600 shadow-violet-200' :
                  mode === 'regen' ? 'bg-amber-500 shadow-amber-100' : 'bg-sky-600 shadow-sky-100'
                }`}
              >
                {timeLeft > 0 && timeLeft < (isTransitioning ? TRANSITION_TIME : currentSequence[currentStepIdx].time) 
                  ? 'REANUDAR' 
                  : mode === 'regen' ? 'INICIAR REGENERACIÓN' : 'INICIAR RETROLAVADO'}
              </button>
            ) : (
              <button 
                onClick={pauseSequence} 
                className="flex-1 bg-red-500 text-white py-5 rounded-[2.5rem] font-black text-sm shadow-xl shadow-red-100 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <i className="fas fa-pause"></i> PAUSAR PROCESO
              </button>
            )}
            
            {/* Botón para saltar espera si ya ajustaron rápido */}
            {isRunning && isTransitioning && (
               <button 
                 onClick={() => setEndTime(Date.now())} // Forzar fin de tiempo
                 className="w-16 bg-violet-200 text-violet-700 rounded-[2.5rem] flex items-center justify-center shadow-inner active:scale-95"
               >
                 <i className="fas fa-forward-step"></i>
               </button>
            )}
          </div>
        </RoundedCard>

        {/* Hardness Control (Solo visible si no es transición para limpiar UI) */}
        {!isTransitioning && (
          <section className="space-y-4 opacity-80 hover:opacity-100 transition-opacity">
            <div className="flex items-center justify-between px-2">
              <h4 className="text-[10px] font-black uppercase text-sky-400 tracking-widest">Estado de Resinas y Dureza</h4>
              <span className="text-[10px] font-bold text-sky-300">Medidor TDS/PPM</span>
            </div>
            
            <RoundedCard className="bg-white border-none shadow-lg py-4">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500">
                    <i className="fas fa-flask"></i>
                  </div>
                  <span className="text-sm font-black text-sky-900">Dureza del Agua</span>
                </div>
                <div className="flex items-center gap-2 bg-sky-50 p-1 rounded-2xl">
                  <button onClick={() => setHardness(Math.max(0, hardness - 1))} className="w-10 h-10 bg-white rounded-xl shadow-sm text-sky-600 font-black">-</button>
                  <span className="text-2xl font-black text-sky-900 w-12 text-center">{hardness}</span>
                  <button onClick={() => setHardness(hardness + 1)} className="w-10 h-10 bg-white rounded-xl shadow-sm text-sky-600 font-black">+</button>
                </div>
              </div>
              
              {hardness > 50 && (
                <div className="bg-red-50 border border-red-100 p-3 rounded-2xl flex items-center gap-3">
                  <i className="fas fa-triangle-exclamation text-red-500"></i>
                  <span className="text-[10px] font-bold text-red-700 uppercase">Regeneración Recomendada</span>
                </div>
              )}
            </RoundedCard>
          </section>
        )}

        {/* Maintenance Tips */}
        <RoundedCard className="bg-indigo-900 text-white shadow-indigo-100 border-none">
           <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                <i className="fas fa-lightbulb text-indigo-300"></i>
              </div>
              <div>
                <h5 className="font-black text-sm mb-1 uppercase tracking-tighter">Tip de Operador</h5>
                <p className="text-[10px] opacity-70 leading-relaxed font-bold">
                  {isTransitioning 
                    ? "¡Rápido! Asegúrate de alinear las válvulas correctamente para la siguiente etapa antes de que el contador llegue a cero."
                    : mode === 'backwash' 
                      ? "Mantén la presión estable durante el retrolavado para expandir la cama filtrante correctamente."
                      : "Verifica el nivel de salmuera antes de iniciar la succión."}
                </p>
              </div>
           </div>
        </RoundedCard>
      </div>
    </div>
  );
};
