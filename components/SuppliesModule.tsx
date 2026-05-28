
import React, { useState } from 'react';
import { useERPData } from '../hooks/useERPData';
import { ModuleHeader, RoundedCard, ActionButton } from './ui/Cards';
import { Product } from '../types';

// Modal de Consumo (Extracted to prevent re-renders)
const ConsumptionModal = ({ supply, onClose, onConfirm }: { supply: Product; onClose: () => void; onConfirm: (p: Product) => void }) => {
  const [amount, setAmount] = useState<number | ''>('');

  const handleConsume = () => {
    const qty = Number(amount);
    if (!qty || qty <= 0) return;
    
    // Check stock
    if (qty > supply.stock) {
      alert("No hay suficiente stock para este consumo.");
      return;
    }

    // Save with reduced stock
    onConfirm({ ...supply, stock: supply.stock - qty });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-slate-800">Consumo Interno</h3>
          <button onClick={onClose} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400"><i className="fas fa-times"></i></button>
        </div>
        
        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 mb-6 flex items-center gap-4">
           <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-amber-500 text-xl shadow-sm">
             <i className="fas fa-box-open"></i>
           </div>
           <div>
             <p className="text-[10px] font-black uppercase text-amber-400 tracking-widest">Insumo</p>
             <p className="text-sm font-black text-slate-800">{supply.name}</p>
             <p className="text-xs font-bold text-slate-500">Stock actual: {supply.stock}</p>
           </div>
        </div>

        <div className="space-y-4">
           <div>
             <label className="text-[10px] font-black text-slate-400 uppercase ml-2 block mb-1">Cantidad a Utilizar</label>
             <input 
               type="number" 
               autoFocus
               className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-black text-2xl text-slate-800 focus:ring-2 ring-amber-300 transition-all text-center"
               placeholder="0"
               value={amount}
               onChange={e => setAmount(Number(e.target.value))}
             />
           </div>
           
           <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setAmount(50)} className="py-2 bg-slate-50 text-slate-500 rounded-xl text-[10px] font-black hover:bg-amber-100 hover:text-amber-600 transition-colors">50</button>
              <button onClick={() => setAmount(100)} className="py-2 bg-slate-50 text-slate-500 rounded-xl text-[10px] font-black hover:bg-amber-100 hover:text-amber-600 transition-colors">100</button>
              <button onClick={() => setAmount(500)} className="py-2 bg-slate-50 text-slate-500 rounded-xl text-[10px] font-black hover:bg-amber-100 hover:text-amber-600 transition-colors">500</button>
           </div>

           <ActionButton onClick={handleConsume} variant="primary">Confirmar Salida</ActionButton>
        </div>
      </div>
    </div>
  );
};

// Modal de Edición/Creación (Extracted)
const EditSupplyModal = ({ supply, onClose, onConfirm }: { supply: Partial<Product>; onClose: () => void; onConfirm: (p: Product) => void }) => {
  const [form, setForm] = useState(supply);

  const handleSave = () => {
    if (!form.name) return alert("El nombre es obligatorio");
    
    onConfirm({
      id: form.id || Date.now().toString(),
      name: form.name,
      price: form.price || 0, // Insumos might have 0 sell price
      stock: form.stock || 0,
      category: 'Insumos'
    } as Product);
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl">
        <h3 className="text-xl font-black text-slate-800 mb-6">{form.id ? 'Editar Insumo' : 'Nuevo Insumo'}</h3>
        
        <div className="space-y-4">
           <div>
             <label className="text-[10px] font-black text-slate-400 uppercase ml-2 block mb-1">Nombre del Material</label>
             <input 
               className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-slate-800 focus:ring-2 ring-sky-300"
               placeholder="Ej: Tapas Ciel 20L"
               value={form.name || ''}
               onChange={e => setForm({...form, name: e.target.value})}
             />
           </div>
           
           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="text-[10px] font-black text-slate-400 uppercase ml-2 block mb-1">Stock Inicial</label>
               <input 
                 type="number"
                 className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-slate-800 focus:ring-2 ring-sky-300"
                 placeholder="0"
                 value={form.stock || ''}
                 onChange={e => setForm({...form, stock: Number(e.target.value)})}
               />
             </div>
             <div>
               <label className="text-[10px] font-black text-slate-400 uppercase ml-2 block mb-1">Costo Unitario (Ref)</label>
               <input 
                 type="number"
                 className="w-full bg-slate-50 p-4 rounded-2xl outline-none font-bold text-slate-800 focus:ring-2 ring-sky-300"
                 placeholder="0.00"
                 value={form.price || ''}
                 onChange={e => setForm({...form, price: Number(e.target.value)})}
               />
             </div>
           </div>
           
           <div className="pt-4">
             <ActionButton onClick={handleSave}>Guardar Insumo</ActionButton>
           </div>
        </div>
        <button onClick={onClose} className="w-full mt-4 text-slate-400 font-bold uppercase text-[10px]">Cancelar</button>
      </div>
    </div>
  );
};

