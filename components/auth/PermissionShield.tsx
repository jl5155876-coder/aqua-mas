
import React, { useState } from 'react';

export const PermissionShield: React.FC<{ onGranted: () => void }> = ({ onGranted }) => {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'error'>('idle');

  const requestPermissions = async () => {
    setStatus('requesting');
    
    try {
      if (navigator.storage && navigator.storage.persist) {
        await navigator.storage.persist();
      }

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: false, 
            video: { facingMode: 'environment' } 
          });
          stream.getTracks().forEach(track => track.stop());
        } catch (mediaErr) {
          console.warn("Permiso de medios denegado o no disponible:", mediaErr);
        }
      }

      if (navigator.geolocation) {
        new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(resolve, resolve, { timeout: 2000 });
        });
      }

      localStorage.setItem('aqua_permissions_granted', 'true');
      onGranted();
    } catch (e) {
      console.error("Error general de permisos:", e);
      localStorage.setItem('aqua_permissions_granted', 'true');
      onGranted();
    }
  };

  return (
    <div className="fixed inset-0 bg-sky-900 flex flex-col items-center justify-center z-[200] px-10 text-center animate-fadeIn">
      <div className="w-24 h-24 bg-white/10 rounded-[2.5rem] flex items-center justify-center mb-8">
        <i className={`fas ${status === 'requesting' ? 'fa-circle-notch animate-spin' : 'fa-shield-halved'} text-sky-400 text-4xl`}></i>
      </div>
      <h2 className="text-white text-3xl font-black mb-4 tracking-tighter">Acceso Requerido</h2>
      <p className="text-sky-300 text-sm mb-12 font-medium leading-relaxed">
        Aqua+ Pro ERP requiere acceso a la cámara y ubicación para el funcionamiento de escáner y mapas.
        <br/><br/>
        Si has bloqueado estos permisos anteriormente, podrás usar la app manualmente, pero ciertas funciones no estarán disponibles.
      </p>
      
      <button 
        onClick={requestPermissions}
        disabled={status === 'requesting'}
        className={`w-full ${status === 'requesting' ? 'bg-sky-700' : 'bg-sky-500'} text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-sky-500/20 active:scale-95 transition-all`}
      >
        {status === 'requesting' ? 'Iniciando...' : 'Entendido, Iniciar App'}
      </button>
      <p className="mt-6 text-[10px] text-sky-500/50 uppercase font-black">Configuración única de instalación</p>
    </div>
  );
};
