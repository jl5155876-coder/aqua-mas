
import React, { useState } from 'react';
import { Customer, Product, CartItem, Order, Vehicle } from '../types';
import { useERPData } from '../hooks/useERPData';
import { ModuleHeader, RoundedCard, ActionButton } from './ui/Cards';
import { optimizeRoute } from '../services/geminiService';

export const OrdersModule: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { customers, products, orders, addOrder, updateOrder, vehicles, setOrders } = useERPData();
  const [activeTab, setActiveTab] = useState<'pending' | 'assigned' | 'new'>('pending');
  
  // New Order State
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [optimizing, setOptimizing] = useState(false);

  // Assignment State
  const [assigningOrder, setAssigningOrder] = useState<Order | null>(null);

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const handleCreateOrder = () => {
    if (!customer || cart.length === 0) return alert("Selecciona cliente y productos.");
    addOrder({
      customerId: customer.id,
      customerAlias: customer.alias,
      items: cart,
      total,
      status: 'pendiente',
      priority: 1
    });
    setCustomer(null);
    setCart([]);
    setSearch('');
    setActiveTab('pending');
  };

  const handleAssign = (vehicleId: string) => {
    if (!assigningOrder) return;
    updateOrder({ ...assigningOrder, vehicleId, status: 'asignado' });
    setAssigningOrder(null);
  };

  const handleOptimize = async () => {
    const pendingOrders = orders.filter(o => o.status === 'pendiente');
    if (pendingOrders.length < 2) return alert("Necesitas al menos 2 pedidos pendientes.");
    
    setOptimizing(true);
    const result = await optimizeRoute(pendingOrders);
    
    if (result.orderedIds) {
      const optimized = [...orders].sort((a, b) => {
        const idxA = result.orderedIds.indexOf(a.id);
        const idxB = result.orderedIds.indexOf(b.id);
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
      setOrders(optimized);
      alert("¡Ruta optimizada con IA basada en ubicación!");
    }
    setOptimizing(false);
  };

  return (
    <div className="h-full bg-sky-50 flex flex-col animate-fadeIn overflow-hidden pb-24">
      <ModuleHeader title="Gestión de Pedidos" onBack={onBack} />
      
      <div className="px-6 flex gap-2 mb-4 shrink-0">
        <button onClick={() => setActiveTab('new')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'new' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-sky-400'}`}>Nuevo</button>
        <button onClick={() => setActiveTab('pending')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pending' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-sky-400'}`}>Pendientes</button>
        <button onClick={() => setActiveTab('assigned')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'assigned' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-sky-400'}`}>En Ruta</button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-4 no-scrollbar pb-10">
        {activeTab === 'new' && (
          <div className="space-y-6">
            <section>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Buscar Cliente..." 
                  className="w-full bg-white border-none rounded-[2rem] py-5 px-8 shadow-sm outline-none focus:ring-2 ring-indigo-300"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && !customer && (
                  <div className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-3xl mt-2 z-50 border border-sky-100 max-h-40 overflow-y-auto">
                    {customers.filter(c => c.alias.toLowerCase().includes(search.toLowerCase())).map(c => (
                      <button key={c.id} onClick={() => { setCustomer(c); setSearch(c.alias); }} className="w-full text-left p-4 hover:bg-sky-50 border-b border-sky-50 last:border-none font-bold text-sky-900">{c.alias}</button>
                    ))}
                  </div>
                )}
              </div>
              {customer && (
                <div className="mt-3 bg-indigo-500 text-white p-5 rounded-[2rem] flex justify-between items-center animate-fadeIn">
                  <span className="font-black">{customer.alias}</span>
                  <button onClick={() => { setCustomer(null); setSearch(''); }} className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full"><i className="fas fa-times"></i></button>
                </div>
              )}
            </section>

            <div className="grid grid-cols-2 gap-3">
              {products.map(p => (
                <button key={p.id} onClick={() => addToCart(p)} className="bg-white p-5 rounded-[2.2rem] shadow-sm border border-white text-left active:bg-sky-50 transition-all">
                  <div className="text-[11px] font-black text-sky-900 uppercase leading-none mb-1">{p.name}</div>
                  <div className="text-indigo-600 font-black">${p.price}</div>
                </button>
              ))}
            </div>

            {cart.length > 0 && (
              <RoundedCard className="bg-white/80 border-indigo-100">
                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Detalle Pedido</h4>
                {cart.map(i => (
                  <div key={i.id} className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-sky-900">{i.quantity}x {i.name}</span>
                    <span className="text-xs font-black text-indigo-600">${i.price * i.quantity}</span>
                  </div>
                ))}
                <div className="mt-4 pt-4 border-t border-indigo-50 flex justify-between">
                  <span className="font-black text-sky-900">TOTAL</span>
                  <span className="font-black text-2xl text-indigo-600">${total}</span>
                </div>
                <button onClick={handleCreateOrder} className="w-full bg-indigo-600 text-white py-4 rounded-3xl mt-6 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100">Confirmar Pedido</button>
              </RoundedCard>
            )}
          </div>
        )}

        {activeTab === 'pending' && (
          <div className="space-y-4">
            <button 
              onClick={handleOptimize} 
              disabled={optimizing}
              className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-[2rem] border border-emerald-100 font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 mb-4"
            >
              <i className={`fas ${optimizing ? 'fa-spinner animate-spin' : 'fa-wand-magic-sparkles'}`}></i>
              {optimizing ? 'Optimizando Ruta...' : 'Optimizar Ruta con IA'}
            </button>
            
            {orders.filter(o => o.status === 'pendiente').map((o, idx) => (
              <RoundedCard key={o.id} className="border-l-4 border-l-indigo-400">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-indigo-100 text-indigo-600 text-[8px] font-black px-2 py-0.5 rounded-full">#{idx + 1} EN RUTA</span>
                      <h4 className="font-black text-sky-900">{o.customerAlias}</h4>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {o.items.map(i => <span key={i.id} className="text-[8px] font-bold text-sky-400">{i.quantity}x {i.name}</span>)}
                    </div>
                  </div>
                  <span className="font-black text-indigo-600">${o.total}</span>
                </div>
                <button onClick={() => setAssigningOrder(o)} className="w-full mt-4 py-3 bg-indigo-50 text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest">Asignar a Flota</button>
              </RoundedCard>
            ))}
          </div>
        )}

        {activeTab === 'assigned' && (
          <div className="space-y-4">
            {orders.filter(o => o.status === 'asignado').map(o => (
              <RoundedCard key={o.id} className="border-l-4 border-l-emerald-400">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-sky-900">{o.customerAlias}</h4>
                    <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Unidad: {vehicles.find(v => v.id === o.vehicleId)?.plate || 'S/N'}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-sky-900 block">${o.total}</span>
                    <button onClick={() => updateOrder({...o, status: 'entregado'})} className="text-[9px] font-black text-emerald-600 uppercase underline">Confirmar Entrega</button>
                  </div>
                </div>
              </RoundedCard>
            ))}
          </div>
        )}
      </div>

      {assigningOrder && (
        <div className="fixed inset-0 bg-sky-900/40 backdrop-blur-sm z-[100] flex items-end">
          <div className="w-full bg-white rounded-t-[2.5rem] p-8 animate-fadeIn">
            <h3 className="text-xl font-black text-sky-900 mb-6">Asignar Unidad de Flota</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto no-scrollbar">
              {vehicles.map(v => (
                <button key={v.id} onClick={() => handleAssign(v.id)} className="w-full p-5 bg-sky-50 rounded-[1.8rem] flex justify-between items-center active:scale-95 transition-all">
                  <div className="flex items-center gap-4">
                    <i className="fas fa-truck-moving text-sky-600"></i>
                    <div className="text-left">
                      <span className="text-[9px] font-black text-sky-400 uppercase">{v.plate}</span>
                      <h5 className="font-black text-sky-900 text-sm">{v.description}</h5>
                    </div>
                  </div>
                  <i className="fas fa-chevron-right text-sky-200"></i>
                </button>
              ))}
            </div>
            <button onClick={() => setAssigningOrder(null)} className="w-full py-4 mt-6 text-sky-400 font-black uppercase text-[10px] tracking-widest">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};
