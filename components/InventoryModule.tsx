
import React, { useState } from 'react';
import { useERPData } from '../hooks/useERPData';
import { ModuleHeader, RoundedCard, ActionButton } from './ui/Cards';
import { Product } from '../types';

export const InventoryModule: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { products, saveProduct, deleteProduct, emptyJugsStock, setEmptyJugsStock, customers, vehicles } = useERPData();
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [search, setSearch] = useState('');

  const totalJugsOnLoan = customers.reduce((acc, c) => acc + (c.jugsOnLoan || 0), 0);
  const totalEmptyInVehicles = vehicles.reduce((acc, v) => acc + (v.emptyJugs || 0), 0);
  const fullJugsInPlant = products.find(p => p.id === '1')?.stock || 0;
  const fullJugsInVehicles = vehicles.reduce((acc, v) => acc + (v.inventory.find(i => i.id === '1')?.quantity || 0), 0);
  
  const totalJugsInSystem = fullJugsInPlant + fullJugsInVehicles + emptyJugsStock + totalEmptyInVehicles + totalJugsOnLoan;

  const filteredProducts = products.filter(p => 
    p.category !== 'Insumos' &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = products
    .filter(p => p.category !== 'Insumos')
    .reduce((acc, p) => acc + (p.stock * p.price), 0);

  const handleSave = () => {
    if (!editingProduct?.name || editingProduct.price === undefined || editingProduct.stock === undefined) {
      alert("Por favor completa todos los campos.");
      return;
    }
    const productToSave: Product = {
      id: editingProduct.id || Date.now().toString(),
      name: editingProduct.name,
      price: editingProduct.price,
      stock: editingProduct.stock,
      category: editingProduct.category || 'Agua'
    };
    saveProduct(productToSave);
    setEditingProduct(null);
  };

  const adjustStock = (p: Product, delta: number) => {
    saveProduct({ ...p, stock: Math.max(0, p.stock + delta) });
  };

  const handleEditAdjustStock = (delta: number) => {
    if (!editingProduct) return;
    setEditingProduct({ ...editingProduct, stock: Math.max(0, (editingProduct.stock || 0) + delta) });
  };

  const handlePriceChange = (product: Product, newPriceString: string) => {
    const newPrice = parseFloat(newPriceString);
    if (!isNaN(newPrice) && newPrice >= 0) saveProduct({ ...product, price: newPrice });
  };

  if (editingProduct) {
    return (
      <div className="h-full bg-sky-50 overflow-y-auto no-scrollbar pb-32 animate-fadeIn">
        <ModuleHeader title={editingProduct.id ? "Editar Producto" : "Nuevo Producto"} onBack={() => setEditingProduct(null)} />
        <div className="px-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-sky-400 uppercase ml-3 mb-1 block">Nombre del Producto</label>
              <input 
                className="w-full bg-white p-5 rounded-[2rem] outline-none shadow-sm font-bold text-sky-900 focus:ring-2 ring-violet-300 transition-all" 
                placeholder="Ej: Garrafón 20L (Llenado)" 
                value={editingProduct.name || ''} 
                onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-[10px] font-black text-sky-400 uppercase ml-3 mb-1 block">Precio al Público</label>
                <div className="relative">
                   <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-sky-400">$</span>
                   <input 
                    type="number"
                    className="w-full bg-white p-5 pl-10 rounded-[2rem] outline-none shadow-sm font-black text-sky-900 text-xl focus:ring-2 ring-violet-300 transition-all" 
                    placeholder="0.00" 
                    value={editingProduct.price || ''} 
                    onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})}
                  />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-violet-50">
                <label className="text-[10px] font-black text-violet-400 uppercase tracking-widest block mb-4 text-center">Ajuste Manual de Stock</label>
                <div className="flex items-center justify-between gap-4">
                   <button onClick={() => handleEditAdjustStock(-1)} className="w-14 h-14 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center font-black text-2xl active:bg-violet-200 transition-colors">-</button>
                   <div className="flex-1 text-center">
                     <input 
                        type="number"
                        className="w-full bg-transparent outline-none font-black text-4xl text-sky-900 text-center" 
                        placeholder="0" 
                        value={editingProduct.stock === undefined ? '' : editingProduct.stock} 
                        onChange={e => setEditingProduct({...editingProduct, stock: Number(e.target.value)})}
                      />
                      <p className="text-[8px] font-bold text-sky-300 uppercase mt-1">Unidades en Piso</p>
                   </div>
                   <button onClick={() => handleEditAdjustStock(1)} className="w-14 h-14 bg-violet-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg shadow-violet-200 active:scale-95 transition-all">+</button>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                   <button onClick={() => handleEditAdjustStock(10)} className="py-2 bg-violet-50 text-violet-600 rounded-xl text-[9px] font-black uppercase active:bg-violet-100">+10</button>
                   <button onClick={() => handleEditAdjustStock(-10)} className="py-2 bg-violet-50 text-violet-600 rounded-xl text-[9px] font-black uppercase active:bg-violet-100">-10</button>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-sky-400 uppercase ml-3 mb-1 block">Categoría</label>
              <select 
                className="w-full bg-white p-5 rounded-[2rem] outline-none shadow-sm font-bold text-sky-900 appearance-none focus:ring-2 ring-violet-300 transition-all"
                value={editingProduct.category || 'Agua'}
                onChange={e => setEditingProduct({...editingProduct, category: e.target.value as any})}
              >
                <option value="Agua">Agua Purificada</option>
                <option value="Accesorios">Accesorios</option>
              </select>
            </div>
          </div>

          <div className="pt-4 space-y-3">
             <ActionButton onClick={handleSave}>Confirmar Inventario</ActionButton>
             {editingProduct.id && (
               <button 
                onClick={() => { if(confirm("¿Eliminar producto?")) { deleteProduct(editingProduct.id!); setEditingProduct(null); } }}
                className="w-full py-4 text-rose-500 font-black uppercase text-[10px] tracking-widest bg-rose-50 rounded-[2rem] border border-rose-100 active:scale-95 transition-all"
               >
                 Eliminar Producto
               </button>
             )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-sky-50 flex flex-col animate-fadeIn overflow-hidden pb-24">
      <ModuleHeader title="Gestión de Inventario" onBack={onBack} />
      
      <div className="px-6 space-y-4 shrink-0 mb-4">
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-[2.5rem] shadow-xl shadow-indigo-200 p-6 flex items-center justify-between relative overflow-hidden">
           <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
           <div className="relative z-10">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-70 mb-1">Valor Total Almacén</p>
              <p className="text-3xl font-black tracking-tighter">${totalValue.toLocaleString()}</p>
           </div>
           <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-sm relative z-10">
              <i className="fas fa-warehouse"></i>
           </div>
        </div>

        {/* Balance de Envases */}
        <div className="grid grid-cols-2 gap-3">
           <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-sky-100">
              <p className="text-[8px] font-black text-sky-400 uppercase tracking-widest mb-1">Vacíos en Planta</p>
              <div className="flex items-center justify-between gap-2">
                 <div className="flex items-center gap-2">
                   <i className="fas fa-recycle text-sky-500 text-xs"></i>
                   <span className="text-xl font-black text-sky-900">{emptyJugsStock}</span>
                 </div>
                 <div className="flex gap-1">
                   <button onClick={() => setEmptyJugsStock(prev => Math.max(0, prev - 1))} className="w-6 h-6 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center text-[10px]">-</button>
                   <button onClick={() => setEmptyJugsStock(prev => prev + 1)} className="w-6 h-6 bg-sky-50 text-sky-600 rounded-lg flex items-center justify-center text-[10px]">+</button>
                 </div>
              </div>
           </div>
           <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-sky-100">
              <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Prestados (Clientes)</p>
              <div className="flex items-center gap-2">
                 <i className="fas fa-hand-holding-heart text-indigo-500 text-xs"></i>
                 <span className="text-xl font-black text-indigo-900">{totalJugsOnLoan}</span>
              </div>
           </div>
           <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-sky-100">
              <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">Llenos (Total)</p>
              <div className="flex items-center gap-2">
                 <i className="fas fa-bottle-water text-emerald-500 text-xs"></i>
                 <span className="text-xl font-black text-emerald-900">{fullJugsInPlant + fullJugsInVehicles}</span>
              </div>
           </div>
           <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-sky-100">
              <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest mb-1">Total Sistema</p>
              <div className="flex items-center gap-2">
                 <i className="fas fa-infinity text-amber-500 text-xs"></i>
                 <span className="text-xl font-black text-amber-900">{totalJugsInSystem}</span>
              </div>
           </div>
        </div>

        <div className="relative">
          <input 
            type="text" 
            placeholder="Buscar producto..." 
            className="w-full bg-white p-5 rounded-[2rem] outline-none shadow-sm focus:ring-2 ring-violet-300 font-medium pl-12" 
            value={search} 
            onChange={e => setSearch(e.target.value)}
          />
          <i className="fas fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-sky-200"></i>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-3 no-scrollbar pb-10">
        {filteredProducts.map(p => (
          <RoundedCard key={p.id} className="p-4 border-none shadow-sm group hover:shadow-md transition-all active:scale-[0.99] relative overflow-visible">
            <div className="flex justify-between items-center">
               <div className="flex items-center gap-4 flex-1" onClick={() => setEditingProduct(p)}>
                  <div className={`w-14 h-14 ${p.stock < 15 ? 'bg-rose-100 text-rose-500' : 'bg-sky-50 text-sky-500'} rounded-2xl flex items-center justify-center text-xl shadow-inner`}>
                     <i className={`fas ${p.category === 'Agua' ? 'fa-bottle-water' : 'fa-pump-medical'}`}></i>
                  </div>
                  <div>
                     <h4 className="font-black text-sky-900 text-sm leading-tight">{p.name}</h4>
                     <span className="text-[9px] font-bold text-sky-400 uppercase tracking-widest bg-sky-50 px-2 py-0.5 rounded-full mt-1 inline-block">{p.category || 'Agua'}</span>
                  </div>
               </div>
               
               <div className="flex items-center gap-2 bg-sky-50 p-1.5 rounded-2xl ml-2 shadow-inner">
                 <button onClick={(e) => { e.stopPropagation(); adjustStock(p, -1); }} className="w-9 h-9 bg-white shadow-sm text-sky-600 rounded-xl flex items-center justify-center font-black active:scale-90 transition-all">-</button>
                 <div className="text-center min-w-[35px]" onClick={() => setEditingProduct(p)}>
                    <span className={`text-xl font-black block leading-none ${p.stock < 15 ? 'text-rose-500' : 'text-sky-900'}`}>{p.stock}</span>
                 </div>
                 <button onClick={(e) => { e.stopPropagation(); adjustStock(p, 1); }} className="w-9 h-9 bg-sky-600 text-white shadow-lg shadow-sky-200 rounded-xl flex items-center justify-center font-black active:scale-90 transition-all">+</button>
               </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-sky-50 flex justify-between items-center">
               <div className="flex items-center gap-2">
                 <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Precio:</span>
                 <div className="bg-sky-50 rounded-lg px-3 py-1 flex items-center gap-1">
                    <span className="text-sky-400 font-bold">$</span>
                    <input 
                        type="number" 
                        className="w-16 bg-transparent text-sm font-black text-sky-900 outline-none"
                        defaultValue={p.price}
                        onBlur={(e) => handlePriceChange(p, e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        onClick={(e) => e.stopPropagation()} 
                    />
                 </div>
               </div>

               <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-full border border-sky-50 shadow-sm" onClick={() => setEditingProduct(p)}>
                 <div className={`w-2 h-2 rounded-full ${p.stock < 15 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                 <span className={`text-[8px] font-black uppercase ${p.stock < 15 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {p.stock < 15 ? 'Bajo Stock' : 'Disponible'}
                 </span>
               </div>
            </div>
          </RoundedCard>
        ))}
        
        <button 
          onClick={() => setEditingProduct({ category: 'Agua', stock: 0, price: 0 })}
          className="w-full py-6 border-2 border-dashed border-violet-200 rounded-[2.5rem] text-violet-400 font-black text-sm uppercase hover:bg-white hover:text-violet-600 transition-all active:scale-95"
        >
          + Agregar Nuevo Producto
        </button>
      </div>
    </div>
  );
};
