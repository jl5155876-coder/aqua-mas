
export type ViewType = 'dashboard' | 'pos' | 'orders' | 'logistics' | 'production' | 'sync' | 'whatsapp' | 'customers' | 'employees' | 'reports' | 'settings' | 'quality' | 'scanner' | 'inventory' | 'tickets' | 'supplies' | 'messages' | 'notifications' | 'fuel';

export type Role = 'Administrador' | 'Repartidor' | 'Planta';

export type GarrafonType = 'Aqua' | 'Bonafont' | 'Ciel' | 'E-Pura' | 'Generico';

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: 'Agua' | 'Accesorios' | 'Insumos';
  lastUpdated?: number;
  satCode?: string;
  unitCode?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Customer {
  id: string;
  name: string;
  alias: string;
  phone: string;
  address: string;
  balance: number;
  specialPrice?: number;
  garrafonType?: GarrafonType;
  jugsOnLoan?: number;
  lat?: number;
  lng?: number;
  lastUpdated?: number;
}

export interface PaymentSplit {
  method: 'Efectivo' | 'Transferencia' | 'Tarjeta';
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
  deviceId?: string;
  status?: 'cancelado';
  previousBalance?: number;
  newBalance?: number;
}

export interface Order {
  id: string;
  timestamp: number;
  status: 'pendiente' | 'asignado' | 'entregado' | 'cancelado';
  priority: number;
  items: CartItem[];
  total: number;
  customerId: string;
  customerAlias: string;
  deviceId?: string;
  lastUpdated?: number;
  vehicleId?: string;
}

export interface Employee {
  id: string;
  name: string;
  roles: Role[];
  phone: string;
  pin: string;
  permissions: ViewType[];
  lastUpdated?: number;
  role?: string; // Legacy support
}

export interface FuelRecord {
  id: string;
  date: number;
  mileage: number;
  liters: number;
  cost: number;
  notes?: string;
}

export interface Vehicle {
  id: string;
  plate: string;
  description: string;
  loadCapacity: number;
  currentLoad: number;
  inventory: CartItem[];
  emptyJugs: number;
  fuelHistory: FuelRecord[];
  lastUpdated?: number;
  lat?: number;
  lng?: number;
  heading?: number;
  speed?: number;
}

export interface QualityRecord {
  id: string;
  timestamp: number;
  employeeId: string;
  type: 'Cruda' | 'Producto';
  ph: number;
  cloro: number;
  tds: number;
  dureza: number;
  color: string;
  sabor: string;
  turbiedad: string;
}

export interface Task {
  id: string;
  timestamp: number;
  status: 'pendiente' | 'completada';
  deviceId?: string;
  lastUpdated?: number;
  title: string;
  description: string;
  date: string;
  employeeId: string;
}

export interface Attendance {
  id: string;
  employeeId: string;
  status: 'presente' | 'retardo' | 'falta';
  date: string;
  timestamp: number;
}

export interface TicketConfig {
  businessName: string;
  rfc: string;
  address: string;
  phone: string;
  footerMessage: string;
  website: string;
  socialMedia: string;
  extraNote: string;
  logoUrl: string;
  colorHex: string;
  email: string;
  paperWidth: '58mm' | '80mm';
  showLogo: boolean;
  showQr: boolean;
  showFooter: boolean;
  slogan?: string;
}

export interface CloudConfig {
  url: string;
  apiKey: string;
  autoSync: boolean;
  sharedMode?: boolean;
  lastSync?: number;
}

export interface SavedReport {
  id: string;
  timestamp: number;
  rangeType: 'day' | 'week' | 'month';
  dateLabel: string;
  totalGross: number;
  totalTransactions: number;
  averageTicket: number;
  payments: { cash: number; transfer: number; card: number };
  topProducts: { name: string; qty: number; total: number }[];
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  timestamp: number;
  read: boolean;
}

export interface AppNotification {
  id: string;
  timestamp: number;
  read: boolean;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'urgent' | 'alarm';
  actionLink?: ViewType;
  scheduledFor?: number;
}

export interface ProductionStep {
  stage: string;
  process: string;
  time: number;
}

export interface MaintenanceTask {
  id: string;
  title: string;
  lastDate: number;
  intervalDays: number;
  status: 'ok' | 'warning' | 'urgent';
}

export interface ProductionBatch {
  id: string;
  timestamp: number;
  quantity: number;
  operatorId: string;
  notes?: string;
}

export interface ProductionConfig {
  backwashSequence: ProductionStep[];
  regenerationSequence: ProductionStep[];
  softenerVolumeFt3?: number;
  multimediaVolumeFt3?: number;
  carbonVolumeFt3?: number;
  currentUsageLiters?: number;
  lastRegenDate?: number;
  maintenanceTasks?: MaintenanceTask[];
  batches?: ProductionBatch[];
}
