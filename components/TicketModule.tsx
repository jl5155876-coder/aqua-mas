
import React, { useState } from 'react';
import { useERPData } from '../hooks/useERPData';
import { ModuleHeader, RoundedCard, ActionButton } from './ui/Cards';
import { Product, CartItem, PaymentSplit } from '../types';

export const TicketModule: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { customers, products, addSale, sales } = useERPData();
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  
  // State for Create
  const [manualDate, setManualDate] = useState<string>(() => {
    // Default to current time but in local ISO format for input
    const d = new Date();
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchCustomer, setSearchCustomer] = useState('');

  const customer = customers.find(c => c.id === selectedCustomerId);
  const total = cart.reduce((sum, item) => {
    const price = (customer?.specialPrice && item.id === '1') ? customer.specialPrice : item.price;
    return sum + (price * item.quantity);
  }, 0);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const handleCreateTicket = () => {
    if (!customer || cart.length === 0 || !manualDate) {
      alert("Faltan datos (Cliente, Productos o Fecha).");
      return;
    }

    const timestamp = new Date(manualDate).getTime();
    if (isNaN(timestamp)) {
      alert("Fecha inválida.");
      return;
    }

    // Default payment to cash for admin back-entry
    const splits: PaymentSplit[] = [{ method: 'Efectivo', amount: total }];

    addSale(
      customer.id, 
      cart, 
      total, 
      total, // Fully paid by default for history logs
      splits, 
      0, // No returns tracked here
      timestamp // CRITICAL: The manual timestamp
    );

    alert("Ticket registrado correctamente fuera de tiempo.");
    setCart([]);
    setSelectedCustomerId('');
    setSearchCustomer('');
    setActiveTab('history');
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col animate-fadeIn overflow-hidden pb-24">
      <ModuleHeader title="Gestión de Tickets" onBack={onBack} />
      
      <div className="px-6 flex gap-2 mb-4 shrink-0">
        <button onClick={() => setActiveTab('create')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'create' ? 'bg-slate-700 text-white shadow-lg' : 'bg-white text-slate-400'}`}>Emitir Retroactivo</button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-slate-700 text-white shadow-lg' : 'bg-white text-slate-400'}`}>Últimos Emitidos</button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-6 no-scrollbar pb-10">
        
        {activeTab === 'create' && (
          <div className="space-y-6">
            <RoundedCard className="bg-slate-800 text-white border-none">
              <div className="flex items-center gap-3 mb-4">
                 <i className="fas fa-clock text-rose-400 text-xl"></i>
                 <h3 className="font-black uppercase text-sm">Fecha de Emisión</h3>
              </div>
              <p className="text-[10px] text-slate-400 mb-2">Selecciona la fecha y hora exacta que aparecerá en el ticket.</p>
              <input 
                type="datetime-local" 
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="w-full bg-slate-700 text-white p-4 rounded-2xl outline-none font-bold text-lg border border-slate-600 focus:border-rose-400 transition-colors"
              />
            </RoundedCard>

            <section>
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 px-2">Cliente</h4>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Buscar cliente..." 
                  value={searchCustomer}
                  onChange={e => setSearchCustomer(e.target.value)}
                  className="w-full bg-white p-4 rounded-[1.5rem] shadow-sm font-bold text-slate-800 outline-none"
                />
                {searchCustomer && !selectedCustomerId && (
                  <div className="absolute top-full left-0 right-0 bg-white z-20 shadow-xl rounded-xl mt-2 max-h-40 overflow-y-auto border border-slate-100">
                    {customers.filter(c => c.alias.toLowerCase().includes(searchCustomer.toLowerCase())).map(c => (
                      <button 
                        key={c.id} 
                        onClick={() => { setSelectedCustomerId(c.id); setSearchCustomer(c.alias); }}
                        className="w-full text-left p-3 border-b border-slate-50 font-bold text-xs text-slate-600 hover:bg-slate-50"
                      >
                        {c.alias}
                      </button>
                    ))}
                  </div>
                )}
                {customer && (
                   <div className="mt-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-xs font-black uppercase flex justify-between items-center border border-emerald-100">
                     <span>{customer.alias}</span>
                     <button onClick={() => { setSelectedCustomerId(''); setSearchCustomer(''); }}><i className="fas fa-times"></i></button>
                   </div>
                )}
              </div>
            </section>

            <section>
               <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 px-2">Productos</h4>
               <div className="grid grid-cols-2 gap-2">
                 {products.map(p => (
                   <button 
                    key={p.id} 
                    onClick={() => addToCart(p)}
                    className="bg-white p-3 rounded-xl shadow-sm text-left active:scale-95 transition-transform border border-slate-50"
                   >
                     <p className="text-[9px] font-black uppercase text-slate-800">{p.name}</p>
                     <p className="text-xs font-bold text-slate-500">${p.price}</p>
                   </button>
                 ))}
               </div>
            </section>

            {cart.length > 0 && (
              <div className="bg-white p-5 rounded-[2rem] shadow-lg border border-slate-100">
                 <h4 className="text-xs font-black uppercase text-slate-800 mb-3 border-b pb-2">Resumen</h4>
                 {cart.map(i => (
                   <div key={i.id} className="flex justify-between items-center mb-2 text-xs">
                      <span className="font-bold text-slate-600">{i.quantity}x {i.name}</span>
                      <div className="flex items-center gap-3">
                         <span className="font-black text-slate-900">${(i.quantity * i.price)}</span>
                         <button onClick={() => removeFromCart(i.id)} className="text-rose-400"><i className="fas fa-trash"></i></button>
                      </div>
                   </div>
                 ))}
                 <div className="mt-4 pt-2 border-t flex justify-between items-center">
                    <span className="font-black text-slate-800 text-lg">TOTAL</span>
                    <span className="font-black text-slate-900 text-2xl">${total.toFixed(2)}</span>
                 </div>
                 <div className="mt-6">
                   <ActionButton onClick={handleCreateTicket} variant="primary">Guardar Ticket</ActionButton>
                 </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
             {sales.length === 0 ? (
               <p className="text-center text-slate-400 text-xs py-10">No hay tickets registrados.</p>
             ) : (
               sales.slice(0, 20).map(s => (
                 <div key={s.id} className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100 flex justify-between items-center">
                    <div>
                       <div className="flex items-center gap-2">
                          <span className="bg-slate-100 text-slate-600 text-[8px] font-black px-2 py-0.5 rounded-full">{s.id}</span>
                          <span className="text-xs font-black text-slate-800">{s.customerAlias}</span>
                       </div>
                       <p className="text-[10px] text-slate-400 font-bold mt-1">
                         {new Date(s.timestamp).toLocaleDateString()} {new Date(s.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                       </p>
                       <p className="text-[8px] text-slate-300 uppercase mt-0.5">Items: {s.items.reduce((a,b)=>a+b.quantity,0)}</p>
                    </div>
                    <span className="text-xl font-black text-slate-700">${s.total}</span>
                 </div>
               ))
             )}
          </div>
        )}

      </div>
    </div>
  );
};
