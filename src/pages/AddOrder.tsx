
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { customers, products } from "@/data/mockData";
import { OrderItem } from "@/types";

const AddOrder = () => {
  const navigate = useNavigate();
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  
  // Calculate total
  const total = items.reduce((sum, item) => sum + item.total, 0);

  const handleAddItem = () => {
    if (!selectedProduct || quantity <= 0) {
      toast.error("Please select a product and valid quantity");
      return;
    }

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    // Check if product already in items
    const existingItem = items.find(item => item.productId === selectedProduct);
    
    if (existingItem) {
      // Update quantity of existing item
      setItems(items.map(item => 
        item.productId === selectedProduct 
          ? { 
              ...item, 
              quantity: item.quantity + quantity,
              total: (item.quantity + quantity) * item.unitPrice
            } 
          : item
      ));
    } else {
      // Add new item
      const newItem: OrderItem = {
        productId: product.id,
        productName: product.name,
        quantity: quantity,
        unitPrice: product.price,
        total: quantity * product.price
      };
      
      setItems([...items, newItem]);
    }
    
    // Reset selection
    setSelectedProduct("");
    setQuantity(1);
  };

  const handleRemoveItem = (productId: string) => {
    setItems(items.filter(item => item.productId !== productId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }
    
    if (items.length === 0) {
      toast.error("Please add at least one product to the order");
      return;
    }
    
    // In a real application, you would make an API call here
    // For now, let's just show a success message and redirect
    toast.success("Order created successfully!");
    navigate("/orders");
  };

  return (
    <DashboardLayout title="Create New Order">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <Link to="/orders">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Orders
            </Button>
          </Link>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Customer Selection */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer">
                      Select Customer <span className="text-destructive">*</span>
                    </Label>
                    <Select 
                      value={customerId}
                      onValueChange={setCustomerId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map(customer => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {customerId && (
                    <div className="rounded-md border p-4 mt-4">
                      <h3 className="font-medium mb-2">Selected Customer:</h3>
                      {(() => {
                        const customer = customers.find(c => c.id === customerId);
                        return customer ? (
                          <div className="space-y-1 text-sm">
                            <p><span className="font-medium">Name:</span> {customer.name}</p>
                            <p><span className="font-medium">Email:</span> {customer.email}</p>
                            <p><span className="font-medium">Phone:</span> {customer.phone}</p>
                            <p><span className="font-medium">Address:</span> {customer.address}</p>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Add Product Form */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Select 
                        value={selectedProduct}
                        onValueChange={setSelectedProduct}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map(product => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - ₹{product.price}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="w-full sm:w-24">
                      <Input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        placeholder="Qty"
                      />
                    </div>
                    
                    <Button 
                      type="button" 
                      onClick={handleAddItem}
                      className="gap-2 bg-organic-primary hover:bg-organic-dark"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                  
                  {/* Items Table */}
                  {items.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.productId}>
                            <TableCell>{item.productName}</TableCell>
                            <TableCell className="text-right">₹{item.unitPrice.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right font-medium">₹{item.total.toFixed(2)}</TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(item.productId)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-10 border rounded-md bg-muted/50">
                      <p className="text-muted-foreground">No items added to this order yet.</p>
                    </div>
                  )}
                  
                  {/* Order Summary */}
                  {items.length > 0 && (
                    <div className="flex flex-col gap-2 items-end pt-4 border-t">
                      <div className="text-lg font-semibold flex justify-between w-full max-w-xs">
                        <span>Total:</span>
                        <span>₹{total.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Submit Button */}
          <div className="flex justify-end mt-6">
            <Button 
              type="submit" 
              size="lg"
              className="gap-2 bg-organic-primary hover:bg-organic-dark"
              disabled={!customerId || items.length === 0}
            >
              <Save className="h-4 w-4" />
              Create Order
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default AddOrder;
