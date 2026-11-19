import type { Product } from './types';

/**
 * Demo catalogue for "Sourav Dairy".
 * Change prices/units here (or in the products table) and both the agent and
 * the dashboard pick them up.
 */
export const CATALOG: Product[] = [
  { id: 'p_cow', sku: 'COW', name: 'Cow Milk', nameHi: 'गाय का दूध', unit: 'litre', price: 60, active: true },
  { id: 'p_buffalo', sku: 'BUFFALO', name: 'Buffalo Milk', nameHi: 'भैंस का दूध', unit: 'litre', price: 80, active: true },
  { id: 'p_curd', sku: 'CURD', name: 'Curd', nameHi: 'दही', unit: 'kg', price: 100, active: true },
  { id: 'p_paneer', sku: 'PANEER', name: 'Paneer', nameHi: 'पनीर', unit: 'kg', price: 400, active: true },
  { id: 'p_ghee', sku: 'GHEE', name: 'Desi Ghee', nameHi: 'देसी घी', unit: 'litre', price: 750, active: true },
  { id: 'p_chaas', sku: 'CHAAS', name: 'Buttermilk', nameHi: 'छाछ', unit: 'litre', price: 40, active: true },
];

export const BUSINESS = {
  name: 'Sourav Dairy',
  tagline: 'Farm-fresh doodh, dahi & paneer — roz subah 5:00–7:30 baje',
  phone: '+91 98200 00000',
  deliveryWindow: '5:00–7:30 AM',
  cutoff: '9:00 PM',
  area: 'Andheri West, Mumbai',
  upi: 'souravdairy@upi',
  /** How many days ahead deliveries are generated for recurring orders. */
  generateDays: 7,
};

export function productById(products: Product[], id: string | undefined): Product | undefined {
  return products.find((p) => p.id === id);
}

export function productBySku(products: Product[], sku: string): Product | undefined {
  return products.find((p) => p.sku === sku);
}
