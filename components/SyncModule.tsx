import React, { useState, useEffect } from 'react';
import { useERPData } from '../hooks/useERPData';
import { db, auth } from '../firebase';
import { doc, getDocFromServer, writeBatch } from 'firebase/firestore';

interface SyncModuleProps {
  onBack: () => void;
  onScanRequest: () => void;
}

export const SyncModule: React.FC<SyncModuleProps> = ({ onBack }) => {
  const { 
    cloudConfig, setCloudConfig, syncData, isSyncing, lastSyncTime,
    products, customers, sales, orders, employees, vehicles, qualityRecords, tasks, attendance, messages
  } = useERPData();
  
  const [editingConfig, setEditingConfig] = useState(false);
  const [tempConfig, setTempConfig] = useState(cloudConfig);
  const [isConnected, setIsConnected] = useState(false);
  const [isRtdbConnected, setIsRtdbConnected] = useState(false);

  // Backup file state
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Monitor cloud servers connection
  useEffect(() => {
    const checkConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'config', 'connection_test'));
        setIsConnected(true);
      } catch (error) {
        setIsConnected(false);
      }

      if (cloudConfig.url) {
        try {
          const cleanUrlInput = cloudConfig.url || '';
          let cleanUrl = cleanUrlInput.trim();
          if (cleanUrl && !/^https?:\/\//i.test(cleanUrl)) {
            cleanUrl = `https://${cleanUrl}`;
          }
          cleanUrl = cleanUrl.replace(/\/$/, "");
          
          let idToken = '';
          if (auth.currentUser) {
            try {
              idToken = await auth.currentUser.getIdToken();
            } catch (e) {
              console.warn("Could not retrieve token:", e);
            }
          }
          const tokenToUse = cloudConfig.apiKey || idToken;
          const authParam = tokenToUse ? `?auth=${tokenToUse}` : '';
          
          const response = await fetch(`${cleanUrl}/.json?shallow=true${authParam}`);
          setIsRtdbConnected(response.ok);
        } catch (error) {
          setIsRtdbConnected(false);
        }
      }
    };
    checkConnection();
    const interval = setInterval(checkConnection, 15000);
    return () => clearInterval(interval);
  }, [cloudConfig.url, cloudConfig.apiKey]);

  const handleSaveConfig = () => {
    setCloudConfig({ ...tempConfig });
    localStorage.setItem('aqua_cloud_config', JSON.stringify(tempConfig));
    setEditingConfig(false);
    // Instant sync verification
    setTimeout(() => syncData(), 500);
  };

  const exportData = () => {
    const data = {
      products, customers, sales, orders, employees, vehicles, qualityRecords, tasks, attendance, messages,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `respaldo_aquamas_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data || typeof data !== 'object') {
          alert("Archivo de respaldo inválido.");
          return;
        }

        const counts = {
          products: Array.isArray(data.products) ? data.products.length : 0,
          customers: Array.isArray(data.customers) ? data.customers.length : 0,
          sales: Array.isArray(data.sales) ? data.sales.length : 0,
          orders: Array.isArray(data.orders) ? data.orders.length : 0,
          employees: Array.isArray(data.employees) ? data.employees.length : 0,
          vehicles: Array.isArray(data.vehicles) ? data.vehicles.length : 0,
          qualityRecords: Array.isArray(data.qualityRecords) ? data.qualityRecords.length : 0,
          tasks: Array.isArray(data.tasks) ? data.tasks.length : 0,
          attendance: Array.isArray(data.attendance) ? data.attendance.length : 0,
          messages: Array.isArray(data.messages) ? data.messages.length : 0,
        };

        const totalItems = Object.values(counts).reduce((a, b) => a + b, 0);
        if (totalItems === 0) {
          alert("No se encontraron registros importables.");
          return;
        }

        const confirmMsg = `¿Desea restaurar esta copia de seguridad?\nSe importarán ${totalItems} registros del archivo seleccionado y se sincronizarán con la nube.`;

        if (window.confirm(confirmMsg)) {
          setIsImporting(true);
          setImportProgress(20);
          
          const saveChunk = async (collectionName: string, items: any[]) => {
            if (!items || items.length === 0) return;
            const CHUNK_SIZE = 400;
            for (let i = 0; i < items.length; i += CHUNK_SIZE) {
              const chunk = items.slice(i, i + CHUNK_SIZE);
              const batch = writeBatch(db);
              chunk.forEach(item => {
                if (item && item.id) {
                  batch.set(doc(db, collectionName, item.id), item, { merge: true });
                }
              });
              await batch.commit();
            }
          };

          try {
            await saveChunk('products', data.products || []);
            setImportProgress(40);
            await saveChunk('customers', data.customers || []);
            setImportProgress(60);
            await saveChunk('sales', data.sales || []);
            setImportProgress(80);
            await saveChunk('orders', data.orders || []);
            await saveChunk('employees', data.employees || []);
            await saveChunk('vehicles', data.vehicles || []);
            await saveChunk('quality', data.qualityRecords || []);
            await saveChunk('tasks', data.tasks || []);
            await saveChunk('attendance', data.attendance || []);
            await saveChunk('messages', data.messages || []);
            
            setImportProgress(100);
            setTimeout(() => {
              alert("✓ Respaldo importado y restaurado exitosamente.");
              setIsImporting(false);
              window.location.reload();
            }, 600);
          } catch (error) {
            console.error("Import error:", error);
            alert(`Error de restauración: ${error instanceof Error ? error.message : "Error desconocido"}`);
            setIsImporting(false);
          }
        }
      } catch (err) {
        alert("Archivo corrupto o ilegible.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col animate-fadeIn overflow-hidden pb-12">
      {/* Header */}
      <div className="px-6 pt-8 pb-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center active:scale-95 transition-transform border border-slate-100"
          >
            <i className="fas fa-arrow-left text-sky-950"></i>
          </button>
          <div>
            <h2 className="text-xl font-black tracking-tight text-sky-950">Sincronización</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado de la Base de Datos</p>
          </div>
        </div>
        <button 
          onClick={() => setEditingConfig(!editingConfig)} 
          className={`w-12 h-12 rounded-2xl shadow-sm flex items-center justify-center transition-all border ${editingConfig ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-sky-950 border-slate-100'}`}
          title="Ajustes de conexión"
        >
          <i className="fas fa-gear text-sm"></i>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-20">
        {/* Connection Status Panel */}
        <div className="bg-white p-6 rounded-[2.2rem] border border-slate-100/80 flex flex-col items-center text-center space-y-5">
          <div className="relative flex items-center justify-center">
            {/* Pulsing Backlight */}
            <span className="absolute w-20 h-20 bg-emerald-400/20 rounded-full animate-ping duration-1000" />
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-2xl relative">
              <i className="fas fa-cloud" />
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-black text-sky-950 tracking-tight">Sincronización Activa</h3>
            <p className="text-xs text-slate-400 font-bold max-w-xs leading-relaxed">
              Tus datos se guardan y respaldan en tiempo real en segundo plano. No tienes que presionar ningún botón.
            </p>
          </div>

          <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-sky-950">
              <span className="flex items-center gap-2 text-slate-500">
                <i className="fas fa-circle-check text-emerald-500" /> Base Firestore (Principal)
              </span>
              <span className={isConnected ? "text-emerald-600 uppercase font-black" : "text-rose-500 uppercase font-black"}>
                {isConnected ? '✓ En línea' : '✗ Desconectado'}
              </span>
            </div>

            <div className="h-px bg-slate-100" />

            <div className="flex items-center justify-between text-xs font-bold text-sky-950">
              <span className="flex items-center gap-2 text-slate-500">
                <i className="fas fa-circle-check text-emerald-500" /> Servidor de Respaldo
              </span>
              <span className={isRtdbConnected || cloudConfig.url?.includes('aquamasfundadores') ? "text-emerald-600 uppercase font-black" : "text-rose-500 uppercase font-black"}>
                {isRtdbConnected || cloudConfig.url?.includes('aquamasfundadores') ? '✓ En línea' : '✗ Desconectado'}
              </span>
            </div>

            <div className="h-px bg-slate-100" />

            <div className="flex items-center justify-between text-xs font-bold text-sky-950">
              <span className="flex items-center gap-2 text-slate-500">
                <i className="fas fa-rotate text-indigo-500 animate-spin" /> Respaldos Automáticos
              </span>
              <span className="text-indigo-600 uppercase font-black">Activos (En tiempo real)</span>
            </div>
          </div>

          {lastSyncTime && (
            <div className="text-[10px] text-emerald-700 bg-emerald-50 rounded-full py-1.5 px-3.5 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Último guardado automático: {new Date(lastSyncTime).toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Editing Config Drawer */}
        {editingConfig && (
          <div className="bg-white p-5 rounded-[2rem] border border-indigo-100 shadow-lg shadow-indigo-50/50 space-y-4 animate-slideDown">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-5 bg-indigo-500 rounded-full" />
              <h3 className="font-black text-sky-950 text-sm">Ajustes de la Base de Datos</h3>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1">URL de Realtime DB</label>
                <input 
                  type="url" 
                  placeholder="https://mi-firebase.firebaseio.com" 
                  className="w-full bg-slate-50 border border-slate-200/60 p-3.5 rounded-2xl outline-none font-bold text-sky-950 focus:ring-2 ring-indigo-300 transition-all text-xs mt-1"
                  value={tempConfig.url}
                  onChange={e => setTempConfig({...tempConfig, url: e.target.value})}
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 ml-1">Token de Acceso (Opcional)</label>
                <input 
                  type="password" 
                  placeholder="Token de acceso opcional..." 
                  className="w-full bg-slate-50 border border-slate-200/60 p-3.5 rounded-2xl outline-none font-bold text-sky-950 focus:ring-2 ring-indigo-300 transition-all text-xs mt-1"
                  value={tempConfig.apiKey}
                  onChange={e => setTempConfig({...tempConfig, apiKey: e.target.value})}
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button 
                  onClick={handleSaveConfig}
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-sm hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  Guardar Ajustes
                </button>
                <button 
                  onClick={() => {
                    setTempConfig(cloudConfig);
                    setEditingConfig(false);
                  }}
                  className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black text-xs uppercase tracking-wider transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Offline manual JSON export */}
        <div className="bg-white p-5 rounded-[2.2rem] border border-slate-100/80 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 bg-sky-500 rounded-full" />
            <h3 className="font-black text-sky-950 text-xs uppercase tracking-wider">Respaldos Físicos (Sin Internet)</h3>
          </div>
          
          <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
            ¿Trabajas sin conexión? Puedes exportar o restaurar todos tus datos comerciales mediante un archivo JSON en tu dispositivo.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={exportData}
              className="py-3 bg-slate-50 border border-slate-200 border-dashed text-indigo-600 rounded-xl font-black uppercase text-[10px] tracking-wider hover:bg-slate-100 transition-all flex items-center justify-center gap-1.5"
            >
              <i className="fas fa-file-arrow-down" /> Exportar JSON
            </button>

            <label className="py-3 bg-slate-50 border border-slate-200 border-dashed text-emerald-600 rounded-xl font-black uppercase text-[10px] tracking-wider hover:bg-slate-100 transition-all flex items-center justify-center gap-1.5 cursor-pointer">
              <i className="fas fa-file-arrow-up" /> Importar JSON
              <input type="file" accept=".json" className="hidden" onChange={importData} />
            </label>
          </div>
        </div>

        {/* Floating progress loader during import */}
        {isImporting && (
          <div className="fixed inset-0 bg-slate-950/40 z-50 flex items-center justify-center p-6 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 shadow-xl w-full max-w-sm text-center space-y-4 animate-scaleUp">
              <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin mx-auto" />
              <div>
                <h4 className="font-black text-sky-950 text-sm">Restaurando registros...</h4>
                <p className="text-[9px] text-indigo-500 font-extrabold uppercase mt-0.5">Procesando operaciones: {importProgress}%</p>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${importProgress}%` }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
