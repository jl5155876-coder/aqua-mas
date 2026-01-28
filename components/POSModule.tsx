
import React, { useState, useEffect } from 'react';
import { Product, Customer, CartItem, PaymentSplit, Sale, Employee } from '../types';
import { useERPData } from '../hooks/useERPData';
import { ModuleHeader, RoundedCard, ActionButton } from './ui/Cards';

export const POSModule: React.FC<{ onBack: () => void; user: Employee }> = ({ onBack, user }) => {
  const { products, customers, sales, addSale, ticketConfig } = useERPData();
  const [activeTab, setActiveTab] = useState<'sell' | 'history'>('sell');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [search, setSearch] = useState('');
  const [vacios, setVacios] = useState(0);
  
  // Lógica de Tiempo para Admin
  const getLocalISO = (d: Date = new Date()) => {
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  };

  const [manualDate, setManualDate] = useState<string>(getLocalISO());
  const [autoTime, setAutoTime] = useState(true);
  const [nowDisplay, setNowDisplay] = useState(new Date());

  const [showSuccessModal, setShowSuccessModal] = useState<Sale | null>(null);
  
  const [paidCash, setPaidCash] = useState<string>('');
  const [paidTransfer, setPaidTransfer] = useState<string>('');

  // Efecto del Reloj
  useEffect(() => {
    let interval: any;
    if (autoTime) {
      interval = setInterval(() => {
        const d = new Date();
        setNowDisplay(d);
        setManualDate(getLocalISO(d));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [autoTime]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoTime(false);
    setManualDate(e.target.value);
  };

  const total = cart.reduce((sum, item) => {
    const price = (customer?.specialPrice && item.id === '1') ? customer.specialPrice : item.price;
    return sum + (price * item.quantity);
  }, 0);

  const totalPaid = (parseFloat(paidCash) || 0) + (parseFloat(paidTransfer) || 0);
  const change = Math.max(0, totalPaid - total);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const generateTicketPDF = (sale: Sale) => {
    const qrData = btoa(`AQUA-PRO-SECURE|${JSON.stringify({ id: sale.id, total: sale.total })}`);
    const ticketHtml = `
      <div style="font-family: 'Courier New', Courier, monospace; padding: 20px; text-align: center; width: 300px; margin: auto; color: #000; background: #fff; line-height: 1.4;">
        ${ticketConfig.logoUrl ? `<img src="${ticketConfig.logoUrl}" style="width: 100px; height: 100px; object-fit: contain; margin-bottom: 15px;"/>` : ''}
        
        <h2 style="margin: 0; font-size: 18px; text-transform: uppercase; font-weight: 900;">${ticketConfig.businessName}</h2>
        ${ticketConfig.slogan ? `<p style="font-size: 10px; font-style: italic; margin: 4px 0 0 0; color: #444;">"${ticketConfig.slogan}"</p>` : ''}
        
        <div style="margin: 10px 0; font-size: 10px; border-bottom: 2px solid #000; padding-bottom: 10px;">
          <p style="margin: 2px 0;">RFC: ${ticketConfig.rfc}</p>
          <p style="margin: 2px 0;">${ticketConfig.address}</p>
          <p style="margin: 2px 0;">TEL: ${ticketConfig.phone}</p>
          ${ticketConfig.email ? `<p style="margin: 2px 0;">${ticketConfig.email}</p>` : ''}
          ${ticketConfig.website ? `<p style="margin: 2px 0;">${ticketConfig.website}</p>` : ''}
          ${ticketConfig.socialMedia ? `<p style="margin: 2px 0;">${ticketConfig.socialMedia}</p>` : ''}
        </div>
        
        <div style="text-align: left; font-size: 11px; margin-bottom: 10px;">
          <p style="margin: 2px 0;">FOLIO: <b>${sale.id}</b></p>
          <p style="margin: 2px 0;">FECHA: ${new Date(sale.timestamp).toLocaleString()}</p>
          <p style="margin: 2px 0;">CLIENTE: ${sale.customerAlias.toUpperCase()}</p>
        </div>
        
        <table style="width: 100%; font-size: 11px; border-collapse: collapse; margin-bottom: 10px;">
          <thead>
            <tr style="border-bottom: 1px dashed #000;">
              <th style="text-align: left; padding: 4px 0;">CANT</th>
              <th style="text-align: left; padding: 4px 0;">CONCEPTO</th>
              <th style="text-align: right; padding: 4px 0;">IMP</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items.map(i => `
              <tr>
                <td style="text-align: left; vertical-align: top; padding: 4px 0;">${i.quantity}</td>
                <td style="text-align: left; vertical-align: top; padding: 4px 0;">${i.name.slice(0, 20)}</td>
                <td style="text-align: right; vertical-align: top; padding: 4px 0;">$${(i.quantity * i.price).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="border-top: 2px solid #000; padding-top: 10px; text-align: right; font-size: 13px; font-weight: 900;">
          <p style="margin: 4px 0;">TOTAL: $${sale.total.toFixed(2)}</p>
        </div>
        <div style="text-align: right; font-size: 11px;">
          <p style="margin: 2px 0;">EFECTIVO: $${(sale.paymentSplits.find(p => p.method === 'Efectivo')?.amount || 0).toFixed(2)}</p>
          <p style="margin: 2px 0;">TRANSF: $${(sale.paymentSplits.find(p => p.method === 'Transferencia')?.amount || 0).toFixed(2)}</p>
          <p style="margin: 2px 0;">RECIBIDO: $${sale.paidAmount.toFixed(2)}</p>
          <p style="margin: 4px 0; font-weight: bold; border-top: 1px dotted #888; display: inline-block; padding-top: 2px;">CAMBIO: $${sale.change.toFixed(2)}</p>
        </div>
        
        <div style="margin: 20px 0; border-top: 1px dashed #000; padding-top: 10px;">
          <p style="font-size: 11px; font-weight: bold; margin: 0 0 5px 0;">${ticketConfig.footerMessage}</p>
          ${ticketConfig.extraNote ? `<p style="font-size: 9px; font-style: italic; margin: 0;">* ${ticketConfig.extraNote}</p>` : ''}
        </div>
        
        <div style="margin-top: 15px;">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrData)}" style="width: 120px; height: 120px;"/>
          <p style="font-size: 8px; margin-top: 8px; color: #555; text-transform: uppercase; letter-spacing: 1px;">Escanea para validar autenticidad</p>
          <p style="font-size: 8px; font-weight: bold;">AQUA+ FUNDADORES SECURITY</p>
        </div>
      </div>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(ticketHtml);
      win.document.close();
      win.print();
    }
  };

  const handleSendWhatsApp = (sale: Sale) => {
    const phone = customer?.phone?.replace(/\D/g, '');
    if (!phone) return alert("El cliente no tiene teléfono registrado.");
    
    const itemsText = sale.items.map(i => `• ${i.quantity}x ${i.name}`).join('%0A');
    const msg = `¡Hola ${sale.customerAlias}!%0A%0A*${ticketConfig.businessName}*%0AGracias por tu compra.%0A%0A*Detalles de tu pedido:*%0A${itemsText}%0A%0A*Total:* $${sale.total.toFixed(2)}%0A*Ticket:* ${sale.id}%0A%0A_Validación de seguridad QR disponible en planta._`;
    window.open(`https://wa.me/52${phone}?text=${msg}`, '_blank');
  };

  const handleCheckout = () => {
    if (!customer) return alert("Selecciona un cliente.");
    if (cart.length === 0) return alert("El carrito está vacío.");

    const splits: PaymentSplit[] = [];
    if (parseFloat(paidCash) > 0) splits.push({ method: 'Efectivo', amount: parseFloat(paidCash) });
    if (parseFloat(paidTransfer) > 0) splits.push({ method: 'Transferencia', amount: parseFloat(paidTransfer) });

    const sale = addSale(
      customer.id, cart, total, totalPaid, splits, vacios, 
      user.role === 'Administrador' ? new Date(manualDate).getTime() : undefined
    );
    
    setShowSuccessModal(sale);
    setCart([]);
    setCustomer(null);
    setSearch('');
    setPaidCash('');
    setPaidTransfer('');
    if (user.role === 'Administrador') setAutoTime(true); // Reset to auto time after sale
  };

  return (
    <div className="h-full flex flex-col animate-fadeIn bg-sky-50 pb-24 overflow-hidden relative">
      <ModuleHeader title="Punto de Venta" onBack={onBack} />
      
      <div className="px-6 flex gap-2 mb-4">
        <button onClick={() => setActiveTab('sell')} className={`flex-1 py-3 rounded-2xl text-xs font-bold ${activeTab === 'sell' ? 'bg-sky-600 text-white shadow-lg' : 'bg-white text-sky-400'}`}>Nueva Venta</button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 rounded-2xl text-xs font-bold ${activeTab === 'history' ? 'bg-sky-600 text-white shadow-lg' : 'bg-white text-sky-400'}`}>Historial</button>
      </div>

      {activeTab === 'sell' ? (
        <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-32 no-scrollbar">
          {/* Admin Date Control Mejorado */}
          {user.role === 'Administrador' && (
            <div className={`p-4 rounded-[2.2rem] border transition-all duration-500 ${autoTime ? 'bg-white border-sky-100' : 'bg-amber-50 border-amber-200 shadow-inner'}`}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${autoTime ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-sky-900">
                    {autoTime ? 'TIEMPO REAL (INTERNET)' : 'MODO MANUAL (EDITANDO)'}
                  </label>
                </div>
                {!autoTime && (
                  <button onClick={() => setAutoTime(true)} className="flex items-center gap-1 text-[9px] font-black text-sky-500 uppercase bg-sky-50 px-3 py-1.5 rounded-full active:scale-95 transition-transform">
                    <i className="fas fa-rotate"></i> Sincronizar
                  </button>
                )}
              </div>
              
              <div className="flex gap-3 items-center">
                <div className="flex-1 relative">
                  <input 
                    type="datetime-local" 
                    className={`w-full border-none rounded-2xl p-4 text-xs font-black shadow-sm outline-none transition-all ${
                      autoTime 
                        ? 'bg-sky-50 text-sky-400 pointer-events-none opacity-80' 
                        : 'bg-white text-amber-600 ring-2 ring-amber-200'
                    }`}
                    value={manualDate}
                    onChange={handleDateChange}
                  />
                  {autoTime && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 text-lg font-black tracking-tighter tabular-nums">
                      {nowDisplay.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <section>
            <div className="relative">
              <input type="text" placeholder="Buscar Cliente..." className="w-full bg-white border-none rounded-[2rem] py-5 px-8 shadow-sm outline-none" value={search} onChange={e => setSearch(e.target.value)} />
              {search && !customer && (
                <div className="absolute top-full left-0 right-0 bg-white shadow-2xl rounded-3xl mt-2 z-50 overflow-hidden border border-sky-50">
                  {customers.filter(c => c.alias.toLowerCase().includes(search.toLowerCase())).map(c => (
                    <button key={c.id} onClick={() => { setCustomer(c); setSearch(c.alias); }} className="w-full text-left p-4 hover:bg-sky-50 font-bold border-b border-sky-50 flex justify-between items-center">
                      <span className="text-sky-900">{c.alias}</span>
                      <span className="text-[10px] bg-sky-50 text-sky-400 px-3 py-1 rounded-full font-black">${c.balance}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {customer && (
              <div className="mt-4 flex items-center justify-between bg-sky-600 text-white p-4 rounded-[1.8rem] shadow-lg animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center"><i className="fas fa-user"></i></div>
                  <div>
                    <span className="text-[8px] font-black uppercase opacity-60 block">Cliente Activo</span>
                    <span className="font-black text-sm">{customer.alias}</span>
                  </div>
                </div>
                <button onClick={() => {setCustomer(null); setSearch('');}} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center active:scale-90 transition-all"><i className="fas fa-times"></i></button>
              </div>
            )}
          </section>

          <div className="grid grid-cols-2 gap-3">
            {products.map(p => (
              <button key={p.id} onClick={() => addToCart(p)} className="bg-white p-5 rounded-[2.2rem] shadow-sm active:bg-sky-50 text-left relative overflow-hidden group border border-transparent hover:border-sky-100">
                <div className="text-xs font-black text-sky-900 uppercase tracking-tight mb-1">{p.name}</div>
                <div className="text-sky-600 font-black text-lg">${p.price}</div>
                <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-sky-50 text-sky-100 flex items-center justify-center rounded-tl-3xl group-active:text-sky-200 transition-colors">
                  <i className="fas fa-plus"></i>
                </div>
              </button>
            ))}
          </div>

          {cart.length > 0 && (
            <RoundedCard className="shadow-2xl border-2 border-white">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-[10px] text-sky-400 font-black uppercase mb-1 block">Monto a Liquidar</span>
                  <span className="text-4xl font-black text-sky-900 tracking-tighter">${total.toFixed(2)}</span>
                </div>
                <button onClick={() => setCart([])} className="text-rose-400 text-xs font-bold uppercase underline">Vaciar</button>
              </div>
              
              <div className="space-y-3 mb-6">
                {cart.map(i => (
                  <div key={i.id} className="flex justify-between items-center bg-sky-50/30 p-2 rounded-xl">
                    <span className="text-xs font-bold text-sky-800">{i.quantity}x {i.name}</span>
                    <span className="text-xs font-black text-sky-600">${(i.quantity * i.price).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-sky-400 uppercase ml-2">Efectivo</label>
                  <input type="number" value={paidCash} onChange={e => setPaidCash(e.target.value)} className="w-full bg-sky-50 p-4 rounded-2xl font-black text-lg focus:ring-2 ring-sky-200 outline-none" placeholder="$ 0.00" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-sky-400 uppercase ml-2">Transf.</label>
                  <input type="number" value={paidTransfer} onChange={e => setPaidTransfer(e.target.value)} className="w-full bg-sky-50 p-4 rounded-2xl font-black text-lg focus:ring-2 ring-sky-200 outline-none" placeholder="$ 0.00" />
                </div>
              </div>
              
              <div className="mt-4 p-5 bg-emerald-50 rounded-[1.8rem] flex justify-between items-center border border-emerald-100">
                <div>
                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block">Cambio Sugerido</span>
                  <span className="text-2xl font-black text-emerald-600 tracking-tighter">${change.toFixed(2)}</span>
                </div>
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm shadow-emerald-100">
                  <i className="fas fa-hand-holding-dollar text-xl"></i>
                </div>
              </div>
            </RoundedCard>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 space-y-3 pb-10 no-scrollbar">
          {sales.length === 0 ? (
            <div className="text-center py-20 opacity-30">
               <i className="fas fa-receipt text-6xl mb-4"></i>
               <p className="text-xs font-black uppercase">Sin historial reciente</p>
            </div>
          ) : (
            sales.map(s => (
              <RoundedCard key={s.id} className="py-5 border-none shadow-sm group">
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center text-xl">
                      <i className="fas fa-receipt"></i>
                    </div>
                    <div>
                      <h4 className="font-black text-sky-900 text-sm leading-tight">{s.customerAlias}</h4>
                      <p className="text-[9px] text-sky-400 font-bold uppercase mt-1">{new Date(s.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-sky-600 text-xl tracking-tighter">${s.total}</span>
                    <p className="text-[8px] font-black text-sky-300 uppercase">{s.id}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                   <button onClick={() => generateTicketPDF(s)} className="flex-1 text-[9px] font-black uppercase bg-sky-100 text-sky-600 px-3 py-3 rounded-xl flex items-center justify-center gap-2 active:bg-sky-200 transition-colors">
                    <i className="fas fa-print"></i> Ticket
                   </button>
                   <button onClick={() => handleSendWhatsApp(s)} className="flex-1 text-[9px] font-black uppercase bg-emerald-100 text-emerald-600 px-3 py-3 rounded-xl flex items-center justify-center gap-2 active:bg-emerald-200 transition-colors">
                    <i className="fab fa-whatsapp"></i> Enviar WA
                   </button>
                </div>
              </RoundedCard>
            ))
          )}
        </div>
      )}

      {activeTab === 'sell' && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/95 border-t border-sky-100 shadow-2xl z-50">
          <ActionButton onClick={handleCheckout} disabled={!customer || cart.length === 0}>
            Completar Venta
          </ActionButton>
        </div>
      )}

      {/* Modal de Éxito Moderno */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-sky-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-8 animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 text-center shadow-2xl border-t-8 border-emerald-500">
            <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-100">
              <i className="fas fa-check-circle text-5xl"></i>
            </div>
            <h3 className="text-3xl font-black text-sky-900 mb-2 tracking-tighter">¡Listo!</h3>
            <p className="text-sky-400 text-xs font-bold mb-10 uppercase tracking-widest leading-relaxed">Venta registrada en sistema local y red P2P</p>
            
            <div className="space-y-3">
              <button 
                onClick={() => { generateTicketPDF(showSuccessModal); setShowSuccessModal(null); }}
                className="w-full bg-sky-600 text-white py-6 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-4 active:scale-95 transition-all shadow-xl shadow-sky-100"
              >
                <i className="fas fa-print text-sm"></i> Imprimir Físico
              </button>
              <button 
                onClick={() => { handleSendWhatsApp(showSuccessModal); setShowSuccessModal(null); }}
                className="w-full bg-emerald-500 text-white py-6 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-4 active:scale-95 transition-all shadow-xl shadow-emerald-100"
              >
                <i className="fab fa-whatsapp text-sm"></i> Enviar a Cliente
              </button>
              <button 
                onClick={() => setShowSuccessModal(null)}
                className="w-full bg-sky-50 text-sky-400 py-5 rounded-[2rem] font-black uppercase text-[10px] mt-4"
              >
                Continuar Vendiendo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
