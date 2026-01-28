
import { useState, useEffect, useCallback } from 'react';
import { Product, Customer, Sale, CartItem, Order, Employee, Vehicle, PaymentSplit, ViewType, QualityRecord, Task, Attendance, TicketConfig, CloudConfig } from '../types';
import { INITIAL_PRODUCTS, INITIAL_CUSTOMERS } from '../constants';

const DEFAULT_PERMISSIONS: ViewType[] = ['dashboard', 'pos', 'orders', 'customers', 'logistics', 'inventory', 'whatsapp', 'production', 'sync', 'reports', 'settings', 'employees', 'quality', 'scanner', 'tickets'];

const INITIAL_TICKET_CONFIG: TicketConfig = {
  businessName: 'AQUA+ FUNDADORES',
  rfc: 'AQUA900101-XXX',
  address: 'Calle del Agua #123, Col. Manantiales',
  phone: '33-1234-5678',
  footerMessage: '¡Gracias por tu preferencia! Frescura que hidrata tu vida.',
  website: 'www.aquafun.mx',
  socialMedia: '@aquafun_pro',
  extraNote: 'No hay cambios después de 24 horas.',
  logoUrl: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2225%22 fill=%22%230284c7%22/><path d=%22M50 20C50 20 30 45 30 60C30 71.0457 38.9543 80 50 80C61.0457 80 70 71.0457 70 60C70 45 50 20 50 20Z%22 fill=%22white%22/></svg>'
};

const INITIAL_CLOUD_CONFIG: CloudConfig = {
  url: '',
  apiKey: '',
  autoSync: false
};

