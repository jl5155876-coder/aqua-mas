
import React, { useState, useMemo } from 'react';
import { Customer, Product, CartItem, Order, Vehicle } from '../types';
import { useERPData } from '../hooks/useERPData';
import { ModuleHeader, RoundedCard, ActionButton } from './ui/Cards';
import { optimizeRoute } from '../services/geminiService';

interface OrdersModuleProps {
  onBack: () => void;
  onProcessOrder: (order: Order) => void;
}

export const OrdersModule: React.FC<OrdersModuleProps> = ({ onBack, onProcessOrder }) => {
  const { customers, products, orders, addOrder, updateOrder, vehicles, setOrders, addNotification } = useERPData();
  const [activeTab, setActiveTab] = useState<'new' | 'pending' | 'assigned'>('pending');
  
  // --- STATE: NEW ORDER ---
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<'today' | 'tomorrow' | string>('today');

  // --- STATE: MANAGEMENT ---
  const [optimizing, setOptimizing] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [showAssignModal, setShowAssignModal] = useState(false);

  // --- COMPUTED ---
  // Fix: Total respects customer special price logic (ID '1' is Garrafón)
  const total = cart.reduce((sum, item) => {
    const price = (customer?.specialPrice && item.id === '1') ? customer.specialPrice : item.price;
    return sum + (price * item.quantity);
  }, 0);

  // --- ACTIONS: NEW ORDER ---
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const decreaseQuantity = (productId: string) => {
    setCart(prev => prev.map(item => 
      item.id === productId ? { ...item, quantity: Math.max(0, item.quantity - 1) } : item
    ).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const handleCreateOrder = () => {
    if (!customer || cart.length === 0) {
      addNotification({
        title: 'Pedido incompleto',
        message: 'Selecciona cliente y productos.',
        type: 'warning'
      });
      return;
    }
    
    // Calculate timestamp based on schedule
    const now = new Date();
    let targetDate = new Date();
    if (scheduleDate === 'tomorrow') {
        targetDate.setDate(now.getDate() + 1);
    } else if (scheduleDate !== 'today') {
        targetDate = new Date(scheduleDate); // YYYY-MM-DD
        // Set to 9 AM
        targetDate.setHours(9, 0, 0, 0);
    }

    addOrder({
      customerId: customer.id,
      customerAlias: customer.alias,
      items: cart,
      total,
      status: 'pendiente',
      priority: isUrgent ? 2 : 1,
      timestamp: targetDate.getTime()
    });

    // Reset Form
    setCustomer(null);
    setCart([]);
    setSearch('');
    setIsUrgent(false);
    setScheduleDate('today');
    setActiveTab('pending');
  };

  // --- ACTIONS: BULK MANAGEMENT ---
  const toggleOrderSelection = (id: string) => {
    const newSet = new Set(selectedOrderIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedOrderIds(newSet);
  };

  const selectAllPending = () => {
    const pendingIds = orders.filter(o => o.status === 'pendiente').map(o => o.id);
    if (selectedOrderIds.size === pendingIds.length) {
        setSelectedOrderIds(new Set());
    } else {
        setSelectedOrderIds(new Set(pendingIds));
    }
  };

  const handleAssignToVehicle = (vehicleId: string) => {
    const idsToAssign = Array.from(selectedOrderIds);
    if (idsToAssign.length === 0) return;

    // Bulk update logic
    const updatedOrders = orders.map(o => {
        if (idsToAssign.includes(o.id)) {
            return { ...o, vehicleId, status: 'asignado' as const };
        }
        return o;
    });
    
    setOrders(updatedOrders);
    setSelectedOrderIds(new Set());
    setShowAssignModal(false);
  };

  const handleOptimize = async () => {
    const pendingOrders = orders.filter(o => o.status === 'pendiente');
    if (pendingOrders.length < 2) {
      addNotification({
        title: 'Optimización',
        message: 'Necesitas al menos 2 pedidos pendientes.',
        type: 'warning'
      });
      return;
    }
    
    setOptimizing(true);
    
    // Enrich orders with customer addresses for the AI
    const enrichedOrders = pendingOrders.map(o => {
        const c = customers.find(cust => cust.id === o.customerId);
        return {
            ...o,
            address: c?.address || 'Dirección no disponible'
        };
    });

    const result = await optimizeRoute(enrichedOrders);
    
    if (result.orderedIds && result.orderedIds.length > 0) {
      // Create a copy of the current orders
      const newOrders = [...orders];
      
      // Separate pending orders from the rest
      const otherOrders = newOrders.filter(o => o.status !== 'pendiente');
      const currentPending = newOrders.filter(o => o.status === 'pendiente');
      
      // Reorder pending orders based on AI result
      const sortedPending = [...currentPending].sort((a, b) => {
        const idxA = result.orderedIds.indexOf(a.id);
        const idxB = result.orderedIds.indexOf(b.id);
        
        // If not in optimized list, keep at end
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
      
      // Combine back: optimized pending first, then others
      setOrders([...sortedPending, ...otherOrders]);
      addNotification({
        title: 'IA: Ruta Optimizada',
        message: 'Los pedidos han sido reordenados para una entrega eficiente.',
        type: 'info'
      });
    } else {
      addNotification({
        title: 'Error de IA',
        message: result.explanation || 'La IA no pudo optimizar la ruta en este momento.',
        type: 'warning'
      });
    }
    setOptimizing(false);
  };

  // --- ACTIONS: ORDER STATUS MANAGEMENT ---
  const handleCancelOrder = (order: Order) => {
    if (window.confirm(`¿Estás seguro de cancelar el pedido de ${order.customerAlias}?`)) {
        updateOrder({ ...order, status: 'cancelado' });
    }
  };

  const handleRevertToPending = (order: Order) => {
    if (window.confirm(`¿Regresar el pedido de ${order.customerAlias} a lista de pendientes? Se desasignará del vehículo.`)) {
        updateOrder({ ...order, status: 'pendiente', vehicleId: undefined });
    }
  };

  // --- RENDER HELPERS ---
  const pendingOrders = useMemo(() => orders.filter(o => o.status === 'pendiente'), [orders]);
  const assignedOrders = useMemo(() => orders.filter(o => o.status === 'asignado'), [orders]);

  return (
    <div className="h-full bg-sky-50 flex flex-col animate-fadeIn overflow-hidden pb-24 relative">
      <ModuleHeader title="Logística de Pedidos" onBack={onBack} />
      
      {/* TABS */}
      <div className="px-6 flex gap-2 mb-4 shrink-0">
        <button onClick={() => setActiveTab('new')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'new' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-400'}`}>
            <i className="fas fa-plus mr-1"></i> Crear
        </button>
        <button onClick={() => setActiveTab('pending')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'pending' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-400'}`}>
            Pendientes
            {pendingOrders.length > 0 && <span className="absolute -top-1 -right-1 bg-rose-500 text-white w-5 h-5 flex items-center justify-center rounded-full text-[8px] border-2 border-sky-50">{pendingOrders.length}</span>}
        </button>
        <button onClick={() => setActiveTab('assigned')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'assigned' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-400'}`}>
            En Ruta
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-4 no-scrollbar pb-24">
        
        {/* --- TAB: NEW ORDER --- */}
        {activeTab === 'new' && (
          <div className="space-y-6">
            
            {/* Customer Search */}
            <section className="relative z-20">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">1. Cliente</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Nombre, alias o teléfono..." 
                  className="w-full bg-white border-none rounded-[2rem] py-5 px-6 shadow-sm outline-none focus:ring-2 ring-indigo-300 font-bold text-sky-900"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <i className="fas fa-search absolute right-6 top-1/2 -translate-y-1/2 text-slate-300"></i>
                
                {search && !customer && (
                  <div className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-3xl mt-2 overflow-hidden border border-slate-100 max-h-48 overflow-y-auto">
                    {customers.filter(c => c.alias.toLowerCase().includes(search.toLowerCase())).map(c => (
                      <button key={c.id} onClick={() => { setCustomer(c); setSearch(c.alias); }} className="w-full text-left p-4 hover:bg-sky-50 border-b border-slate-50 last:border-none flex justify-between items-center group">
                        <span className="font-bold text-slate-700 text-sm">{c.alias}</span>
                        <i className="fas fa-plus-circle text-indigo-200 group-hover:text-indigo-500"></i>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {customer && (
                <div className="mt-3 bg-indigo-50 border border-indigo-100 p-4 rounded-[1.5rem] flex justify-between items-center animate-fadeIn">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600"><i className="fas fa-user-check"></i></div>
                      <div>
                          <p className="font-black text-indigo-900 text-sm">{customer.alias}</p>
                          <p className="text-[9px] text-indigo-400 font-bold uppercase">{customer.address || 'Sin dirección'}</p>
                          {customer.specialPrice && <p className="text-[9px] text-emerald-500 font-black uppercase">Precio Especial: ${customer.specialPrice}</p>}
                      </div>
                  </div>
                  <button onClick={() => { setCustomer(null); setSearch(''); }} className="w-8 h-8 flex items-center justify-center bg-white rounded-full text-rose-400 shadow-sm"><i className="fas fa-times"></i></button>
                </div>
              )}
            </section>

            {/* Product Selection */}
            <section>
               <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-2 block">2. Productos</label>
               <div className="grid grid-cols-2 gap-2">
                {products.filter(p => p.category !== 'Insumos').map(p => {
                    const inCart = cart.find(i => i.id === p.id)?.quantity || 0;
                    // Check for special price
                    const effectivePrice = (customer?.specialPrice && p.id === '1') ? customer.specialPrice : p.price;
                    const isSpecial = (customer?.specialPrice && p.id === '1');

                    return (
                        <div 
                            key={p.id} 
                            className={`p-3 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${inCart > 0 ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white border-transparent text-slate-600 hover:border-indigo-100'}`}
                        >
                            <div onClick={() => { if(inCart === 0) addToCart(p); }} className="cursor-pointer">
                                <div className="text-[10px] font-black uppercase leading-tight mb-1 pr-2">{p.name}</div>
                                <div className={`font-black flex items-center gap-1 ${inCart > 0 ? 'text-indigo-200' : 'text-indigo-500'}`}>
                                    ${effectivePrice}
                                    {isSpecial && <i className="fas fa-tag text-[8px]"></i>}
                                </div>
                            </div>
                            
                            {inCart > 0 ? (
                                <div className="flex items-center justify-between mt-2 bg-indigo-700/30 rounded-xl p-1 backdrop-blur-sm">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); decreaseQuantity(p.id); }} 
                                      className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-lg font-black shadow-sm active:bg-white/20 transition-all text-white"
                                    >
                                      -
                                    </button>
                                    <span className="font-black text-lg">{inCart}</span>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); addToCart(p); }} 
                                      className="w-8 h-8 flex items-center justify-center bg-white text-indigo-600 rounded-lg font-black shadow-sm active:scale-90 transition-transform"
                                    >
                                      +
                                    </button>
                                </div>
                            ) : (
                                <button onClick={() => addToCart(p)} className="w-full py-2 bg-indigo-50 text-indigo-500 rounded-xl font-black text-[9px] uppercase mt-2 hover:bg-indigo-100 transition-colors">
                                    Agregar
                                </button>
                            )}
                        </div>
                    );
                })}
               </div>
            </section>

            {/* Scheduling & Options */}
            <section className="bg-white p-5 rounded-[2rem] shadow-sm">
                <label className="text-[10px] font-black text-slate-400 uppercase mb-3 block">3. Detalles de Entrega</label>
                
                <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
                    <button onClick={() => setScheduleDate('today')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-colors ${scheduleDate === 'today' ? 'bg-emerald-100 text-emerald-600 ring-2 ring-emerald-400' : 'bg-slate-50 text-slate-400'}`}>
                        Hoy
                    </button>
                    <button onClick={() => setScheduleDate('tomorrow')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-colors ${scheduleDate === 'tomorrow' ? 'bg-sky-100 text-sky-600 ring-2 ring-sky-400' : 'bg-slate-50 text-slate-400'}`}>
                        Mañana
                    </button>
                    <input 
                        type="date" 
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-slate-50 text-slate-500 outline-none focus:ring-2 focus:ring-indigo-300 ${scheduleDate !== 'today' && scheduleDate !== 'tomorrow' ? 'ring-2 ring-indigo-400 bg-indigo-50 text-indigo-600' : ''}`}
                        onChange={(e) => setScheduleDate(e.target.value)}
                    />
                </div>

                <div className="flex items-center justify-between bg-rose-50 p-3 rounded-2xl border border-rose-100 relative">
                    <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isUrgent ? 'border-rose-500 bg-rose-500' : 'border-rose-300'}`}>
                            {isUrgent && <i className="fas fa-check text-white text-[8px]"></i>}
                        </div>
                        <span className="text-xs font-bold text-rose-700">Marcar como URGENTE</span>
                    </div>
                    {/* Improved checkbox hit area */}
                    <input type="checkbox" checked={isUrgent} onChange={() => setIsUrgent(!isUrgent)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10" />
                </div>
            </section>

            {/* Summary & Action */}
            {cart.length > 0 && (
                <div className="pt-2 animate-slideUp">
                    <div className="flex justify-between items-end mb-4 px-2">
                        <span className="text-xs font-bold text-slate-400 uppercase">Total a Cobrar</span>
                        <span className="text-3xl font-black text-sky-900 tracking-tighter">${total.toFixed(2)}</span>
                    </div>
                    <ActionButton onClick={handleCreateOrder}>
                        Confirmar Pedido <i className="fas fa-check ml-2"></i>
                    </ActionButton>
                </div>
            )}
          </div>
        )}

        {/* --- TAB: PENDING --- */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            
            {/* Toolbar */}
            <div className="flex justify-between items-center bg-white p-2 pl-4 rounded-[1.5rem] shadow-sm mb-2 sticky top-0 z-10 border border-slate-50">
               <div className="flex items-center gap-2">
                  <div 
                    onClick={selectAllPending}
                    className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-colors ${selectedOrderIds.size > 0 && selectedOrderIds.size === pendingOrders.length ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}
                  >
                     {selectedOrderIds.size > 0 && <i className={`fas ${selectedOrderIds.size === pendingOrders.length ? 'fa-check' : 'fa-minus'} text-white text-[10px]`}></i>}
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-500">
                      {selectedOrderIds.size > 0 ? `${selectedOrderIds.size} Seleccionados` : 'Seleccionar Todo'}
                  </span>
               </div>
               <button 
                 onClick={handleOptimize} 
                 disabled={optimizing} 
                 className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
               >
                 <i className={`fas ${optimizing ? 'fa-spinner animate-spin' : 'fa-wand-magic-sparkles'}`}></i>
               </button>
            </div>

            {pendingOrders.length === 0 ? (
                <div className="text-center py-20 opacity-40">
                    <i className="fas fa-clipboard-check text-6xl mb-4 text-slate-300"></i>
                    <p className="text-xs font-black uppercase text-slate-400">Todo al día</p>
                </div>
            ) : (
                pendingOrders.map((o) => {
                    const isSelected = selectedOrderIds.has(o.id);
                    const isUrgent = o.priority > 1;
                    const date = new Date(o.timestamp);
                    const isToday = date.getDate() === new Date().getDate();

                    return (
                        <div 
                            key={o.id} 
                            className={`relative p-5 rounded-[2rem] transition-all border-2 ${isSelected ? 'bg-indigo-50 border-indigo-500 shadow-md z-10' : 'bg-white border-transparent shadow-sm'}`}
                        >
                            <div className="absolute inset-0 z-0" onClick={() => toggleOrderSelection(o.id)}></div>
                            
                            {/* Urgent Badge */}
                            {isUrgent && <div className="absolute top-0 right-0 bg-rose-500 text-white text-[8px] font-black px-3 py-1 rounded-bl-xl rounded-tr-xl shadow-sm z-10">URGENTE</div>}
                            
                            {/* Cancel Button */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleCancelOrder(o); }}
                                className="absolute top-2 right-2 w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 hover:bg-rose-100 hover:text-rose-500 z-20 transition-colors"
                            >
                                <i className="fas fa-ban"></i>
                            </button>

                            <div className="flex justify-between items-start mb-3 relative z-10 pointer-events-none">
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200'}`}>
                                        {isSelected && <i className="fas fa-check text-white text-[10px]"></i>}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-sky-900 leading-none mb-1 pr-8">{o.customerAlias}</h4>
                                        <div className="flex gap-2">
                                            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 rounded uppercase">
                                                {isToday ? 'Entrega Hoy' : date.toLocaleDateString()}
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-400">
                                                {new Date(o.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <span className="font-black text-indigo-600 text-lg tracking-tighter">${o.total}</span>
                            </div>
                            
                            <div className="flex flex-wrap gap-1 pl-9 relative z-10 pointer-events-none mb-3">
                                {o.items.map(i => (
                                    <span key={i.id} className="text-[9px] font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                        {i.quantity}x {i.name.split(' ')[0]}
                                    </span>
                                ))}
                            </div>

                            {/* Direct Pay Action */}
                            <div className="pl-9 relative z-20">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onProcessOrder(o); }}
                                    className="w-full bg-emerald-50 text-emerald-600 border border-emerald-200 py-2 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 active:bg-emerald-100 transition-colors"
                                >
                                    <i className="fas fa-cash-register"></i> Cobrar / Entregar
                                </button>
                            </div>
                        </div>
                    );
                })
            )}
          </div>
        )}

        {/* --- TAB: ASSIGNED (EN RUTA) --- */}
        {activeTab === 'assigned' && (
          <div className="space-y-4">
             {assignedOrders.length === 0 ? (
                <div className="text-center py-20 opacity-40">
                    <i className="fas fa-truck-fast text-6xl mb-4 text-slate-300"></i>
                    <p className="text-xs font-black uppercase text-slate-400">Sin pedidos en ruta</p>
                </div>
             ) : (
                assignedOrders.map(o => {
                    const vehicle = vehicles.find(v => v.id === o.vehicleId);
                    const isUrgent = o.priority > 1; // Check priority

                    return (
                        <RoundedCard key={o.id} className="border-l-4 border-l-emerald-400 relative overflow-hidden">
                            {/* Urgent Badge in Route Card */}
                            {isUrgent && <div className="absolute top-0 right-0 bg-rose-500 text-white text-[8px] font-black px-3 py-1 rounded-bl-xl rounded-tr-[2.5rem] shadow-sm z-10">URGENTE</div>}
                            
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h4 className="font-black text-sky-900 mb-1">{o.customerAlias}</h4>
                                    <div className="flex items-center gap-2">
                                        <i className="fas fa-truck text-emerald-500 text-xs"></i>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">{vehicle?.plate || 'Unidad ?'}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {o.items.map(i => (
                                            <span key={i.id} className="text-[8px] font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                                {i.quantity}x {i.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="font-black text-sky-900 block mb-2 text-lg">${o.total}</span>
                                    <button 
                                        onClick={() => onProcessOrder(o)}
                                        className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase flex items-center gap-1 active:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200"
                                    >
                                        Entregar <i className="fas fa-arrow-right"></i>
                                    </button>
                                </div>
                            </div>

                            {/* Management Buttons for Assigned Orders */}
                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-50">
                                <button 
                                    onClick={() => handleRevertToPending(o)}
                                    className="text-[9px] font-black uppercase text-amber-500 bg-amber-50 px-3 py-1.5 rounded-lg active:bg-amber-100 transition-colors"
                                >
                                    <i className="fas fa-undo mr-1"></i> Desasignar
                                </button>
                                <button 
                                    onClick={() => handleCancelOrder(o)}
                                    className="text-[9px] font-black uppercase text-rose-400 bg-rose-50 px-3 py-1.5 rounded-lg active:bg-rose-100 transition-colors"
                                >
                                    <i className="fas fa-ban mr-1"></i> Cancelar
                                </button>
                            </div>
                        </RoundedCard>
                    );
                })
             )}
          </div>
        )}
      </div>

      {/* --- FLOATING ACTION BUTTON (ASSIGN) --- */}
      {selectedOrderIds.size > 0 && activeTab === 'pending' && (
        <div className="fixed bottom-6 left-6 right-6 z-30 animate-slideUp">
            <button 
                onClick={() => setShowAssignModal(true)}
                className="w-full bg-indigo-600 text-white py-4 rounded-[2rem] shadow-2xl shadow-indigo-500/40 flex items-center justify-center gap-3 font-black uppercase text-xs tracking-widest active:scale-95 transition-transform"
            >
                <span>Asignar {selectedOrderIds.size} Pedidos</span>
                <i className="fas fa-truck-arrow-right"></i>
            </button>
        </div>
      )}

      {/* --- MODAL: SELECT VEHICLE --- */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end justify-center animate-fadeIn">
            <div className="bg-white w-full max-w-md rounded-t-[2.5rem] p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-sky-900">Seleccionar Unidad</h3>
                    <button onClick={() => setShowAssignModal(false)} className="w-10 h-10 bg-slate-100 rounded-full text-slate-400"><i className="fas fa-times"></i></button>
                </div>
                
                <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar pb-6">
                    {vehicles.map(v => {
                        const loadPercent = Math.round((v.currentLoad / v.loadCapacity) * 100);
                        const isFull = loadPercent >= 100;
                        
                        return (
                            <button 
                                key={v.id} 
                                onClick={() => handleAssignToVehicle(v.id)}
                                disabled={isFull}
                                className={`w-full p-4 rounded-[2rem] border-2 flex items-center justify-between transition-all ${isFull ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-100 active:border-indigo-500 active:bg-indigo-50'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${isFull ? 'bg-slate-200 text-slate-400' : 'bg-indigo-100 text-indigo-600'}`}>
                                        <i className="fas fa-truck-front"></i>
                                    </div>
                                    <div className="text-left">
                                        <h5 className="font-black text-sky-900 text-sm uppercase">{v.plate}</h5>
                                        <p className="text-[10px] font-bold text-slate-400">{v.description}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs font-black ${isFull ? 'text-rose-500' : 'text-emerald-500'}`}>{loadPercent}% Carga</span>
                                    <div className="w-20 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                        <div className={`h-full ${isFull ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{width: `${Math.min(loadPercent, 100)}%`}}></div>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
