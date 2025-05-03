import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart, PieChart, Download, BarChartIcon, PieChartIcon, Calendar, AlertTriangle } from "lucide-react";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart as RechartsPieChart, Pie, Cell, Legend } from 'recharts';
import { toast } from "sonner";
import { collection, getDocs, query, orderBy, where, Timestamp, DocumentData } from 'firebase/firestore';
import { db, customersCollection, productsCollection, ordersCollection } from '@/firebase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#4A7C59'];

// Define types for better TypeScript support
interface SalesDataItem {
  name: string;
  sales: number;
}

interface CategorySalesItem {
  name: string;
  value: number;
}

interface ProductSalesItem {
  name: string;
  sales: number;
}

interface CustomerInsights {
  totalCustomers: number;
  newCustomers: number;
  repeatCustomerPercentage: number;
  averageOrderValue: number;
  customerGrowth: number;
}

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  lowStock: boolean;
  price: number;
  costPrice: number;
  unit: string;
}

interface SalesReportItem {
  id: string;
  invoiceNumber: string;
  date: Date;
  customer: string;
  gstNumber: string;
  total: number;
  paid: boolean;
}

interface OutstandingItem {
  id: string;
  invoiceNumber: string;
  date: Date;
  customer: string;
  total: number;
  dueAmount: number;
  daysOverdue: number;
}

interface ProfitLossItem {
  period: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

const Reports = () => {
  const [reportType, setReportType] = useState("sales");
  const [timeFrame, setTimeFrame] = useState("monthly");
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [useDateRange, setUseDateRange] = useState(false);
  const chartRef = useRef(null);
  const [salesData, setSalesData] = useState<SalesDataItem[]>([]);
  const [categorySalesData, setCategorySalesData] = useState<CategorySalesItem[]>([]);
  const [topSellingProducts, setTopSellingProducts] = useState<ProductSalesItem[]>([]);
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([]);
  const [salesReportData, setSalesReportData] = useState<SalesReportItem[]>([]);
  const [outstandingData, setOutstandingData] = useState<OutstandingItem[]>([]);
  const [profitLossData, setProfitLossData] = useState<ProfitLossItem[]>([]);
  const [customerInsights, setCustomerInsights] = useState<CustomerInsights>({
    totalCustomers: 0,
    newCustomers: 0,
    repeatCustomerPercentage: 0,
    averageOrderValue: 0,
    customerGrowth: 0
  });

  useEffect(() => {
    fetchReportData();
  }, [reportType, timeFrame, useDateRange, startDate, endDate]);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch orders data with date range filter if enabled
      let ordersQuery;
      
      if (useDateRange) {
        const startTimestamp = new Date(startDate);
        const endTimestamp = new Date(endDate);
        endTimestamp.setHours(23, 59, 59, 999); // Set to end of day
        
        ordersQuery = query(
          ordersCollection, 
          where('createdAt', '>=', startTimestamp), 
          where('createdAt', '<=', endTimestamp),
          orderBy('createdAt', 'asc')
        );
      } else {
        ordersQuery = query(ordersCollection, orderBy('createdAt', 'desc'));
      }
      
      const ordersSnapshot = await getDocs(ordersQuery);
      const ordersData = ordersSnapshot.docs.map(doc => {
        const data = doc.data() as DocumentData;
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
        };
      });
      
      // Generate sales data based on time frame
      if (timeFrame === "monthly") {
        generateMonthlySalesData(ordersData);
      } else if (timeFrame === "weekly") {
        generateWeeklySalesData(ordersData);
      } else if (timeFrame === "daily") {
        generateDailySalesData(ordersData);
      } else {
        generateYearlySalesData(ordersData);
      }
      
      // Generate category sales data
      await generateCategorySalesData(ordersData);
      
      // Generate top selling products
      generateTopSellingProducts(ordersData);
      
      // Generate customer insights
      await generateCustomerInsights(ordersData);
      
