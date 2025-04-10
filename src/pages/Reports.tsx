
import { useState } from "react";
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

// Mock data for sales report
const monthlySalesData = [
  { name: 'Jan', sales: 12500 },
  { name: 'Feb', sales: 14250 },
  { name: 'Mar', sales: 15800 },
  { name: 'Apr', sales: 16900 },
  { name: 'May', sales: 16200 },
  { name: 'Jun', sales: 17500 },
];

// Mock data for product category sales
const categorySalesData = [
  { name: 'Fruits', value: 35 },
  { name: 'Vegetables', value: 40 },
  { name: 'Oils', value: 15 },
  { name: 'Grains', value: 10 },
];

// Colors for pie chart
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const Reports = () => {
  const [reportType, setReportType] = useState("sales");
  const [timeFrame, setTimeFrame] = useState("monthly");

  const handleDownload = () => {
    toast.success("Report download initiated");
    // In a real app, this would trigger a download of the report
  };

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
                    data={monthlySalesData}
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
                    <Bar dataKey="sales" fill="#8884d8" />
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
                    <Tooltip />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
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
              <ul className="space-y-2">
                <li className="flex justify-between items-center">
                  <span>Organic Basmati Rice</span>
                  <span className="font-medium">₹23,500</span>
                </li>
                <li className="flex justify-between items-center">
                  <span>Cold-Pressed Coconut Oil</span>
                  <span className="font-medium">₹19,250</span>
                </li>
                <li className="flex justify-between items-center">
                  <span>Raw Honey</span>
                  <span className="font-medium">₹15,800</span>
                </li>
                <li className="flex justify-between items-center">
                  <span>Organic Cashews</span>
                  <span className="font-medium">₹12,600</span>
                </li>
                <li className="flex justify-between items-center">
                  <span>Fresh Avocados</span>
                  <span className="font-medium">₹10,900</span>
                </li>
              </ul>
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
                  <span className="font-medium">128</span>
                </li>
                <li className="flex justify-between items-center">
                  <span>New Customers (This Month)</span>
                  <span className="font-medium">15</span>
                </li>
                <li className="flex justify-between items-center">
                  <span>Repeat Customers</span>
                  <span className="font-medium">78%</span>
                </li>
                <li className="flex justify-between items-center">
                  <span>Average Order Value</span>
                  <span className="font-medium">₹1,250</span>
                </li>
                <li className="flex justify-between items-center">
                  <span>Customer Growth</span>
                  <span className="font-medium text-green-600">+12%</span>
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
