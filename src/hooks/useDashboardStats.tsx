import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { db, customersCollection, productsCollection, ordersCollection } from '@/firebase';
import { Product, Order } from '@/types';

// Define DashboardStats interface locally if not exported from types
interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  lowStockItems: number;
}

// Define a stronger typed version of Order with specific date type
interface ProcessedOrder extends Omit<Order, 'createdAt'> {
  createdAt: Date;
}

export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalOrders: 0,
    totalCustomers: 0,
    lowStockItems: 0
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [salesData, setSalesData] = useState<{ name: string; sales: number }[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Get total customers
        const customersSnapshot = await getDocs(customersCollection);
        const totalCustomers = customersSnapshot.size;
        
        // Get products with low stock (total quantity across batches <= 10)
        const productsSnapshot = await getDocs(productsCollection);
        const productsData = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.().toISOString() || new Date().toISOString()
        } as Product));
        
        // Calculate low stock items
        const lowStockItems = productsData.filter(product => {
          // Calculate total stock across batches
          const totalStock = product.stock_batches 
            ? product.stock_batches.reduce((sum, batch) => sum + batch.quantity, 0)
            : (product.stock || 0);
          return totalStock <= 10;
        });
        
        setLowStockProducts(lowStockItems);
        
        // Get recent orders
        const ordersQuery = query(ordersCollection, orderBy("createdAt", "desc"), limit(5));
        const ordersSnapshot = await getDocs(ordersQuery);
        const ordersData = ordersSnapshot.docs.map(doc => {
          const data = doc.data();
          // Normalize createdAt to Date object
          let createdAt: Date;
          if (data.createdAt && typeof data.createdAt.toDate === 'function') {
            createdAt = data.createdAt.toDate();
          } else if (data.createdAt) {
            createdAt = new Date(data.createdAt);
          } else {
            createdAt = new Date();
          }
          
          return {
            id: doc.id,
            ...data,
            createdAt
          } as unknown as Order;
        });
        
        setRecentOrders(ordersData);
        
        // Calculate total sales and orders for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Get all orders without timestamp filter first
        const allOrdersQuery = query(ordersCollection, orderBy("createdAt", "desc"));
        const allOrdersSnapshot = await getDocs(allOrdersQuery);
        
        const allOrdersData = allOrdersSnapshot.docs.map(doc => {
          const data = doc.data();
          // Normalize createdAt to Date object
          let createdAt: Date;
          if (data.createdAt && typeof data.createdAt.toDate === 'function') {
            createdAt = data.createdAt.toDate();
          } else if (data.createdAt) {
            createdAt = new Date(data.createdAt);
          } else {
            createdAt = new Date();
          }
          
          return {
            id: doc.id,
            ...data,
            createdAt
          } as ProcessedOrder;
        });
        
        // Filter orders for last 30 days
        const recentOrdersData = allOrdersData.filter(order => {
          return order.createdAt >= thirtyDaysAgo;
        });
        
        // Calculate total sales from orders
        const totalSales = recentOrdersData.reduce((sum, order) => sum + (order.total || 0), 0);
        
        // Generate weekly sales data
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const weeklySalesMap = new Map(dayNames.map(day => [day, 0]));
        
        // Group all orders by day of week
        allOrdersData.forEach(order => {
          if (!order.createdAt) return;
          
          const dayName = dayNames[order.createdAt.getDay()];
          weeklySalesMap.set(dayName, (weeklySalesMap.get(dayName) || 0) + (order.total || 0));
        });
        
        // Convert map to array format needed for chart
        const weeklySalesData = Array.from(weeklySalesMap.entries())
          .map(([name, sales]) => ({ name, sales }));
        
        // Reorder days to start with Monday
        const orderedWeeklySalesData = [
          ...weeklySalesData.slice(1, 7),
          weeklySalesData[0]
        ];
        
        setSalesData(orderedWeeklySalesData);
        
        // Set final stats
        setStats({
          totalSales,
          totalOrders: recentOrdersData.length,
          totalCustomers,
          lowStockItems: lowStockItems.length
        });
        
        console.log('Dashboard stats:', {
          totalSales,
          totalOrders: recentOrdersData.length,
          salesData: orderedWeeklySalesData
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return { stats, isLoading, salesData, recentOrders, lowStockProducts };
};
