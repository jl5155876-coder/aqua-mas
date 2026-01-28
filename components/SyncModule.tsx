
import React, { useState, useEffect } from 'react';
import { useERPData } from '../hooks/useERPData';
import { ModuleHeader, RoundedCard, ActionButton } from './ui/Cards';

interface SyncModuleProps {
  onBack: () => void;
  onScanRequest: () => void;
  scannedId?: string;
}

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export const SyncModule: React.FC<SyncModuleProps> = ({ onBack, scannedId }) => {
  const { sales, customers, syncData, cloudConfig, setCloudConfig } = useERPData();
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [editingConfig, setEditingConfig] = useState(false);
  const [tempConfig, setTempConfig] = useState(cloudConfig);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 4)]);
  };

  const handleSaveConfig = () => {
    // Validaciones básicas de URL de Firebase
    let url = tempConfig.url.trim();
    if (url && !url.endsWith('/')) url += '/';
    
    setCloudConfig({ ...tempConfig, url });
    setEditingConfig(false);
    addLog("Configuración guardada.");
  };

  const performSync = async () => {
    if (!cloudConfig.url) {
      alert("Configura primero la URL de tu base de datos (Firebase).");
      setEditingConfig(true);
      return;
    }

    setStatus('syncing');
    addLog("Iniciando conexión segura SSL...");

    try {
      // 1. PUSH: Subir datos locales
      // Usamos PUT para reemplazar nodo específico de este dispositivo o PATCH para mezclar
      // Para simplificar esta demo, asumimos una estructura plana "erp_data"
      // En producción, se usaría una estructura /sales/{id} y /customers/{id} con PATCH
      
      const endpoint = `${cloudConfig.url}aqua_data.json${cloudConfig.apiKey ? `?auth=${cloudConfig.apiKey}` : ''}`;
      
      addLog("Subiendo datos locales...");
      const uploadPayload = {
        sales: sales,
        customers: customers,
        lastUpdated: Date.now(),
        deviceUser: 'AquaPro Mobile'
      };

      // Primero obtenemos lo que hay para no sobrescribir ciegamente (Merge manual simple)
      const getResponse = await fetch(endpoint);
      if (!getResponse.ok) throw new Error(`Error conexión: ${getResponse.statusText}`);
      
      const cloudData = await getResponse.json();
      
      let mergedSales = [...sales];
      let mergedCustomers = [...customers];

      if (cloudData) {
        addLog("Descargando cambios remotos...");
        
        // Merge Lógica: Nube + Local
        if (cloudData.sales) {
          const localIds = new Set(sales.map(s => s.id));
          const newCloudSales = (cloudData.sales as any[]).filter((s: any) => !localIds.has(s.id));
          mergedSales = [...mergedSales, ...newCloudSales];
        }

        if (cloudData.customers) {
          // Asumimos que la nube tiene la verdad para clientes existentes o fusionamos
          const localCustMap = new Map(customers.map(c => [c.id, c]));
          (cloudData.customers as any[]).forEach((c: any) => {
             localCustMap.set(c.id, c); // Cloud gana en conflicto simple
          });
          mergedCustomers = Array.from(localCustMap.values());
        }

        // Aplicar a estado local
        syncData({ sales: mergedSales, customers: mergedCustomers });
      }

      // Subir la versión fusionada (Snapshot total para consistencia en este modelo simple)
      // Nota: En producción real usaríamos updates atómicos.
      const putResponse = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sales: mergedSales,
          customers: mergedCustomers,
          lastUpdated: Date.now()
        })
      });

      if (!putResponse.ok) throw new Error("Error al escribir en nube");

      setCloudConfig(prev => ({ ...prev, lastSync: Date.now() }));
      setStatus('success');
      addLog("¡Sincronización Completada!");

    } catch (error: any) {
      console.error(error);
      setStatus('error');
      addLog(`Error: ${error.message}`);
    } finally {
      setTimeout(() => setStatus(prev => prev === 'syncing' ? 'idle' : prev), 2000);
    }
  };

  // Auto-sync effect
  useEffect(() => {
    if (cloudConfig.autoSync && cloudConfig.url && status === 'idle') {
      const timer = setInterval(() => {
        // Sync cada 5 minutos si está en auto
        const minsSince = cloudConfig.lastSync ? (Date.now() - cloudConfig.lastSync) / 60000 : 999;
        if (minsSince > 5) {
          performSync();
        }
      }, 60000);
      return () => clearInterval(timer);
    }
  }, [cloudConfig, status]);

  if (editingConfig) {
    return (
      <div className="h-full bg-slate-50 animate-fadeIn pb-24 overflow-y-auto">
        <ModuleHeader title="Configurar Nube" onBack={() => setEditingConfig(false)} />
        <div className="px-6 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] shadow-lg border border-indigo-100">
             <div className="flex items-center gap-3 mb-4">
                <i className="fas fa-fire text-amber-500 text-2xl"></i>
                <h3 className="font-black text-sky-900">Firebase Realtime DB</h3>
             </div>
             <p className="text-xs text-slate-500 mb-6 leading-relaxed">
               Conecta tu ERP a una base de datos Firebase para sincronización en tiempo real a través de internet (sin necesidad de estar en la misma red Wi-Fi).
             </p>

             <div className="space-y-4">
               <div>
                 <label className="text-[10px] font-black uppercase text-sky-400 ml-2">URL de la Base de Datos</label>
                 <input 
                   type="url" 
                   placeholder="https://mi-proyecto.firebaseio.com/" 
                   className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-sky-900 focus:ring-2 ring-indigo-300 transition-all text-xs"
                   value={tempConfig.url}
                   onChange={e => setTempConfig({...tempConfig, url: e.target.value})}
                 />
                 <p className="text-[9px] text-slate-400 mt-1 ml-2">Copia esto desde la consola de Firebase {'>'} Realtime Database.</p>
               </div>

               <div>
                 <label className="text-[10px] font-black uppercase text-sky-400 ml-2">Secreto de Base de Datos (Auth)</label>
                 <input 
                   type="password" 
                   placeholder="Token de secreto..." 
                   className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-sky-900 focus:ring-2 ring-indigo-300 transition-all text-xs"
                   value={tempConfig.apiKey}
                   onChange={e => setTempConfig({...tempConfig, apiKey: e.target.value})}
                 />
                 <p className="text-[9px] text-slate-400 mt-1 ml-2">Configuración del Proyecto {'>'} Cuentas de servicio {'>'} Secretos.</p>
               </div>

               <div className="flex items-center gap-3 bg-indigo-50 p-4 rounded-2xl">
                 <div 
                   onClick={() => setTempConfig({...tempConfig, autoSync: !tempConfig.autoSync})}
                   className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer ${tempConfig.autoSync ? 'bg-indigo-500' : 'bg-slate-300'}`}
                 >
                   <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${tempConfig.autoSync ? 'translate-x-5' : ''}`}></div>
                 </div>
                 <span className="text-xs font-bold text-indigo-900">Sincronización Automática (5 min)</span>
               </div>
             </div>
          </div>
          <ActionButton onClick={handleSaveConfig}>Guardar Conexión</ActionButton>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-900 text-white flex flex-col animate-fadeIn overflow-hidden pb-24">
      <div className="px-6 pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center active:scale-90 transition-transform">
            <i className="fas fa-arrow-left"></i>
          </button>
          <div>
            <h2 className="text-xl font-black tracking-tight">Aqua Cloud</h2>
            <div className="flex items-center gap-2">
               <div className={`w-2 h-2 rounded-full ${cloudConfig.url ? 'bg-emerald-400' : 'bg-red-500'}`}></div>
               <span className="text-[10px] font-bold uppercase opacity-70">{cloudConfig.url ? 'Configurado' : 'Sin Conexión'}</span>
            </div>
          </div>
        </div>
        <button onClick={() => setEditingConfig(true)} className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-sm active:bg-white/20">
          <i className="fas fa-gear"></i>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-8 no-scrollbar pb-10 flex flex-col justify-center">
        
        <div className="relative">
           {/* Status Ring */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border-4 border-indigo-500/20"></div>
           <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border-t-4 border-indigo-500 transition-all duration-1000 ${status === 'syncing' ? 'animate-spin' : ''}`}></div>
           
           <div className="flex flex-col items-center justify-center relative z-10">
              <div className={`w-32 h-32 rounded-full flex items-center justify-center text-5xl shadow-[0_0_50px_rgba(99,102,241,0.3)] transition-all ${status === 'syncing' ? 'bg-indigo-600 scale-110' : status === 'success' ? 'bg-emerald-500' : status === 'error' ? 'bg-red-500' : 'bg-slate-800 border border-slate-700'}`}>
                 <i className={`fas ${status === 'syncing' ? 'fa-rotate animate-spin' : status === 'success' ? 'fa-check' : status === 'error' ? 'fa-triangle-exclamation' : 'fa-cloud'}`}></i>
              </div>
              
              <h3 className="text-2xl font-black mt-6 mb-1">
                {status === 'syncing' ? 'Sincronizando...' : status === 'success' ? 'Todo al día' : 'Nube Aqua+'}
              </h3>
              
              {cloudConfig.lastSync ? (
                <p className="text-xs font-mono opacity-50 bg-black/20 px-3 py-1 rounded-full">
                  Última vez: {new Date(cloudConfig.lastSync).toLocaleTimeString()}
                </p>
              ) : (
                <p className="text-xs font-bold opacity-50">Nunca sincronizado</p>
              )}
           </div>
        </div>

        <div className="space-y-4">
           <button 
             onClick={performSync}
             disabled={status === 'syncing'}
             className="w-full bg-white text-indigo-900 py-6 rounded-[2.5rem] font-black uppercase text-sm tracking-widest shadow-2xl shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
           >
             {status === 'syncing' ? 'Procesando...' : 'Sincronizar Ahora'}
             {!status.includes('sync') && <i className="fas fa-arrow-right-arrow-left"></i>}
           </button>

           <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                 <p className="text-[10px] font-black uppercase opacity-40 mb-1">Ventas Locales</p>
                 <p className="text-xl font-black">{sales.length}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                 <p className="text-[10px] font-black uppercase opacity-40 mb-1">Clientes</p>
                 <p className="text-xl font-black">{customers.length}</p>
              </div>
           </div>
        </div>

        {/* Console Log */}
        <div className="bg-black/40 rounded-2xl p-4 font-mono text-[9px] h-32 overflow-hidden border border-white/5 relative">
          <div className="flex justify-between items-center mb-2 opacity-50 sticky top-0">
            <span>ACTIVITY LOG</span>
            <i className="fas fa-terminal"></i>
          </div>
          <div className="space-y-1">
            {logs.length === 0 && <span className="opacity-30">Esperando acción...</span>}
            {logs.map((log, i) => (
              <div key={i} className="opacity-80 border-l-2 border-indigo-500 pl-2">{log}</div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};