export const SuppliesModule: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { products, saveProduct } = useERPData();
  const [search, setSearch] = useState('');
  const [consumingSupply, setConsumingSupply] = useState<Product | null>(null);
  const [editingSupply, setEditingSupply] = useState<Partial<Product> | null>(null);

  // Filter only items categorized as 'Insumos'
  const supplies = products.filter(p => 
    p.category === 'Insumos' && 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockCount = supplies.filter(s => s.stock < 100).length;

  return (
    <div className="h-full bg-slate-50 flex flex-col animate-fadeIn overflow-hidden pb-24 relative">
      <ModuleHeader title="Almacén de Insumos" onBack={onBack} />
      
      <div className="px-6 space-y-4 shrink-0 mb-4">
        {/* Alerts Card - Using div directly to fix background color override */}
        <div className={`rounded-[2.5rem] shadow-lg flex items-center justify-between p-6 transition-colors ${lowStockCount > 0 ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'}`}>
           <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Estado del Almacén</p>
              <p className="text-2xl font-black tracking-tighter">
                {lowStockCount > 0 ? `${lowStockCount} Críticos` : 'Stock Óptimo'}
              </p>
           </div>
           <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">
              <i className={`fas ${lowStockCount > 0 ? 'fa-triangle-exclamation' : 'fa-clipboard-check'}`}></i>
           </div>
        </div>

        {/* Search */}
        <div className="relative">
          <input 
            type="text" 
            placeholder="Buscar tapas, sellos, químicos..." 
            className="w-full bg-white p-5 rounded-[2rem] outline-none shadow-sm focus:ring-2 ring-slate-300 font-medium text-slate-700" 
            value={search} 
            onChange={e => setSearch(e.target.value)}
          />
          <i className="fas fa-magnifying-glass absolute right-6 top-1/2 -translate-y-1/2 text-slate-300"></i>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-3 no-scrollbar pb-10">
        {supplies.length === 0 ? (
           <div className="text-center py-20 opacity-40">
              <i className="fas fa-boxes-stacked text-6xl mb-4 text-slate-300"></i>
              <p className="text-xs font-black uppercase text-slate-400">No hay insumos registrados</p>
           </div>
        ) : (
           supplies.map(s => (
             <RoundedCard key={s.id} className="p-0 border-none shadow-sm overflow-hidden group">
                <div className="p-5 bg-white">
                   <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${s.stock < 100 ? 'bg-amber-500' : 'bg-slate-700'}`}>
                            <i className="fas fa-box"></i>
                         </div>
                         <div>
                            <h4 className="font-black text-slate-800 text-sm leading-none mb-1">{s.name}</h4>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID: {s.id.slice(-4)}</span>
                         </div>
                      </div>
                      <div className="text-right">
                         <span className={`text-2xl font-black block leading-none ${s.stock < 100 ? 'text-amber-500' : 'text-slate-800'}`}>{s.stock}</span>
                         <span className="text-[8px] font-bold text-slate-300 uppercase">Unidades</span>
                      </div>
                   </div>
                   
                   {/* Stock Bar */}
                   <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-4">
                      <div className={`h-full ${s.stock < 100 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: '100%' }}></div>
                   </div>

                   <div className="flex gap-2">
                      <button 
                        onClick={() => setConsumingSupply(s)}
                        className="flex-1 bg-amber-50 text-amber-600 py-3 rounded-xl font-black uppercase text-[9px] flex items-center justify-center gap-2 active:bg-amber-100 transition-colors"
                      >
                        <i className="fas fa-hand-holding-hand"></i> Consumir
                      </button>
                      <button 
                        onClick={() => setEditingSupply(s)}
                        className="flex-1 bg-slate-50 text-slate-600 py-3 rounded-xl font-black uppercase text-[9px] flex items-center justify-center gap-2 active:bg-slate-200 transition-colors"
                      >
                        <i className="fas fa-edit"></i> Editar / Stock
                      </button>
                   </div>
                </div>
             </RoundedCard>
           ))
        )}

        <button 
          onClick={() => setEditingSupply({ category: 'Insumos', stock: 0 })}
          className="w-full py-6 border-2 border-dashed border-slate-300 rounded-[2.5rem] text-slate-400 font-black text-sm uppercase hover:bg-white hover:text-slate-600 transition-all flex items-center justify-center gap-2"
        >
          <i className="fas fa-plus"></i> Nuevo Insumo
        </button>
      </div>

      {consumingSupply && (
        <ConsumptionModal 
          supply={consumingSupply} 
          onClose={() => setConsumingSupply(null)} 
          onConfirm={saveProduct} 
        />
      )}

      {editingSupply && (
        <EditSupplyModal 
          supply={editingSupply} 
          onClose={() => setEditingSupply(null)} 
          onConfirm={saveProduct}
        />
      )}
    </div>
  );
};
