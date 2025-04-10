
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
}

export interface StockBatch {
  id: string;
  quantity: number;
  cost_price: number;
  date_added: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock_batches: StockBatch[];
  category: string;
  image: string;
  createdAt: string;
  stock?: number; // For backward compatibility
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  total: number;
  status: 'pending' | 'processing' | 'out-for-delivery' | 'delivered';
  items: OrderItem[];
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  orderId: string;
  customerName: string;
  total: number;
  paidStatus: 'paid' | 'unpaid';
  createdAt: string;
}

export interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  lowStockItems: number;
}
