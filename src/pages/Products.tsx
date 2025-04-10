
import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, MoreHorizontal, Edit, Trash2, AlertTriangle } from "lucide-react";
import { products } from "@/data/mockData";
import { Link } from "react-router-dom";
import { Product } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const Products = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(products);

  // Get unique categories
  const categories = ["all", ...new Set(products.map((product) => product.category))];

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    filterProducts(query, categoryFilter);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    filterProducts(searchQuery, value);
  };

  const filterProducts = (query: string, category: string) => {
    let filtered = [...products];
    
    // Apply search filter
    if (query.trim() !== "") {
      filtered = filtered.filter(
        product =>
          product.name.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query)
      );
    }
    
    // Apply category filter
    if (category !== "all") {
      filtered = filtered.filter(product => product.category === category);
    }
    
    setFilteredProducts(filtered);
  };

  return (
    <DashboardLayout title="Products">
      <div className="flex flex-col gap-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="pl-9"
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <Select
              value={categoryFilter}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category === "all" ? "All Categories" : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Link to="/products/new">
              <Button className="w-full sm:w-auto gap-1 bg-organic-primary hover:bg-organic-dark">
                <Plus className="h-4 w-4" />
                Add New Product
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Products Grid */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>All Products</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No products found matching your criteria.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

const ProductCard = ({ product }: { product: Product }) => {
  const isLowStock = product.stock <= 10;
  
  const handleDelete = () => {
    // In a real application, this would be an API call
    toast.success(`Product "${product.name}" deleted successfully`);
  };
  
  return (
    <div className="group flex flex-col border rounded-lg overflow-hidden transition-all hover:shadow-md">
      <div className="relative h-48 bg-muted">
        <img
          src={product.image}
          alt={product.name}
          className="object-cover w-full h-full"
        />
        {isLowStock && (
          <div className="absolute top-2 right-2 bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Low Stock
          </div>
        )}
      </div>
      
      <div className="flex-1 p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-medium text-lg">{product.name}</h3>
          <span className="text-organic-primary font-semibold">₹{product.price}</span>
        </div>
        
        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{product.description}</p>
        
        <div className="flex justify-between items-center">
          <span className={cn(
            "text-xs px-2 py-1 rounded-full",
            product.category === "Fruits" && "bg-orange-100 text-orange-800",
            product.category === "Vegetables" && "bg-green-100 text-green-800",
            product.category === "Oils" && "bg-yellow-100 text-yellow-800",
            product.category === "Grains" && "bg-amber-100 text-amber-800",
            product.category === "Sweeteners" && "bg-purple-100 text-purple-800",
          )}>
            {product.category}
          </span>
          
          <span className={cn(
            "text-xs font-medium",
            isLowStock ? "text-red-600" : "text-muted-foreground"
          )}>
            Stock: {product.stock}
          </span>
        </div>
      </div>
      
      <div className="border-t p-3 flex justify-between">
        <Link to={`/products/edit/${product.id}`}>
          <Button variant="outline" size="sm" className="gap-1">
            <Edit className="h-4 w-4" />
            Edit
          </Button>
        </Link>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1 text-destructive border-destructive hover:bg-destructive/10"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>
  );
};

export default Products;
