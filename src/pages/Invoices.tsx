import { useState, useEffect } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Download, Eye, FileText, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Invoice } from "@/types";
import { toast } from "sonner";
import { invoicesCollection } from "@/firebase";
import { getDocs, query, orderBy, where } from "firebase/firestore";
import { generateInvoicePdf } from "@/utils/pdfUtils";

const Invoices = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    // Check if there's an orderId in the URL parameters to generate an invoice
    const orderId = searchParams.get("orderId");
    if (orderId) {
      generateInvoiceForOrder(orderId);
    }
  }, [searchParams]);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      const invoicesQuery = query(invoicesCollection, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(invoicesQuery);
      
      const invoicesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Invoice[];
      
      setInvoices(invoicesData);
      setFilteredInvoices(invoicesData);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to fetch invoices");
    } finally {
      setIsLoading(false);
    }
  };

  const generateInvoiceForOrder = async (orderId: string) => {
    // Check if invoice already exists for this order
    const existingInvoice = invoices.find(invoice => invoice.orderId === orderId);
    if (existingInvoice) {
      navigate(`/invoices/${existingInvoice.id}`);
      return;
    }

    // If not, navigate to invoice creation page
    navigate(`/invoices/generate/${orderId}`);
  };

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
    let filtered = [...invoices];
    
    // Apply search filter
    if (query.trim() !== "") {
      filtered = filtered.filter(
        invoice =>
          (invoice.customerName && invoice.customerName.toLowerCase().includes(query)) ||
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

  const handleViewInvoice = (invoiceId: string) => {
    navigate(`/invoices/${invoiceId}`);
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      // Generate and download the PDF
      const doc = await generateInvoicePdf(invoice);
      
      // Save the PDF with the invoice ID
      doc.save(`Invoice-${invoice.id.slice(0, 6)}.pdf`);
      
      toast.success(`Invoice downloaded successfully!`);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Invoices">
        <div className="flex justify-center items-center h-40">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

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
                <SelectItem value="partially_paid">Partially Paid</SelectItem>
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
                              : invoice.paidStatus === "partially_paid"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          )}>
                            {invoice.paidStatus === "paid" 
                              ? "Paid" 
                              : invoice.paidStatus === "partially_paid" 
                                ? "Partially Paid" 
                                : "Unpaid"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                className="flex items-center gap-2 cursor-pointer"
                                onClick={() => handleViewInvoice(invoice.id)}
                              >
                                <Eye className="h-4 w-4" />
                                View Invoice
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="flex items-center gap-2 cursor-pointer"
                                onClick={() => handleDownloadInvoice(invoice)}
                              >
                                <Download className="h-4 w-4" />
                                Download PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="flex items-center gap-2 cursor-pointer"
                                onClick={() => navigate(`/invoices/status/${invoice.id}`)}
                              >
                                <FileText className="h-4 w-4" />
                                Update Status
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
