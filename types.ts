
export type ViewType = 'dashboard' | 'pos' | 'orders' | 'logistics' | 'production' | 'sync' | 'whatsapp' | 'customers' | 'employees' | 'reports' | 'settings' | 'quality' | 'scanner' | 'inventory' | 'tickets';

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category?: 'Agua' | 'Insumos' | 'Accesorios';
}

export type GarrafonType = 'Aqua' | 'Bonafont' | 'Ciel' | 'E-Pura' | 'Generico';

export interface Customer {
  id: string;
  name: string;
  alias: string;
  phone?: string;
  specialPrice?: number;
  lat?: number;
  lng?: number;
  garrafonType?: GarrafonType;
  balance: number;
}

export interface TicketConfig {
  businessName: string;
  rfc: string;
  address: string;
  phone: string;
  footerMessage: string;
  logoUrl?: string;
  website?: string;
  socialMedia?: string;
  extraNote?: string;
  slogan?: string;
  email?: string;
}

export interface CloudConfig {
  url: string;
  apiKey: string;
  autoSync: boolean;
  lastSync?: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerAlias: string;
  items: CartItem[];
  total: number;
  status: 'pendiente' | 'asignado' | 'entregado' | 'cancelado';
  vehicleId?: string;
  timestamp: number;
  priority: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export type PaymentMethod = 'Efectivo' | 'Transferencia' | 'Crédito' | 'Multimodal';

export interface PaymentSplit {
  method: 'Efectivo' | 'Transferencia';
  amount: number;
}

export interface Sale {
  id: string;
  timestamp: number;
  customerId: string;
  customerAlias: string;
  items: CartItem[];
  total: number;
  paidAmount: number;
  change: number;
  paymentSplits: PaymentSplit[];
  emptyGarrafonsReturned: number;
  synced: boolean;
}

export interface QualityRecord {
  id: string;
  timestamp: number;
  type: 'Cruda' | 'Producto';
  ph: number;
  cloro: number;
  tds: number;
  dureza: number;
  color: string;
  sabor: string;
  turbiedad: string;
  employeeId: string;
}

export interface Task {
  id: string;
  employeeId: string;
  title: string;
  description?: string;
  status: 'pendiente' | 'completada';
  timestamp: number;
  date: string;
}

export interface Attendance {
  id: string;
  employeeId: string;
  timestamp: number;
  date: string;
  status: 'presente' | 'falta' | 'retardo';
}

export interface Employee {
  id: string;
  name: string;
  role: 'Repartidor' | 'Planta' | 'Administrador';
  phone: string;
  pin: string;
  permissions: ViewType[];
}

export interface Vehicle {
  id: string;
  plate: string;
  description: string;
  loadCapacity: number;
  currentLoad: number;
}