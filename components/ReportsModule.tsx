
import React, { useState, useMemo } from 'react';
import { useERPData } from '../hooks/useERPData';
import { ModuleHeader, RoundedCard } from './ui/Cards';
import { SavedReport, Sale, Task, Employee, Vehicle } from '../types';
import { generateFinancialPDF, generateTaskReportPDF, generateGarrafonReportPDF } from '../services/pdfGenerator';

type TimeRange = 'day' | 'week' | 'month';
type ReportType = 'financial' | 'operational' | 'assets' | 'quality';

interface QualityDashboardData {
  records: any[];
  averages: { ph: number; cloro: number; tds: number; dureza: number };
  outOfNormCount: number;
  label: string;
}

// Componente visual para los datos de CALIDAD
const QualityReportDashboard: React.FC<{ data: QualityDashboardData }> = ({ data }) => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <section className="space-y-3">
        <h4 className="text-[10px] font-black uppercase text-teal-500 tracking-widest px-2">
          Resumen de Calidad: {data.label}
        </h4>
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-teal-50">
              <p className="text-[9px] font-black uppercase text-teal-400 tracking-widest mb-1">Promedio pH</p>
              <p className="text-2xl font-black text-slate-800">{data.averages.ph.toFixed(1)}</p>
           </div>
           <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-teal-50">
              <p className="text-[9px] font-black uppercase text-teal-400 tracking-widest mb-1">Promedio TDS</p>
              <p className="text-2xl font-black text-slate-800">{data.averages.tds.toFixed(0)} <span className="text-[10px] text-slate-400">PPM</span></p>
           </div>
           <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-teal-50">
              <p className="text-[9px] font-black uppercase text-teal-400 tracking-widest mb-1">Promedio Cloro</p>
              <p className="text-2xl font-black text-slate-800">{data.averages.cloro.toFixed(2)} <span className="text-[10px] text-slate-400">mg/L</span></p>
           </div>
           <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-teal-50">
              <p className="text-[9px] font-black uppercase text-teal-400 tracking-widest mb-1">Promedio Dureza</p>
              <p className="text-2xl font-black text-slate-800">{data.averages.dureza.toFixed(0)} <span className="text-[10px] text-slate-400">mg/L</span></p>
           </div>
        </div>
      </section>

      {data.outOfNormCount > 0 && (
        <div className="bg-rose-50 p-4 rounded-3xl border border-rose-100 flex items-center gap-4">
          <div className="w-10 h-10 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-rose-200">
            <i className="fas fa-triangle-exclamation"></i>
          </div>
          <div>
            <p className="text-xs font-black text-rose-600 uppercase">Alertas de Calidad</p>
            <p className="text-[10px] font-bold text-rose-400">{data.outOfNormCount} registros fuera de norma detectados.</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Interfaz interna para datos procesados (unifica en vivo e historicos)
interface DashboardData {
  totalGross: number;
  totalTransactions: number;
  averageTicket: number;
  payments: { cash: number; transfer: number; card: number };
  topProducts: { name: string; qty: number; total: number }[];
  hourlyStats: { hour: string; count: number; total: number }[];
  categoryStats: { name: string; total: number }[];
  maxQty: number; // Para la barra de progreso
  label: string;
}

interface TaskDashboardData {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  byEmployee: { id: string; name: string; completed: number; total: number; tasks: Task[] }[];
  label: string;
}

interface AssetDashboardData {
  plantStock: number;
  routeStock: number;
  soldCount: number; // Salieron
  returnedCount: number; // Entraron
  netMovement: number; // Difference
  vehicleBreakdown: { plate: string; load: number; items: string }[];
  label: string;
}

// Componente visual reutilizable para los datos FINANCIEROS
const ReportDashboard: React.FC<{ data: DashboardData }> = ({ data }) => {
  const totalReceived = data.payments.cash + data.payments.transfer + data.payments.card;
  
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Financial Scorecard */}
      <section className="space-y-3">
        <h4 className="text-[10px] font-black uppercase text-sky-400 tracking-widest px-2">
          Resumen Financiero: {data.label}
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-white">
            <div className="flex items-center gap-2 mb-2">
              <i className="fas fa-arrow-trend-up text-emerald-500 text-[10px]"></i>
              <p className="text-[9px] font-black uppercase text-sky-400 tracking-widest leading-none">Ventas Brutas</p>
            </div>
            <p className="text-2xl font-black text-sky-900 tracking-tighter">${data.totalGross.toLocaleString()}</p>
            <div className="mt-1 flex items-center gap-1">
               <span className="text-[8px] font-bold text-sky-300">{data.totalTransactions} Tickets</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-white">
            <div className="flex items-center gap-2 mb-2">
              <i className="fas fa-ticket text-sky-500 text-[10px]"></i>
              <p className="text-[9px] font-black uppercase text-sky-400 tracking-widest leading-none">Ticket Promedio</p>
            </div>
            <p className="text-2xl font-black text-sky-900 tracking-tighter">${data.averageTicket.toFixed(0)}</p>
            <div className="mt-1 flex items-center gap-1">
               <span className="text-[8px] font-bold text-sky-300">Por venta</span>
            </div>
          </div>
        </div>
        
        {/* Payment Methods Chart */}
        {totalReceived > 0 ? (
           <RoundedCard className="bg-white border-none shadow-sm p-5">
              <p className="text-[10px] font-black uppercase text-sky-400 tracking-widest mb-3">Métodos de Pago (Recaudado)</p>
              <div className="flex h-4 rounded-full overflow-hidden mb-2">
                 <div style={{ width: `${(data.payments.cash/totalReceived)*100}%` }} className="bg-emerald-400 h-full"></div>
                 <div style={{ width: `${(data.payments.transfer/totalReceived)*100}%` }} className="bg-indigo-500 h-full"></div>
                 <div style={{ width: `${(data.payments.card/totalReceived)*100}%` }} className="bg-purple-500 h-full"></div>
              </div>
              <div className="flex justify-between text-[10px] font-bold flex-wrap gap-2">
                 <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                    <span className="text-sky-900">Efec: ${data.payments.cash.toLocaleString()}</span>
                 </div>
                 <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    <span className="text-sky-900">Transf: ${data.payments.transfer.toLocaleString()}</span>
                 </div>
                 {data.payments.card > 0 && (
                   <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <span className="text-sky-900">Tarj: ${data.payments.card.toLocaleString()}</span>
                   </div>
                 )}
              </div>
           </RoundedCard>
        ) : (
          <div className="bg-white p-4 rounded-3xl text-center">
            <p className="text-[10px] font-bold text-sky-300">Sin ingresos registrados en este periodo.</p>
          </div>
        )}
      </section>

      {/* Hourly Heatmap */}
      {data.hourlyStats.length > 0 && (
        <section className="space-y-4">
           <h4 className="text-[10px] font-black uppercase text-sky-400 tracking-widest px-2">Ventas por Hora (Mapa de Calor)</h4>
           <div className="flex gap-1 overflow-x-auto pb-2 no-scrollbar px-2">
              {data.hourlyStats.map(stat => {
                 // Intensity based on count vs max count roughly
                 const maxCount = Math.max(...data.hourlyStats.map(h => h.count));
                 const intensity = (stat.count / maxCount); 
                 return (
                   <div key={stat.hour} className="flex flex-col items-center gap-1 min-w-[30px]">
                      <div className="w-full bg-sky-100 rounded-t-lg relative flex items-end justify-center overflow-hidden h-24">
                         <div className={`w-full ${intensity > 0.7 ? 'bg-sky-600' : intensity > 0.4 ? 'bg-sky-400' : 'bg-sky-300'} transition-all`} style={{ height: `${intensity * 100}%` }}></div>
                      </div>
                      <span className="text-[8px] font-black text-sky-900">{stat.hour}</span>
                      <span className="text-[7px] font-bold text-slate-400">{stat.count}</span>
                   </div>
                 )
              })}
           </div>
        </section>
      )}

      {/* Product Performance */}
      <section className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h4 className="text-[10px] font-black uppercase text-sky-400 tracking-widest">Productos Top</h4>
        </div>
        <div className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-white space-y-6">
          {data.topProducts.length === 0 ? (
            <p className="text-center text-sky-300 text-xs italic py-4">Sin datos de productos.</p>
          ) : (
            data.topProducts.map((p, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-end">
                  <div>
                    <h5 className="text-[11px] font-black text-sky-900 uppercase leading-none">{p.name}</h5>
                    <span className="text-[9px] font-bold text-sky-400">{p.qty} unidades vendidas</span>
                  </div>
                  <span className="text-sm font-black text-sky-600">${p.total.toLocaleString()}</span>
                </div>
                <div className="w-full bg-sky-50 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-sky-400 to-sky-600 transition-all duration-1000 ease-out rounded-full" 
                    style={{ width: `${(p.qty / data.maxQty) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

// Componente visual para los datos OPERATIVOS
const TaskReportDashboard: React.FC<{ data: TaskDashboardData }> = ({ data }) => {
  const completionRate = data.totalTasks > 0 ? (data.completedTasks / data.totalTasks) * 100 : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      <section className="space-y-3">
        <h4 className="text-[10px] font-black uppercase text-amber-500 tracking-widest px-2">
          Resumen Operativo: {data.label}
        </h4>
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-white flex justify-between items-center relative overflow-hidden">
           <div className="relative z-10">
              <p className="text-[10px] font-black uppercase text-amber-400 tracking-widest mb-1">Tasa de Cumplimiento</p>
              <p className="text-4xl font-black text-amber-500 tracking-tighter">{Math.round(completionRate)}%</p>
              <p className="text-[9px] font-bold text-slate-400 mt-2">
                {data.completedTasks} completadas de {data.totalTasks} asignadas
              </p>
           </div>
           
           <div className="relative w-20 h-20 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path className="text-slate-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                <path className="text-amber-400" strokeDasharray={`${completionRate}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
              </svg>
              <i className="fas fa-check-double absolute text-amber-500 text-lg"></i>
           </div>
        </div>
      </section>

      <section className="space-y-3">
        <h4 className="text-[10px] font-black uppercase text-amber-500 tracking-widest px-2">Desempeño por Colaborador</h4>
        <div className="space-y-3">
          {data.byEmployee.length === 0 ? (
             <p className="text-center text-slate-400 text-xs py-4">No hay tareas registradas.</p>
          ) : (
             data.byEmployee.sort((a,b) => b.completed - a.completed).map(emp => (
               <RoundedCard key={emp.id} className="py-4 border-none shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center font-black text-sm">
                       {emp.name.charAt(0)}
                     </div>
                     <div>
                        <h5 className="font-black text-slate-800 text-xs uppercase">{emp.name}</h5>
                        <p className="text-[9px] font-bold text-slate-400">{emp.total} Tareas asignadas</p>
                     </div>
                  </div>
                  <div className="text-right">
                     <span className="block font-black text-lg text-emerald-500">{emp.completed}</span>
                     <span className="text-[8px] font-bold text-slate-300 uppercase">Hechas</span>
                  </div>
               </RoundedCard>
             ))
          )}
        </div>
      </section>
    </div>
  );
};

// Componente visual para los datos de ACTIVOS (GARRAFONES)
const AssetReportDashboard: React.FC<{ data: AssetDashboardData }> = ({ data }) => {
  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Cards de Inventario Fijo */}
      <section className="space-y-3">
        <h4 className="text-[10px] font-black uppercase text-teal-500 tracking-widest px-2">Ubicación de Activos (Llenos)</h4>
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-teal-500 text-white p-5 rounded-[2rem] shadow-lg shadow-teal-200">
              <i className="fas fa-industry text-teal-200 text-2xl mb-2"></i>
              <p className="text-[9px] font-black uppercase opacity-70 tracking-widest">En Planta</p>
              <p className="text-3xl font-black tracking-tighter">{data.plantStock}</p>
           </div>
           <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-teal-100">
              <i className="fas fa-truck-ramp-box text-teal-500 text-2xl mb-2"></i>
              <p className="text-[9px] font-black uppercase text-teal-400 tracking-widest">En Ruta</p>
              <p className="text-3xl font-black text-slate-800 tracking-tighter">{data.routeStock}</p>
           </div>
        </div>
      </section>

      {/* Balance de Flujo */}
      <section className="space-y-3">
         <h4 className="text-[10px] font-black uppercase text-teal-500 tracking-widest px-2">Balance de Envases (Calle)</h4>
         <RoundedCard className="bg-white border-none shadow-sm p-6">
            <div className="flex items-center justify-between mb-6 border-b border-slate-50 pb-4">
               <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Entregados (Venta)</p>
                  <p className="text-xl font-black text-slate-800">{data.soldCount} <span className="text-[9px] text-slate-400">Salidas</span></p>
               </div>
               <i className="fas fa-arrow-right-arrow-left text-slate-200"></i>
               <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Recibidos (Vacíos)</p>
                  <p className="text-xl font-black text-slate-800">{data.returnedCount} <span className="text-[9px] text-slate-400">Entradas</span></p>
               </div>
            </div>
            
            <div>
               <p className="text-[10px] font-black text-teal-500 uppercase text-center mb-2">Balance del Periodo</p>
               {data.netMovement > 0 ? (
                 <div className="bg-red-50 text-red-600 p-3 rounded-xl text-center font-black text-sm">
                    <i className="fas fa-arrow-trend-up mr-2"></i>
                    {data.netMovement} Envases quedaron en calle (Deuda)
                 </div>
               ) : data.netMovement < 0 ? (
                 <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-center font-black text-sm">
                    <i className="fas fa-arrow-trend-down mr-2"></i>
                    Recuperación neta de {Math.abs(data.netMovement)} envases
                 </div>
               ) : (
                 <div className="bg-slate-50 text-slate-500 p-3 rounded-xl text-center font-black text-sm">
                    <i className="fas fa-check mr-2"></i>
                    Balance Neutro (1 a 1)
                 </div>
               )}
            </div>
         </RoundedCard>
      </section>

      {/* Desglose por Vehículo */}
      <section className="space-y-3">
         <h4 className="text-[10px] font-black uppercase text-teal-500 tracking-widest px-2">Carga por Unidad</h4>
         <div className="space-y-2">
            {data.vehicleBreakdown.length === 0 ? (
               <p className="text-center text-slate-400 text-xs italic">No hay unidades cargadas.</p>
            ) : (
               data.vehicleBreakdown.map((v, i) => (
                  <div key={i} className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center">
                           <i className="fas fa-truck"></i>
                        </div>
                        <div>
                           <p className="text-xs font-black text-slate-800 uppercase">{v.plate}</p>
                           <p className="text-[8px] font-bold text-slate-400 truncate max-w-[150px]">{v.items}</p>
                        </div>
                     </div>
                     <span className="text-lg font-black text-teal-600">{v.load}</span>
                  </div>
               ))
            )}
         </div>
      </section>
    </div>
  );
};

// --- MODAL LECTOR PDF ---
const PDFReaderModal = ({ url, onClose }: { url: string; onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/95 backdrop-blur-md flex flex-col animate-fadeIn">
      <div className="flex items-center justify-between p-4 bg-white/10 text-white">
        <h3 className="font-black text-sm uppercase tracking-widest">Visor de PDF</h3>
        <button onClick={onClose} className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
          <i className="fas fa-times"></i>
        </button>
      </div>
      <div className="flex-1 w-full bg-slate-800 flex items-center justify-center p-2">
        <iframe 
          src={url} 
          className="w-full h-full rounded-xl bg-white shadow-2xl" 
          title="PDF Viewer"
        ></iframe>
      </div>
      <div className="p-4 flex justify-center gap-4">
        <button 
          onClick={() => {
            const link = document.createElement('a');
            link.href = url;
            link.download = `Reporte_Aqua_${Date.now()}.pdf`;
            link.click();
          }} 
          className="bg-sky-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-lg flex items-center gap-2 active:scale-95 transition-all"
        >
          <i className="fas fa-download"></i> Descargar Archivo
        </button>
      </div>
    </div>
  );
};

export const ReportsModule: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { sales, savedReports, addSavedReport, deleteSavedReport, ticketConfig, tasks, employees, products, vehicles, qualityRecords, addNotification } = useERPData();
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
  const [reportType, setReportType] = useState<ReportType>('financial');
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  
  // Estado para ver un reporte guardado especifico
  const [viewingReport, setViewingReport] = useState<SavedReport | null>(null);
  
  // Estado para el visor de PDF
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Estado para confirmaciones
  const [showConfirmModal, setShowConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // --- LOGICA DE PROCESAMIENTO FINANCIERO ---
  const processSalesData = (salesToProcess: Sale[], label: string): DashboardData => {
    const totalGross = salesToProcess.reduce((acc, s) => acc + (s.total || 0), 0);
    const payments = { cash: 0, transfer: 0, card: 0 };
    const productStats: Record<string, { qty: number, total: number }> = {};
    const hourlyMap: Record<string, { count: number, total: number }> = {};

    // Initialize hours 08:00 to 20:00 just to be clean, or dynamic
    for(let i=8; i<=20; i++) {
        const h = i.toString().padStart(2, '0') + ':00';
        hourlyMap[h] = { count: 0, total: 0 };
    }

    salesToProcess.forEach(s => {
      // 1. Payments
      if (s.paymentSplits && Array.isArray(s.paymentSplits)) {
        s.paymentSplits.forEach(p => {
          if(p.method === 'Efectivo') payments.cash += (p.amount || 0);
          if(p.method === 'Transferencia') payments.transfer += (p.amount || 0);
          if(p.method === 'Tarjeta') payments.card += (p.amount || 0);
        });
      } else if (s.paidAmount > 0) {
        payments.cash += s.paidAmount;
      }

      // 2. Products
      if (s.items && Array.isArray(s.items)) {
        s.items.forEach(item => {
          const name = item.name || 'Producto';
          if (!productStats[name]) productStats[name] = { qty: 0, total: 0 };
          productStats[name].qty += (item.quantity || 0);
          productStats[name].total += (item.quantity || 0) * (item.price || 0);
        });
      }

      // 3. Hourly Stats
      const date = new Date(s.timestamp);
      const hourKey = date.getHours().toString().padStart(2, '0') + ':00';
      if (!hourlyMap[hourKey]) hourlyMap[hourKey] = { count: 0, total: 0 };
      hourlyMap[hourKey].count += 1;
      hourlyMap[hourKey].total += s.total;
    });

    const topProducts = Object.entries(productStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
      
    const hourlyStats = Object.entries(hourlyMap)
        .map(([hour, stats]) => ({ hour, ...stats }))
        .sort((a, b) => a.hour.localeCompare(b.hour))
        .filter(h => h.count > 0); // Only show active hours

    const maxQty = Math.max(...Object.values(productStats).map(s => s.qty), 1);
    const averageTicket = salesToProcess.length > 0 ? totalGross / salesToProcess.length : 0;

    return {
      totalGross,
      totalTransactions: salesToProcess.length,
      averageTicket,
      payments,
      topProducts,
      hourlyStats,
      categoryStats: [], // Placeholder for now
      maxQty,
      label
    };
  };

  // --- LOGICA DE PROCESAMIENTO OPERATIVO ---
  const processTaskData = (tasksToProcess: Task[], label: string): TaskDashboardData => {
    const employeeStats: Record<string, { completed: number, total: number, tasks: Task[] }> = {};

    tasksToProcess.forEach(t => {
      if (!employeeStats[t.employeeId]) {
        employeeStats[t.employeeId] = { completed: 0, total: 0, tasks: [] };
      }
      employeeStats[t.employeeId].total++;
      employeeStats[t.employeeId].tasks.push(t);
      if (t.status === 'completada') {
        employeeStats[t.employeeId].completed++;
      }
    });

    const byEmployee = Object.entries(employeeStats).map(([id, stats]) => ({
      id,
      name: employees.find(e => e.id === id)?.name || 'Desconocido',
      ...stats
    }));

    return {
      totalTasks: tasksToProcess.length,
      completedTasks: tasksToProcess.filter(t => t.status === 'completada').length,
      pendingTasks: tasksToProcess.filter(t => t.status === 'pendiente').length,
      byEmployee,
      label
    };
  };

  // --- LOGICA DE PROCESAMIENTO DE ACTIVOS (GARRAFONES) ---
  const processAssetData = (salesToProcess: Sale[], label: string): AssetDashboardData => {
    // 1. Plant Stock: Only items matching "Garraf" or Category 'Agua'
    const plantStock = products
      .filter(p => p.name.toLowerCase().includes('garraf') || p.category === 'Agua')
      .reduce((acc, p) => acc + p.stock, 0);

    // 2. Route Stock: Check all vehicles
    const routeStock = vehicles.reduce((acc, v) => acc + v.currentLoad, 0);
    const vehicleBreakdown = vehicles.map(v => ({
       plate: v.plate,
       load: v.currentLoad,
       items: v.inventory.filter(i => i.name.toLowerCase().includes('garraf')).map(i => `${i.quantity}x ${i.name.split(' ')[0]}`).join(', ')
    })).filter(v => v.load > 0);

    // 3. Movement from Sales
    let soldCount = 0;
    let returnedCount = 0;

    salesToProcess.forEach(s => {
       // Out
       s.items.forEach(i => {
          if (i.name.toLowerCase().includes('garraf') || i.category === 'Agua') {
             soldCount += i.quantity;
          }
       });
       // In
       returnedCount += (s.emptyGarrafonsReturned || 0);
    });

    const netMovement = soldCount - returnedCount;

    return {
       plantStock,
       routeStock,
       soldCount,
       returnedCount,
       netMovement,
       vehicleBreakdown,
       label
    };
  };

  const processQualityData = (recordsToProcess: any[], label: string): QualityDashboardData => {
    const count = recordsToProcess.length || 1;
    const sums = recordsToProcess.reduce((acc, r) => ({
      ph: acc.ph + (r.ph || 0),
      cloro: acc.cloro + (r.cloro || 0),
      tds: acc.tds + (r.tds || 0),
      dureza: acc.dureza + (r.dureza || 0)
    }), { ph: 0, cloro: 0, tds: 0, dureza: 0 });

    const outOfNormCount = recordsToProcess.filter(r => 
      r.ph < 6.5 || r.ph > 8.5 || 
      r.cloro < 0.2 || r.cloro > 1.5 || 
      r.tds > 500 || 
      r.dureza > 200
    ).length;

    return {
      records: recordsToProcess,
      averages: {
        ph: sums.ph / count,
        cloro: sums.cloro / count,
        tds: sums.tds / count,
        dureza: sums.dureza / count
      },
      outOfNormCount,
      label
    };
  };

  // --- DATOS EN VIVO (FILTERED) ---
  const timeFilter = useMemo(() => {
    const now = new Date();
    let startTime = 0;
    // Simple filter: start of day/week/month
    if (timeRange === 'day') {
      startTime = new Date(now.setHours(0,0,0,0)).getTime();
    } else if (timeRange === 'week') {
      const day = now.getDay(); 
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); 
      const monday = new Date(now.setDate(diff));
      startTime = new Date(monday.setHours(0,0,0,0)).getTime();
    } else if (timeRange === 'month') {
      startTime = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    }
    return startTime;
  }, [timeRange]);

  const liveFilteredSales = useMemo(() => {
    return sales.filter(s => s.timestamp >= timeFilter);
  }, [sales, timeFilter]);

  const liveFilteredTasks = useMemo(() => {
    return tasks.filter(t => {
       const taskTs = new Date(t.date + 'T00:00:00').getTime(); 
       return taskTs >= timeFilter; 
    });
  }, [tasks, timeFilter]);

  const liveFilteredQuality = useMemo(() => {
    return qualityRecords.filter(r => r.timestamp >= timeFilter);
  }, [qualityRecords, timeFilter]);

  const liveData = processSalesData(liveFilteredSales, timeRange === 'day' ? 'Hoy' : timeRange === 'week' ? 'Esta Semana' : 'Este Mes');
  const taskData = processTaskData(liveFilteredTasks, timeRange === 'day' ? 'Hoy' : timeRange === 'week' ? 'Esta Semana' : 'Este Mes');
  const assetData = processAssetData(liveFilteredSales, timeRange === 'day' ? 'Hoy' : timeRange === 'week' ? 'Esta Semana' : 'Este Mes');
  const qualityData = processQualityData(liveFilteredQuality, timeRange === 'day' ? 'Hoy' : timeRange === 'week' ? 'Esta Semana' : 'Este Mes');

  const handleSaveSnapshot = () => {
    if (reportType !== 'financial') {
      addNotification({
        title: "Operación no permitida",
        message: "Solo se pueden guardar reportes financieros en el historial histórico.",
        type: 'warning'
      });
      return;
    }

    if (liveFilteredSales.length === 0) {
      addNotification({
        title: "Sin datos",
        message: "No hay datos para guardar en este reporte.",
        type: 'warning'
      });
      return;
    }

    setShowConfirmModal({
      title: "Generar Corte",
      message: `¿Deseas guardar el reporte de ${timeRange === 'day' ? 'Hoy' : timeRange === 'week' ? 'Esta Semana' : 'Este Mes'} en el historial?`,
      onConfirm: () => {
        const dateLabel = new Date().toLocaleDateString('es-MX', {
          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit'
        });

        const newReport: SavedReport = {
          id: `REP-${Date.now()}`,
          timestamp: Date.now(),
          rangeType: timeRange,
          dateLabel: dateLabel,
          totalGross: liveData.totalGross,
          totalTransactions: liveData.totalTransactions,
          averageTicket: liveData.averageTicket,
          payments: liveData.payments,
          topProducts: liveData.topProducts,
        };

        addSavedReport(newReport);
        setActiveTab('history');
        setShowConfirmModal(null);
        addNotification({
          title: "Corte Generado",
          message: "El reporte ha sido guardado en el historial.",
          type: 'info'
        });
      }
    });
  };

  const handleGeneratePDF = () => {
    try {
      let url = '';
      if (reportType === 'financial') {
        const reportData = {
          ...liveData,
          rangeType: timeRange
        };
        url = generateFinancialPDF(reportData, ticketConfig);
      } else if (reportType === 'assets') {
        url = generateGarrafonReportPDF({ ...assetData, totalAssets: assetData.plantStock + assetData.routeStock }, ticketConfig);
      } else {
        const reportData = {
          ...taskData,
          rangeType: timeRange
        };
        url = generateTaskReportPDF(reportData, ticketConfig);
      }
      setPdfUrl(url);
    } catch (e) {
      console.error(e);
      addNotification({
        title: "Error",
        message: "No se pudo generar el archivo PDF.",
        type: 'alarm'
      });
    }
  };

  // --- VISTA DETALLADA DE HISTORIAL ---
  if (viewingReport) {
    // Only supports financial history viewing for now
    const historicData: DashboardData = {
      totalGross: viewingReport.totalGross,
      totalTransactions: viewingReport.totalTransactions,
      averageTicket: viewingReport.averageTicket,
      payments: { ...viewingReport.payments, card: viewingReport.payments.card || 0 }, // Ensure card prop exists
      topProducts: viewingReport.topProducts,
      hourlyStats: [], // Not saved in history object yet
      categoryStats: [],
      maxQty: Math.max(...viewingReport.topProducts.map(p => p.qty), 1),
      label: viewingReport.dateLabel
    };

    return (
      <div className="h-full bg-sky-50 overflow-y-auto pb-32 no-scrollbar animate-fadeIn">
         <ModuleHeader title="Detalle de Reporte" onBack={() => setViewingReport(null)} />
         <div className="px-6 space-y-4">
           <div className="bg-sky-600 text-white p-4 rounded-3xl flex justify-between items-center shadow-lg shadow-sky-200">
              <div>
                 <span className="text-[10px] font-black uppercase opacity-60">Fecha de Corte</span>
                 <p className="font-bold text-sm">{viewingReport.dateLabel}</p>
                 <span className="bg-white/20 text-[9px] px-2 py-0.5 rounded uppercase font-black mt-1 inline-block">
                    Tipo: {viewingReport.rangeType === 'day' ? 'Diario' : viewingReport.rangeType === 'week' ? 'Semanal' : 'Mensual'}
                 </span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                     const url = generateFinancialPDF({...historicData, rangeType: viewingReport.rangeType}, ticketConfig);
                     setPdfUrl(url);
                  }}
                  className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white active:scale-95 transition-all"
                  title="Exportar PDF"
                >
                  <i className="fas fa-file-pdf"></i>
                </button>
                <button 
                   onClick={() => {
                      setShowConfirmModal({
                        title: "Eliminar Reporte",
                        message: "¿Deseas eliminar este reporte permanentemente?",
                        onConfirm: () => {
                          deleteSavedReport(viewingReport.id);
                          setViewingReport(null);
                          setShowConfirmModal(null);
                          addNotification({
                            title: "Reporte Eliminado",
                            message: "El reporte ha sido borrado del historial.",
                            type: 'info'
                          });
                        }
                      });
                   }}
                   className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white active:bg-red-500 transition-colors"
                >
                  <i className="fas fa-trash-can"></i>
                </button>
              </div>
           </div>
           
           <ReportDashboard data={historicData} />
         </div>
         {pdfUrl && <PDFReaderModal url={pdfUrl} onClose={() => setPdfUrl(null)} />}
      </div>
    );
  }

  return (
    <div className="h-full bg-sky-50 overflow-y-auto pb-32 no-scrollbar">
      <ModuleHeader title="Reportes y Finanzas" onBack={onBack} />
      
      <div className="px-6 flex gap-2 mb-4 shrink-0">
        <button onClick={() => setActiveTab('live')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'live' ? 'bg-sky-600 text-white shadow-lg' : 'bg-white text-sky-400'}`}>Análisis en Vivo</button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-sky-600 text-white shadow-lg' : 'bg-white text-sky-400'}`}>Historial</button>
      </div>

      <div className="px-6 space-y-6">
        {activeTab === 'live' && (
          <>
            <div className="flex bg-white p-1 rounded-[2rem] shadow-sm mb-2 overflow-x-auto no-scrollbar">
              <button onClick={() => setReportType('financial')} className={`flex-1 py-3 px-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${reportType === 'financial' ? 'bg-indigo-500 text-white shadow-md' : 'text-indigo-300'}`}>
                 <i className="fas fa-coins mr-1"></i> Finanzas
              </button>
              <button onClick={() => setReportType('operational')} className={`flex-1 py-3 px-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${reportType === 'operational' ? 'bg-amber-500 text-white shadow-md' : 'text-amber-300'}`}>
                 <i className="fas fa-list-check mr-1"></i> Operaciones
              </button>
              <button onClick={() => setReportType('assets')} className={`flex-1 py-3 px-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${reportType === 'assets' ? 'bg-teal-500 text-white shadow-md' : 'text-teal-300'}`}>
                 <i className="fas fa-bottle-water mr-1"></i> Envases
              </button>
            </div>

            <div className="flex bg-white p-1.5 rounded-[2rem] shadow-sm">
              <button onClick={() => setTimeRange('day')} className={`flex-1 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${timeRange === 'day' ? 'bg-sky-50 text-sky-600 border border-sky-100' : 'text-slate-300'}`}>Día</button>
              <button onClick={() => setTimeRange('week')} className={`flex-1 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${timeRange === 'week' ? 'bg-sky-50 text-sky-600 border border-sky-100' : 'text-slate-300'}`}>Semana</button>
              <button onClick={() => setTimeRange('month')} className={`flex-1 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${timeRange === 'month' ? 'bg-sky-50 text-sky-600 border border-sky-100' : 'text-slate-300'}`}>Mes</button>
            </div>

            {reportType === 'financial' ? (
               <ReportDashboard data={liveData} />
            ) : reportType === 'operational' ? (
               <TaskReportDashboard data={taskData} />
            ) : reportType === 'assets' ? (
               <AssetReportDashboard data={assetData} />
            ) : (
               <QualityReportDashboard data={qualityData} />
            )}
            
            <div className="flex gap-3">
              <button 
                onClick={handleGeneratePDF}
                className="flex-1 py-5 bg-white text-sky-600 rounded-[2.5rem] font-black text-xs uppercase tracking-widest shadow-sm border border-sky-100 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <i className="fas fa-file-pdf"></i> PDF
              </button>
              
              {reportType === 'financial' && (
                <button 
                  onClick={handleSaveSnapshot}
                  className="flex-[2] py-5 bg-indigo-600 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <i className="fas fa-save"></i> Generar Corte
                </button>
              )}
            </div>
          </>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3 animate-fadeIn">
            {savedReports.length === 0 ? (
               <div className="text-center py-20 opacity-30">
                  <i className="fas fa-folder-open text-6xl mb-4 text-sky-300"></i>
                  <p className="text-xs font-black uppercase text-sky-400">No hay reportes guardados</p>
               </div>
            ) : (
               savedReports.sort((a,b) => b.timestamp - a.timestamp).map(report => (
                 <RoundedCard key={report.id} onClick={() => setViewingReport(report)} className="py-4 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]">
                    <div className="flex justify-between items-center">
                       <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg shadow-sm ${
                            report.rangeType === 'day' ? 'bg-emerald-400' : report.rangeType === 'week' ? 'bg-indigo-400' : 'bg-purple-400'
                          }`}>
                            <i className="fas fa-chart-bar"></i>
                          </div>
                          <div>
                             <h4 className="font-black text-sky-900 text-sm">{report.dateLabel}</h4>
                             <span className="text-[9px] font-bold text-sky-400 uppercase">
                               Corte: {report.rangeType === 'day' ? 'Diario' : report.rangeType === 'week' ? 'Semanal' : 'Mensual'}
                             </span>
                          </div>
                       </div>
                       <div className="text-right">
                          <span className="block font-black text-sky-600 text-lg">${report.totalGross.toLocaleString()}</span>
                          <span className="text-[9px] font-bold text-sky-300">{report.totalTransactions} Ops</span>
                       </div>
                    </div>
                 </RoundedCard>
               ))
            )}
          </div>
        )}
      </div>
      
      {/* PDF Reader Overlay */}
      {pdfUrl && <PDFReaderModal url={pdfUrl} onClose={() => setPdfUrl(null)} />}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 animate-fadeIn">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowConfirmModal(null)}></div>
          <div className="relative bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl animate-scaleIn text-center">
            <div className="w-20 h-20 bg-sky-100 text-sky-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">
              <i className="fas fa-question"></i>
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">{showConfirmModal.title}</h3>
            <p className="text-slate-500 text-sm font-bold leading-relaxed mb-8">
              {showConfirmModal.message}
            </p>
            <div className="space-y-3">
              <button 
                onClick={showConfirmModal.onConfirm}
                className="w-full py-4 bg-sky-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-sky-200 active:scale-95 transition-all"
              >
                Confirmar
              </button>
              <button 
                onClick={() => setShowConfirmModal(null)}
                className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
