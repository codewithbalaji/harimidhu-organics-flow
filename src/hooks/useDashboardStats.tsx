
import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { db, customersCollection, productsCollection, ordersCollection } from '@/firebase';
import { DashboardStats, Product, Order } from '@/types';

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
        const ordersData = ordersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt
        } as Order));
        
        setRecentOrders(ordersData);
        
        // Calculate total sales and orders for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentOrdersQuery = query(
          ordersCollection,
          where("createdAt", ">=", Timestamp.fromDate(thirtyDaysAgo))
        );
        
        const recentOrdersSnapshot = await getDocs(recentOrdersQuery);
        const recentOrdersData = recentOrdersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Order));
        
        // Calculate total sales from orders
        const totalSales = recentOrdersData.reduce((sum, order) => sum + (order.total || 0), 0);
        
        // Generate weekly sales data
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const weeklySalesMap = new Map(dayNames.map(day => [day, 0]));
        
        // Group orders by day of week
        recentOrdersData.forEach(order => {
          if (!order.createdAt) return;
          
          // Handle both timestamp and number formats
          let orderDate;
          if (typeof order.createdAt === 'number') {
            orderDate = new Date(order.createdAt);
          } else if (order.createdAt.toDate) {
            // Handle Firestore Timestamp
            orderDate = order.createdAt.toDate();
          } else {
            // Try to parse whatever we have
            orderDate = new Date(order.createdAt);
          }
          
          const dayName = dayNames[orderDate.getDay()];
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
