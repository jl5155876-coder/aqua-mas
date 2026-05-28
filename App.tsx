
import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { useNavigation } from './hooks/useNavigation';
import { Employee, Order } from './types';
import { Dashboard } from './components/Dashboard';
import { POSModule } from './components/POSModule';
import { ProductionModule } from './components/ProductionModule';
import { LogisticsModule } from './components/LogisticsModule';
import { InventoryModule } from './components/InventoryModule';
import { SuppliesModule } from './components/SuppliesModule';
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
import { MessagingModule } from './components/MessagingModule';
import { FuelModule } from './components/FuelModule'; // Imported

// Auth & UI Components
import { PermissionShield } from './components/auth/PermissionShield';
import { LoginScreen } from './components/auth/LoginScreen';
import { SplashScreen } from './components/ui/SplashScreen';

// State Provider
import { ERPProvider, useERPDataHook } from './hooks/ERPContext'; // Fixed import

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Algo salió mal.";
      let details = "";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) {
          errorMessage = `Error de Base de Datos: ${parsed.operationType}`;
          details = parsed.error;
        }
      } catch (e) {
        errorMessage = this.state.error.message || String(this.state.error);
      }

      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-6 text-center">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border-2 border-red-100">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-exclamation-triangle text-2xl"></i>
            </div>
            <h2 className="text-xl font-black text-red-900 mb-2 uppercase tracking-tight">{errorMessage}</h2>
            <p className="text-sm text-red-600 mb-6 font-medium leading-relaxed">{details || "Ocurrió un error inesperado al procesar los datos."}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-red-200 active:scale-95 transition-all"
            >
              Reiniciar Aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const { currentView, navigateTo, goBack } = useNavigation();
  const { messages, addNotification, employees } = useERPDataHook();
  
  const [showSplash, setShowSplash] = useState(true);
  const [needsPermissions, setNeedsPermissions] = useState(() => !localStorage.getItem('aqua_permissions_granted'));
  const [user, setUser] = useState<Employee | null>(null);
  
  // State for passing Order to POS
  const [pendingOrderForPOS, setPendingOrderForPOS] = useState<Order | null>(null);

  // --- GLOBAL MESSAGE MONITORING ---
  const prevMsgCount = useRef(messages.length);

  // 1. New Message Detection & Notification
  useEffect(() => {
    if (!user) return;
    
    if (messages.length > prevMsgCount.current) {
        // Get only the new messages added
        const newMsgs = messages.slice(prevMsgCount.current);
        
        newMsgs.forEach(msg => {
            const isFromMe = msg.senderId === user.id;
            const isForMe = msg.receiverId === user.id || msg.receiverId === 'general';
            
            // If message is for me (or general) AND not from me
            if (!isFromMe && isForMe) {
                // Only notify if NOT currently in the messaging module
                if (currentView !== 'messages') {
                    const senderName = employees.find(e => e.id === msg.senderId)?.name.split(' ')[0] || 'Alguien';
                    const title = msg.receiverId === 'general' ? `Canal General (${senderName})` : `Mensaje de ${senderName}`;
                    
                    addNotification({
                        title: title,
                        message: msg.text,
                        type: 'info',
                        actionLink: 'messages'
                    });
                }
            }
        });
    }
    prevMsgCount.current = messages.length;
  }, [messages, user, currentView, employees, addNotification]);

  const handleProcessOrder = (order: Order) => {
    setPendingOrderForPOS(order);
    navigateTo('pos');
  };

  if (needsPermissions) return <PermissionShield onGranted={() => setNeedsPermissions(false)} />;
  if (showSplash) return <SplashScreen onComplete={() => setShowSplash(false)} />;
  if (!user) return <LoginScreen onLogin={setUser} />;

  return (
    <div className="max-w-md mx-auto h-screen bg-sky-50 relative overflow-hidden shadow-2xl flex flex-col">
      <main className="flex-1 overflow-hidden relative">
        {currentView === 'dashboard' && <Dashboard setView={navigateTo} user={user} onLogout={() => setUser(null)} />}
        
        {currentView === 'pos' && (
          <POSModule 
            key="pos-module-static"
            user={user} 
            onBack={goBack} 
            initialOrder={pendingOrderForPOS} 
            onClearInitialOrder={() => setPendingOrderForPOS(null)} 
          />
        )}
        
        {currentView === 'settings' && <SettingsModule currentUser={user} onBack={goBack} />}
        {currentView === 'whatsapp' && <WhatsAppModule onBack={goBack} />}
        {currentView === 'customers' && <CustomersModule onBack={goBack} />}
        {currentView === 'logistics' && <LogisticsModule onBack={goBack} />}
        {currentView === 'production' && <ProductionModule onBack={goBack} />}
        {currentView === 'sync' && <SyncModule onBack={goBack} onScanRequest={() => navigateTo('scanner')} />}
        {currentView === 'inventory' && <InventoryModule onBack={goBack} />}
        {currentView === 'supplies' && <SuppliesModule onBack={goBack} />}
        {currentView === 'employees' && <EmployeesModule onBack={goBack} currentUser={user} />}
        {currentView === 'reports' && <ReportsModule onBack={goBack} />}
        {currentView === 'quality' && <QualityModule onBack={goBack} />}
        {currentView === 'scanner' && <ScannerModule onBack={goBack} />}
        {currentView === 'messages' && <MessagingModule onBack={goBack} currentUser={user} />}
        {currentView === 'fuel' && <FuelModule onBack={goBack} />}
        
        {currentView === 'orders' && (
          <OrdersModule 
            onBack={goBack} 
            onProcessOrder={handleProcessOrder} 
          />
        )}
        
        {currentView === 'tickets' && <TicketModule onBack={goBack} />}
      </main>
    </div>
  );
};

const App: React.FC = () => (
  <ErrorBoundary>
    <ERPProvider>
      <AppContent />
    </ERPProvider>
  </ErrorBoundary>
);

export default App;
