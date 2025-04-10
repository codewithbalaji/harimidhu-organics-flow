
import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Download, Eye, FileText, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Mock data for invoices
const mockInvoices = [
  {
    id: "INV-001",
    orderId: "ORD-001",
    customerName: "Rahul Sharma",
    total: 1250.75,
    paidStatus: "paid",
    createdAt: "2025-04-05T10:30:00Z",
  },
  {
    id: "INV-002",
    orderId: "ORD-003",
    customerName: "Priya Patel",
    total: 875.50,
    paidStatus: "paid",
    createdAt: "2025-04-03T14:15:00Z",
  },
  {
    id: "INV-003",
    orderId: "ORD-005",
    customerName: "Ajay Singh",
    total: 2340.25,
    paidStatus: "unpaid",
    createdAt: "2025-04-01T09:45:00Z",
  },
  {
    id: "INV-004",
    orderId: "ORD-007",
    customerName: "Sunita Desai",
    total: 950.00,
    paidStatus: "paid",
    createdAt: "2025-03-29T16:20:00Z",
  },
  {
    id: "INV-005",
    orderId: "ORD-008",
    customerName: "Vikram Gupta",
    total: 1780.60,
    paidStatus: "unpaid",
    createdAt: "2025-03-25T11:10:00Z",
  },
];

const Invoices = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [filteredInvoices, setFilteredInvoices] = useState(mockInvoices);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    filterInvoices(query, statusFilter);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    filterInvoices(searchQuery, value);
  };

  const filterInvoices = (query: string, status: string) => {
    let filtered = [...mockInvoices];
    
    // Apply search filter
    if (query.trim() !== "") {
      filtered = filtered.filter(
        invoice =>
          invoice.customerName.toLowerCase().includes(query) ||
          invoice.id.toLowerCase().includes(query) ||
          invoice.orderId.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (status !== "all") {
      filtered = filtered.filter(invoice => invoice.paidStatus === status);
    }
    
    setFilteredInvoices(filtered);
  };

  return (
    <DashboardLayout title="Invoices">
      <div className="flex flex-col gap-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              className="pl-9"
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
          
          <div className="flex gap-4">
            <Select
              value={statusFilter}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Invoices Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>All Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredInvoices.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice ID</TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.id}</TableCell>
                        <TableCell>{invoice.orderId}</TableCell>
                        <TableCell>{invoice.customerName}</TableCell>
                        <TableCell>{format(new Date(invoice.createdAt), "dd MMM yyyy")}</TableCell>
                        <TableCell>₹{invoice.total.toFixed(2)}</TableCell>
                        <TableCell>
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            invoice.paidStatus === "paid" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-red-100 text-red-800"
                          )}>
                            {invoice.paidStatus === "paid" ? "Paid" : "Unpaid"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View</span>
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                              <Download className="h-4 w-4" />
                              <span className="sr-only">Download</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-10">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">No invoices found matching your criteria.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Invoices;
