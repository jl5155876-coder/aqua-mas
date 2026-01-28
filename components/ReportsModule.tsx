
import React from 'react';
import { useERPData } from '../hooks/useERPData';
import { ModuleHeader, RoundedCard } from './ui/Cards';

export const ReportsModule: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { sales, customers, products } = useERPData();
  
  const todayStart = new Date().setHours(0,0,0,0);
  const salesToday = sales.filter(s => s.timestamp >= todayStart);
  
  const totalGrossToday = salesToday.reduce((acc, s) => acc + s.total, 0);
  const totalPaidToday = salesToday.reduce((acc, s) => acc + s.paidAmount, 0);
  const totalCreditToday = totalGrossToday - totalPaidToday;
  
  const totalHistSales = sales.reduce((acc, s) => acc + s.total, 0);
  const totalDebtBalance = customers.reduce((acc, c) => acc + (c.balance > 0 ? c.balance : 0), 0);
  const totalInventoryValue = products.reduce((acc, p) => acc + (p.stock * p.price), 0);

  // Categorize sales by product
  const productStats: Record<string, { qty: number, total: number }> = {};
  salesToday.forEach(s => {
    s.items.forEach(item => {
      if (!productStats[item.name]) productStats[item.name] = { qty: 0, total: 0 };
      productStats[item.name].qty += item.quantity;
      productStats[item.name].total += item.quantity * item.price;
    });
  });

  const maxQty = Math.max(...Object.values(productStats).map(s => s.qty), 1);

  return (
    <div className="h-full bg-sky-50 overflow-y-auto pb-32 no-scrollbar">
      <ModuleHeader title="Análisis de Negocio" onBack={onBack} />
      <div className="px-6 space-y-6 animate-fadeIn">
        
        {/* Financial Scorecard */}
        <section className="space-y-3">
          <h4 className="text-[10px] font-black uppercase text-sky-400 tracking-widest px-2">Finanzas de Hoy</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-white">
              <div className="flex items-center gap-2 mb-2">
                <i className="fas fa-arrow-trend-up text-emerald-500 text-[10px]"></i>
                <p className="text-[9px] font-black uppercase text-sky-400 tracking-widest leading-none">Ventas</p>
              </div>
              <p className="text-2xl font-black text-sky-900 tracking-tighter">${totalGrossToday.toLocaleString()}</p>
              <div className="mt-1 flex items-center gap-1">
                 <span className="text-[8px] font-bold text-sky-300">{salesToday.length} Tickets generados</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-white">
              <div className="flex items-center gap-2 mb-2">
                <i className="fas fa-money-bill-transfer text-sky-500 text-[10px]"></i>
                <p className="text-[9px] font-black uppercase text-sky-400 tracking-widest leading-none">Recaudado</p>
              </div>
              <p className="text-2xl font-black text-sky-900 tracking-tighter">${totalPaidToday.toLocaleString()}</p>
              <div className="mt-1 flex items-center gap-1">
                 <span className="text-[8px] font-bold text-emerald-500">{Math.round((totalPaidToday/totalGrossToday || 0)*100)}% de cobro</span>
              </div>
            </div>
          </div>

          <RoundedCard className="bg-sky-900 text-white border-none shadow-xl flex items-center justify-between p-7">
            <div>
              <p className="text-[9px] font-black text-sky-300 uppercase tracking-[0.2em] mb-1">Cuentas por Cobrar (Clientes)</p>
              <p className="text-3xl font-black tracking-tighter">${totalDebtBalance.toLocaleString()}</p>
            </div>
            <div className="w-14 h-14 bg-white/10 rounded-3xl flex items-center justify-center text-2xl text-sky-300">
              <i className="fas fa-sack-dollar"></i>
            </div>
          </RoundedCard>
        </section>

        {/* Product Performance Visualization */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h4 className="text-[10px] font-black uppercase text-sky-400 tracking-widest">Desempeño por Producto</h4>
            <span className="text-[9px] font-bold text-sky-300">HOY</span>
          </div>
          <div className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-white space-y-6">
            {Object.keys(productStats).length === 0 ? (
              <p className="text-center text-sky-300 text-xs italic py-4">Sin datos de ventas hoy.</p>
            ) : (
              Object.entries(productStats).map(([name, stats]) => (
                <div key={name} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <h5 className="text-[11px] font-black text-sky-900 uppercase leading-none">{name}</h5>
                      <span className="text-[9px] font-bold text-sky-400">{stats.qty} unidades vendidas</span>
                    </div>
                    <span className="text-sm font-black text-sky-600">${stats.total.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-sky-50 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-sky-400 to-sky-600 transition-all duration-1000 ease-out rounded-full" 
                      style={{ width: `${(stats.qty / maxQty) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Assets & Inventory */}
        <section className="space-y-4">
          <h4 className="text-[10px] font-black uppercase text-sky-400 tracking-widest px-2">Inventario y Activos</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-white">
              <p className="text-[9px] font-black uppercase text-sky-400 tracking-widest mb-1">Valor Stock</p>
              <p className="text-xl font-black text-sky-900">${totalInventoryValue.toLocaleString()}</p>
              <p className="text-[8px] font-bold text-sky-300 mt-1 uppercase">Estimado en piso</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-white">
              <p className="text-[9px] font-black uppercase text-sky-400 tracking-widest mb-1">Items Bajos</p>
              <p className="text-xl font-black text-rose-500">{products.filter(p => p.stock < 15).length}</p>
              <p className="text-[8px] font-bold text-rose-300 mt-1 uppercase">Reabastecimiento</p>
            </div>
          </div>
          
          <div className="space-y-2">
            {products.filter(p => p.stock < 15).map(p => (
              <div key={p.id} className="bg-rose-50 border border-rose-100 p-4 rounded-3xl flex justify-between items-center animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-rose-500 shadow-sm">
                    <i className="fas fa-triangle-exclamation text-xs"></i>
                  </div>
                  <span className="text-[10px] font-black text-rose-900 uppercase">{p.name}</span>
                </div>
                <span className="text-xs font-black text-rose-600">{p.stock} Uds.</span>
              </div>
            ))}
          </div>
        </section>

        <div className="py-10 text-center">
          <p className="text-[9px] font-black text-sky-200 uppercase tracking-[0.5em] mb-4">Métricas Consolidadas</p>
          <div className="flex justify-center gap-6 opacity-20">
            <i className="fas fa-chart-line text-2xl"></i>
            <i className="fas fa-database text-2xl"></i>
            <i className="fas fa-file-invoice-dollar text-2xl"></i>
          </div>
        </div>
      </div>
    </div>
  );
};
