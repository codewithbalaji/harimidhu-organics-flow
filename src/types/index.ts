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

export interface OrderItem {
  id?: string;
  name: string;
  price: number;
  quantity: number;
  productId: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  items: OrderItem[];
  status: 'pending' | 'processing' | 'out-for-delivery' | 'delivered';
  total: number;
  createdAt: number;
}

export interface Invoice {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  items: OrderItem[];
  total: number;
  paidStatus: "paid" | "unpaid";
  paymentMethod?: string;
  paymentDate?: number;
  paymentReference?: string;
  dueDate: number;
  notes?: string;
  createdAt: number;
  updatedAt?: number;
}

export interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  lowStockItems: number;
}
