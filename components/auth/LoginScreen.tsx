
import React, { useState } from 'react';
import { useERPData } from '../../hooks/useERPData';
import { Employee } from '../../types';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';

export const LoginScreen: React.FC<{ onLogin: (emp: Employee) => void }> = ({ onLogin }) => {
  const { employees, firebaseUser } = useERPData();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  if (!firebaseUser) {
    return (
      <div className="fixed inset-0 bg-sky-50 flex flex-col items-center justify-center px-10 animate-fadeIn">
        <div className="mb-12 text-center">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm mx-auto mb-6">
            <i className="fas fa-cloud text-sky-400 text-2xl"></i>
          </div>
          <h2 className="text-2xl font-black text-sky-900 mb-1">Conectar Dispositivo</h2>
          <p className="text-sky-400 text-xs font-bold uppercase tracking-widest">Inicia sesión para sincronizar</p>
        </div>
        <button 
          onClick={handleGoogleLogin}
          className="w-full max-w-xs py-4 bg-white text-sky-900 rounded-2xl font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <i className="fab fa-google text-rose-500"></i>
          Continuar con Google
        </button>
        {authError && <p className="mt-4 text-xs text-red-500 font-bold text-center">{authError}</p>}
      </div>
    );
  }

  const handlePress = async (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        if (employees.length === 0) {
          // Bootstrap first admin
          setIsCreatingAdmin(true);
          try {
            const newAdmin: Employee = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Administrador',
              phone: '',
              pin: newPin,
              roles: ['Administrador'],
              permissions: ['dashboard', 'pos', 'orders', 'customers', 'logistics', 'inventory', 'whatsapp', 'production', 'sync', 'reports', 'settings', 'employees', 'quality', 'scanner', 'tickets', 'messages', 'notifications', 'fuel'],
              lastUpdated: Date.now()
            };
            await setDoc(doc(db, 'employees', newAdmin.id), newAdmin);
            onLogin(newAdmin);
          } catch (err: any) {
            console.error("Error creating admin:", err);
            setError(true);
            setTimeout(() => { setPin(''); setError(false); setIsCreatingAdmin(false); }, 1000);
          }
        } else {
          const emp = employees.find(e => e.pin === newPin);
          if (emp) onLogin(emp);
          else {
            setError(true);
            setTimeout(() => { setPin(''); setError(false); }, 1000);
          }
        }
      }
    }
  };

  const handleAdminBypass = () => {
    const adminEmp = employees.find(e => e.id === firebaseUser.uid && e.roles.includes('Administrador'));
    if (adminEmp) {
      onLogin(adminEmp);
    } else {
      alert("Tu cuenta de Google no está asociada a un Administrador.");
    }
  };

  const isInitialSetup = employees.length === 0;
  const isAdminUser = employees.some(e => e.id === firebaseUser.uid && e.roles.includes('Administrador'));

  return (
    <div className="fixed inset-0 bg-sky-50 flex flex-col items-center justify-center px-10 animate-fadeIn">
      <div className="mb-12 text-center">
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm mx-auto mb-6">
          <i className={`fas ${isInitialSetup ? 'fa-user-shield' : 'fa-lock'} text-sky-400 text-2xl`}></i>
        </div>
        <h2 className="text-2xl font-black text-sky-900 mb-1">
          {isInitialSetup ? 'Configuración Inicial' : 'Acceso Seguro'}
        </h2>
        <p className="text-sky-400 text-xs font-bold uppercase tracking-widest">
          {isInitialSetup ? 'Crea un PIN de 4 dígitos para el administrador' : 'Ingresa tu PIN de 4 dígitos'}
        </p>
      </div>
      <div className="flex gap-4 mb-12">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${error ? 'bg-red-500 border-red-500' : pin.length > i ? 'bg-sky-600 border-sky-600 scale-125' : 'bg-white border-sky-200'}`}></div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map(k => (
          <button 
            type="button" 
            key={k} 
            disabled={isCreatingAdmin}
            onClick={() => { if (k === 'C') setPin(''); else if (k === '⌫') setPin(pin.slice(0, -1)); else handlePress(k); }} 
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black bg-white shadow-sm active:scale-90 transition-transform cursor-pointer disabled:opacity-50"
          >
            {k}
          </button>
        ))}
      </div>
      {isCreatingAdmin && <p className="mt-6 text-sm text-sky-600 font-bold animate-pulse">Creando administrador...</p>}
      
      {!isInitialSetup && isAdminUser && (
        <button 
          onClick={handleAdminBypass}
          className="mt-8 text-sky-500 font-bold text-sm underline underline-offset-4"
        >
          ¿Olvidaste tu PIN? Acceder con Google
        </button>
      )}
    </div>
  );
};
