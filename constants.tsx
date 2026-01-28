
import { Product, Customer } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Garrafón 20L (Llenado)', price: 18, stock: 150 },
  { id: '2', name: 'Garrafón 20L (Nuevo)', price: 110, stock: 45 },
  { id: '3', name: 'Botella 500ml (Caja)', price: 85, stock: 20 },
  { id: '4', name: 'Galón 5L', price: 12, stock: 80 }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  // Fixed: Added balance property (0) to match the Customer interface
  { id: 'c1', name: 'Juan Pérez', alias: 'Juan El Barbas', specialPrice: 16, balance: 0 },
  { id: 'c2', name: 'Tienda "La Bendición"', alias: 'Doña Mary', balance: 0 },
  { id: 'c3', name: 'Restaurante El Lago', alias: 'Chef Pedro', specialPrice: 15, balance: 0 }
];

export const THEME_COLORS = {
  primary: 'bg-sky-500',
  secondary: 'bg-sky-200',
  accent: 'bg-sky-100',
  text: 'text-sky-900',
  border: 'rounded-[2.5rem]',
  card: 'bg-white/80 backdrop-blur-md shadow-lg'
};
