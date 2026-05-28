
import React from 'react';

export const RoundedCard: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
  onClick?: () => void;
}> = ({ children, className = "", onClick }) => (
  <div 
    onClick={onClick}
    className={`glass-effect rounded-[2rem] shadow-sm p-6 ${className} ${onClick ? 'cursor-pointer active:scale-[0.98] transition-all hover:shadow-md' : ''}`}
  >
    {children}
  </div>
);

export const ActionButton: React.FC<{ 
  onClick: () => void; 
  children: React.ReactNode; 
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}> = ({ onClick, children, variant = 'primary', disabled }) => {
  const themes = {
    primary: 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/30 border-none',
    secondary: 'bg-white text-sky-600 shadow-sm border-2 border-sky-100 hover:bg-sky-50',
    danger: 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30 border-none'
  };

  return (
    <button 
      disabled={disabled}
      onClick={onClick}
      className={`w-full py-4 rounded-[1.5rem] font-extrabold text-sm uppercase tracking-wider transition-all active:scale-[0.97] disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 ${themes[variant]}`}
    >
      {children}
    </button>
  );
};

export const ModuleHeader: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => (
  <div className="px-6 pt-8 pb-4 flex items-center gap-4 relative z-10">
    <button onClick={onBack} className="w-12 h-12 glass-effect rounded-2xl flex items-center justify-center text-sky-600 active:scale-90 transition-transform hover:bg-white">
      <i className="fas fa-arrow-left"></i>
    </button>
    <h2 className="text-2xl font-black text-slate-800 tracking-tight">{title}</h2>
  </div>
);
