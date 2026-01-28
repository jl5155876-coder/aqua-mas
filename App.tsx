
import React, { useState, useEffect } from 'react';
import { useNavigation } from './hooks/useNavigation';
import { useERPData } from './hooks/useERPData';
import { Employee, ViewType } from './types';
import { Dashboard } from './components/Dashboard';
import { POSModule } from './components/POSModule';
import { ProductionModule } from './components/ProductionModule';
import { LogisticsModule } from './components/LogisticsModule';
import { InventoryModule } from './components/InventoryModule';
import { WhatsAppModule } from './components/WhatsAppModule';
import { CustomersModule } from './components/CustomersModule';
import { EmployeesModule } from './components/EmployeesModule';
import { ReportsModule } from './components/ReportsModule';
import { SettingsModule } from './components/SettingsModule';
import { SyncModule } from './components/SyncModule';
import { OrdersModule } from './components/OrdersModule';
import { QualityModule } from './components/QualityModule';
import { ScannerModule } from './components/ScannerModule';
import { TicketModule } from './components/TicketModule';
import { VoiceAI } from './components/VoiceAI';

const PermissionShield: React.FC<{ onGranted: () => void }> = ({ onGranted }) => {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'error'>('idle');

  const requestPermissions = async () => {
    setStatus('requesting');
    
    // Intentamos pedir permisos, pero no bloqueamos si fallan algunos (como cámara)
    // porque el usuario puede querer usar solo el POS o Inventario manual.
    try {
      if (navigator.storage && navigator.storage.persist) {
        await navigator.storage.persist();
      }

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: true, 
            video: { facingMode: 'environment' } 
          });
          stream.getTracks().forEach(track => track.stop());
        } catch (mediaErr) {
          console.warn("Permiso de medios denegado o no disponible:", mediaErr);
          // No lanzamos error para permitir continuar
        }
      }

      if (navigator.geolocation) {
        // Solicitamos ubicación con timeout corto para no bloquear
        new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(resolve, resolve, { timeout: 2000 });
        });
      }

      localStorage.setItem('aqua_permissions_granted', 'true');
      onGranted();
    } catch (e) {
      console.error("Error general de permisos:", e);
      // Aún en error, permitimos continuar, la app manejará fallos locales
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
        Aqua+ Pro ERP funciona mejor con acceso a cámara, micrófono y ubicación.
        <br/><br/>
        Si has bloqueado estos permisos anteriormente, podrás usar la app manualmente, pero el escáner y la voz no funcionarán.
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

const SplashScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-sky-600 flex flex-col items-center justify-center z-[100] animate-fadeIn">
      <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center shadow-2xl animate-bounce mb-6">
        <i className="fas fa-droplet text-sky-500 text-5xl"></i>
      </div>
      <h1 className="text-white text-3xl font-black tracking-tighter mb-2">Aqua+ Fundadores</h1>
      <p className="text-sky-200 text-xs font-bold uppercase tracking-[0.3em] opacity-80">ERP Pro Mobile</p>
    </div>
  );
};

const LoginScreen: React.FC<{ onLogin: (emp: Employee) => void }> = ({ onLogin }) => {
  const { employees } = useERPData();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handlePress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        const emp = employees.find(e => e.pin === newPin);
        if (emp) onLogin(emp);
        else {
          setError(true);
          setTimeout(() => { setPin(''); setError(false); }, 1000);
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-sky-50 flex flex-col items-center justify-center px-10 animate-fadeIn">
      <div className="mb-12 text-center">
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm mx-auto mb-6">
          <i className="fas fa-lock text-sky-400 text-2xl"></i>
        </div>
        <h2 className="text-2xl font-black text-sky-900 mb-1">Acceso Seguro</h2>
        <p className="text-sky-400 text-xs font-bold uppercase tracking-widest">Ingresa tu PIN de 4 dígitos</p>
      </div>
      <div className="flex gap-4 mb-12">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${error ? 'bg-red-500 border-red-500' : pin.length > i ? 'bg-sky-600 border-sky-600 scale-125' : 'bg-white border-sky-200'}`}></div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(k => (
          <button type="button" key={k} onClick={() => { if (k === 'C') setPin(''); else if (k === '⌫') setPin(pin.slice(0, -1)); else handlePress(k); }} className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black bg-white shadow-sm active:scale-90 transition-transform cursor-pointer">{k}</button>
        ))}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const { currentView, navigateTo, goBack } = useNavigation();
  const [showSplash, setShowSplash] = useState(true);
  const [needsPermissions, setNeedsPermissions] = useState(() => !localStorage.getItem('aqua_permissions_granted'));
  const [user, setUser] = useState<Employee | null>(null);

  if (needsPermissions) return <PermissionShield onGranted={() => setNeedsPermissions(false)} />;
  if (showSplash) return <SplashScreen onComplete={() => setShowSplash(false)} />;
  if (!user) return <LoginScreen onLogin={setUser} />;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-sky-50 relative overflow-x-hidden shadow-2xl">
      <main className="min-h-screen">
        {currentView === 'dashboard' && <Dashboard setView={navigateTo} user={user} onLogout={() => setUser(null)} />}
        {currentView === 'pos' && <POSModule user={user} onBack={goBack} />}
        {currentView === 'settings' && <SettingsModule currentUser={user} onBack={goBack} />}
        {currentView === 'whatsapp' && <WhatsAppModule onBack={goBack} />}
        {currentView === 'customers' && <CustomersModule onBack={goBack} />}
        {currentView === 'logistics' && <LogisticsModule onBack={goBack} />}
        {currentView === 'production' && <ProductionModule onBack={goBack} />}
        {currentView === 'sync' && <SyncModule onBack={goBack} onScanRequest={() => navigateTo('scanner')} />}
        {currentView === 'inventory' && <InventoryModule onBack={goBack} />}
        {currentView === 'employees' && <EmployeesModule onBack={goBack} currentUser={user} />}
        {currentView === 'reports' && <ReportsModule onBack={goBack} />}
        {currentView === 'quality' && <QualityModule onBack={goBack} />}
        {currentView === 'scanner' && <ScannerModule onBack={goBack} />}
        {currentView === 'orders' && <OrdersModule onBack={goBack} />}
        {currentView === 'tickets' && <TicketModule onBack={goBack} />}
      </main>
      {currentView === 'dashboard' && <VoiceAI onAction={(res) => res.action === 'SALE' && navigateTo('pos')} />}
    </div>
  );
};

export default App;
