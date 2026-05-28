
import React, { useState, useMemo } from 'react';
import { useERPData } from '../hooks/useERPData';
import { ModuleHeader, RoundedCard, ActionButton } from './ui/Cards';
import { QualityRecord } from '../types';

const SENSORY_OPTIONS = {
  color: ['Incoloro', 'Cristalino', 'Amarillento', 'Turbio'],
  sabor: ['Insípido', 'Clorado', 'Metálico', 'Dulce'],
  turbiedad: ['Nula', 'Ligera', 'Media', 'Alta']
};

// NORMATIVA (Based roughly on NOM-201-SSA1-2015 & NOM-127)
const NORMS = {
    ph: { min: 6.5, max: 8.5, ideal: 7.0 },
    tds: { min: 0, max: 500, ideal: 50 }, // Purified often <100
    cloro: { min: 0.2, max: 1.5, ideal: 0.5 }, // Residual free chlorine
    dureza: { min: 0, max: 200, ideal: 0 } // Ideally soft
};

export const QualityModule: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { qualityRecords, addQualityRecord, addNotification } = useERPData();
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [newRecord, setNewRecord] = useState<Partial<QualityRecord>>({
    type: 'Producto', // Default to finished product
    ph: 7.0,
    cloro: 0.5,
    tds: 40,
    dureza: 0,
    color: 'Cristalino',
    sabor: 'Insípido',
    turbiedad: 'Nula'
  });

  // --- VALIDATION LOGIC ---
  const getStatus = (val: number, type: 'ph' | 'tds' | 'cloro' | 'dureza') => {
      const norm = NORMS[type];
      if (val >= norm.min && val <= norm.max) return 'good';
      // Warning buffer (10%)
      const buffer = (norm.max - norm.min) * 0.1;
      if (val >= norm.min - buffer && val <= norm.max + buffer) return 'warning';
      return 'danger';
  };

  const isBatchCertified = useMemo(() => {
      if (newRecord.type === 'Cruda') return true; // Raw water standards allow more variance usually, but keep simple
      
      const phStatus = getStatus(newRecord.ph || 0, 'ph');
      const tdsStatus = getStatus(newRecord.tds || 0, 'tds');
      const cloroStatus = getStatus(newRecord.cloro || 0, 'cloro');
      const durezaStatus = getStatus(newRecord.dureza || 0, 'dureza');
      
      // Sensory Check
      const sensoryOK = newRecord.color === 'Cristalino' || newRecord.color === 'Incoloro';
      const flavorOK = newRecord.sabor === 'Insípido';

      return phStatus === 'good' && tdsStatus === 'good' && cloroStatus === 'good' && durezaStatus === 'good' && sensoryOK && flavorOK;
  }, [newRecord]);

  const handleSave = () => {
    if (!isBatchCertified) {
      setShowConfirmModal(true);
      return;
    }
    executeSave();
  };

  const executeSave = () => {
    addQualityRecord(newRecord as any);
    addNotification({
      title: isBatchCertified ? "Lote Certificado" : "Lote Registrado",
      message: isBatchCertified ? "El lote ha sido certificado y registrado correctamente." : "Bitácora guardada con observaciones fuera de norma.",
      type: isBatchCertified ? 'info' : 'warning'
    });
    setActiveTab('history');
    setShowConfirmModal(false);
  };

  // --- UI COMPONENTS ---
  const SmartGauge = ({ label, value, onChange, type, unit, step }: any) => {
      const status = getStatus(value, type);
      const norm = NORMS[type as keyof typeof NORMS];
      
      // Colors
      const colorClass = status === 'good' ? 'text-emerald-500' : status === 'warning' ? 'text-amber-500' : 'text-rose-500';
      const bgClass = status === 'good' ? 'bg-emerald-50 border-emerald-100' : status === 'warning' ? 'bg-amber-50 border-amber-100' : 'bg-rose-50 border-rose-100';
      const barColor = status === 'good' ? 'bg-emerald-400' : status === 'warning' ? 'bg-amber-400' : 'bg-rose-400';

      // Percentage for bar (Clamped 0-100 relative to max norm * 1.5)
      const maxDisplay = norm.max * 1.5;
      const percent = Math.min((value / maxDisplay) * 100, 100);

      return (
        <div className={`p-5 rounded-[2rem] border transition-all ${bgClass}`}>
            <div className="flex justify-between items-end mb-2">
                <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{label}</label>
                    <div className="flex items-center gap-2">
                        <input 
                            type="number" 
                            step={step}
                            className={`text-3xl font-black bg-transparent outline-none w-24 ${colorClass}`}
                            value={value}
                            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                        />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{unit}</span>
                    </div>
                </div>
                <div className="text-right">
                    <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded-lg ${status === 'good' ? 'bg-white text-emerald-500' : 'bg-white text-rose-500'}`}>
                        {status === 'good' ? 'EN NORMA' : 'REVISAR'}
                    </span>
                </div>
            </div>
            
            {/* Visual Gauge Bar */}
            <div className="relative h-3 bg-white rounded-full overflow-hidden shadow-inner">
                <div className={`absolute top-0 left-0 h-full ${barColor} transition-all duration-500 rounded-full`} style={{ width: `${percent}%` }}></div>
                {/* Norm Markers */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-slate-300 opacity-50" style={{ left: `${(norm.min / maxDisplay)*100}%` }}></div>
                <div className="absolute top-0 bottom-0 w-0.5 bg-slate-300 opacity-50" style={{ left: `${(norm.max / maxDisplay)*100}%` }}></div>
            </div>
            <div className="flex justify-between text-[8px] text-slate-400 font-bold mt-1 px-1">
                <span>0</span>
                <span>Rango: {norm.min}-{norm.max}</span>
                <span>{maxDisplay}</span>
            </div>
        </div>
      );
  };

  const SensoryButton = ({ label, options, current, onSelect }: any) => (
    <div>
        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-2 block">{label}</label>
        <div className="flex flex-wrap gap-2">
            {options.map((opt: string) => {
                const isSelected = current === opt;
                // Highlight logic for "Bad" sensory values
                const isBad = (label === 'Color' && opt !== 'Cristalino' && opt !== 'Incoloro') || 
                              (label === 'Sabor' && opt !== 'Insípido') ||
                              (label === 'Turbiedad' && opt !== 'Nula');
                
                return (
                    <button
                        key={opt}
                        onClick={() => onSelect(opt)}
                        className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all border ${
                            isSelected 
                                ? (isBad ? 'bg-rose-500 text-white border-rose-500 shadow-md' : 'bg-teal-500 text-white border-teal-500 shadow-md')
                                : 'bg-white text-slate-400 border-slate-100 hover:border-teal-200'
                        }`}
                    >
                        {opt}
                    </button>
                );
            })}
        </div>
    </div>
  );

  return (
    <div className="h-full bg-slate-50 flex flex-col animate-fadeIn overflow-hidden pb-24">
      <ModuleHeader title="Laboratorio de Calidad" onBack={onBack} />
      
      <div className="px-6 flex gap-2 mb-4 shrink-0">
        <button onClick={() => setActiveTab('new')} className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'new' ? 'bg-teal-600 text-white shadow-lg' : 'bg-white text-slate-400'}`}>Nueva Muestra</button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-teal-600 text-white shadow-lg' : 'bg-white text-slate-400'}`}>Bitácora</button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-6 no-scrollbar pb-10">
        {activeTab === 'new' ? (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Certification Status Header */}
            <div className={`p-5 rounded-[2.5rem] shadow-sm flex items-center justify-between transition-colors duration-500 ${isBatchCertified ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-white text-slate-500 border border-slate-100'}`}>
                <div>
                    <p className="text-[10px] font-black uppercase opacity-80 tracking-widest mb-1">Estado del Lote</p>
                    <h3 className="text-xl font-black">{isBatchCertified ? 'CALIDAD CERTIFICADA' : 'REVISIÓN REQUERIDA'}</h3>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${isBatchCertified ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-300'}`}>
                    <i className={`fas ${isBatchCertified ? 'fa-certificate' : 'fa-triangle-exclamation'}`}></i>
                </div>
            </div>

            {/* Type Selector */}
            <div className="flex p-1.5 bg-white rounded-[2rem] shadow-sm gap-1">
              {['Cruda', 'Producto'].map(type => (
                <button 
                  key={type} 
                  onClick={() => setNewRecord({...newRecord, type: type as any})}
                  className={`flex-1 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${newRecord.type === type ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  Agua {type}
                </button>
              ))}
            </div>

            {/* Gauges Grid */}
            <div className="grid grid-cols-1 gap-4">
                <SmartGauge label="pH (Potencial H)" value={newRecord.ph} type="ph" unit="pH" step={0.1} onChange={(v:any) => setNewRecord({...newRecord, ph: v})} />
                <SmartGauge label="Cloro Residual" value={newRecord.cloro} type="cloro" unit="mg/L" step={0.1} onChange={(v:any) => setNewRecord({...newRecord, cloro: v})} />
                <SmartGauge label="Sólidos (TDS)" value={newRecord.tds} type="tds" unit="PPM" step={1} onChange={(v:any) => setNewRecord({...newRecord, tds: v})} />
                <SmartGauge label="Dureza" value={newRecord.dureza} type="dureza" unit="mg/L" step={1} onChange={(v:any) => setNewRecord({...newRecord, dureza: v})} />
            </div>

            {/* Sensory Section */}
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50 space-y-5">
                <h4 className="text-xs font-black text-slate-800 uppercase border-b border-slate-50 pb-2">Análisis Organoléptico</h4>
                <SensoryButton label="Apariencia / Color" options={SENSORY_OPTIONS.color} current={newRecord.color} onSelect={(v:string) => setNewRecord({...newRecord, color: v})} />
                <SensoryButton label="Sabor" options={SENSORY_OPTIONS.sabor} current={newRecord.sabor} onSelect={(v:string) => setNewRecord({...newRecord, sabor: v})} />
                <SensoryButton label="Turbiedad" options={SENSORY_OPTIONS.turbiedad} current={newRecord.turbiedad} onSelect={(v:string) => setNewRecord({...newRecord, turbiedad: v})} />
            </div>

            <ActionButton onClick={handleSave} variant={isBatchCertified ? 'primary' : 'secondary'}>
                {isBatchCertified ? 'Registrar Lote Correcto' : 'Registrar Incidencia'}
            </ActionButton>
          </div>
        ) : (
          <div className="space-y-4 animate-fadeIn">
            {qualityRecords.length === 0 ? (
              <div className="text-center py-20 text-slate-300 italic flex flex-col items-center gap-4">
                <i className="fas fa-microscope text-5xl opacity-20"></i>
                Sin registros en bitácora.
              </div>
            ) : (
              qualityRecords.slice().reverse().map(r => {
                  // Quick check for status
                  const isOK = r.ph >= NORMS.ph.min && r.ph <= NORMS.ph.max && r.cloro >= NORMS.cloro.min && r.cloro <= NORMS.cloro.max && r.dureza >= NORMS.dureza.min && r.dureza <= NORMS.dureza.max;
                  
                  return (
                    <RoundedCard key={r.id} className="p-0 border-none shadow-sm relative overflow-hidden group">
                      <div className={`h-2 w-full ${isOK ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                      <div className="p-5">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="flex items-center gap-2">
                                  <h4 className="font-black text-slate-800 text-sm">Agua {r.type}</h4>
                                  {!isOK && <i className="fas fa-triangle-exclamation text-amber-500 text-xs"></i>}
                              </div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(r.timestamp).toLocaleString()}</p>
                            </div>
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{r.id}</span>
                          </div>
                          
                          <div className="flex justify-between text-center divide-x divide-slate-100">
                             <div className="px-2 flex-1">
                                <p className="text-[8px] font-black uppercase text-slate-400">pH</p>
                                <p className={`text-sm font-black ${r.ph < NORMS.ph.min || r.ph > NORMS.ph.max ? 'text-rose-500' : 'text-slate-700'}`}>{r.ph}</p>
                             </div>
                             <div className="px-2 flex-1">
                                <p className="text-[8px] font-black uppercase text-slate-400">Cloro</p>
                                <p className={`text-sm font-black ${r.cloro < NORMS.cloro.min || r.cloro > NORMS.cloro.max ? 'text-rose-500' : 'text-slate-700'}`}>{r.cloro}</p>
                             </div>
                             <div className="px-2 flex-1">
                                <p className="text-[8px] font-black uppercase text-slate-400">TDS</p>
                                <p className="text-sm font-black text-slate-700">{r.tds}</p>
                             </div>
                             <div className="px-2 flex-1">
                                <p className="text-[8px] font-black uppercase text-slate-400">Dureza</p>
                                <p className={`text-sm font-black ${r.dureza < NORMS.dureza.min || r.dureza > NORMS.dureza.max ? 'text-rose-500' : 'text-slate-700'}`}>{r.dureza}</p>
                             </div>
                          </div>
                      </div>
                    </RoundedCard>
                  );
              })
            )}
          </div>
        )}
      </div>
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 animate-fadeIn">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowConfirmModal(false)}></div>
          <div className="relative bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl animate-scaleIn text-center">
            <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">
              <i className="fas fa-triangle-exclamation"></i>
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">Fuera de Norma</h3>
            <p className="text-slate-500 text-sm font-bold leading-relaxed mb-8">
              Los parámetros actuales no cumplen con la normativa de calidad. ¿Deseas guardar el registro con observaciones de todos modos?
            </p>
            <div className="space-y-3">
              <button 
                onClick={executeSave}
                className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-200 active:scale-95 transition-all"
              >
                Guardar con Observaciones
              </button>
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
              >
                Cancelar y Revisar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
