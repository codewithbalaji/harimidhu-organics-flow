
import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { products } from "@/data/mockData";
import { Product, StockBatch } from "@/types";
import StockBatchManager from "@/components/products/StockBatchManager";

const EditProduct = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState<Omit<Product, "id" | "createdAt" | "stock_batches">>({
    name: "",
    description: "",
    price: 0,
    category: "",
    image: "",
  });
  const [stockBatches, setStockBatches] = useState<StockBatch[]>([]);
  
  useEffect(() => {
    // Find the product by ID
    const product = products.find(product => product.id === id);
    
    if (product) {
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        image: product.image,
      });
      
      // Convert legacy stock to stock batches if needed
      if (product.stock_batches) {
        setStockBatches(product.stock_batches);
      } else if (product.stock) {
        // Create a default batch for legacy data
        setStockBatches([{
          id: crypto.randomUUID(),
          quantity: product.stock,
          cost_price: product.price * 0.7, // Assuming 30% margin as fallback
          date_added: product.createdAt
        }]);
      }
    } else {
      toast.error("Product not found");
      navigate("/products");
    }
  }, [id, navigate]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "price" ? Number(value) : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name || !formData.price || !formData.category) {
      toast.error("Please fill all required fields");
      return;
    }
    
    // In a real application, you would make an API call here with the stockBatches data
    console.log("Updated product data:", { ...formData, stock_batches: stockBatches });
    
    toast.success("Product updated successfully!");
    navigate("/products");
  };

  // Get unique categories for the dropdown
  const categories = [...new Set(products.map((product) => product.category))];

  return (
    <DashboardLayout title="Edit Product">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <Link to="/products">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Products
            </Button>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Edit Product Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter product name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">
                    Selling Price (₹) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter price"
                    value={formData.price}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleSelectChange("category", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image">
                    Image URL <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="image"
                    name="image"
                    placeholder="Enter image URL"
                    value={formData.image}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">
                    Description <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Enter product description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stock Batch Manager */}
          <StockBatchManager 
            batches={stockBatches}
            onChange={setStockBatches}
          />

          <div className="flex justify-end">
            <Button type="submit" className="gap-2 bg-organic-primary hover:bg-organic-dark">
              <Save className="h-4 w-4" />
              Update Product
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default EditProduct;
