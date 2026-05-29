
import React, { useState } from 'react';
import { useERPData } from '../../hooks/useERPData';
import { Employee } from '../../types';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const LoginScreen: React.FC<{ onLogin: (emp: Employee) => void }> = ({ onLogin }) => {
  const { employees, firebaseUser } = useERPData();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setAuthError('');
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Firebase Login Error:", err);
      setAuthError(err?.code || err?.message || String(err));
    }
  };

  const openInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  if (!firebaseUser) {
    const isUnauthorizedDomain = authError.includes('unauthorized-domain') || authError.includes('auth/unauthorized-domain');
    const isPopupBlocked = authError.includes('popup-blocked') || authError.includes('cancelled-popup-request') || authError.includes('popup_closed_by_user');
    const isInvalidAction = authError.toLowerCase().includes('invalid-action-code') || 
                           authError.toLowerCase().includes('action-is-invalid') || 
                           authError.toLowerCase().includes('action is invalid') || 
                           authError.toLowerCase().includes('invalid_apikey') ||
                           authError.toLowerCase().includes('api key') ||
                           authError.toLowerCase().includes('invalid');

    return (
      <div className="fixed inset-0 bg-sky-50 flex flex-col items-center justify-center px-6 md:px-10 animate-fadeIn overflow-y-auto py-10">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm flex flex-col items-center text-center space-y-6">
          <div>
            <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-cloud text-sky-500 text-xl"></i>
            </div>
            <h2 className="text-xl font-black text-sky-950 tracking-tight">Conectar Dispositivo</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Inicia sesión de operador con Google</p>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            className="w-full py-4 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer"
          >
            <i className="fab fa-google text-white text-sm"></i>
            Iniciar sesión con Google
          </button>

          {authError && (
            <div className="w-full bg-rose-50/80 border border-rose-100 rounded-2xl p-4 text-left space-y-3 animate-slideDown">
              <div className="flex gap-2 text-rose-700 text-xs font-bold items-center">
                <i className="fas fa-triangle-exclamation" />
                <span>Problema de Autorización</span>
              </div>
              
              <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                {isInvalidAction ? (
                  <span className="block space-y-2">
                    <span>
                      Este error (<strong className="text-rose-600">The requested action is invalid</strong>) ocurre en Firebase cuando faltan configuraciones esenciales:
                    </span>
                    <ol className="list-decimal pl-4 space-y-2 mt-1.5 text-slate-500 font-medium">
                      <li>
                        <strong className="text-slate-700 font-black">Proveedor Google deshabilitado:</strong> Tienes que activar el proveedor de inicio de sesión "Google" en la sección de autenticación de tu consola de Firebase.
                      </li>
                      <li>
                        <strong className="text-slate-700 font-black">Falta Correo de Asistencia del proyecto:</strong> Google exige que el proyecto tenga asignada una dirección de correo para asistencia/soporte del desarrollador. (Ícono de engranaje ⚙️ &gt; Configuración del proyecto &gt; General &gt; seleccionar tu correo en "Correo de asistencia").
                      </li>
                    </ol>
                  </span>
                ) : isUnauthorizedDomain ? (
                  <span>
                    El dominio actual <strong className="text-rose-600 underline font-black">{window.location.hostname}</strong> no está autorizado en tu consola de Firebase.
                  </span>
                ) : isPopupBlocked ? (
                  <span>
                    El navegador bloqueó la ventana emergente o se cerró antes de completar. Abre la app en una nueva pestaña.
                  </span>
                ) : (
                  <span>
                    No se pudo completar el acceso debido a la restricción de cookies en iframes o error de clave.
                    <br />
                    <span className="text-[10px] text-slate-400 block mt-1 font-mono">Detalle: {authError}</span>
                  </span>
                )}
              </p>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={openInNewTab}
                  className="w-full py-2.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-xl font-bold text-[11px] uppercase tracking-wider active:scale-95 transition-all text-center"
                >
                  <i className="fas fa-arrow-up-right-from-square mr-1.5" /> Abrir en pestaña nueva (Solución de iframes)
                </button>

                <a
                  href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-[11px] uppercase tracking-wider text-center block"
                >
                  <i className="fas fa-gears mr-1.5" /> Consola Firebase (Activar Google)
                </a>

                <a
                  href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/settings/general`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-[11px] uppercase tracking-wider text-center block"
                >
                  <i className="fas fa-envelope mr-1.5" /> Ajustes: Poner Correo de Soporte
                </a>
              </div>
            </div>
          )}

          <div className="text-[10px] text-slate-400/80 font-bold max-w-xs leading-relaxed">
            Nota: Al usar el visor integrado de AI Studio, los navegadores de internet bloquean las credenciales por seguridad. Se recomienda trabajar en pestaña completa para su correcto funcionamiento.
          </div>
        </div>
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