      // Handle specific report types
      if (reportType === "inventory") {
        await fetchInventoryData();
      } else if (reportType === "sales-report") {
        await generateSalesReport(ordersData);
      } else if (reportType === "profit-loss") {
        await generateProfitLossReport(ordersData);
      } else if (reportType === "outstanding") {
        await generateOutstandingReport(ordersData);
      }
      
    } catch (error) {
      console.error("Error fetching report data:", error);
      toast.error("Failed to load report data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInventoryData = async () => {
    try {
      const productsSnapshot = await getDocs(productsCollection);
      
      const inventoryItems: InventoryItem[] = productsSnapshot.docs.map(doc => {
        const data = doc.data() as DocumentData;
        
        // Calculate total stock and average cost price from stock_batches if available
        let totalStock = 0;
        let totalCost = 0;
        let costPrice = 0;
        
        if (data.stock_batches && Array.isArray(data.stock_batches) && data.stock_batches.length > 0) {
          // Calculate total stock
          totalStock = data.stock_batches.reduce((sum, batch) => {
            const batchQuantity = Number(batch.quantity) || 0;
            return sum + batchQuantity;
          }, 0);
          
          // Calculate average cost price
          totalCost = data.stock_batches.reduce((sum, batch) => {
            const batchQuantity = Number(batch.quantity) || 0;
            const batchCostPrice = Number(batch.cost_price) || 0;
            return sum + (batchQuantity * batchCostPrice);
          }, 0);
          
          costPrice = totalStock > 0 ? totalCost / totalStock : 0;
        } else {
          totalStock = Number(data.stock) || 0;
          costPrice = Number(data.costPrice) || 0;
        }
        
        // Determine if stock is low (less than or equal to 10)
        const isLowStock = totalStock <= 10;
        
        return {
          id: doc.id,
          name: data.name || 'Unnamed Product',
          category: data.category || 'Uncategorized',
          stock: totalStock,
          lowStock: isLowStock,
          price: Number(data.price) || 0,
          costPrice: costPrice,
          unit: data.unit || 'Unit' // Default to 'Unit' if not specified
        };
      });
      
      // Sort inventory by stock level (ascending) so low stock items appear first
      const sortedInventory = inventoryItems.sort((a, b) => a.stock - b.stock);
      setInventoryData(sortedInventory);
      
    } catch (error) {
      console.error("Error fetching inventory data:", error);
      toast.error("Failed to load inventory data");
    }
  };

  const generateMonthlySalesData = (ordersData) => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlySalesMap = new Map(monthNames.map(month => [month, 0]));
    
    // Get the current year
    const currentYear = new Date().getFullYear();
    
    // Filter for current year and aggregate by month
    ordersData.forEach(order => {
      if (!order.createdAt) return;
      
      if (order.createdAt.getFullYear() === currentYear) {
        const monthIndex = order.createdAt.getMonth();
        const monthName = monthNames[monthIndex];
        monthlySalesMap.set(monthName, (monthlySalesMap.get(monthName) || 0) + (order.total || 0));
      }
    });
    
    // Convert to array for the chart
    const monthlySales = monthNames.map(month => ({
      name: month,
      sales: monthlySalesMap.get(month) || 0
    }));
    
    setSalesData(monthlySales);
  };

  const generateWeeklySalesData = (ordersData) => {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weeklySalesMap = new Map(dayNames.map(day => [day, 0]));
    
    // Get the current date and calculate start of this week
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start of this week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);
    
    // Filter for current week and aggregate by day
    ordersData.forEach(order => {
      if (!order.createdAt) return;
      
      if (order.createdAt >= startOfWeek) {
        const dayIndex = order.createdAt.getDay();
        const dayName = dayNames[dayIndex];
        weeklySalesMap.set(dayName, (weeklySalesMap.get(dayName) || 0) + (order.total || 0));
      }
    });
    
    // Convert to array and reorder days to start with Monday
    const weeklySales = dayNames.map(day => ({
      name: day,
      sales: weeklySalesMap.get(day) || 0
    }));
    
    // Reorder days to start with Monday
    const orderedWeeklySales = [
      ...weeklySales.slice(1, 7), // Monday to Saturday
      weeklySales[0] // Sunday
    ];
    
    setSalesData(orderedWeeklySales);
  };

  const generateDailySalesData = (ordersData) => {
    // Get the last 7 days
    const dates = [];
    const dailySalesMap = new Map();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const dateString = `${date.getDate()}/${date.getMonth() + 1}`;
      dates.push(dateString);
      dailySalesMap.set(dateString, 0);
    }
    
    // Aggregate by day
    ordersData.forEach(order => {
      if (!order.createdAt) return;
      
      // Check if the order is from the last 7 days
      const orderDate = new Date(order.createdAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const timeDiff = today.getTime() - orderDate.getTime();
      const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
      
      if (dayDiff >= 0 && dayDiff < 7) {
        const dateString = `${orderDate.getDate()}/${orderDate.getMonth() + 1}`;
        dailySalesMap.set(dateString, (dailySalesMap.get(dateString) || 0) + (order.total || 0));
      }
    });
    
    // Convert to array for the chart
    const dailySales = dates.map(date => ({
      name: date,
      sales: dailySalesMap.get(date) || 0
    }));
    
    setSalesData(dailySales);
  };

  const generateYearlySalesData = (ordersData) => {
    // Get the last 5 years
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => (currentYear - 4 + i).toString());
    const yearlySalesMap = new Map(years.map(year => [year, 0]));
    
    // Aggregate by year
    ordersData.forEach(order => {
      if (!order.createdAt) return;
      
      const year = order.createdAt.getFullYear().toString();
      if (years.includes(year)) {
        yearlySalesMap.set(year, (yearlySalesMap.get(year) || 0) + (order.total || 0));
      }
    });
    
    // Convert to array for the chart
    const yearlySales = years.map(year => ({
      name: year,
      sales: yearlySalesMap.get(year) || 0
    }));
    
    setSalesData(yearlySales);
  };

  const generateCategorySalesData = async (ordersData) => {
    try {
      // First get all products to map their categories
      const productsSnapshot = await getDocs(productsCollection);
      const productsMap = new Map();
      
      productsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        productsMap.set(doc.id, {
          name: data.name,
          category: data.category
        });
      });
      
      // Aggregate sales by category
      const categorySalesMap = new Map();
      
      ordersData.forEach(order => {
        if (!order.items) return;
        
        order.items.forEach(item => {
          const product = productsMap.get(item.productId);
          if (product && product.category) {
            const category = product.category;
            const itemTotal = (item.price || 0) * (item.quantity || 0);
            categorySalesMap.set(category, (categorySalesMap.get(category) || 0) + itemTotal);
          }
        });
      });
      
      // Convert to array for the chart
      const categorySales = Array.from(categorySalesMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value); // Sort by value descending
      
      setCategorySalesData(categorySales);
    } catch (error) {
      console.error("Error generating category sales data:", error);
    }
  };

  const generateTopSellingProducts = (ordersData) => {
    // Aggregate sales by product
    const productSalesMap = new Map();
    
    ordersData.forEach(order => {
      if (!order.items) return;
      
      order.items.forEach(item => {
        if (item.name && item.price && item.quantity) {
          const productName = item.name;
          const itemTotal = item.price * item.quantity;
          productSalesMap.set(productName, (productSalesMap.get(productName) || 0) + itemTotal);
        }
      });
    });
    
    // Convert to array and sort by sales descending
    const productSales = Array.from(productSalesMap.entries())
      .map(([name, sales]) => ({ name, sales }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5); // Take top 5
    
    setTopSellingProducts(productSales);
  };

  const generateCustomerInsights = async (ordersData) => {
    try {
      // Get all customers
      const customersSnapshot = await getDocs(customersCollection);
      const totalCustomers = customersSnapshot.size;
      
      // Get new customers in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      let newCustomers = 0;
      customersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        let createdAt;
        
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          createdAt = data.createdAt.toDate();
        } else if (data.createdAt) {
          createdAt = new Date(data.createdAt);
        }
        
        if (createdAt && createdAt >= thirtyDaysAgo) {
          newCustomers++;
        }
      });
      
      // Calculate customer growth percentage
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      
      let previousPeriodCustomers = 0;
      customersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        let createdAt;
        
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          createdAt = data.createdAt.toDate();
        } else if (data.createdAt) {
          createdAt = new Date(data.createdAt);
        }
        
        if (createdAt && createdAt >= sixtyDaysAgo && createdAt < thirtyDaysAgo) {
          previousPeriodCustomers++;
        }
      });
      
      // Calculate growth percentage
      const customerGrowth = previousPeriodCustomers > 0 
        ? ((newCustomers - previousPeriodCustomers) / previousPeriodCustomers) * 100 
        : 0;
      
      // Calculate average order value
      const totalOrderValue = ordersData.reduce((sum, order) => sum + (order.total || 0), 0);
      const averageOrderValue = ordersData.length > 0 ? totalOrderValue / ordersData.length : 0;
      
      // Calculate repeat customer percentage (customers who have more than one order)
      const customerOrders = new Map();
      ordersData.forEach(order => {
        if (order.customerId) {
          customerOrders.set(order.customerId, (customerOrders.get(order.customerId) || 0) + 1);
        }
      });
      
      const repeatCustomers = Array.from(customerOrders.values()).filter(count => count > 1).length;
      const repeatCustomerPercentage = totalCustomers > 0 
        ? (repeatCustomers / totalCustomers) * 100 
        : 0;
      
      setCustomerInsights({
        totalCustomers,
        newCustomers,
        repeatCustomerPercentage,
        averageOrderValue,
        customerGrowth
      });
      
    } catch (error) {
      console.error("Error generating customer insights:", error);
    }
  };

  const generateSalesReport = async (ordersData) => {
    try {
      // Get customers data to map customer names and GST numbers
      const customersSnapshot = await getDocs(customersCollection);
      const customersMap = new Map();
      
      customersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        customersMap.set(doc.id, {
          name: data.name || data.businessName || 'Unknown Customer',
          gstNumber: data.gstNumber || 'N/A'
        });
      });
      
      // Map orders to sales report format
      const salesReport = ordersData.map(order => {
        const customer = customersMap.get(order.customerId) || { name: 'Unknown Customer', gstNumber: 'N/A' };
        
        return {
          id: order.id,
          invoiceNumber: order.invoiceNumber || `INV-${order.id.substring(0, 6)}`,
          date: order.createdAt,
          customer: customer.name,
          gstNumber: customer.gstNumber,
          total: order.total || 0,
          paid: order.paymentStatus === 'paid'
        };
      });
      
      // Sort by date - newest first
      salesReport.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      setSalesReportData(salesReport);
    } catch (error) {
      console.error("Error generating sales report:", error);
      toast.error("Failed to generate sales report");
    }
  };

  const generateOutstandingReport = async (ordersData) => {
    try {
      // Get customers data to map customer names
      const customersSnapshot = await getDocs(customersCollection);
      const customersMap = new Map();
      
      customersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        customersMap.set(doc.id, {
          name: data.name || data.businessName || 'Unknown Customer'
        });
      });
      
      // Filter to get only unpaid or partially paid orders
      const outstandingOrders = ordersData.filter(order => 
        order.paymentStatus === 'pending' || 
        order.paymentStatus === 'partial' ||
        (order.total > (order.amountPaid || 0))
      );
      
      // Map to outstanding report format
      const today = new Date();
      const outstanding = outstandingOrders.map(order => {
        const customer = customersMap.get(order.customerId) || { name: 'Unknown Customer' };
        const dueAmount = order.total - (order.amountPaid || 0);
        
        // Calculate days overdue
        const dueDate = order.dueDate ? new Date(
          typeof order.dueDate.toDate === 'function' ? order.dueDate.toDate() : order.dueDate
        ) : order.createdAt;
        
        const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
        
        return {
          id: order.id,
          invoiceNumber: order.invoiceNumber || `INV-${order.id.substring(0, 6)}`,
          date: order.createdAt,
          customer: customer.name,
          total: order.total || 0,
          dueAmount,
          daysOverdue
        };
      });
      
      // Sort by days overdue (highest first)
      outstanding.sort((a, b) => b.daysOverdue - a.daysOverdue);
      
      setOutstandingData(outstanding);
    } catch (error) {
      console.error("Error generating outstanding report:", error);
      toast.error("Failed to generate outstanding report");
    }
  };

  const generateProfitLossReport = async (ordersData) => {
    try {
      // Get products to calculate cost prices
      const productsSnapshot = await getDocs(productsCollection);
      const productsMap = new Map();
      
      productsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        productsMap.set(doc.id, {
          costPrice: data.costPrice || 0,
          price: data.price || 0
        });
      });
      
      // Determine periods based on timeFrame
      let periods = [];
      let profitLossMap = new Map();
      
      if (timeFrame === "monthly") {
        // Monthly data for current year
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        periods = monthNames;
        
        // Initialize profit loss map for all months
        monthNames.forEach(month => {
          profitLossMap.set(month, { revenue: 0, cost: 0, profit: 0, margin: 0 });
        });
        
        // Current year filter
        const currentYear = new Date().getFullYear();
        
        // Aggregate by month
        ordersData.forEach(order => {
          if (!order.createdAt || order.createdAt.getFullYear() !== currentYear) return;
          
          const monthIndex = order.createdAt.getMonth();
          const month = monthNames[monthIndex];
          
          // Calculate revenue
          const revenue = order.total || 0;
          profitLossMap.get(month).revenue += revenue;
          
          // Calculate cost
          let cost = 0;
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
              const productCost = item.productId && productsMap.get(item.productId) 
                ? (productsMap.get(item.productId).costPrice * (item.quantity || 1))
                : 0;
              cost += productCost;
            });
          }
          
          profitLossMap.get(month).cost += cost;
        });
      } else if (timeFrame === "weekly") {
        // Weekly data
        const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        periods = dayNames;
        
        // Initialize profit loss map for all days
        dayNames.forEach(day => {
          profitLossMap.set(day, { revenue: 0, cost: 0, profit: 0, margin: 0 });
        });
        
        // Current week filter
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Start from Monday
        startOfWeek.setHours(0, 0, 0, 0);
        
        // Aggregate by day
        ordersData.forEach(order => {
          if (!order.createdAt || order.createdAt < startOfWeek) return;
          
          const dayIndex = order.createdAt.getDay();
          const dayName = dayNames[dayIndex === 0 ? 6 : dayIndex - 1]; // Adjust for Monday start
          
          // Calculate revenue
          const revenue = order.total || 0;
          profitLossMap.get(dayName).revenue += revenue;
          
          // Calculate cost
          let cost = 0;
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
              const productCost = item.productId && productsMap.get(item.productId) 
                ? (productsMap.get(item.productId).costPrice * (item.quantity || 1))
                : 0;
              cost += productCost;
            });
          }
          
          profitLossMap.get(dayName).cost += cost;
        });
      } else if (timeFrame === "daily") {
        // Last 7 days
        const dates = [];
        
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);
          
          const dateString = `${date.getDate()}/${date.getMonth() + 1}`;
          dates.push(dateString);
          profitLossMap.set(dateString, { revenue: 0, cost: 0, profit: 0, margin: 0 });
        }
        
        periods = dates;
        
        // Aggregate by day
        ordersData.forEach(order => {
          if (!order.createdAt) return;
          
          // Check if the order is from the last 7 days
          const orderDate = order.createdAt;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const timeDiff = today.getTime() - orderDate.getTime();
          const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
          
          if (dayDiff >= 0 && dayDiff < 7) {
            const dateString = `${orderDate.getDate()}/${orderDate.getMonth() + 1}`;
            
            // Calculate revenue
            const revenue = order.total || 0;
            
            if (profitLossMap.has(dateString)) {
              profitLossMap.get(dateString).revenue += revenue;
              
              // Calculate cost
              let cost = 0;
              if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                  const productCost = item.productId && productsMap.get(item.productId) 
                    ? (productsMap.get(item.productId).costPrice * (item.quantity || 1))
                    : 0;
                  cost += productCost;
                });
              }
              
              profitLossMap.get(dateString).cost += cost;
            }
          }
        });
      } else {
        // Yearly data for last 5 years
        const currentYear = new Date().getFullYear();
        const years = Array.from({ length: 5 }, (_, i) => (currentYear - 4 + i).toString());
        periods = years;
        
        // Initialize profit loss map for all years
        years.forEach(year => {
          profitLossMap.set(year, { revenue: 0, cost: 0, profit: 0, margin: 0 });
        });
        
        // Aggregate by year
        ordersData.forEach(order => {
          if (!order.createdAt) return;
          
          const year = order.createdAt.getFullYear().toString();
          if (years.includes(year)) {
            // Calculate revenue
            const revenue = order.total || 0;
            profitLossMap.get(year).revenue += revenue;
            
            // Calculate cost
            let cost = 0;
            if (order.items && Array.isArray(order.items)) {
              order.items.forEach(item => {
                const productCost = item.productId && productsMap.get(item.productId) 
                  ? (productsMap.get(item.productId).costPrice * (item.quantity || 1))
                  : 0;
                cost += productCost;
              });
            }
            
            profitLossMap.get(year).cost += cost;
          }
        });
      }
      
      // Calculate profit and margin for each period
      profitLossMap.forEach((data, period) => {
        data.profit = data.revenue - data.cost;
        data.margin = data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0;
      });
      
      // Convert to array for display
      const profitLossData = periods.map(period => ({
        period,
        revenue: profitLossMap.get(period).revenue,
        cost: profitLossMap.get(period).cost,
        profit: profitLossMap.get(period).profit,
        margin: profitLossMap.get(period).margin
      }));
      
      setProfitLossData(profitLossData);
      
    } catch (error) {
      console.error("Error generating profit/loss report:", error);
      toast.error("Failed to generate profit/loss report");
    }
  };

  const handleDownload = async () => {
    if (!chartRef.current) {
      toast.error("Chart not available for download");
      return;
    }
    
    try {
      toast.info("Generating PDF, please wait...");
      
      const chartElement = chartRef.current;
      
      // Use html2canvas to convert the chart to an image
      const canvas = await html2canvas(chartElement);
      const imgData = canvas.toDataURL('image/png');
      
      // Initialize jsPDF
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // Add title
      const title = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`;
      pdf.setFontSize(18);
      pdf.text(title, 15, 15);
      
      // Add date range or time frame info
      pdf.setFontSize(12);
      let dateInfo;
      
      if (useDateRange) {
        dateInfo = `Period: ${startDate} to ${endDate}`;
      } else {
        dateInfo = `Time Frame: ${timeFrame.charAt(0).toUpperCase() + timeFrame.slice(1)}`;
      }
      
      pdf.text(dateInfo, 15, 25);
      
      // Add generated date
      const generatedDate = `Generated: ${new Date().toLocaleDateString()}`;
      pdf.text(generatedDate, 15, 30);
      
      // Add chart image
      const imgWidth = 270;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 15, 40, imgWidth, imgHeight);
      
      // Add report-specific details
      if (reportType === 'category' && categorySalesData.length > 0) {
        let yPosition = 45 + imgHeight;
        pdf.text('Categories:', 15, yPosition);
        
        categorySalesData.forEach((category, index) => {
          yPosition += 7;
          pdf.text(`${category.name}: ₹${category.value.toFixed(2)}`, 20, yPosition);
        });
      } else if (reportType === 'sales' && salesData.length > 0) {
        let yPosition = 45 + imgHeight;
        pdf.text('Sales Data:', 15, yPosition);
        
        // Calculate total sales
        const totalSales = salesData.reduce((sum, item) => sum + item.sales, 0);
        yPosition += 7;
        pdf.text(`Total: ₹${totalSales.toFixed(2)}`, 20, yPosition);
        
        // Add individual period data
        salesData.forEach((period, index) => {
          yPosition += 7;
          if (yPosition > 180) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(`${period.name}: ₹${period.sales.toFixed(2)}`, 20, yPosition);
        });
      } else if (reportType === 'inventory' && inventoryData.length > 0) {
        let yPosition = 45 + imgHeight;
        pdf.text('Inventory Summary:', 15, yPosition);
        
        // Add inventory summary
        yPosition += 7;
        const totalItems = inventoryData.length;
        const lowStockItems = inventoryData.filter(item => item.lowStock).length;
        pdf.text(`Total Products: ${totalItems}`, 20, yPosition);
        
        yPosition += 7;
        pdf.text(`Low Stock Products: ${lowStockItems}`, 20, yPosition);
        
        // Add inventory details header
        yPosition += 10;
        pdf.text('Low Stock Items:', 15, yPosition);
        
        // Add low stock items details
        inventoryData.filter(item => item.lowStock).forEach((item, index) => {
          yPosition += 7;
          if (yPosition > 180) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(`${item.name} (${item.category}): ${item.stock} ${item.unit} left`, 20, yPosition);
        });
      }
      
      // Save the PDF
      const fileName = `${reportType}_report_${new Date().getTime()}.pdf`;
      pdf.save(fileName);
      
      toast.success("Report downloaded successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF report");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Reports">
        <div className="flex justify-center items-center h-40">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Reports">
      <div className="flex flex-col gap-6">
        {/* Report Controls */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                value={reportType}
                onValueChange={setReportType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Report Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales Overview</SelectItem>
                  <SelectItem value="category">Category Sales</SelectItem>
                  <SelectItem value="inventory">Inventory Report</SelectItem>
                  <SelectItem value="profit-loss">Profit & Loss</SelectItem>
                  <SelectItem value="sales-report">Invoice Report</SelectItem>
                  <SelectItem value="outstanding">Outstanding Invoices</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={timeFrame}
                onValueChange={setTimeFrame}
                disabled={useDateRange || reportType === "inventory"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Time Frame" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
              Download Report
            </Button>
          </div>
          
          {/* Date Range Controls */}
          {reportType !== "inventory" && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <input 
                  type="checkbox" 
                  id="useDateRange" 
                  checked={useDateRange} 
                  onChange={(e) => setUseDateRange(e.target.checked)} 
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="useDateRange" className="flex items-center gap-2 cursor-pointer">
                  <Calendar className="h-4 w-4" />
                  Use Custom Date Range
                </Label>
              </div>
              
              {useDateRange && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      max={endDate}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
        
        {/* Report Content */}
        {reportType === "sales" && (
          <Card>
            <CardHeader>
              <CardTitle>Sales Overview</CardTitle>
              <CardDescription>
                {useDateRange 
                  ? `Sales from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`
                  : timeFrame === "monthly" ? "Monthly sales for the current year" : 
                    timeFrame === "weekly" ? "Weekly sales for the current week" :
                    timeFrame === "daily" ? "Daily sales for the last 7 days" : "Yearly sales"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80" ref={chartRef}>
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    data={salesData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`₹${value}`, 'Sales']}
                    />
                    <Bar dataKey="sales" fill="#4A7C59" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
        
        {reportType === "category" && (
          <Card>
            <CardHeader>
              <CardTitle>Category Sales Distribution</CardTitle>
              <CardDescription>
                {useDateRange 
                  ? `Category sales from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`
                  : "Percentage of sales by product category"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80" ref={chartRef}>
                {categorySalesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={categorySalesData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categorySalesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`₹${value}`, '']} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No category data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Inventory Report (New Implementation) */}
        {reportType === "inventory" && (
          <Card>
            <CardHeader>
              <CardTitle>Inventory Status</CardTitle>
              <CardDescription>
                Current inventory levels and low stock alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div ref={chartRef} className="space-y-6">
                {/* Inventory Summary Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-muted/30 rounded-lg p-4 text-center">
                    <h3 className="text-xs text-muted-foreground mb-1">Total Products</h3>
                    <p className="text-2xl font-semibold">{inventoryData.length}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4 text-center">
                    <h3 className="text-xs text-muted-foreground mb-1">Low Stock Items</h3>
                    <p className="text-2xl font-semibold">{inventoryData.filter(item => item.lowStock).length}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4 text-center">
                    <h3 className="text-xs text-muted-foreground mb-1">Total Inventory Value</h3>
                    <p className="text-2xl font-semibold">
                      ₹{inventoryData.reduce((sum, item) => sum + (item.stock * item.costPrice), 0).toFixed(2)}
                    </p>
                  </div>
                </div>
                
                {/* Inventory Visualization - Stock by Category */}
                <div className="h-80">
                  {inventoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart
                        data={Object.entries(
                          inventoryData.reduce((acc, item) => {
                            if (!acc[item.category]) acc[item.category] = 0;
                            acc[item.category] += item.stock;
                            return acc;
                          }, {} as {[key: string]: number})
                        ).map(([category, stock]) => ({ 
                          category, 
                          stock 
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value} items`, 'Stock']} />
                        <Bar dataKey="stock" fill="#4A7C59" />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No inventory data available</p>
                    </div>
                  )}
                </div>
                
                {/* Low Stock Items Alert */}
                {inventoryData.filter(item => item.lowStock).length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex items-center gap-2 text-red-800 mb-2">
                      <AlertTriangle className="h-5 w-5" />
                      <h3 className="font-medium">Low Stock Items</h3>
                    </div>
                    <ul className="space-y-2">
                      {inventoryData
                        .filter(item => item.lowStock)
                        .map(item => (
                          <li key={item.id} className="flex justify-between items-center">
                            <span className="flex items-center gap-2">
                              <span className="font-medium">{item.name}</span>
                              <span className="text-xs text-muted-foreground">{item.category}</span>
                            </span>
                            <span className="font-medium text-red-600">{item.stock} {item.unit} left</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
                
                {/* Full Inventory Table */}
                <div className="border rounded-md mt-4">
                  <div className="p-4 border-b bg-muted/30">
                    <h3 className="font-medium">Full Inventory List</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/20">
                        <tr>
                          <th className="text-left p-3">Product Name</th>
                          <th className="text-left p-3">Category</th>
                          <th className="text-right p-3">Stock</th>
                          <th className="text-right p-3">Unit</th>
                          <th className="text-right p-3">Cost Price</th>
                          <th className="text-right p-3">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventoryData.map(item => (
                          <tr key={item.id} className="border-t">
                            <td className="p-3 font-medium">{item.name}</td>
                            <td className="p-3">{item.category}</td>
                            <td className={`p-3 text-right ${item.lowStock ? 'text-red-600 font-medium' : ''}`}>
                              {item.stock}
                            </td>
                            <td className="p-3 text-right">{item.unit}</td>
                            <td className="p-3 text-right">₹{item.costPrice.toFixed(2)}</td>
                            <td className="p-3 text-right">₹{(item.stock * item.costPrice).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Additional Report Insights */}
        {reportType !== "inventory" && reportType !== "profit-loss" && reportType !== "sales-report" && reportType !== "outstanding" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Top Selling Products</CardTitle>
              </CardHeader>
              <CardContent>
                {topSellingProducts.length > 0 ? (
                  <ul className="space-y-2">
                    {topSellingProducts.map((product, index) => (
                      <li key={index} className="flex justify-between items-center">
                        <span>{product.name}</span>
                        <span className="font-medium">₹{product.sales.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-center text-muted-foreground py-4">No product sales data available</p>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Customer Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex justify-between items-center">
                    <span>Total Customers</span>
                    <span className="font-medium">{customerInsights.totalCustomers}</span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span>New Customers (This Month)</span>
                    <span className="font-medium">{customerInsights.newCustomers}</span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span>Repeat Customers</span>
                    <span className="font-medium">{customerInsights.repeatCustomerPercentage.toFixed(0)}%</span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span>Average Order Value</span>
                    <span className="font-medium">₹{customerInsights.averageOrderValue.toFixed(2)}</span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span>Customer Growth</span>
                    <span className={`font-medium ${customerInsights.customerGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {customerInsights.customerGrowth >= 0 ? '+' : ''}{customerInsights.customerGrowth.toFixed(0)}%
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sales Report (Invoice List) */}
        {reportType === "sales-report" && (
          <Card>
            <CardHeader>
              <CardTitle>Invoice Report</CardTitle>
              <CardDescription>
                {useDateRange 
                  ? `Invoice details from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`
                  : "Recent invoices"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div ref={chartRef} className="space-y-4">
                {/* Sales Report Table */}
                <div className="border rounded-md overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/20">
                        <tr>
                          <th className="text-left p-3">Invoice #</th>
                          <th className="text-left p-3">Date</th>
                          <th className="text-left p-3">Customer</th>
                          <th className="text-left p-3">GST Number</th>
                          <th className="text-right p-3">Amount</th>
                          <th className="text-center p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesReportData.length > 0 ? (
                          salesReportData.map(invoice => (
                            <tr key={invoice.id} className="border-t">
                              <td className="p-3 font-medium">{invoice.invoiceNumber}</td>
                              <td className="p-3">{invoice.date.toLocaleDateString()}</td>
                              <td className="p-3">{invoice.customer}</td>
                              <td className="p-3">{invoice.gstNumber}</td>
                              <td className="p-3 text-right">₹{invoice.total.toFixed(2)}</td>
                              <td className="p-3 text-center">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  invoice.paid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {invoice.paid ? 'Paid' : 'Pending'}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="p-4 text-center text-muted-foreground">
                              No invoice data available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              
                {/* Sales Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-muted/30 rounded-lg p-4 text-center">
                    <h3 className="text-xs text-muted-foreground mb-1">Total Sales</h3>
                    <p className="text-2xl font-semibold">
                      ₹{salesReportData.reduce((sum, item) => sum + item.total, 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4 text-center">
                    <h3 className="text-xs text-muted-foreground mb-1">Total Invoices</h3>
                    <p className="text-2xl font-semibold">{salesReportData.length}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4 text-center">
                    <h3 className="text-xs text-muted-foreground mb-1">Paid Invoices</h3>
                    <p className="text-2xl font-semibold">
                      {salesReportData.filter(invoice => invoice.paid).length} 
                      <span className="text-sm text-muted-foreground ml-1">
                        ({salesReportData.length > 0 
                          ? Math.round((salesReportData.filter(invoice => invoice.paid).length / salesReportData.length) * 100) 
                          : 0}%)
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profit & Loss Report */}
        {reportType === "profit-loss" && (
          <Card>
            <CardHeader>
              <CardTitle>Profit & Loss Report</CardTitle>
              <CardDescription>
                {useDateRange 
                  ? `Financial analysis from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`
                  : timeFrame === "monthly" ? "Monthly P&L for the current year" : 
                    timeFrame === "weekly" ? "Weekly P&L for the current week" :
                    timeFrame === "daily" ? "Daily P&L for the last 7 days" : "Yearly P&L"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6" ref={chartRef}>
                {/* P&L Chart */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={profitLossData}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => [`₹${value}`, '']}
                      />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="#4A7C59" />
                      <Bar dataKey="cost" name="Cost" fill="#FF8042" />
                      <Bar dataKey="profit" name="Profit" fill="#0088FE" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
                
                {/* P&L Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-muted/30 rounded-lg p-4 text-center">
                    <h3 className="text-xs text-muted-foreground mb-1">Total Revenue</h3>
                    <p className="text-2xl font-semibold">
                      ₹{profitLossData.reduce((sum, item) => sum + item.revenue, 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4 text-center">
                    <h3 className="text-xs text-muted-foreground mb-1">Total Cost</h3>
                    <p className="text-2xl font-semibold">
                      ₹{profitLossData.reduce((sum, item) => sum + item.cost, 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4 text-center">
                    <h3 className="text-xs text-muted-foreground mb-1">Net Profit</h3>
                    <p className="text-2xl font-semibold">
                      ₹{profitLossData.reduce((sum, item) => sum + item.profit, 0).toFixed(2)}
                    </p>
                  </div>
                </div>
                
                {/* P&L Table */}
                <div className="border rounded-md overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/20">
                        <tr>
                          <th className="text-left p-3">Period</th>
                          <th className="text-right p-3">Revenue</th>
                          <th className="text-right p-3">Cost</th>
                          <th className="text-right p-3">Profit</th>
                          <th className="text-right p-3">Margin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profitLossData.map((item, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-3 font-medium">{item.period}</td>
                            <td className="p-3 text-right">₹{item.revenue.toFixed(2)}</td>
                            <td className="p-3 text-right">₹{item.cost.toFixed(2)}</td>
                            <td className="p-3 text-right">
                              <span className={item.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                ₹{item.profit.toFixed(2)}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <span className={item.margin >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {item.margin.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/10">
                        <tr className="border-t-2">
                          <td className="p-3 font-medium">Total</td>
                          <td className="p-3 text-right font-medium">
                            ₹{profitLossData.reduce((sum, item) => sum + item.revenue, 0).toFixed(2)}
                          </td>
                          <td className="p-3 text-right font-medium">
                            ₹{profitLossData.reduce((sum, item) => sum + item.cost, 0).toFixed(2)}
                          </td>
                          <td className="p-3 text-right font-medium">
                            <span className={profitLossData.reduce((sum, item) => sum + item.profit, 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                              ₹{profitLossData.reduce((sum, item) => sum + item.profit, 0).toFixed(2)}
                            </span>
                          </td>
                          <td className="p-3 text-right font-medium">
                            {profitLossData.reduce((sum, item) => sum + item.revenue, 0) > 0 ? (
                              <span className={profitLossData.reduce((sum, item) => sum + item.profit, 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {((profitLossData.reduce((sum, item) => sum + item.profit, 0) / profitLossData.reduce((sum, item) => sum + item.revenue, 0)) * 100).toFixed(1)}%
                              </span>
                            ) : (
                              <span>0.0%</span>
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Outstanding Report */}
        {reportType === "outstanding" && (
          <Card>
            <CardHeader>
              <CardTitle>Outstanding Invoices</CardTitle>
              <CardDescription>
                Unpaid and overdue invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div ref={chartRef} className="space-y-6">
                {/* Outstanding Summary Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-muted/30 rounded-lg p-4 text-center">
                    <h3 className="text-xs text-muted-foreground mb-1">Total Outstanding</h3>
                    <p className="text-2xl font-semibold">
                      ₹{outstandingData.reduce((sum, item) => sum + item.dueAmount, 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4 text-center">
                    <h3 className="text-xs text-muted-foreground mb-1">Overdue Invoices</h3>
                    <p className="text-2xl font-semibold">{outstandingData.filter(item => item.daysOverdue > 0).length}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4 text-center">
                    <h3 className="text-xs text-muted-foreground mb-1">Outstanding Today</h3>
                    <p className="text-2xl font-semibold">
                      ₹{outstandingData.filter(item => item.daysOverdue === 0).reduce((sum, item) => sum + item.dueAmount, 0).toFixed(2)}
                    </p>
                  </div>
                </div>
                
                {/* Outstanding by Aging */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={[
                          { 
                            name: 'Not Yet Due', 
                            value: outstandingData.filter(item => item.daysOverdue === 0).reduce((sum, item) => sum + item.dueAmount, 0)
                          },
                          { 
                            name: '1-30 Days', 
                            value: outstandingData.filter(item => item.daysOverdue > 0 && item.daysOverdue <= 30).reduce((sum, item) => sum + item.dueAmount, 0)
                          },
                          { 
                            name: '31-60 Days', 
                            value: outstandingData.filter(item => item.daysOverdue > 30 && item.daysOverdue <= 60).reduce((sum, item) => sum + item.dueAmount, 0)
                          },
                          { 
                            name: '61-90 Days', 
                            value: outstandingData.filter(item => item.daysOverdue > 60 && item.daysOverdue <= 90).reduce((sum, item) => sum + item.dueAmount, 0)
                          },
                          { 
                            name: 'Over 90 Days', 
                            value: outstandingData.filter(item => item.daysOverdue > 90).reduce((sum, item) => sum + item.dueAmount, 0)
                          }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[0, 1, 2, 3, 4].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`₹${value.toFixed(2)}`, '']} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Outstanding Table */}
                <div className="border rounded-md overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/20">
                        <tr>
                          <th className="text-left p-3">Invoice #</th>
                          <th className="text-left p-3">Date</th>
                          <th className="text-left p-3">Customer</th>
                          <th className="text-right p-3">Invoice Amount</th>
                          <th className="text-right p-3">Outstanding</th>
                          <th className="text-center p-3">Days Overdue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outstandingData.length > 0 ? (
                          outstandingData.map(invoice => (
                            <tr key={invoice.id} className="border-t">
                              <td className="p-3 font-medium">{invoice.invoiceNumber}</td>
                              <td className="p-3">{invoice.date.toLocaleDateString()}</td>
                              <td className="p-3">{invoice.customer}</td>
                              <td className="p-3 text-right">₹{invoice.total.toFixed(2)}</td>
                              <td className="p-3 text-right font-medium">₹{invoice.dueAmount.toFixed(2)}</td>
                              <td className="p-3 text-center">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  invoice.daysOverdue === 0 ? 'bg-green-100 text-green-800' : 
                                  invoice.daysOverdue <= 30 ? 'bg-yellow-100 text-yellow-800' : 
                                  invoice.daysOverdue <= 60 ? 'bg-orange-100 text-orange-800' : 
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {invoice.daysOverdue === 0 ? 'Not Due' : `${invoice.daysOverdue} days`}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="p-4 text-center text-muted-foreground">
                              No outstanding invoices
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Aging Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="border rounded-md p-4">
                    <h3 className="text-sm font-medium mb-2">Today's Outstanding</h3>
                    <p className="text-2xl font-semibold">
                      ₹{outstandingData.filter(item => item.daysOverdue === 0).reduce((sum, item) => sum + item.dueAmount, 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {outstandingData.filter(item => item.daysOverdue === 0).length} invoices
                    </p>
                  </div>
                  <div className="border rounded-md p-4">
                    <h3 className="text-sm font-medium mb-2">This Month's Outstanding</h3>
                    <p className="text-2xl font-semibold">
                      ₹{outstandingData.filter(item => {
                        const today = new Date();
                        const thisMonth = today.getMonth();
                        const thisYear = today.getFullYear();
                        return item.date.getMonth() === thisMonth && item.date.getFullYear() === thisYear;
                      }).reduce((sum, item) => sum + item.dueAmount, 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {outstandingData.filter(item => {
                        const today = new Date();
                        const thisMonth = today.getMonth();
                        const thisYear = today.getFullYear();
                        return item.date.getMonth() === thisMonth && item.date.getFullYear() === thisYear;
                      }).length} invoices
                    </p>
                  </div>
                  <div className="border rounded-md p-4">
                    <h3 className="text-sm font-medium mb-2">1-30 Days Overdue</h3>
                    <p className="text-2xl font-semibold">
                      ₹{outstandingData.filter(item => item.daysOverdue > 0 && item.daysOverdue <= 30).reduce((sum, item) => sum + item.dueAmount, 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {outstandingData.filter(item => item.daysOverdue > 0 && item.daysOverdue <= 30).length} invoices
                    </p>
                  </div>
                  <div className="border rounded-md p-4">
                    <h3 className="text-sm font-medium mb-2">Over 30 Days Overdue</h3>
                    <p className="text-2xl font-semibold text-red-600">
                      ₹{outstandingData.filter(item => item.daysOverdue > 30).reduce((sum, item) => sum + item.dueAmount, 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {outstandingData.filter(item => item.daysOverdue > 30).length} invoices
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Reports;
