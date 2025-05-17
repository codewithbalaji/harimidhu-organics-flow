import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { db, customersCollection, productsCollection, ordersCollection, invoicesCollection } from '@/firebase';
import { Product, Order, Invoice } from '@/types';

// Define DashboardStats interface locally if not exported from types
interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  outstandingAmount: number;
  pendingOrders: number;
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
    outstandingAmount: 0,
    pendingOrders: 0
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [salesData, setSalesData] = useState<{ name: string; sales: number }[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Get total customers
        const customersSnapshot = await getDocs(customersCollection);
        const totalCustomers = customersSnapshot.size;
        
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

        // Get all invoices
        const invoicesQuery = query(invoicesCollection, orderBy("createdAt", "desc"));
        const invoicesSnapshot = await getDocs(invoicesQuery);
        
        // Process invoices and calculate totals
        let totalSales = 0;
        let outstandingAmount = 0;
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlySalesMap = new Map(monthNames.map(month => [month, 0]));

        invoicesSnapshot.docs.forEach(doc => {
          const invoice = doc.data() as Invoice;
          const createdAt = invoice.createdAt;
          if (!createdAt) return;
          
          const invoiceDate = typeof createdAt === 'object' && 'toDate' in createdAt
            ? createdAt.toDate()
            : new Date(createdAt);

          // Only include invoices from last 30 days for total sales
          if (invoiceDate >= thirtyDaysAgo) {
            // Calculate subtotal from invoice items only
            const subtotal = invoice.items?.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0) || 0;
            totalSales += subtotal;

            // Add to monthly sales data (using items subtotal)
            const monthName = monthNames[invoiceDate.getMonth()];
            monthlySalesMap.set(monthName, (monthlySalesMap.get(monthName) || 0) + subtotal);
          }

          // Always include outstanding amount
          outstandingAmount += invoice.outstandingAmount || 0;
        });
        
        // Count pending orders
        const pendingOrders = allOrdersData.filter(order => order.status === 'pending').length;
        
        // Convert monthly sales map to array
        const monthlySalesData = monthNames.map(month => ({
          name: month,
          sales: monthlySalesMap.get(month) || 0
        }));
        
        setSalesData(monthlySalesData);
        
        // Set final stats
        setStats({
          totalSales,
          totalOrders: allOrdersData.length,
          totalCustomers,
          outstandingAmount,
          pendingOrders
        });
        
        console.log('Dashboard stats:', {
          totalSales,
          totalOrders: allOrdersData.length,
          outstandingAmount,
          pendingOrders,
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

  return { stats, isLoading, salesData, recentOrders };
};
