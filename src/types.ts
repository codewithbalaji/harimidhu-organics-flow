// Customer type
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  createdAt: string;
}

// Product types
export interface StockBatch {
  id: string;
  quantity: number; // Can be a decimal/float value
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
  stock?: number; // Legacy field
}

// Order types
export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number; // Can be a decimal/float value
  unitPrice: number;
  total: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  status: "pending" | "processing" | "out-for-delivery" | "delivered";
  createdAt: string;
} 
