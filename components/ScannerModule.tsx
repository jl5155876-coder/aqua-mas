
import React, { useState, useEffect, useRef } from 'react';
import { ModuleHeader, RoundedCard } from './ui/Cards';
import jsQR from 'jsqr';

interface ScannerModuleProps {
  onBack: () => void;
  onScanSuccess?: (data: string, type: 'TICKET' | 'SYNC' | 'PRODUCT') => void;
  mode?: 'TICKET' | 'P2P' | 'UNIVERSAL';
}

export const ScannerModule: React.FC<ScannerModuleProps> = ({ onBack, onScanSuccess, mode = 'TICKET' }) => {
  const [scanning, setScanning] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  
  // Hardware controls
  const [hasFlash, setHasFlash] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null); // For drawing bounding boxes
  const animationRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  // Native Barcode Detector (Experimental Chrome/Android)
  const detectorRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Native Detector if available
    if ('BarcodeDetector' in window) {
      try {
        detectorRef.current = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'ean_13', 'code_128', 'upc_a']
        });
      } catch (e) {
        console.warn("BarcodeDetector supported but failed to init:", e);
      }
    }
  }, []);

  const playBeep = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch(e) {}
  };

  const cleanupMedia = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false; 
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleFlash = async () => {
    if (trackRef.current && hasFlash) {
      try {
        await trackRef.current.applyConstraints({
          advanced: [{ torch: !isFlashOn }] as any
        });
        setIsFlashOn(!isFlashOn);
      } catch (e) {
        console.error("Flash toggle failed", e);
      }
    }
  };

  const switchCamera = () => {
    setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment');
    setScanning(false);
    setTimeout(() => setScanning(true), 100);
  };

  // Start Camera Logic
  useEffect(() => {
    if (!scanning) {
      cleanupMedia();
      return;
    }

    const startCamera = async () => {
      cleanupMedia();
      setCameraError(null);
      setDebugInfo('Iniciando cámara...');
      setHasFlash(false);

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("API de cámara no soportada.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: cameraFacing,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });

        if (stream) {
          streamRef.current = stream;
          const track = stream.getVideoTracks()[0];
          trackRef.current = track;

          // Check for Flash capabilities
          const capabilities = track.getCapabilities ? track.getCapabilities() : {};
          if ((capabilities as any).torch) {
            setHasFlash(true);
          }

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.setAttribute("playsinline", "true");
            await videoRef.current.play();
            requestAnimationFrame(tick);
            setDebugInfo('');
          }
        }
      } catch (err: any) {
        console.error("Camera Error:", err);
        if (err.name === 'NotAllowedError') setCameraError("permiso");
        else if (err.name === 'NotFoundError') setCameraError("no_device");
        else setCameraError("generic");
      }
    };

    startCamera();
    return () => cleanupMedia();
  }, [scanning, cameraFacing]);

  // Main Loop
  const tick = async () => {
    if (!videoRef.current || !canvasRef.current || !overlayRef.current || !scanning) return;

    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const overlay = overlayRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const overlayCtx = overlay.getContext('2d');

      if (ctx && overlayCtx) {
        // Sync dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        overlay.width = video.videoWidth;
        overlay.height = video.videoHeight;

        // Clear overlay
        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

        // --- STRATEGY 1: NATIVE BARCODE DETECTOR (FAST) ---
        if (detectorRef.current) {
          try {
            const barcodes = await detectorRef.current.detect(video);
            if (barcodes.length > 0) {
              const code = barcodes[0];
              
              // Draw Bounding Box
              if (code.cornerPoints) {
                drawBoundingBox(overlayCtx, code.cornerPoints);
              }

              handleScan(code.rawValue);
              return; // Stop processing this frame
            }
          } catch (e) {
            // Native failed, fallback to jsQR
          }
        }

        // --- STRATEGY 2: JSQR FALLBACK (QR ONLY) ---
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code && code.data) {
            // Draw Bounding Box
            drawBoundingBox(overlayCtx, [
              code.location.topLeftCorner,
              code.location.topRightCorner,
              code.location.bottomRightCorner,
              code.location.bottomLeftCorner
            ]);
            
            handleScan(code.data);
            return;
          }
        } catch (e) {
          // Ignore
        }
      }
    }
    animationRef.current = requestAnimationFrame(tick);
  };

  const drawBoundingBox = (ctx: CanvasRenderingContext2D, points: any[]) => {
    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#34d399"; // emerald-400
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.stroke();
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
      return { type: 'PRODUCT', data: encrypted };
    }
  };

  const handleScan = (codeRaw: string) => {
    if (!scanning) return;
    
    playBeep();
    if (navigator.vibrate) navigator.vibrate(200);

    const processed = decryptData(codeRaw);

    // MODE FILTERING
    if (mode === 'P2P' && processed?.type !== 'SYNC') {
        // Ignore non-sync codes in P2P mode to avoid confusion
        return;
    }

    if (processed?.type === 'TICKET') {
        if (mode === 'TICKET' || mode === 'UNIVERSAL') {
            cleanupMedia();
            if (onScanSuccess) onScanSuccess(codeRaw, 'TICKET');
            else { setResult(processed.data); setScanning(false); }
        }
    } else if (processed?.type === 'SYNC') {
        if (mode === 'P2P' || mode === 'UNIVERSAL') {
            cleanupMedia();
            if (onScanSuccess) onScanSuccess(codeRaw, 'SYNC');
        }
    } else {
        // Assume Product / Generic
        cleanupMedia();
        if (onScanSuccess) onScanSuccess(codeRaw, 'PRODUCT');
        else {
            setResult({ id: 'Código de Barras', total: codeRaw });
            setScanning(false);
        }
    }
  };

  return (
    <div className={`h-full flex flex-col animate-fadeIn overflow-hidden bg-slate-900`}>
      <div className="px-6 pt-8 pb-4 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center active:scale-90 transition-transform">
            <i className="fas fa-arrow-left"></i>
            </button>
            <h2 className="text-2xl font-black tracking-tight text-white">
            {mode === 'P2P' ? 'Conectar' : mode === 'TICKET' ? 'Validar Ticket' : 'Escáner Universal'}
            </h2>
        </div>
        <div className="flex gap-3">
            {hasFlash && (
                <button onClick={toggleFlash} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isFlashOn ? 'bg-amber-400 text-white shadow-lg shadow-amber-400/50' : 'bg-white/10 text-white'}`}>
                    <i className="fas fa-bolt"></i>
                </button>
            )}
            <button onClick={switchCamera} className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center active:scale-90 transition-transform">
                <i className="fas fa-rotate"></i>
            </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 relative">
        {scanning ? (
          <div className="w-full h-full flex flex-col items-center justify-center relative rounded-[2.5rem] overflow-hidden bg-black shadow-2xl border border-white/10 my-4">
            
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
               <>
                  <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-90" muted playsInline></video>
                  <canvas ref={canvasRef} className="hidden"></canvas>
                  <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none z-10"></canvas>
                  
                  {/* Visual Guide Overlay */}
                  <div className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center justify-center">
                      <div className="relative w-64 h-64 border-2 border-white/30 rounded-3xl">
                          <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl"></div>
                          <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl"></div>
                          <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl"></div>
                          <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl"></div>
                          
                          {/* Scan line */}
                          <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse"></div>
                      </div>
                      <p className="mt-8 text-white/80 font-bold uppercase text-xs tracking-widest bg-black/40 px-4 py-2 rounded-full backdrop-blur-md">
                        Apunte al código
                      </p>
                  </div>
               </>
            )}
          </div>
        ) : (
          <RoundedCard className="w-full bg-white animate-fadeIn p-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                <i className="fas fa-check-circle text-4xl"></i>
              </div>
              <h3 className="text-2xl font-black text-sky-900 mb-2">¡Detectado!</h3>
              <div className="w-full bg-sky-50 rounded-3xl p-6 mb-8 space-y-4">
                <div className="flex justify-between items-center border-b border-sky-100 pb-3">
                  <span className="text-[10px] font-black text-sky-400 uppercase">Referencia</span>
                  <span className="text-xs font-black text-sky-900 truncate max-w-[150px]">{result?.id || 'N/A'}</span>
                </div>
                {result?.total && (
                  <div className="flex justify-between">
                    <span className="text-[10px] font-black text-sky-400 uppercase">Valor</span>
                    <span className="text-xl font-black text-sky-900">{typeof result.total === 'number' ? `$${result.total}` : result.total}</span>
                  </div>
                )}
              </div>
              <button 
                onClick={() => { setResult(null); setScanning(true); }} 
                className="w-full bg-sky-600 text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-sky-100 active:scale-95 transition-all"
              >
                Escanear Otro
              </button>
            </div>
          </RoundedCard>
        )}
        
        {!cameraError && scanning && (
            <button 
                onClick={() => {
                    const code = prompt("Ingresa el código manualmente:");
                    if(code) handleScan(code);
                }}
                className="absolute bottom-12 text-white/50 font-bold text-xs uppercase underline z-30"
            >
                Entrada Manual
            </button>
        )}
      </div>
    </div>
  );
};
