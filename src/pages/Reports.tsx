import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart, PieChart, Download, BarChartIcon, PieChartIcon } from "lucide-react";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart as RechartsPieChart, Pie, Cell, Legend } from 'recharts';
import { toast } from "sonner";
import { collection, getDocs, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db, customersCollection, productsCollection, ordersCollection } from '@/firebase';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#4A7C59'];

const Reports = () => {
  const [reportType, setReportType] = useState("sales");
  const [timeFrame, setTimeFrame] = useState("monthly");
  const [isLoading, setIsLoading] = useState(true);
  const [salesData, setSalesData] = useState<{ name: string; sales: number }[]>([]);
  const [categorySalesData, setCategorySalesData] = useState<{ name: string; value: number }[]>([]);
  const [topSellingProducts, setTopSellingProducts] = useState<{ name: string; sales: number }[]>([]);
  const [customerInsights, setCustomerInsights] = useState({
    totalCustomers: 0,
    newCustomers: 0,
    repeatCustomerPercentage: 0,
    averageOrderValue: 0,
    customerGrowth: 0
  });

  useEffect(() => {
    fetchReportData();
  }, [reportType, timeFrame]);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch orders data
      const ordersSnapshot = await getDocs(ordersCollection);
      const ordersData = ordersSnapshot.docs.map(doc => {
        const data = doc.data();
        // Normalize createdAt to Date object
        let createdAt;
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
      
    } catch (error) {
      console.error("Error fetching report data:", error);
      toast.error("Failed to load report data");
    } finally {
      setIsLoading(false);
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

  const handleDownload = () => {
    toast.success("Report download initiated");
    // In a real app, this would trigger a download of the report
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
                <SelectItem value="sales">Sales Report</SelectItem>
                <SelectItem value="category">Category Sales</SelectItem>
                <SelectItem value="inventory">Inventory Report</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={timeFrame}
              onValueChange={setTimeFrame}
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
        
        {/* Report Content */}
        {reportType === "sales" && (
          <Card>
            <CardHeader>
              <CardTitle>Sales Overview</CardTitle>
              <CardDescription>
                {timeFrame === "monthly" ? "Monthly sales for the current year" : 
                 timeFrame === "weekly" ? "Weekly sales for the current month" :
                 timeFrame === "daily" ? "Daily sales for the current week" : "Yearly sales"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
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
                Percentage of sales by product category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
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
        
        {reportType === "inventory" && (
          <Card>
            <CardHeader>
              <CardTitle>Inventory Status</CardTitle>
              <CardDescription>
                Current inventory levels and low stock alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-10">
              <BarChartIcon className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">Inventory report will be available soon.</p>
            </CardContent>
          </Card>
        )}
        
        {/* Additional Report Insights */}
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
      </div>
    </DashboardLayout>
  );
};

export default Reports;
