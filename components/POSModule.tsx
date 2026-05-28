
import React, { useState, useEffect } from 'react';
import { Product, Customer, CartItem, PaymentSplit, Sale, Employee, TicketConfig, Order, GarrafonType } from '../types';
import { useERPData } from '../hooks/useERPData';
import { ModuleHeader, RoundedCard, ActionButton } from './ui/Cards';
import html2canvas from 'html2canvas';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { generateTicketPDF } from '../services/pdfGenerator';

// Helper to convert Uint8Array to Base64
const uint8ArrayToBase64 = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

const GARRAFON_COLORS: Record<GarrafonType, string> = {
  'Aqua': 'bg-indigo-500',
  'Bonafont': 'bg-orange-400',
  'Ciel': 'bg-sky-400',
  'E-Pura': 'bg-blue-600',
  'Generico': 'bg-slate-400'
};

const TicketModal = ({ sale, config, onClose, onWhatsApp, onNewSale, onFinish }: any) => {
  const [sharing, setSharing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const qrData = btoa(`AQUA-PRO-SECURE|${JSON.stringify({ id: sale.id, total: sale.total })}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;

  // Auto-save logic restored
  const handleAutoSave = async () => {
    try {
      setSaveStatus('saving');
      const element = document.getElementById('printable-ticket');
      if (!element) return;

      const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', logging: false });
      const base64Data = canvas.toDataURL('image/png').split(',')[1];
      const folderName = 'AquaTickets';
      const fileName = `Ticket_${sale.id}_${Date.now()}.png`;

      try {
        await Filesystem.mkdir({ path: folderName, directory: Directory.Documents, recursive: true });
        await Filesystem.writeFile({ path: `${folderName}/${fileName}`, data: base64Data, directory: Directory.Documents });
        setSaveStatus('saved');
      } catch (fsError) {
        console.warn("Auto-save skipped (Web mode)", fsError);
        setSaveStatus('error');
      }
    } catch (e) {
      console.error("Error generating image", e);
      setSaveStatus('error');
    }
  };

  useEffect(() => { setTimeout(handleAutoSave, 800); }, []);

  const handleSharePDF = async () => {
    setSharing(true);
    try {
        const pdfBytes = await generateTicketPDF(sale, config);
        const base64Content = uint8ArrayToBase64(pdfBytes);
        const fileName = `Ticket_${sale.id}.pdf`;

        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Content,
          directory: Directory.Cache
        });

        await Share.share({
            title: `Ticket ${sale.id}`,
            text: `Hola ${sale.customerAlias}, adjunto tu ticket de compra en Aqua+.`,
            url: savedFile.uri,
            dialogTitle: 'Compartir Ticket'
        });
    } catch (e) {
        console.error(e);
        // Fallback Web
        try {
            const pdfBytes = await generateTicketPDF(sale, config);
            const file = new File([pdfBytes], `Ticket_${sale.id}.pdf`, { type: 'application/pdf' });
            const url = URL.createObjectURL(file);
            const link = document.createElement('a');
            link.href = url;
            link.download = file.name;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch(webErr) {
            alert("No se pudo compartir.");
        }
    } finally {
        setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-[340px] max-h-[85vh] shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col relative">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-400 via-indigo-500 to-sky-400"></div>
        
        {saveStatus === 'saved' && (
          <div className="absolute top-3 right-4 bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full text-[8px] font-black uppercase flex items-center gap-1 animate-fadeIn z-20">
            <i className="fas fa-check-circle"></i> Guardado
          </div>
        )}

        <div className="overflow-y-auto flex-1 p-6 pb-2 text-center font-mono text-slate-800 leading-tight text-xs relative custom-scrollbar" id="printable-ticket">
            {config.logoUrl && <img src={config.logoUrl} alt="Logo" className="w-20 h-20 object-contain mx-auto mb-3 grayscale mix-blend-multiply" />}
            <h2 className="text-xl font-black uppercase mb-1 tracking-tighter text-sky-900">{config.businessName}</h2>
            {config.slogan && <p className="text-[9px] text-slate-400 uppercase font-bold mb-2 tracking-widest">{config.slogan}</p>}
            
            <div className="border-y-2 border-dashed border-slate-200 py-3 my-3 space-y-1 text-slate-500">
              <div className="flex justify-between text-[10px] font-bold uppercase">
                <span>Fecha:</span>
                <span className="text-slate-800">{new Date(sale.timestamp).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold uppercase">
                <span>Hora:</span>
                <span className="text-slate-800">{new Date(sale.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold uppercase">
                <span>Folio:</span>
                <span className="text-sky-600 font-black">{sale.id}</span>
              </div>
              {sale.customerAlias && (
                <div className="flex justify-between text-[10px] font-bold uppercase border-t border-slate-100 pt-1 mt-1">
                  <span>Cliente:</span>
                  <span className="text-slate-800">{sale.customerAlias}</span>
                </div>
              )}
            </div>

            <table className="w-full mb-4 border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900">
                  <th className="text-left py-2 w-8 uppercase text-[9px] font-black">Cant</th>
                  <th className="text-left py-2 uppercase text-[9px] font-black pl-2">Descripción</th>
                  <th className="text-right py-2 uppercase text-[9px] font-black">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items.map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="text-left py-2 align-top font-black text-slate-900">{item.quantity}</td>
                    <td className="text-left py-2 align-top pl-2">
                      <div className="font-bold text-slate-700">{item.name}</div>
                      <div className="text-[9px] text-slate-400">${item.price.toFixed(2)} c/u</div>
                    </td>
                    <td className="text-right py-2 align-top font-bold text-slate-900">${(item.quantity * item.price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="bg-slate-50 rounded-2xl p-4 mb-4 space-y-2 border border-slate-100">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                <span>Subtotal</span>
                <span>${sale.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                <span>Pagado</span>
                <span className="text-emerald-600">${sale.paidAmount.toFixed(2)}</span>
              </div>
              
              {sale.paidAmount < sale.total && (
                <div className="flex justify-between text-[10px] font-black text-rose-600 uppercase pt-1 border-t border-rose-100">
                  <span>Deuda Generada</span>
                  <span>${(sale.total - sale.paidAmount).toFixed(2)}</span>
                </div>
              )}
              
              {sale.paidAmount > sale.total && (
                <div className="flex justify-between text-[10px] font-bold text-sky-600 uppercase pt-1 border-t border-sky-100">
                  <span>Cambio</span>
                  <span>${(sale.paidAmount - sale.total).toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t-2 border-slate-900 mt-1">
                <span className="text-xs font-black uppercase text-slate-900">Total a Pagar</span>
                <span className="text-xl font-black text-slate-900">${sale.total.toFixed(2)}</span>
              </div>
            </div>

            {(sale.previousBalance > 0 || sale.newBalance > 0) && (
              <div className="bg-indigo-50/50 rounded-xl p-3 mb-4 border border-indigo-100 space-y-1">
                <div className="flex justify-between text-[9px] font-bold text-indigo-400 uppercase">
                  <span>Saldo Anterior</span>
                  <span>${sale.previousBalance?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between text-[10px] font-black text-indigo-700 uppercase">
                  <span>Saldo Actualizado</span>
                  <span>${sale.newBalance?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            )}

            {sale.emptyGarrafonsReturned > 0 && (
              <div className="bg-sky-50 p-3 rounded-xl mb-4 text-left border border-sky-100 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase text-sky-400">Envases Recibidos</p>
                  <p className="text-xs font-black text-sky-700">{sale.emptyGarrafonsReturned} Garrafones</p>
                </div>
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-sky-500 shadow-sm">
                  <i className="fas fa-recycle"></i>
                </div>
              </div>
            )}
            
            <div className="flex flex-col items-center pb-2 mt-4">
              <img src={qrUrl} alt="QR" className="w-16 h-16 mb-1 mix-blend-multiply opacity-80" />
              <p className="text-[8px] uppercase font-bold text-slate-400">Gracias por su compra</p>
            </div>
        </div>

        <div className="bg-slate-50 p-4 border-t border-slate-100 shrink-0 space-y-3 z-20">
             <div className="grid grid-cols-2 gap-3">
                <button onClick={handleSharePDF} disabled={sharing} className="bg-indigo-600 text-white py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-indigo-200 active:scale-95 transition-transform flex items-center justify-center gap-2">
                    {sharing ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-share-nodes"></i>} Compartir
                </button>
                <button onClick={onWhatsApp} className="bg-emerald-500 text-white py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-emerald-200 active:scale-95 transition-transform flex items-center justify-center gap-2">
                    <i className="fab fa-whatsapp"></i> WhatsApp
                </button>
             </div>
             <button onClick={onNewSale} className="w-full bg-sky-500 text-white py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-sky-200 active:scale-95 transition-transform">
                Nueva Venta
             </button>
             <button onClick={onFinish} className="w-full text-slate-400 text-[10px] font-bold uppercase hover:text-rose-400 transition-colors">Cerrar</button>
        </div>
      </div>
    </div>
  );
};

const PaymentModal = ({ total, onConfirm, onCancel }: any) => {
  const [cash, setCash] = useState('');
  const [transfer, setTransfer] = useState('');
  const [card, setCard] = useState('');
  const numCash = parseFloat(cash) || 0;
  const numTransfer = parseFloat(transfer) || 0;
  const numCard = parseFloat(card) || 0;
  
  const totalPaid = numCash + numTransfer + numCard;
  const remaining = Math.max(0, total - totalPaid);
  const change = Math.max(0, totalPaid - total);
  const isComplete = totalPaid >= (total - 0.01);

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
         <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-slate-800">Método de Pago</h3>
            <button onClick={onCancel} className="w-10 h-10 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-colors"><i className="fas fa-times"></i></button>
         </div>

         <div className="text-center mb-6">
            <p className="text-xs font-bold uppercase text-slate-400 tracking-widest mb-1">Total a Cobrar</p>
            <p className="text-5xl font-black text-slate-800 tracking-tighter">${total.toFixed(2)}</p>
         </div>

         <div className="space-y-3 mb-8">
            <div className="bg-slate-50 p-4 rounded-[1.5rem] flex items-center gap-4 border border-slate-100 focus-within:ring-2 ring-emerald-400 transition-all">
               <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm text-xl"><i className="fas fa-money-bill-wave"></i></div>
               <div className="flex-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Efectivo</label>
                  <input type="number" placeholder="0.00" className="w-full bg-transparent font-black text-xl text-slate-800 outline-none placeholder-slate-300" value={cash} onChange={e => setCash(e.target.value)} autoFocus />
               </div>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-[1.5rem] flex items-center gap-4 border border-slate-100 focus-within:ring-2 ring-indigo-400 transition-all">
               <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm text-xl"><i className="fas fa-building-columns"></i></div>
               <div className="flex-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Transferencia</label>
                  <input type="number" placeholder="0.00" className="w-full bg-transparent font-black text-xl text-slate-800 outline-none placeholder-slate-300" value={transfer} onChange={e => setTransfer(e.target.value)} />
               </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-[1.5rem] flex items-center gap-4 border border-slate-100 focus-within:ring-2 ring-purple-400 transition-all">
               <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-purple-500 shadow-sm text-xl"><i className="fas fa-credit-card"></i></div>
               <div className="flex-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Tarjeta (T. Crédito/Débito)</label>
                  <input type="number" placeholder="0.00" className="w-full bg-transparent font-black text-xl text-slate-800 outline-none placeholder-slate-300" value={card} onChange={e => setCard(e.target.value)} />
               </div>
            </div>
         </div>

         {change > 0 && (
            <div className="mb-6 bg-emerald-50 p-4 rounded-2xl border-2 border-emerald-100 flex justify-between items-center animate-slideUp">
                <span className="text-xs font-black uppercase text-emerald-600 tracking-widest">Cambio a Entregar</span>
                <span className="text-3xl font-black text-emerald-500 tracking-tighter">${change.toFixed(2)}</span>
            </div>
         )}

          <ActionButton 
            onClick={() => onConfirm(numCash, numTransfer, numCard)} 
            variant={isComplete ? 'primary' : 'secondary'}
          >
            {isComplete ? (
              change > 0 ? `Cobrar (Cambio: $${change.toFixed(2)})` : 'Confirmar Cobro Exacto'
            ) : (
              totalPaid > 0 ? `Cobrar Parcial (Deuda: $${remaining.toFixed(2)})` : `Confirmar Deuda ($${remaining.toFixed(2)})`
            )}
          </ActionButton>
      </div>
    </div>
  );
};

export const POSModule: React.FC<{ onBack: () => void; user: Employee; initialOrder?: Order | null; onClearInitialOrder?: () => void; }> = ({ onBack, user, initialOrder, onClearInitialOrder }) => {
  const { products, customers, sales, addSale, ticketConfig, vehicles, updateOrder, addNotification } = useERPData();
  const [activeTab, setActiveTab] = useState<'sell' | 'history'>('sell');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [search, setSearch] = useState('');
  const [vacios, setVacios] = useState<number | null>(null);
  const [selectedSource, setSelectedSource] = useState<string>('plant');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showStockWarning, setShowStockWarning] = useState(false);
  const [stockWarningItems, setStockWarningItems] = useState<string[]>([]);
  const [viewingTicket, setViewingTicket] = useState<Sale | null>(null);
  const [linkedOrderId, setLinkedOrderId] = useState<string | null>(null);
  const [originalOrder, setOriginalOrder] = useState<Order | null>(null);

  // Load Order Data
  useEffect(() => {
    if (initialOrder) {
      let client = customers.find(c => c.id === initialOrder.customerId);
      if (!client) {
         // Fallback if client isn't in DB yet
         client = { 
           id: initialOrder.customerId, 
           name: initialOrder.customerAlias, 
           alias: initialOrder.customerAlias, 
           balance: 0, 
           phone: '', 
           garrafonType: 'Generico' 
         } as Customer;
      }
      setCustomer(client);
      setSearch(client.alias);
      setCart(initialOrder.items);
      
      // Auto-load jug quantity into 'vacios' (1:1 exchange assumption) to ensure seamless flow
      const initialJugs = initialOrder.items
        .filter(i => i.name.toLowerCase().includes('garraf') || i.category === 'Agua')
        .reduce((acc, i) => acc + i.quantity, 0);
      setVacios(initialJugs);

      if (initialOrder.vehicleId && vehicles.some(v => v.id === initialOrder.vehicleId)) setSelectedSource(initialOrder.vehicleId);
      setLinkedOrderId(initialOrder.id);
      setOriginalOrder(initialOrder);
      
      // Crucial: Clear order from App state to prevent stale data re-load, 
      // but ensure POS doesn't unmount (handled in App.tsx by static key)
      if (onClearInitialOrder) onClearInitialOrder();
    }
  }, [initialOrder, customers, vehicles, onClearInitialOrder]);

  // SPECIAL PRICE LOGIC: Always respects customer specific price for ID 1 (Garrafon)
  const total = cart.reduce((sum, item) => {
    const price = (customer?.specialPrice && item.id === '1') ? customer.specialPrice : item.price;
    return sum + (price * item.quantity);
  }, 0);

  useEffect(() => {
    // We remove the auto-update of vacios for new sales to make it mandatory for the user to enter it.
    // If it's a linked order, it's already handled in the other useEffect.
    if (!linkedOrderId && cart.length === 0) {
        setVacios(null);
    }
  }, [cart, linkedOrderId]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const decreaseQuantity = (productId: string) => {
    setCart(prev => prev.map(item => item.id === productId ? { ...item, quantity: Math.max(0, item.quantity - 1) } : item).filter(item => item.quantity > 0));
  };

  const handlePreCheckout = () => {
    if (!customer) {
        addNotification({ title: 'Error', message: 'Selecciona un cliente.', type: 'warning' });
        return;
    }
    if (cart.length === 0 && (vacios || 0) <= 0) {
        addNotification({ title: 'Error', message: 'Carrito vacío.', type: 'warning' });
        return;
    }

    if (vacios === null) {
        addNotification({ 
            title: 'Dato Requerido', 
            message: 'Es obligatorio ingresar el número de envases vacíos recolectados.', 
            type: 'urgent' 
        });
        const el = document.getElementById('vacios-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        return;
    }

    // VALIDACIÓN DE STOCK (Solo si es vehículo)
    if (selectedSource !== 'plant') {
        const vehicle = vehicles.find(v => v.id === selectedSource);
        if (vehicle) {
            const currentInv = vehicle.inventory || [];
            
            const missing = cart.filter(item => {
                const stockItem = currentInv.find(i => i.id === item.id);
                return !stockItem || stockItem.quantity < item.quantity;
            });

            if (missing.length > 0) {
                setStockWarningItems(missing.map(m => m.name));
                setShowStockWarning(true);
                return;
            }
        }
    }

    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async (cash: number, transfer: number, card: number) => {
    if(!customer) return;
    const totalPaid = cash + transfer + card;
    const splits: PaymentSplit[] = [];
    if (cash > 0) splits.push({ method: 'Efectivo', amount: cash });
    if (transfer > 0) splits.push({ method: 'Transferencia', amount: transfer });
    if (card > 0) splits.push({ method: 'Tarjeta', amount: card });

    // La validación principal ya se hizo en handlePreCheckout
    // Aquí solo procesamos la venta (incluso si genera negativo)
    const sale = await addSale(customer.id, cart, total, totalPaid, splits, vacios || 0, undefined, selectedSource === 'plant' ? undefined : selectedSource);
    
    if (originalOrder) {
       updateOrder({ ...originalOrder, status: 'entregado' });
    }

    setShowPaymentModal(false);
    if (sale) setViewingTicket(sale);
  };

  const resetPOS = () => {
    setViewingTicket(null);
    setCart([]);
    setCustomer(null);
    setSearch('');
    setVacios(null);
    setLinkedOrderId(null);
    setOriginalOrder(null);
    setActiveTab('sell');
  };

  return (
    <div className="h-full flex flex-col animate-fadeIn bg-transparent pb-24 overflow-hidden relative">
      <ModuleHeader title="Punto de Venta" onBack={onBack} />
      
      <div className="px-6 flex gap-2 mb-4 shrink-0">
        <button onClick={() => setActiveTab('sell')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'sell' ? 'bg-sky-600 text-white shadow-lg' : 'bg-white text-slate-400'}`}>Venta</button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-sky-600 text-white shadow-lg' : 'bg-white text-slate-400'}`}>Historial</button>
      </div>

      {activeTab === 'sell' ? (
        <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-32 no-scrollbar">
          
          {linkedOrderId && (
            <div className="bg-amber-100 text-amber-700 p-4 rounded-[1.5rem] border border-amber-200 flex justify-between items-center shadow-sm">
               <span className="text-xs font-black uppercase tracking-wide flex items-center gap-2"><i className="fas fa-clipboard-check"></i> Pedido: {linkedOrderId}</span>
               <button onClick={resetPOS} className="w-8 h-8 bg-white rounded-full text-amber-500 flex items-center justify-center shadow-sm active:scale-90 transition-transform"><i className="fas fa-times"></i></button>
            </div>
          )}

          <div className="overflow-x-auto pb-2 no-scrollbar">
            <div className="flex gap-2 min-w-max">
              <button 
                onClick={() => setSelectedSource('plant')}
                className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 transition-all ${selectedSource === 'plant' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-400 border border-slate-100'}`}
              >
                <i className="fas fa-store"></i> Planta
              </button>
              {vehicles.map(v => (
                <button 
                  key={v.id}
                  onClick={() => setSelectedSource(v.id)}
                  className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 transition-all ${selectedSource === v.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-slate-400 border border-slate-100'}`}
                >
                  <i className="fas fa-truck"></i> {v.plate}
                </button>
              ))}
            </div>
          </div>

          <div className="relative z-20">
            <input type="text" placeholder="Buscar Cliente..." className="w-full bg-white border-none rounded-[1.5rem] py-4 px-6 shadow-sm outline-none font-bold text-slate-700 placeholder-slate-300 focus:ring-2 ring-sky-300 transition-all" value={search} onChange={e => setSearch(e.target.value)} />
            {search && !customer && (
              <div className="absolute top-full left-0 right-0 bg-white shadow-xl rounded-[1.5rem] mt-2 overflow-hidden border border-slate-100 max-h-48 overflow-y-auto z-50">
                {customers.filter(c => c.alias.toLowerCase().includes(search.toLowerCase())).map(c => (
                  <button key={c.id} onClick={() => { setCustomer(c); setSearch(c.alias); }} className="w-full text-left p-4 hover:bg-sky-50 border-b border-slate-50 last:border-none">
                    <span className="text-slate-800 font-bold text-sm block">{c.alias}</span>
                  </button>
                ))}
              </div>
            )}
            {customer && (
              <div className="mt-2 bg-white p-3 rounded-[1.5rem] shadow-sm border border-sky-100 flex justify-between items-center animate-fadeIn">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center text-sky-600"><i className="fas fa-user-check"></i></div>
                   <div>
                      <span className="font-black text-slate-800 text-sm block">{customer.alias}</span>
                      <div className="flex gap-2 items-center">
                        {customer.specialPrice && <span className="text-[8px] text-amber-500 font-bold uppercase">Precio Esp: ${customer.specialPrice}</span>}
                        {customer.garrafonType && (
                            <span className={`text-[8px] text-white font-bold uppercase px-2 py-0.5 rounded-full ${GARRAFON_COLORS[customer.garrafonType] || 'bg-slate-400'}`}>
                                Pref: {customer.garrafonType}
                            </span>
                        )}
                      </div>
                   </div>
                </div>
                <button onClick={() => {setCustomer(null); setSearch('');}} className="w-8 h-8 flex items-center justify-center text-rose-400 bg-rose-50 rounded-full hover:bg-rose-100 transition-colors"><i className="fas fa-times"></i></button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {products.filter(p => p.category !== 'Insumos').map(p => {
               const inCart = cart.find(i => i.id === p.id)?.quantity || 0;
               // Determine price to show (Customer specific or default)
               const effectivePrice = (customer?.specialPrice && p.id === '1') ? customer.specialPrice : p.price;
               const isSpecial = (customer?.specialPrice && p.id === '1');

               return (
                <button key={p.id} onClick={() => addToCart(p)} className={`p-4 rounded-[1.8rem] text-left transition-all relative overflow-hidden group ${inCart > 0 ? 'bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-300' : 'bg-white text-slate-600 shadow-sm border border-white'}`}>
                  <div className="relative z-10">
                    <p className={`text-[9px] font-black uppercase mb-1 tracking-wide ${inCart > 0 ? 'text-sky-100' : 'text-slate-400'}`}>{p.category}</p>
                    <h4 className="font-bold text-sm leading-tight mb-2 pr-4">{p.name.replace('Garrafón', 'G.')}</h4>
                    <div className="flex items-center gap-1">
                        <p className="text-lg font-black">${effectivePrice}</p>
                        {isSpecial && <i className={`fas fa-tag text-[10px] ${inCart > 0 ? 'text-amber-300' : 'text-amber-500'}`}></i>}
                    </div>
                  </div>
                  {inCart > 0 && (
                    <div className="absolute top-3 right-3 w-8 h-8 bg-white text-sky-600 rounded-full flex items-center justify-center font-black text-sm shadow-sm animate-bounce">
                      {inCart}
                    </div>
                  )}
                  <div className={`absolute -bottom-4 -right-4 w-16 h-16 rounded-full ${inCart > 0 ? 'bg-white/10' : 'bg-slate-50'} blur-xl`}></div>
                </button>
               );
            })}
          </div>
          {cart.length > 0 && (
            <div className="bg-white rounded-[2rem] p-5 shadow-lg shadow-slate-100/50 border border-white animate-slideUp">
               <div className="flex justify-between items-center mb-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Resumen</h4>
                  <button onClick={() => setCart([])} className="text-[10px] text-rose-500 font-bold uppercase hover:underline">Vaciar Carrito</button>
               </div>
               
               <div className="space-y-2 mb-6">
                 {cart.map(i => (
                   <div key={i.id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-none">
                      <div className="flex items-center gap-3">
                         <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-1">
                            <button onClick={() => decreaseQuantity(i.id)} className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-400 font-bold hover:text-sky-500 transition-colors">-</button>
                            <span className="text-xs font-black w-5 text-center text-slate-700">{i.quantity}</span>
                            <button onClick={() => addToCart(i)} className="w-7 h-7 flex items-center justify-center bg-sky-500 text-white rounded-lg shadow-sm font-bold hover:bg-sky-600 transition-colors">+</button>
                         </div>
                         <span className="text-xs font-bold text-slate-700 truncate max-w-[120px]">{i.name}</span>
                      </div>
                      <span className="text-sm font-black text-slate-800">${(( (customer?.specialPrice && i.id === '1') ? customer.specialPrice : i.price ) * i.quantity).toFixed(2)}</span>
                   </div>
                 ))}
               </div>
 
               <div id="vacios-section" className={`p-4 rounded-[1.5rem] flex justify-between items-center mb-2 transition-all duration-300 ${vacios === null ? 'bg-rose-50 border-2 border-rose-200 animate-pulse' : 'bg-slate-50 border border-slate-100'}`}>
                  <div className="flex flex-col">
                    <span className={`text-[10px] font-black uppercase tracking-wide ${vacios === null ? 'text-rose-600' : 'text-slate-500'}`}>
                        Envases Vacíos Recibidos
                    </span>
                    {vacios === null && <span className="text-[8px] font-bold text-rose-400 uppercase tracking-widest">Requerido *</span>}
                  </div>
                  <div className="flex items-center gap-3">
                     <button onClick={() => setVacios(Math.max(0, (vacios || 0) - 1))} className="w-8 h-8 bg-white rounded-full shadow-sm text-slate-400 font-bold hover:text-sky-500">-</button>
                     <span className={`font-black text-lg ${vacios === null ? 'text-rose-400' : 'text-slate-800'}`}>{vacios !== null ? vacios : '?'}</span>
                     <button onClick={() => setVacios((vacios || 0) + 1)} className="w-8 h-8 bg-sky-500 rounded-full shadow-lg shadow-sky-200 text-white font-bold hover:bg-sky-600 active:scale-90 transition-transform">+</button>
                  </div>
               </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 space-y-3 pb-10 no-scrollbar">
           {sales.map(s => (
             <RoundedCard key={s.id} className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 text-lg">
                      <i className="fas fa-receipt"></i>
                   </div>
                   <div>
                      <h4 className="font-black text-slate-800 text-sm">{s.customerAlias}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(s.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                   </div>
                </div>
                <div className="text-right">
                   <span className="block font-black text-slate-800 text-lg">${s.total}</span>
                   <button onClick={() => setViewingTicket(s)} className="text-[10px] text-sky-500 font-bold uppercase bg-sky-50 px-3 py-1 rounded-lg mt-1 active:bg-sky-100">Ver Ticket</button>
                </div>
             </RoundedCard>
           ))}
        </div>
      )}

      {activeTab === 'sell' && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-white/50 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-50">
          <ActionButton onClick={handlePreCheckout} disabled={!customer || cart.length === 0}>
             <div className="flex justify-between w-full px-4 items-center">
                <span>{linkedOrderId ? 'Finalizar Entrega' : 'Cobrar'}</span>
                <span className="bg-white/20 px-3 py-1 rounded-xl text-sm font-black backdrop-blur-sm shadow-sm">${total.toFixed(2)}</span>
             </div>
          </ActionButton>
        </div>
      )}

      {showPaymentModal && <PaymentModal total={total} onConfirm={handleConfirmPayment} onCancel={() => setShowPaymentModal(false)} />}
      
      {showStockWarning && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-scaleIn">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500 text-3xl">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h3 className="text-xl font-black text-slate-800 text-center mb-2">Stock Insuficiente</h3>
            <p className="text-slate-500 text-center mb-6 leading-relaxed">
              El vehículo no tiene carga suficiente de:
              <span className="block font-bold text-slate-700 mt-2">
                {stockWarningItems.map(name => `• ${name}`).join('\n')}
              </span>
              <br/>
              ¿Deseas forzar la venta (Stock Negativo)?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowStockWarning(false)}
                className="flex-1 py-4 rounded-2xl font-bold text-slate-400 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  setShowStockWarning(false);
                  setShowPaymentModal(true);
                }}
                className="flex-1 py-4 rounded-2xl font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-200 transition-all active:scale-95"
              >
                Forzar Venta
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingTicket && (
        <TicketModal 
          sale={viewingTicket} 
          config={ticketConfig} 
          onClose={() => setViewingTicket(null)} 
          onWhatsApp={() => {
             const customer = customers.find(c => c.id === viewingTicket.customerId);
             const phone = customer?.phone;
             if(phone) {
                const debtText = viewingTicket.paidAmount < viewingTicket.total 
                  ? `%0A*Deuda Generada:* $${(viewingTicket.total - viewingTicket.paidAmount).toFixed(2)}` 
                  : '';
                const balanceText = (viewingTicket.newBalance || 0) > 0 
                  ? `%0A*Saldo Actual:* $${viewingTicket.newBalance?.toFixed(2)}` 
                  : '';
                const text = `*${ticketConfig.businessName}*%0A*Ticket:* ${viewingTicket.id}%0A*Total:* $${viewingTicket.total.toFixed(2)}%0A*Pagado:* $${viewingTicket.paidAmount.toFixed(2)}${debtText}${balanceText}%0A%0A¡Gracias por su preferencia!`;
                window.open(`https://wa.me/52${phone.replace(/\D/g,'')}?text=${text}`, '_blank');
             } else {
                addNotification({ title: 'Error', message: 'Sin teléfono registrado', type: 'warning' });
             }
          }}
          onNewSale={resetPOS}
          onFinish={() => { setViewingTicket(null); setActiveTab('history'); }}
        />
      )}
    </div>
  );
};
