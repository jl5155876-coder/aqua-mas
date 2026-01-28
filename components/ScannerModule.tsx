
import React, { useState, useEffect, useRef } from 'react';
import { ModuleHeader, RoundedCard } from './ui/Cards';
import jsQR from 'jsqr';

interface ScannerModuleProps {
  onBack: () => void;
  onScanSuccess?: (data: string, type: 'TICKET' | 'SYNC') => void;
  mode?: 'TICKET' | 'P2P';
}

export const ScannerModule: React.FC<ScannerModuleProps> = ({ onBack, onScanSuccess, mode = 'TICKET' }) => {
  const [scanning, setScanning] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  // Limpieza agresiva de streams previos
  const cleanupMedia = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load();
    }
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };

  // Iniciar Cámara
  useEffect(() => {
    if (!scanning) {
      cleanupMedia();
      return;
    }

    const startCamera = async () => {
      cleanupMedia();
      setCameraError(null);
      setDebugInfo('Iniciando cámara...');

      try {
        // Verificar soporte
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("API de cámara no soportada en este dispositivo.");
        }

        // Estrategia 1: Buscar ID de cámara trasera explícitamente (Más robusto en Android)
        let backCameraId = null;
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(d => d.kind === 'videoinput');
          const backDevice = videoDevices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('trasera') || 
            d.label.toLowerCase().includes('environment')
          );
          if (backDevice) backCameraId = backDevice.deviceId;
          // Si solo hay una cámara, usarla
          if (!backCameraId && videoDevices.length === 1) backCameraId = videoDevices[0].deviceId;
        } catch (e) {
          console.warn("Error enumerando dispositivos:", e);
        }

        const tryStream = async (constraints: MediaStreamConstraints) => {
          try {
            return await navigator.mediaDevices.getUserMedia(constraints);
          } catch (err: any) {
            console.warn(`Intento fallido: ${JSON.stringify(constraints)}`, err);
            return null;
          }
        };

        let stream: MediaStream | null = null;

        // Intento 1: ID Específico (si se encontró)
        if (backCameraId) {
          stream = await tryStream({ 
            video: { 
              deviceId: { exact: backCameraId },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            } 
          });
        }

        // Intento 2: Facing Mode Environment (Estándar Web)
        if (!stream) {
          stream = await tryStream({ 
            video: { facingMode: "environment", width: { ideal: 640 } } 
          });
        }

        // Intento 3: Cualquier video (Fallback extremo)
        if (!stream) {
          stream = await tryStream({ video: true });
        }

        if (stream) {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.setAttribute("playsinline", "true");
            
            // Promesa de play segura
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch(error => {
                console.error("Error al reproducir video:", error);
                setCameraError("generic");
                setDebugInfo(`Play error: ${error.message}`);
              });
            }
            
            requestAnimationFrame(tick);
            setDebugInfo('');
          }
        } else {
          throw new Error("No se pudo obtener ningún stream de video.");
        }

      } catch (err: any) {
        console.error("Camera Fatal Error:", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraError("permiso");
        } else if (err.name === 'NotFoundError') {
          setCameraError("no_device");
        } else if (err.name === 'NotReadableError') {
          setCameraError("generic");
          setDebugInfo("Hardware ocupado. Reinicia la app.");
        } else {
          setCameraError("generic");
          setDebugInfo(`${err.name}: ${err.message}`);
        }
      }
    };

    // Pequeño delay para asegurar que el DOM esté listo y streams anteriores cerrados
    const timer = setTimeout(startCamera, 500);
    return () => {
      clearTimeout(timer);
      cleanupMedia();
    };
  }, [scanning]);

  const tick = () => {
    if (!videoRef.current || !canvasRef.current || !scanning) return;

    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code && code.data) {
            handleScan(code.data);
            return; 
          }
        } catch (e) {
          // Ignorar errores de decodificación frame a frame
        }
      }
    }
    animationRef.current = requestAnimationFrame(tick);
  };

  const decryptData = (encrypted: string) => {
    try {
      const decoded = atob(encrypted);
      if (decoded.startsWith('AQUA-PRO-SECURE|')) {
        return { type: 'TICKET', data: JSON.parse(decoded.split('|')[1]) };
      }
      return null;
    } catch {
      if (mode === 'P2P' && (encrypted.length > 5 || encrypted.startsWith('AQUA-'))) {
         return { type: 'SYNC', data: encrypted };
      }
      return null;
    }
  };

  const handleScan = (code: string) => {
    if (!scanning) return;
    
    if (navigator.vibrate) navigator.vibrate(200);

    if (mode === 'P2P') {
      cleanupMedia();
      if (onScanSuccess) onScanSuccess(code, 'SYNC');
      return;
    }

    const decoded = decryptData(code);
    if (decoded?.type === 'TICKET') {
      cleanupMedia();
      if (onScanSuccess && mode === 'TICKET') {
        onScanSuccess(code, 'TICKET');
      } else {
        setResult(decoded.data);
        setScanning(false);
      }
    }
  };

  const handleManualEntry = (code: string) => {
    handleScan(code);
  };

  return (
    <div className={`h-full flex flex-col animate-fadeIn overflow-hidden ${mode === 'P2P' ? 'bg-slate-800' : 'bg-sky-900'}`}>
      <div className="px-6 pt-8 pb-4 flex items-center gap-4 relative z-20">
        <button onClick={onBack} className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center active:scale-90 transition-transform">
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2 className="text-2xl font-black tracking-tight text-white">
          {mode === 'P2P' ? 'Conectar' : 'Validar Ticket'}
        </h2>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 relative">
        {scanning ? (
          <div className="w-full h-full flex flex-col items-center justify-center">
            
            {cameraError ? (
               <div className="bg-white p-8 rounded-[2rem] max-w-sm text-center shadow-2xl animate-fadeIn z-30">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 text-3xl">
                     <i className="fas fa-video-slash"></i>
                  </div>
                  <h3 className="text-xl font-black text-sky-900 mb-2">Error de Cámara</h3>
                  
                  {cameraError === 'permiso' ? (
                    <div className="text-sm text-sky-600 mb-6 text-left bg-sky-50 p-4 rounded-xl">
                       <p className="font-bold mb-2">Permisos Requeridos:</p>
                       <p className="text-xs">Ve a Ajustes {'>'} Apps {'>'} Aqua+ Pro {'>'} Permisos y activa la Cámara.</p>
                    </div>
                  ) : (
                    <div className="mb-6">
                      <p className="text-sm text-sky-500 mb-2 font-bold">No se pudo iniciar el video.</p>
                      <p className="text-[10px] bg-slate-100 p-2 rounded text-slate-500 font-mono break-all">{debugInfo}</p>
                    </div>
                  )}
                  
                  <button onClick={() => { setCameraError(null); setScanning(true); window.location.reload(); }} className="w-full bg-sky-600 text-white py-4 rounded-xl font-black uppercase text-xs shadow-lg">Reiniciar App</button>
               </div>
            ) : (
               <div className="relative w-full max-w-sm aspect-square rounded-[3rem] overflow-hidden border-4 border-white/20 shadow-2xl bg-black">
                  <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline></video>
                  <canvas ref={canvasRef} className="hidden"></canvas>
                  
                  {/* Overlay UI */}
                  <div className="absolute inset-0 border-[30px] border-black/50 z-10 pointer-events-none"></div>
                  <div className={`absolute top-0 left-0 right-0 h-1 shadow-[0_0_20px_rgba(255,255,255,1)] animate-scanner z-20 ${mode === 'P2P' ? 'bg-emerald-500' : 'bg-sky-400'}`}></div>
                  
                  <div className="absolute bottom-6 left-0 right-0 text-center z-20">
                     <p className="text-white/80 text-xs font-bold uppercase tracking-widest bg-black/40 inline-block px-4 py-1 rounded-full backdrop-blur-md">
                        {mode === 'P2P' ? 'Buscando QR Maestro...' : 'Buscando Ticket...'}
                     </p>
                  </div>
                  
                  {/* Debug info on screen transparently */}
                  {debugInfo && <div className="absolute top-2 left-2 text-[8px] text-white/50 font-mono z-30">{debugInfo}</div>}
               </div>
            )}
            
            {!cameraError && (
              <div className="w-full max-w-sm mt-8">
                <input 
                  type="text" 
                  placeholder="Código Manual..." 
                  className="w-full border border-white/20 bg-white/10 text-white rounded-2xl p-5 text-sm outline-none focus:ring-2 ring-white/30 transition-all placeholder-white/40 font-bold text-center"
                  onKeyDown={e => e.key === 'Enter' && handleManualEntry(e.currentTarget.value)}
                />
              </div>
            )}
          </div>
        ) : (
          <RoundedCard className="w-full bg-white animate-fadeIn p-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                <i className="fas fa-check-circle text-4xl"></i>
              </div>
              <h3 className="text-2xl font-black text-sky-900 mb-2">Código Detectado</h3>
              <div className="w-full bg-sky-50 rounded-3xl p-6 mb-8 space-y-4">
                <div className="flex justify-between">
                  <span className="text-[10px] font-black text-sky-400 uppercase">ID</span>
                  <span className="text-xs font-black text-sky-900">{result?.id || 'N/A'}</span>
                </div>
                {result?.total && (
                  <div className="flex justify-between border-t border-sky-100 pt-3">
                    <span className="text-[10px] font-black text-sky-400 uppercase">Monto</span>
                    <span className="text-xl font-black text-sky-900">${result.total}</span>
                  </div>
                )}
              </div>
              <button 
                onClick={() => { setResult(null); setScanning(true); }} 
                className="w-full bg-sky-600 text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-sky-100"
              >
                Escanear Otro
              </button>
            </div>
          </RoundedCard>
        )}
      </div>

      <style>{`
        @keyframes scanner {
          0% { transform: translateY(30px); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(280px); opacity: 0; }
        }
        .animate-scanner { animation: scanner 2s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
      `}</style>
    </div>
  );
};
