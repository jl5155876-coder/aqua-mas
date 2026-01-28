
import React, { useState } from 'react';
import { useERPData } from '../hooks/useERPData';
import { ModuleHeader, RoundedCard, ActionButton } from './ui/Cards';
import { QualityRecord } from '../types';

const SENSORY_OPTIONS = {
  color: ['Incoloro', 'Cristalino', 'Amarillento', 'Turbio'],
  sabor: ['Insípido', 'Clorado', 'Metálico', 'Dulce'],
  turbiedad: ['Nula', 'Ligera', 'Media', 'Alta']
};

export const QualityModule: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { qualityRecords, addQualityRecord } = useERPData();
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [newRecord, setNewRecord] = useState<Partial<QualityRecord>>({
    type: 'Cruda',
    ph: 7.0,
    cloro: 0,
    tds: 0,
    dureza: 0,
    color: 'Incoloro',
    sabor: 'Insípido',
    turbiedad: 'Nula'
  });

  const handleSave = () => {
    addQualityRecord(newRecord as any);
    alert("Bitácora registrada correctamente.");
    setActiveTab('history');
  };

  const ParamInput = ({ label, value, onChange, unit, min, max, step, icon, subtitle }: any) => (
    <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-sky-50 transition-all active:scale-[0.98]">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <i className={`fas ${icon} text-sky-300 text-[10px]`}></i>
          <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest">{label}</span>
        </div>
        <span className="text-[9px] font-bold text-sky-300 uppercase">{unit}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <input 
            type="number" 
            step={step || 1}
            className="w-full font-black text-2xl text-sky-900 outline-none bg-transparent" 
            value={value}
            onChange={e => onChange(parseFloat(e.target.value) || 0)}
          />
          {subtitle && (
            <p className="text-[9px] font-bold text-sky-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => onChange(Math.max(min || 0, value - (step || 1)))} className="w-10 h-10 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center font-bold active:bg-sky-200 transition-colors">-</button>
          <button onClick={() => onChange(Math.min(max || 9999, value + (step || 1)))} className="w-10 h-10 bg-sky-600 text-white rounded-2xl flex items-center justify-center font-bold shadow-lg shadow-sky-100 active:bg-sky-700 transition-colors">+</button>
        </div>
      </div>
    </div>
  );

  const SensorySelector = ({ label, options, current, onSelect, icon }: any) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-2">
        <i className={`fas ${icon} text-sky-300 text-[10px]`}></i>
        <label className="text-[10px] font-black text-sky-400 uppercase tracking-widest">{label}</label>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt: string) => (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-tighter transition-all border ${
              current === opt 
                ? 'bg-teal-500 text-white border-teal-500 shadow-md scale-105' 
                : 'bg-white text-sky-400 border-sky-50'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="h-full bg-sky-50 flex flex-col animate-fadeIn overflow-hidden pb-24">
      <ModuleHeader title="Bitácoras de Calidad" onBack={onBack} />
      
      <div className="px-6 flex gap-2 mb-4 shrink-0">
        <button onClick={() => setActiveTab('new')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'new' ? 'bg-teal-500 text-white shadow-lg' : 'bg-white text-sky-400'}`}>Nueva Bitácora</button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-teal-500 text-white shadow-lg' : 'bg-white text-sky-400'}`}>Historial</button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-6 no-scrollbar pb-10">
        {activeTab === 'new' ? (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex p-1.5 bg-white rounded-[2rem] shadow-sm gap-1">
              {['Cruda', 'Producto'].map(type => (
                <button 
                  key={type} 
                  onClick={() => setNewRecord({...newRecord, type: type as any})}
                  className={`flex-1 py-3.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${newRecord.type === type ? 'bg-teal-500 text-white shadow-sm' : 'text-sky-300'}`}
                >
                  Agua {type}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3">
              <ParamInput icon="fa-vial" label="Potencial de Hidrógeno (pH)" unit="pH" value={newRecord.ph} step={0.1} min={0} max={14} onChange={(ph:any) => setNewRecord({...newRecord, ph})}/>
              <ParamInput icon="fa-atom" label="Sólidos Totales Disueltos (TDS)" unit="PPM" value={newRecord.tds} onChange={(tds:any) => setNewRecord({...newRecord, tds})}/>
              <ParamInput 
                icon="fa-gem" 
                label="Dureza Total" 
                unit="Gotas" 
                value={newRecord.dureza} 
                onChange={(dureza:any) => setNewRecord({...newRecord, dureza})}
                subtitle={`Equivalencia: ${newRecord.dureza} Grains (GPG) ≈ ${(newRecord.dureza! * 17.1).toFixed(1)} PPM`}
              />
              <ParamInput icon="fa-eye-dropper" label="Cloro Residual" unit="mg/L" value={newRecord.cloro} step={0.1} onChange={(cloro:any) => setNewRecord({...newRecord, cloro})}/>
            </div>

            <div className="bg-sky-100/30 p-6 rounded-[2.5rem] space-y-5 border border-white">
              <SensorySelector icon="fa-palette" label="Color" options={SENSORY_OPTIONS.color} current={newRecord.color} onSelect={(color:string) => setNewRecord({...newRecord, color})} />
              <SensorySelector icon="fa-utensils" label="Sabor" options={SENSORY_OPTIONS.sabor} current={newRecord.sabor} onSelect={(sabor:string) => setNewRecord({...newRecord, sabor})} />
              <SensorySelector icon="fa-wind" label="Turbiedad" options={SENSORY_OPTIONS.turbiedad} current={newRecord.turbiedad} onSelect={(turbiedad:string) => setNewRecord({...newRecord, turbiedad})} />
            </div>

            <ActionButton onClick={handleSave} variant="primary">Guardar Registro de Calidad</ActionButton>
          </div>
        ) : (
          <div className="space-y-4 animate-fadeIn">
            {qualityRecords.length === 0 ? (
              <div className="text-center py-20 text-sky-300 italic flex flex-col items-center gap-4">
                <i className="fas fa-book-open text-5xl opacity-20"></i>
                No hay registros aún.
              </div>
            ) : (
              qualityRecords.map(r => (
                <RoundedCard key={r.id} className="p-5 border-none shadow-sm relative overflow-hidden group">
                  <div className={`absolute left-0 top-0 bottom-0 w-2 ${r.type === 'Cruda' ? 'bg-amber-400' : 'bg-teal-500'}`}></div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="pl-2">
                      <h4 className="font-black text-sky-900 text-base leading-tight">Agua {r.type}</h4>
                      <p className="text-[10px] text-sky-400 font-bold uppercase">{new Date(r.timestamp).toLocaleString()}</p>
                    </div>
                    <span className="text-[9px] font-black text-sky-200 uppercase tracking-widest">{r.id}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-6 pl-2">
                    <div className="flex justify-between border-b border-sky-50 pb-1">
                      <span className="text-[9px] font-bold text-sky-400 uppercase">pH</span>
                      <span className="text-xs font-black text-sky-900">{r.ph}</span>
                    </div>
                    <div className="flex justify-between border-b border-sky-50 pb-1">
                      <span className="text-[9px] font-bold text-sky-400 uppercase">TDS</span>
                      <span className="text-xs font-black text-sky-900">{r.tds}</span>
                    </div>
                    <div className="flex justify-between border-b border-sky-50 pb-1">
                      <span className="text-[9px] font-bold text-sky-400 uppercase">Cloro</span>
                      <span className="text-xs font-black text-sky-900">{r.cloro}</span>
                    </div>
                    <div className="flex justify-between border-b border-sky-50 pb-1">
                      <span className="text-[9px] font-bold text-sky-400 uppercase">Dureza</span>
                      <span className="text-xs font-black text-sky-900">{r.dureza} gotas</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-sky-50 pl-2 flex flex-wrap gap-2">
                    <span className="text-[8px] bg-sky-50 text-sky-600 px-2 py-1 rounded-full font-black uppercase">Color: {r.color}</span>
                    <span className="text-[8px] bg-sky-50 text-sky-600 px-2 py-1 rounded-full font-black uppercase">Sabor: {r.sabor}</span>
                    <span className="text-[8px] bg-sky-50 text-sky-600 px-2 py-1 rounded-full font-black uppercase">Turb.: {r.turbiedad}</span>
                  </div>
                </RoundedCard>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
