
import React, { useState, useMemo } from 'react';
import { useERPData } from '../hooks/useERPData';
import { ModuleHeader, RoundedCard, ActionButton } from './ui/Cards';
import { Customer } from '../types';

export const WhatsAppModule: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { customers } = useERPData();
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [searchCustomer, setSearchCustomer] = useState('');
  
  // Custom Message State
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customMsg, setCustomMsg] = useState('');
  
  // Multi-selection states
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [campaignMode, setCampaignMode] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const templates = [
    { 
      id: 1, 
      category: 'Rutas',
      title: 'Recordatorio de Visita', 
      msg: '¡Hola! Aqua+ Fundadores pasará mañana por tu zona. ¿Necesitas garrafones? Responde con el número de piezas. 🚛',
      color: 'bg-blue-100 text-blue-600'
    },
    { 
      id: 2, 
      category: 'Promos',
      title: 'Fidelidad 10+1', 
      msg: '¡Felicidades! En tu próxima compra de 10 garrafones, el 11 va por nuestra cuenta. ¡Gracias por elegirnos! 🎁',
      color: 'bg-purple-100 text-purple-600'
    },
    { 
      id: 3, 
      category: 'Cobranza',
      title: 'Aviso de Pago Pendiente', 
      msg: 'Estimado cliente, te recordamos que tienes un saldo pendiente. Ayúdanos a seguir brindándote el mejor servicio. 💳',
      color: 'bg-red-100 text-red-600'
    },
    { 
      id: 4, 
      category: 'Bienvenida',
      title: 'Nuevo Cliente', 
      msg: '¡Bienvenido a la familia Aqua+ Fundadores! Es un gusto saludarte. Te compartimos nuestros horarios y precios actuales. 💧',
      color: 'bg-emerald-100 text-emerald-600'
    },
    {
      id: 5,
      category: 'Promos',
      title: 'Promo Fin de Semana',
      msg: '¡Disfruta el fin de semana! ☀️ Solo por hoy y mañana, 2 garrafones por precio especial. ¡Pide el tuyo ahora!',
      color: 'bg-amber-100 text-amber-600'
    },
    {
      id: 6,
      category: 'Aviso',
      title: 'Mantenimiento en Planta',
      msg: 'Aviso Importante: Realizaremos mantenimiento de calidad mañana. Por favor anticipa tus pedidos hoy. ¡Gracias! 🛠️',
      color: 'bg-slate-100 text-slate-600'
    },
    {
      id: 7,
      category: 'Calidad',
      title: 'Encuesta de Satisfacción',
      msg: 'Nos importa tu opinión. ¿Qué tal te pareció el servicio y la calidad del agua en tu última entrega? Tu opinión nos ayuda a mejorar. ⭐',
      color: 'bg-indigo-100 text-indigo-600'
    },
    {
      id: 8,
      category: 'Recuperación',
      title: 'Te Extrañamos',
      msg: 'Hace tiempo no sabemos de ti. ¿Necesitas rellenar tus garrafones? Tenemos una sorpresa para ti en tu próximo pedido. 🎈',
      color: 'bg-pink-100 text-pink-600'
    },
    {
      id: 9,
      category: 'Clima',
      title: 'Promo Lluvia',
      msg: '¡Que la lluvia no te deje sin agua! 🌧️ Haz tu pedido hoy y te lo llevamos hasta la puerta de tu cocina. ¡Evita salir!',
      color: 'bg-sky-100 text-sky-600'
    },
    {
      id: 10,
      category: 'Logística',
      title: 'Recolección de Envases',
      msg: '¡Hola! Pasaremos a recolectar envases vacíos en tu zona. Si tienes garrafones para cambio, por favor déjalos listos. ♻️',
      color: 'bg-teal-100 text-teal-600'
    },
    {
      id: 11,
      category: 'Aviso',
      title: 'Horario Extendido',
      msg: '¡Buenas noticias! Ahora cerramos más tarde. Servicio disponible hasta las 8:00 PM. ¡Haz tu pedido! 🌙',
      color: 'bg-violet-100 text-violet-600'
    },
    {
      id: 12,
      category: 'Promos',
      title: 'Promo Agua Alcalina',
      msg: '¿Ya probaste nuestra agua alcalina? Balancea tu pH y mejora tu hidratación. ¡Pregunta por el precio de introducción! 💧⚡',
      color: 'bg-cyan-100 text-cyan-600'
    },
    {
      id: 13,
      category: 'Soporte',
      title: 'Garantía de Envase',
      msg: '¿Tu garrafón tiene alguna fuga o detalle? No te preocupes, avísanos y pasamos a cambiártelo sin costo adicional. Tu satisfacción es primero. 🛡️',
      color: 'bg-orange-100 text-orange-600'
    },
    {
      id: 14,
      category: 'Promos',
      title: 'Programa de Referidos',
      msg: '¡Gana agua GRATIS! Recomiéndanos con un vecino. Si hace su primer pedido, ambos reciben un garrafón de regalo en su próxima compra. 🤝',
      color: 'bg-lime-100 text-lime-600'
    },
    {
      id: 15,
      category: 'Aviso',
      title: 'Día Festivo',
      msg: 'Aviso: Mañana es día festivo y no laboramos. ¡Asegura tu agua hoy! Estamos recibiendo pedidos hasta las 6 PM. 📅',
      color: 'bg-rose-100 text-rose-500'
    },
    {
      id: 16,
      category: 'Producto',
      title: 'Venta de Hielo',
      msg: '¡Ya tenemos Hielo! 🧊 Bolsa de 5kg ideal para tus reuniones. Pídela junto con tu garrafón y que no falte nada en tu fiesta.',
      color: 'bg-blue-50 text-blue-800'
    },
    {
      id: 17,
      category: 'Cobranza',
      title: 'Recordatorio Amable',
      msg: 'Hola, solo un recordatorio amistoso de tu saldo pendiente. Puedes pagar en efectivo al repartidor o por transferencia. ¡Gracias! 😊',
      color: 'bg-gray-100 text-gray-600'
    }
  ];

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.alias.toLowerCase().includes(searchCustomer.toLowerCase()) || 
      (c.phone && c.phone.includes(searchCustomer))
    );
  }, [customers, searchCustomer]);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedCustomerIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedCustomerIds(newSet);
  };

  const selectAllFiltered = () => {
    const newSet = new Set(selectedCustomerIds);
    filteredCustomers.forEach(c => newSet.add(c.id));
    setSelectedCustomerIds(newSet);
  };

  const clearSelection = () => {
    setSelectedCustomerIds(new Set());
  };

  const handleSendToCustomer = (customer: Customer) => {
    if (!customer.phone) {
      alert("Este cliente no tiene un teléfono registrado.");
      return;
    }
    const cleanPhone = customer.phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.length === 10 ? `52${cleanPhone}` : cleanPhone;
    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(selectedTemplate.msg)}`;
    
    // Mark as completed
    const newCompleted = new Set(completedIds);
    newCompleted.add(customer.id);
    setCompletedIds(newCompleted);
    
    window.open(url, '_blank');
  };

  const startCampaign = () => {
    if (selectedCustomerIds.size === 0) return alert("Selecciona al menos un cliente.");
    setCampaignMode(true);
    setCompletedIds(new Set());
  };

  const confirmCustomMessage = () => {
    if (!customTitle || !customMsg) return alert("Debes escribir un título y un mensaje.");
    setSelectedTemplate({
        id: 999,
        category: 'Personalizado',
        title: customTitle,
        msg: customMsg,
        color: 'bg-slate-100 text-slate-600 border border-slate-300'
    });
    setIsCustomMode(false);
  };

  // Campaign View
  if (campaignMode && selectedTemplate) {
    const selectedCustomersList = customers.filter(c => selectedCustomerIds.has(c.id));
    const pendingCount = selectedCustomerIds.size - completedIds.size;
    const progress = (completedIds.size / selectedCustomerIds.size) * 100;

    return (
      <div className="h-full animate-fadeIn bg-sky-50 pb-24 flex flex-col overflow-hidden relative">
        <ModuleHeader title="Campaña Activa" onBack={() => setShowExitConfirm(true)} />
        
        <div className="px-6 flex-1 overflow-y-auto no-scrollbar pb-10">
          <RoundedCard className="mb-6 bg-white border-none shadow-lg">
             <h4 className="text-xs font-black text-sky-900 mb-1">Enviando: "{selectedTemplate.title}"</h4>
             <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-bold text-sky-400 uppercase">Progreso</span>
                <span className="text-2xl font-black text-sky-600">{Math.round(progress)}%</span>
             </div>
             <div className="w-full bg-sky-100 h-3 rounded-full overflow-hidden">
               <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
             </div>
             <p className="text-[9px] text-right mt-2 font-bold text-sky-400">
               {completedIds.size} de {selectedCustomerIds.size} enviados
             </p>
          </RoundedCard>

          <div className="space-y-3">
             {selectedCustomersList.sort((a, b) => {
               // Sort: Pending first, then completed
               const aDone = completedIds.has(a.id);
               const bDone = completedIds.has(b.id);
               return (aDone === bDone) ? 0 : aDone ? 1 : -1;
             }).map(c => {
               const isDone = completedIds.has(c.id);
               return (
                 <div key={c.id} className={`p-4 rounded-[1.5rem] flex items-center justify-between transition-all ${isDone ? 'bg-emerald-50 opacity-60' : 'bg-white shadow-md border border-sky-100 scale-105 z-10'}`}>
                    <div className="flex items-center gap-3">
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${isDone ? 'bg-emerald-300' : 'bg-sky-500'}`}>
                          <i className={`fas ${isDone ? 'fa-check' : 'fa-user'}`}></i>
                       </div>
                       <div>
                          <h5 className="font-black text-sky-900 text-xs">{c.alias}</h5>
                          <p className="text-[9px] text-sky-400">{c.phone}</p>
                       </div>
                    </div>
                    {isDone ? (
                      <span className="text-[9px] font-black uppercase text-emerald-500 bg-emerald-100 px-3 py-1 rounded-full">Enviado</span>
                    ) : (
                      <button 
                        onClick={() => handleSendToCustomer(c)}
                        className="bg-emerald-500 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-200 active:scale-90 transition-transform flex items-center gap-2"
                      >
                        Enviar <i className="fab fa-whatsapp"></i>
                      </button>
                    )}
                 </div>
               );
             })}
          </div>
        </div>

        {/* Modal de Confirmación de Salida */}
        {showExitConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-sky-900/60 backdrop-blur-sm p-6 animate-fadeIn">
            <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl border border-sky-100">
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4 mx-auto">
                <i className="fas fa-right-from-bracket text-2xl"></i>
              </div>
              <h3 className="text-xl font-black text-sky-900 mb-2 text-center">¿Detener Campaña?</h3>
              <p className="text-xs font-bold text-sky-500 mb-6 text-center leading-relaxed">
                El progreso de envío actual se perderá si sales ahora. ¿Estás seguro?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-4 bg-sky-50 text-sky-600 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all"
                >
                  Continuar
                </button>
                <button 
                  onClick={() => {
                    setCampaignMode(false);
                    setCompletedIds(new Set());
                    setShowExitConfirm(false);
                  }}
                  className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-200 active:scale-95 transition-all"
                >
                  Salir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Selection View
  return (
    <div className="h-full animate-fadeIn bg-sky-50 pb-24 flex flex-col overflow-hidden">
      <ModuleHeader title="Difusión Inteligente" onBack={onBack} />
      
      <div className="px-6 flex-1 overflow-y-auto no-scrollbar space-y-4 pb-32">
        <div className="bg-emerald-50 p-5 rounded-[2rem] border border-emerald-100 mb-2">
          <div className="flex items-center gap-3 mb-2">
            <i className="fab fa-whatsapp text-emerald-500 text-2xl"></i>
            <h4 className="font-black text-emerald-900 text-[10px] uppercase tracking-wider">WhatsApp Business Pro</h4>
          </div>
          <p className="text-[10px] text-emerald-700 leading-relaxed font-bold italic">
            Selecciona una plantilla y marca múltiples clientes para iniciar una campaña de envío masivo.
          </p>
        </div>
        
        {!selectedTemplate ? (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center px-2">
                <h4 className="text-[10px] font-black uppercase text-sky-400 tracking-widest">1. Selecciona Plantilla</h4>
                <button onClick={() => setIsCustomMode(!isCustomMode)} className="text-[9px] font-black text-emerald-500 uppercase bg-emerald-50 px-3 py-1 rounded-full active:scale-95 transition-transform">
                    {isCustomMode ? 'Ver Plantillas' : '+ Crear Nuevo'}
                </button>
            </div>

            {isCustomMode ? (
                <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-emerald-50 space-y-4 animate-fadeIn">
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 block mb-1">Título (Interno)</label>
                        <input 
                            className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-sky-900 text-sm focus:ring-2 ring-emerald-200 transition-all" 
                            placeholder="Ej: Aviso Urgente"
                            value={customTitle}
                            onChange={e => setCustomTitle(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 block mb-1">Mensaje para el Cliente</label>
                        <textarea 
                            className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-medium text-slate-600 text-sm h-32 resize-none focus:ring-2 ring-emerald-200 transition-all" 
                            placeholder="Escribe tu mensaje aquí..."
                            value={customMsg}
                            onChange={e => setCustomMsg(e.target.value)}
                        />
                    </div>
                    <ActionButton onClick={confirmCustomMessage}>
                        Usar Mensaje
                    </ActionButton>
                </div>
            ) : (
                templates.map(t => (
                <RoundedCard key={t.id} onClick={() => setSelectedTemplate(t)} className="hover:border-emerald-300 transition-all border-transparent shadow-sm active:scale-[0.98]">
                    <div className="flex justify-between items-start mb-3">
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${t.color}`}>
                        {t.category}
                    </span>
                    </div>
                    <h4 className="font-black text-sky-900 text-sm mb-2">{t.title}</h4>
                    <p className="text-[10px] text-sky-500 font-bold line-clamp-2 italic">"{t.msg}"</p>
                </RoundedCard>
                ))
            )}
          </div>
        ) : (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between px-2">
              <h4 className="text-[10px] font-black uppercase text-sky-400 tracking-widest">2. Selecciona Destinatarios</h4>
              <button onClick={() => { setSelectedTemplate(null); clearSelection(); }} className="text-[9px] font-black text-sky-400 uppercase underline">Cambiar Plantilla</button>
            </div>

            <div className="bg-white p-4 rounded-3xl shadow-sm border border-emerald-50 mb-2">
              <p className="text-[9px] font-black text-sky-300 uppercase mb-1">Plantilla Activa:</p>
              <p className="text-xs font-bold text-sky-900 leading-tight">"{selectedTemplate.title}"</p>
              {selectedTemplate.category === 'Personalizado' && <p className="text-[9px] text-slate-400 italic mt-1 line-clamp-2">"{selectedTemplate.msg}"</p>}
            </div>

            <div className="relative">
              <input 
                type="text" 
                placeholder="Filtrar clientes..." 
                className="w-full bg-white border-none rounded-[2rem] py-4 px-6 shadow-sm outline-none focus:ring-2 ring-emerald-300 font-bold text-sm"
                value={searchCustomer}
                onChange={(e) => setSearchCustomer(e.target.value)}
              />
              <i className="fas fa-search absolute right-6 top-1/2 -translate-y-1/2 text-sky-100"></i>
            </div>

            <div className="flex gap-2 px-2">
              <button onClick={selectAllFiltered} className="text-[10px] bg-sky-100 text-sky-600 px-3 py-1.5 rounded-full font-black uppercase">
                Seleccionar Visibles ({filteredCustomers.length})
              </button>
              {selectedCustomerIds.size > 0 && (
                <button onClick={clearSelection} className="text-[10px] bg-white text-rose-400 border border-rose-100 px-3 py-1.5 rounded-full font-black uppercase">
                  Limpiar ({selectedCustomerIds.size})
                </button>
              )}
            </div>

            <div className="space-y-2">
              {filteredCustomers.length === 0 ? (
                <p className="text-center py-10 text-sky-300 text-xs italic">No se encontraron clientes.</p>
              ) : (
                filteredCustomers.map(c => {
                  const isSelected = selectedCustomerIds.has(c.id);
                  return (
                    <button 
                      key={c.id} 
                      onClick={() => toggleSelection(c.id)}
                      className={`w-full p-4 rounded-[2rem] flex items-center justify-between border-2 transition-all shadow-sm group ${isSelected ? 'bg-emerald-50 border-emerald-400' : 'bg-white border-transparent'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-sky-200 bg-white'}`}>
                           {isSelected && <i className="fas fa-check text-white text-[10px]"></i>}
                        </div>
                        <div className="text-left">
                          <h5 className="font-black text-sky-900 text-xs uppercase tracking-tighter">{c.alias}</h5>
                          <p className="text-[9px] text-sky-400 font-bold">{c.phone || 'Sin teléfono'}</p>
                        </div>
                      </div>
                      {isSelected && <i className="fab fa-whatsapp text-emerald-500"></i>}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {selectedCustomerIds.size > 0 && selectedTemplate && !campaignMode && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/95 border-t border-sky-100 shadow-2xl z-50 animate-fadeIn">
          <div className="flex justify-between items-center mb-3 px-2">
             <span className="text-xs font-bold text-sky-900">{selectedCustomerIds.size} Clientes Seleccionados</span>
             <span className="text-[10px] font-black text-emerald-500 uppercase">Listo para enviar</span>
          </div>
          <ActionButton onClick={startCampaign}>
            <div className="flex items-center justify-center gap-2">
               <span>Iniciar Campaña</span>
               <i className="fas fa-paper-plane"></i>
            </div>
          </ActionButton>
        </div>
      )}
    </div>
  );
};
