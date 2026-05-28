
import React, { useState, useEffect } from 'react';

export const SplashScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 2500; 

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      if (elapsed >= duration) {
        clearInterval(interval);
        onComplete();
      }
    }, 30);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900 flex flex-col items-center justify-center overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-600 via-blue-700 to-slate-900"></div>
      
      {/* Decorative Blobs */}
      <div className="absolute top-[-20%] left-[-20%] w-[80vw] h-[80vw] bg-sky-400/20 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[80vw] h-[80vw] bg-indigo-500/20 rounded-full blur-[100px] animate-pulse delay-1000"></div>

      <div className="relative z-10 w-full h-full flex flex-col items-center justify-between py-20 animate-fadeIn">
        <div className="flex-[0.5]"></div>

        <div className="flex flex-col items-center justify-center flex-[2]">
          <div className="relative mb-8 group">
            <div className="absolute inset-0 bg-sky-400/30 blur-2xl rounded-full animate-pulse"></div>
            <div className="w-36 h-36 bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2.5rem] flex items-center justify-center shadow-2xl relative z-10 ring-1 ring-white/30 transform transition-transform duration-700 hover:scale-105">
               <i className="fas fa-droplet text-6xl text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]"></i>
            </div>
          </div>
          
          <h1 className="text-5xl font-black text-white tracking-tighter mb-2 drop-shadow-lg">
            Aqua<span className="text-sky-300">+</span>
          </h1>
          <div className="flex items-center gap-3">
             <div className="h-px w-8 bg-sky-300/50"></div>
             <p className="text-sky-100 text-xs font-bold uppercase tracking-[0.4em]">Fundadores Pro</p>
             <div className="h-px w-8 bg-sky-300/50"></div>
          </div>
        </div>

        <div className="w-full px-12 flex flex-col items-center justify-end flex-1 pb-8">
           <div className="w-full max-w-[220px] h-1.5 bg-black/20 rounded-full overflow-hidden backdrop-blur-md border border-white/10 mb-4 shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-sky-400 via-white to-sky-400 shadow-[0_0_15px_rgba(255,255,255,0.8)] rounded-full transition-all duration-100 ease-linear relative" 
                style={{ width: `${progress}%` }}
              >
              </div>
           </div>
           
           <div className="flex flex-col items-center gap-1">
             <p className="text-[10px] text-white/60 font-mono uppercase tracking-widest">
                Cargando Sistema... {Math.round(progress)}%
             </p>
             <p className="text-[8px] text-white/20 font-black tracking-widest mt-2">v3.5.0 Enterprise</p>
           </div>
        </div>
      </div>
    </div>
  );
};
