
import React, { useState, useEffect } from 'react';
import { useERPData } from '../hooks/useERPData';
import { ModuleHeader, RoundedCard, ActionButton } from './ui/Cards';
import { Product, CartItem, PaymentSplit, Sale, TicketConfig, Customer } from '../types';
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

// Componente Interno del Visualizador de Ticket
const TicketViewerModal = ({ sale, config, onClose }: { sale: Sale, config: TicketConfig, onClose: () => void }) => {
  const [sharing, setSharing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const qrData = btoa(`AQUA-PRO-SECURE|${JSON.stringify({ id: sale.id, total: sale.total })}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
  
  // Custom Color Logic
  const accentColor = config.colorHex || '#0284c7';

  // Auto-save effect (Imagen PNG)
  useEffect(() => {
    const timer = setTimeout(() => {
      handleAutoSaveImage();
    }, 800); // Wait for render
    return () => clearTimeout(timer);
  }, []);

  const handleAutoSaveImage = async () => {
    try {
      setSaveStatus('saving');
      const element = document.getElementById('printable-area');
      if (!element) return;

      const canvas = await html2canvas(element, { 
        scale: 2, 
        backgroundColor: '#ffffff',
        logging: false 
      });

      const base64Data = canvas.toDataURL('image/png');
      const base64Content = base64Data.split(',')[1];
      
      const folderName = 'AquaTickets';
      const fileName = `Ticket_${sale.id}_${Date.now()}.png`;

      try {
        await Filesystem.mkdir({
            path: folderName,
            directory: Directory.Documents,
            recursive: true
        });

        await Filesystem.writeFile({
          path: `${folderName}/${fileName}`,
          data: base64Content,
          directory: Directory.Documents
        });
        setSaveStatus('saved');
      } catch (fsError) {
        console.warn("Filesystem save failed (likely web browser), skipping auto-save to disk", fsError);
        setSaveStatus('error');
      }

    } catch (e) {
      console.error("Error generating image", e);
      setSaveStatus('error');
    }
  };

  const handleSavePDF = async () => {
    try {
      setSaveStatus('saving');
      const pdfBytes = await generateTicketPDF(sale, config);
      const base64Content = uint8ArrayToBase64(pdfBytes);
      
      const folderName = 'AquaTickets';
      const fileName = `Reporte_${sale.id}.pdf`;

      await Filesystem.mkdir({
          path: folderName,
          directory: Directory.Documents,
          recursive: true
      });

      await Filesystem.writeFile({
        path: `${folderName}/${fileName}`,
        data: base64Content,
        directory: Directory.Documents
      });

      setSaveStatus('saved');
      alert(`PDF Guardado en: Documentos/${folderName}/${fileName}`);

      if (!(window as any).Capacitor?.isNative) {
         const blob = new Blob([pdfBytes], { type: 'application/pdf' });
         const url = URL.createObjectURL(blob);
         const link = document.createElement('a');
         link.href = url;
         link.download = fileName;
         link.click();
         setTimeout(() => URL.revokeObjectURL(url), 1000);
      }

    } catch (e) {
      console.error("Error saving PDF", e);
      setSaveStatus('error');
      alert("Error al generar el PDF.");
    } finally {
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

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
            text: `Hola ${sale.customerAlias}, adjunto tu ticket de compra.`,
            url: savedFile.uri,
            dialogTitle: 'Compartir Ticket'
        });

    } catch (e) {
        console.error(e);
        try {
            const pdfBytes = await generateTicketPDF(sale, config);
            const file = new File([pdfBytes], `Ticket_${sale.id}.pdf`, { type: 'application/pdf' });
            const url = URL.createObjectURL(file);
            const link = document.createElement('a');
            link.href = url;
            link.download = file.name;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            alert("Modo Web: Archivo descargado.");
        } catch(webErr) {
            alert("No se pudo compartir.");
        }
    } finally {
        setSharing(false);
    }
  };

  const handleNativeShareImage = async () => {
    setSharing(true);
    try {
      const element = document.getElementById('printable-area');
      if (!element) return;

      const canvas = await html2canvas(element, { 
        scale: 2, 
        backgroundColor: '#ffffff',
        logging: false 
      });

      const base64Data = canvas.toDataURL('image/png');
      const base64Content = base64Data.split(',')[1];
      const fileName = `Ticket_${sale.id}.png`;

      const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: base64Content,
          directory: Directory.Cache
      });

      await Share.share({
          title: `Ticket ${sale.id}`,
          text: `Hola ${sale.customerAlias}, aquí tienes tu ticket.`,
          url: savedFile.uri,
          dialogTitle: 'Compartir Imagen'
      });

    } catch (e) {
      console.error(e);
      alert("Error al compartir imagen. Intenta guardarla primero.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-fadeIn">
      <button onClick={onClose} className="absolute top-6 right-6 w-12 h-12 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all z-50 backdrop-blur-sm">
        <i className="fas fa-times text-xl"></i>
      </button>

      <div className="bg-white w-full max-w-[340px] max-h-[85vh] shadow-2xl rounded-3xl overflow-hidden flex flex-col relative print:w-full">
        {/* Efecto de papel */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIgdmlld0JveD0iMCAwIDEwIDEwIj48cGF0aCBkPSJNTAgMTBMNSAwTDEwIDEwWiIgZmlsbD0iI2YzZjRZjYiLz48L3N2Zz4=')] opacity-50 z-10 pointer-events-none print:hidden"></div>
        
        {saveStatus === 'saved' && (
          <div className="absolute top-4 right-16 z-20 bg-emerald-100 text-emerald-600 px-2 py-1 rounded-full text-[8px] font-black uppercase flex items-center gap-1 animate-fadeIn">
            <i className="fas fa-check-circle"></i> Guardado en AquaTickets
          </div>
        )}

        <div className="overflow-y-auto flex-1 p-6 pb-2 text-center font-mono text-slate-900 leading-tight text-xs relative custom-scrollbar" id="printable-area">
            {config.logoUrl && <img src={config.logoUrl} alt="Logo" className="w-20 h-20 object-contain mx-auto mb-3 grayscale mix-blend-multiply" />}
            
            <h2 className="text-lg font-black uppercase mb-1 tracking-tighter" style={{ color: accentColor }}>{config.businessName}</h2>
            {config.slogan && <p className="text-[9px] italic mb-3 opacity-70">"{config.slogan}"</p>}
            
            <div className="border-b-2 border-dashed border-slate-300 pb-3 mb-3 space-y-0.5">
              <p>RFC: {config.rfc}</p>
              <p>{config.address}</p>
              <p>Tel: {config.phone}</p>
              {config.email && <p>{config.email}</p>}
              {config.website && <p>{config.website}</p>}
              <p>{new Date(sale.timestamp).toLocaleString()}</p>
            </div>

            <div className="text-left mb-3 space-y-1">
              <p>FOLIO: <span className="font-bold">{sale.id}</span></p>
              <p>CLIENTE: {sale.customerAlias.toUpperCase()}</p>
            </div>

            <table className="w-full mb-3 border-collapse">
              <thead>
                <tr className="border-b" style={{ borderColor: accentColor }}>
                  <th className="text-left py-1 w-8">CANT</th>
                  <th className="text-left py-1">DESC</th>
                  <th className="text-right py-1">IMP</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item, i) => (
                  <tr key={i}>
                    <td className="text-left py-1 align-top font-bold">{item.quantity}</td>
                    <td className="text-left py-1 align-top">{item.name.slice(0, 18)}</td>
                    <td className="text-right py-1 align-top">${(item.quantity * item.price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t-2 pt-2 mb-2 text-right" style={{ borderColor: accentColor }}>
              <p className="text-xl font-black" style={{ color: accentColor }}>TOTAL: ${sale.total.toFixed(2)}</p>
            </div>
            
            <div className="text-right mb-4 space-y-0.5 text-[10px]">
              <p>SU PAGO: ${sale.paidAmount.toFixed(2)}</p>
              {sale.paidAmount < sale.total ? (
                  <p className="font-bold text-white inline-block px-1" style={{ backgroundColor: accentColor }}>PENDIENTE: ${(sale.total - sale.paidAmount).toFixed(2)}</p>
              ) : (
                  <p>CAMBIO: ${sale.change.toFixed(2)}</p>
              )}
            </div>

            {sale.emptyGarrafonsReturned > 0 && (
              <div className="border-2 p-2 mb-4 text-xs font-bold uppercase text-center" style={{ borderColor: accentColor, color: accentColor }}>
                  * {sale.emptyGarrafonsReturned} Envases Recibidos *
              </div>
            )}

            <div className="pt-2 mb-4 text-center opacity-80">
              <p className="font-bold mb-1">{config.footerMessage}</p>
              <p className="text-[8px] italic">{config.extraNote}</p>
            </div>

            <div className="flex flex-col items-center pb-2">
              <img src={qrUrl} alt="QR" className="w-20 h-20 mb-1 mix-blend-multiply" />
            </div>
        </div>

        <div className="bg-slate-100 p-4 border-t border-slate-200 shrink-0 print:hidden grid grid-cols-2 gap-3 z-20 relative">
             <button 
                onClick={handleSharePDF} 
                disabled={sharing}
                className="bg-indigo-600 text-white py-3 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-indigo-200 col-span-2"
              >
                  {sharing ? <i className="fas fa-spinner animate-spin"></i> : <i className="fab fa-whatsapp"></i>}
                  Compartir PDF
              </button>

             <button 
                onClick={handleNativeShareImage} 
                disabled={sharing}
                className="bg-emerald-500 text-white py-3 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-emerald-100"
              >
                  <i className="fas fa-image"></i> Imagen
              </button>
              
              <button 
                onClick={handleSavePDF} 
                className="bg-slate-800 text-white py-3 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-sm"
              >
                  <i className="fas fa-file-pdf"></i> Guardar
              </button>

              <button 
                onClick={onClose} 
                className="bg-white border border-slate-300 text-slate-500 py-3 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 active:scale-95 transition-transform col-span-2"
              >
                  <i className="fas fa-xmark"></i> Cerrar
              </button>
        </div>
      </div>
    </div>
  );
};

export const TicketModule: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { customers, products, addSale, sales, ticketConfig, vehicles } = useERPData();
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
  
  // New Payment States
  const [paymentType, setPaymentType] = useState<'contado' | 'credito'>('contado');
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Transferencia' | 'Tarjeta'>('Efectivo');
  
  // Inventory Source State
  const [selectedSource, setSelectedSource] = useState<string>('plant');
  
  // Modales
  const [showSuccessModal, setShowSuccessModal] = useState<Sale | null>(null);
  const [viewingTicket, setViewingTicket] = useState<Sale | null>(null);

  const customer = customers.find(c => c.id === selectedCustomerId);
  
  // SPECIAL PRICE LOGIC: Always respects customer specific price for ID 1 (Garrafon)
  const total = cart.reduce((sum, item) => {
    const price = (customer?.specialPrice && item.id === '1') ? customer.specialPrice : item.price;
    return sum + (price * item.quantity);
  }, 0);

  const handleSendWhatsApp = (sale: Sale) => {
    const currentCustomer = customers.find(c => c.id === sale.customerId);
    const phone = currentCustomer?.phone?.replace(/\D/g, '');
    
    if (!phone) return alert("El cliente no tiene teléfono registrado.");
    
    const itemsText = sale.items.map(i => `• ${i.quantity}x ${i.name}`).join('%0A');
    const msg = `¡Hola ${sale.customerAlias}!%0A%0A*${ticketConfig.businessName}*%0AGracias por tu compra.%0A%0A*Detalles de tu pedido:*%0A${itemsText}%0A%0A*Total:* $${sale.total.toFixed(2)}%0A*Ticket:* ${sale.id}%0A%0A_Este es un comprobante digital._`;
    window.open(`https://wa.me/52${phone}?text=${msg}`, '_blank');
  };

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

  const handleCreateTicket = async () => {
    if (!customer || cart.length === 0 || !manualDate) {
      alert("Faltan datos (Cliente, Productos o Fecha).");
      return;
    }

    const timestamp = new Date(manualDate).getTime();
    if (isNaN(timestamp)) {
      alert("Fecha inválida.");
      return;
    }

    const isPaid = paymentType === 'contado';
    const paidAmount = isPaid ? total : 0;
    const splits: PaymentSplit[] = isPaid ? [{ method: paymentMethod, amount: total }] : [];

    const sale = await addSale(
      customer.id, 
      cart, 
      total, 
      paidAmount, 
      splits, 
      0, 
      timestamp,
      selectedSource === 'plant' ? undefined : selectedSource
    );

    if (sale) setShowSuccessModal(sale);
    
    setCart([]);
    setSelectedCustomerId('');
    setSearchCustomer('');
    setPaymentType('contado');
    setSelectedSource('plant');
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col animate-fadeIn overflow-hidden pb-24 relative">
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

            {/* Source Selection for Inventory Impact */}
            <div className="overflow-x-auto pb-2 no-scrollbar">
                <div className="flex gap-2 min-w-max">
                  <button 
                    onClick={() => setSelectedSource('plant')}
                    className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 transition-all ${selectedSource === 'plant' ? 'bg-sky-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}
                  >
                    <i className="fas fa-store"></i> Descargar de Planta
                  </button>
                  {vehicles.map(v => (
                    <button 
                      key={v.id}
                      onClick={() => setSelectedSource(v.id)}
                      className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 transition-all ${selectedSource === v.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}
                    >
                      <i className="fas fa-truck"></i> {v.plate}
                    </button>
                  ))}
                </div>
            </div>

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

            {/* Payment Options Section */}
            <section className="bg-white p-5 rounded-[2rem] shadow-sm">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Condiciones de Pago</h4>
                <div className="flex gap-2 mb-4">
                    <button onClick={() => setPaymentType('contado')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${paymentType === 'contado' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-100 text-slate-400'}`}>
                        Contado
                    </button>
                    <button onClick={() => setPaymentType('credito')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${paymentType === 'credito' ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-slate-100 text-slate-400'}`}>
                        Crédito
                    </button>
                </div>
                {paymentType === 'contado' && (
                    <div className="grid grid-cols-3 gap-2 animate-fadeIn">
                        <button onClick={() => setPaymentMethod('Efectivo')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${paymentMethod === 'Efectivo' ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 'border-transparent bg-slate-50 text-slate-400'}`}>
                            <i className="fas fa-money-bill-wave mr-1"></i> Efectivo
                        </button>
                        <button onClick={() => setPaymentMethod('Transferencia')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${paymentMethod === 'Transferencia' ? 'border-indigo-500 text-indigo-600 bg-indigo-50' : 'border-transparent bg-slate-50 text-slate-400'}`}>
                            <i className="fas fa-building-columns mr-1"></i> Transf.
                        </button>
                        <button onClick={() => setPaymentMethod('Tarjeta')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${paymentMethod === 'Tarjeta' ? 'border-purple-500 text-purple-600 bg-purple-50' : 'border-transparent bg-slate-50 text-slate-400'}`}>
                            <i className="fas fa-credit-card mr-1"></i> Tarjeta
                        </button>
                    </div>
                )}
            </section>

            <section>
               <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 px-2">Productos</h4>
               <div className="grid grid-cols-2 gap-2">
                 {products.filter(p => p.category !== 'Insumos').map(p => {
                   const effectivePrice = (customer?.specialPrice && p.id === '1') ? customer.specialPrice : p.price;
                   const isSpecial = (customer?.specialPrice && p.id === '1');
                   return (
                     <button 
                      key={p.id} 
                      onClick={() => addToCart(p)}
                      className="bg-white p-3 rounded-xl shadow-sm text-left active:scale-95 transition-transform border border-slate-50"
                     >
                       <p className="text-[9px] font-black uppercase text-slate-800">{p.name}</p>
                       <div className="flex items-center gap-1">
                          <p className="text-xs font-bold text-slate-500">${effectivePrice}</p>
                          {isSpecial && <i className="fas fa-tag text-[8px] text-amber-500"></i>}
                       </div>
                     </button>
                   );
                 })}
               </div>
            </section>

            {cart.length > 0 && (
              <div className="bg-white p-5 rounded-[2rem] shadow-lg border border-slate-100">
                 <h4 className="text-xs font-black uppercase text-slate-800 mb-3 border-b pb-2">Resumen</h4>
                 {cart.map(i => (
                   <div key={i.id} className="flex justify-between items-center mb-2 text-xs">
                      <span className="font-bold text-slate-600">{i.quantity}x {i.name}</span>
                      <div className="flex items-center gap-3">
                         <span className="font-black text-slate-900">
                           ${(( (customer?.specialPrice && i.id === '1') ? customer.specialPrice : i.price ) * i.quantity).toFixed(2)}
                         </span>
                         <button onClick={() => removeFromCart(i.id)} className="text-rose-400"><i className="fas fa-trash"></i></button>
                      </div>
                   </div>
                 ))}
                 <div className="mt-4 pt-2 border-t flex justify-between items-center">
                    <span className="font-black text-slate-800 text-lg">TOTAL</span>
                    <span className="font-black text-slate-900 text-2xl">${total.toFixed(2)}</span>
                 </div>
                 <div className="mt-6">
                   <ActionButton onClick={handleCreateTicket} variant="primary">Guardar Ticket Retroactivo</ActionButton>
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
                 <div key={s.id} className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                         <div className="flex items-center gap-2">
                            <span className="bg-slate-100 text-slate-600 text-[8px] font-black px-2 py-0.5 rounded-full">{s.id}</span>
                            <span className="text-xs font-black text-slate-800">{s.customerAlias}</span>
                         </div>
                         <p className="text-[10px] text-slate-400 font-bold mt-1">
                           {new Date(s.timestamp).toLocaleDateString()} {new Date(s.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                         </p>
                      </div>
                      <span className="text-xl font-black text-slate-700">${s.total}</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setViewingTicket(s)} 
                        className="flex-1 bg-slate-50 text-slate-600 py-2 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 active:bg-slate-200 transition-colors"
                      >
                        <i className="fas fa-eye"></i> Ver / PDF
                      </button>
                      <button 
                        onClick={() => handleSendWhatsApp(s)} 
                        className="flex-1 bg-emerald-50 text-emerald-600 py-2 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 active:bg-emerald-100 transition-colors"
                      >
                        <i className="fab fa-whatsapp"></i> WA (Txt)
                      </button>
                    </div>
                 </div>
               ))
             )}
          </div>
        )}
      </div>

      {/* Visor de Ticket (PDF Mode) */}
      {(showSuccessModal || viewingTicket) && (
        <TicketViewerModal 
          sale={showSuccessModal || viewingTicket!}
          config={ticketConfig}
          onClose={() => { setShowSuccessModal(null); setViewingTicket(null); }}
        />
      )}
    </div>
  );
};
