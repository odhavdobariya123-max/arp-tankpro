export type UserRole = 'admin' | 'partner' | 'staff';
export type DealerType = 'Retail' | 'Dealer' | 'Distributor';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  email?: string;
  active: boolean;
}

export interface Product {
  id: string;
  tank_name: string;
  capacity: string;
  layer_type?: string;
  color?: string;
  weight?: number;
  purchase_rate?: number;
  sale_rate?: number;
  status: string;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  gst_number?: string;
  address: string;
  city: string;
  dealer_type: DealerType;
  opening_balance: number;
  current_outstanding: number;
  notes?: string;
  created_at: string;
}
