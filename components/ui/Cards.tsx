
import React from 'react';

export const RoundedCard: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
  onClick?: () => void;
}> = ({ children, className = "", onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white/70 backdrop-blur-md rounded-[2.5rem] shadow-sm border border-white/50 p-6 ${className} ${onClick ? 'cursor-pointer active:scale-[0.98] transition-all' : ''}`}
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
    primary: 'bg-sky-600 text-white shadow-sky-100',
    secondary: 'bg-white text-sky-600 shadow-sm border border-sky-100',
    danger: 'bg-red-500 text-white shadow-red-100'
  };

  return (
    <button 
      disabled={disabled}
      onClick={onClick}
      className={`w-full py-5 rounded-full font-bold text-lg transition-all active:scale-[0.97] disabled:opacity-50 shadow-xl ${themes[variant]}`}
    >
      {children}
    </button>
  );
};

export const ModuleHeader: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => (
  <div className="px-6 pt-8 pb-4 flex items-center gap-4">
    <button onClick={onBack} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-sky-600 active:scale-90 transition-transform">
      <i className="fas fa-arrow-left"></i>
    </button>
    <h2 className="text-2xl font-black text-sky-900 tracking-tight">{title}</h2>
  </div>
);
