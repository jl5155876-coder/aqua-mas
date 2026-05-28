
import { Product, Customer } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  // Productos de Venta (Agua)
  { id: '1', name: 'Garrafón 20L (Llenado)', price: 18, stock: 150, category: 'Agua' },
  { id: '2', name: 'Garrafón 20L (Nuevo)', price: 110, stock: 45, category: 'Accesorios' },
  { id: '3', name: 'Botella 500ml (Caja)', price: 85, stock: 20, category: 'Agua' },
  { id: '4', name: 'Galón 5L', price: 12, stock: 80, category: 'Agua' },
  
  // Insumos de Producción
  { id: '5', name: 'Tapas 20L (Generica)', price: 0.80, stock: 1000, category: 'Insumos' },
  { id: '6', name: 'Liner (Sello Espuma)', price: 0.30, stock: 2000, category: 'Insumos' },
  { id: '7', name: 'Sello Térmico (Garantía)', price: 0.40, stock: 1500, category: 'Insumos' },
  { id: '8', name: 'Cloro (Litros)', price: 15, stock: 20, category: 'Insumos' },
  { id: '9', name: 'Sal en Pellet (Saco 20kg)', price: 220, stock: 10, category: 'Insumos' },
  { id: '10', name: 'Kit Reactivos pH/Cloro', price: 150, stock: 2, category: 'Insumos' }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'Juan Pérez', alias: 'Juan El Barbas', specialPrice: 16, balance: 0, phone: '3312345678', address: 'Av. Vallarta 1234' },
  { id: 'c2', name: 'Tienda "La Bendición"', alias: 'Doña Mary', balance: 0, phone: '3398765432', address: 'Calle Independencia 45' },
  { id: 'c3', name: 'Restaurante El Lago', alias: 'Chef Pedro', specialPrice: 15, balance: 0, phone: '3311223344', address: 'Lago Chapala 88' }
];

export const THEME_COLORS = {
  primary: 'bg-sky-500',
  secondary: 'bg-sky-200',
  accent: 'bg-sky-100',
  text: 'text-sky-900',
  border: 'rounded-[2.5rem]',
  card: 'bg-white/80 backdrop-blur-md shadow-lg'
};

export const BACKWASH_SEQUENCE = [
  { stage: 'Multicama', process: 'Backwash', time: 300 }, // 5 min
  { stage: 'Multicama', process: 'Enjuague Rápido', time: 180 }, // 3 min
  { stage: 'Carbón Activado', process: 'Backwash', time: 300 },
  { stage: 'Carbón Activado', process: 'Enjuague Rápido', time: 180 },
  { stage: 'Suavizador', process: 'Backwash', time: 300 },
  { stage: 'Suavizador', process: 'Enjuague Rápido', time: 180 },
];

export const REGENERATION_SEQUENCE = [
  { stage: 'Suavizador', process: 'Backwash Inicial', time: 300 }, // 5 min
  { stage: 'Suavizador', process: 'Succión Salmuera', time: 1800 }, // 30 min
  { stage: 'Suavizador', process: 'Enjuague Lento', time: 1200 }, // 20 min
  { stage: 'Suavizador', process: 'Enjuague Rápido', time: 180 }, // 3 min
  { stage: 'Tanque Sal', process: 'Relleno Nivel', time: 300 }, // 5 min
];