export const useERPData = () => {
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('aqua_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('aqua_customers');
    return saved ? JSON.parse(saved).map((c: any) => ({ ...c, balance: c.balance || 0 })) : INITIAL_CUSTOMERS;
  });

  const [ticketConfig, setTicketConfig] = useState<TicketConfig>(() => {
    const saved = localStorage.getItem('aqua_ticket_config');
    return saved ? JSON.parse(saved) : INITIAL_TICKET_CONFIG;
  });

  const [cloudConfig, setCloudConfig] = useState<CloudConfig>(() => {
    const saved = localStorage.getItem('aqua_cloud_config');
    return saved ? JSON.parse(saved) : INITIAL_CLOUD_CONFIG;
  });
  
  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('aqua_sales');
    return saved ? JSON.parse(saved) : [];
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('aqua_orders');
    return saved ? JSON.parse(saved) : [];
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('aqua_employees');
    const initial = saved ? JSON.parse(saved) : [
      { id: 'admin', name: 'Gerente General', role: 'Administrador', phone: '3312345678', pin: '1234', permissions: [...DEFAULT_PERMISSIONS] }
    ];
    return initial;
  });

  // Force update admin permissions to include all new modules
  useEffect(() => {
    setEmployees(prev => prev.map(e => 
      e.role === 'Administrador' 
        ? { ...e, permissions: [...DEFAULT_PERMISSIONS] } 
        : e
    ));
  }, []);

  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const saved = localStorage.getItem('aqua_vehicles');
    return saved ? JSON.parse(saved) : [{ id: 'v1', plate: 'ABC-123', description: 'Nissan NP300', loadCapacity: 60, currentLoad: 0 }];
  });

  const [qualityRecords, setQualityRecords] = useState<QualityRecord[]>(() => {
    const saved = localStorage.getItem('aqua_quality');
    return saved ? JSON.parse(saved) : [];
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('aqua_tasks');
    return saved ? JSON.parse(saved) : [];
  });

  const [attendance, setAttendance] = useState<Attendance[]>(() => {
    const saved = localStorage.getItem('aqua_attendance');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('aqua_products', JSON.stringify(products));
    localStorage.setItem('aqua_customers', JSON.stringify(customers));
    localStorage.setItem('aqua_sales', JSON.stringify(sales));
    localStorage.setItem('aqua_orders', JSON.stringify(orders));
    localStorage.setItem('aqua_employees', JSON.stringify(employees));
    localStorage.setItem('aqua_vehicles', JSON.stringify(vehicles));
    localStorage.setItem('aqua_ticket_config', JSON.stringify(ticketConfig));
    localStorage.setItem('aqua_quality', JSON.stringify(qualityRecords));
    localStorage.setItem('aqua_tasks', JSON.stringify(tasks));
    localStorage.setItem('aqua_attendance', JSON.stringify(attendance));
    localStorage.setItem('aqua_cloud_config', JSON.stringify(cloudConfig));
  }, [products, customers, sales, orders, employees, vehicles, ticketConfig, qualityRecords, tasks, attendance, cloudConfig]);

  const addSale = (
    customerId: string, 
    items: CartItem[], 
    total: number, 
    paidAmount: number, 
    splits: PaymentSplit[], 
    returnedVacios: number, 
    manualTimestamp?: number
  ) => {
    const debtAmount = Math.max(0, total - paidAmount);
    const newSale: Sale = {
      id: `TKT-${Date.now().toString().slice(-6)}`,
      timestamp: manualTimestamp || Date.now(),
      customerId,
      customerAlias: customers.find(c => c.id === customerId)?.alias || 'Anonimo',
      items,
      total,
      paidAmount,
      change: Math.max(0, paidAmount - total),
      paymentSplits: splits,
      emptyGarrafonsReturned: returnedVacios,
      synced: false
    };

    setSales(prev => [newSale, ...prev]);
    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, balance: (c.balance || 0) + debtAmount } : c));
    setProducts(prev => prev.map(p => {
      const cartItem = items.find(item => item.id === p.id);
      return cartItem ? { ...p, stock: p.stock - cartItem.quantity } : p;
    }));

    return newSale;
  };

  const syncData = useCallback((externalData: { sales: Sale[], customers: Customer[] }) => {
    if (!externalData || !externalData.sales) return false;
    let changesMade = false;

    setSales(prev => {
      const existingIds = new Set(prev.map(s => s.id));
      const newSales = externalData.sales.filter(s => !existingIds.has(s.id));
      if (newSales.length > 0) changesMade = true;
      return [...newSales, ...prev].sort((a, b) => b.timestamp - a.timestamp);
    });

    if (externalData.customers) {
      setCustomers(prev => {
        // Merge strategy: Update existing by ID if cloud version is newer? 
        // For simplicity in this P2P/Cloud model, we assume cloud serves as source of truth for new additions
        // or we merge arrays ensuring no duplicates by ID
        const existingMap = new Map(prev.map(c => [c.id, c]));
        externalData.customers.forEach(c => {
          if (!existingMap.has(c.id)) {
            existingMap.set(c.id, c);
            changesMade = true;
          } else {
             // Optional: Conflict resolution logic (e.g. higher balance wins)
          }
        });
        return Array.from(existingMap.values());
      });
    }

    return changesMade;
  }, []);

  const importCustomers = useCallback((newCustomers: Customer[]) => {
    setCustomers(prev => {
      const existingIds = new Set(prev.map(c => c.id));
      const filteredNew = newCustomers.filter(c => !existingIds.has(c.id));
      return [...prev, ...filteredNew];
    });
  }, []);

  return { 
    products, 
    saveProduct: (p: Product) => setProducts(prev => prev.find(x => x.id === p.id) ? prev.map(x => x.id === p.id ? p : x) : [...prev, p]),
    deleteProduct: (id: string) => setProducts(prev => prev.filter(p => p.id !== id)),
    customers, 
    saveCustomer: (c: Customer) => setCustomers(prev => prev.find(x => x.id === c.id) ? prev.map(x => x.id === c.id ? c : x) : [...prev, c]),
    deleteCustomer: (id: string) => setCustomers(prev => prev.filter(c => c.id !== id)),
    importCustomers,
    sales, addSale,
    orders, 
    setOrders,
    addOrder: (o: Partial<Order>) => {
      const newOrder: Order = {
        id: `ORD-${Date.now().toString().slice(-6)}`,
        timestamp: Date.now(),
        status: 'pendiente',
        priority: 1,
        items: [],
        total: 0,
        customerId: '',
        customerAlias: '',
        ...o
      } as Order;
      setOrders(prev => [newOrder, ...prev]);
    },
    updateOrder: (o: Order) => setOrders(prev => prev.map(item => item.id === o.id ? o : item)),
    employees, 
    saveEmployee: (e: Employee) => setEmployees(prev => prev.find(x => x.id === e.id) ? prev.map(x => x.id === e.id ? e : x) : [...prev, e]),
    vehicles, 
    setVehicles,
    loadVehicle: (id: string, delta: number) => setVehicles(prev => prev.map(v => v.id === id ? { ...v, currentLoad: Math.max(0, Math.min(v.loadCapacity, v.currentLoad + delta)) } : v)),
    tasks,
    addTask: (t: Partial<Task>) => {
      const newTask: Task = {
        id: `TSK-${Date.now().toString().slice(-4)}`,
        timestamp: Date.now(),
        status: 'pendiente',
        ...t
      } as Task;
      setTasks(prev => [newTask, ...prev]);
    },
    updateTaskStatus: (id: string, status: Task['status']) => setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t)),
    attendance,
    recordAttendance: (employeeId: string, status: Attendance['status']) => {
      const date = new Date().toISOString().split('T')[0];
      setAttendance(prev => {
        const filtered = prev.filter(a => !(a.employeeId === employeeId && a.date === date));
        return [{ id: `ATT-${Date.now()}`, employeeId, status, date, timestamp: Date.now() }, ...filtered];
      });
    },
    qualityRecords,
    addQualityRecord: (r: Partial<QualityRecord>) => {
      const newRecord: QualityRecord = {
        id: `QUAL-${Date.now().toString().slice(-4)}`,
        timestamp: Date.now(),
        employeeId: 'admin',
        ...r
      } as QualityRecord;
      setQualityRecords(prev => [newRecord, ...prev]);
    },
    ticketConfig, setTicketConfig,
    cloudConfig, setCloudConfig,
    syncData
  };
};