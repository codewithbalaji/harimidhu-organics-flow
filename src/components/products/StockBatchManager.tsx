import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusCircle, Trash2 } from "lucide-react";
import { StockBatch } from "@/types";
import { toast } from "sonner";

interface StockBatchManagerProps {
  batches: StockBatch[];
  onChange: (batches: StockBatch[]) => void;
}

const StockBatchManager = ({ batches, onChange }: StockBatchManagerProps) => {
  const [newBatch, setNewBatch] = useState<Omit<StockBatch, "id" | "date_added">>({
    quantity: 0,
    cost_price: 0,
  });

  const totalStock = batches.reduce((sum, batch) => sum + batch.quantity, 0);

  const handleAddBatch = () => {
    if (newBatch.quantity <= 0 || newBatch.cost_price <= 0) {
      toast.error("Please enter valid quantity and cost price");
      return;
    }

    const newBatchWithId: StockBatch = {
      id: crypto.randomUUID(),
      quantity: newBatch.quantity,
      cost_price: newBatch.cost_price,
      date_added: new Date().toISOString(),
    };

    onChange([newBatchWithId, ...batches]);
    setNewBatch({ quantity: 0, cost_price: 0 });
  };

  const handleRemoveBatch = (id: string) => {
    onChange(batches.filter(batch => batch.id !== id));
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setNewBatch(prev => ({
      ...prev,
      quantity: isNaN(value) ? 0 : value
    }));
  };

  const handleCostPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setNewBatch(prev => ({
      ...prev,
      cost_price: isNaN(value) ? 0 : value
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between">
          <span>Stock Batches</span>
          <span className="text-sm font-normal text-muted-foreground">
            Total Stock: {totalStock}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={newBatch.quantity || ''}
              onChange={handleQuantityChange}
              placeholder="Enter quantity"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cost_price">Cost Price (₹)</Label>
            <Input
              id="cost_price"
              type="number"
              min="0.01"
              step="0.01"
              value={newBatch.cost_price || ''}
              onChange={handleCostPriceChange}
              placeholder="Enter cost price"
            />
          </div>
          <Button 
            onClick={handleAddBatch}
            className="bg-organic-primary hover:bg-organic-dark gap-2"
            disabled={newBatch.quantity <= 0 || newBatch.cost_price <= 0}
          >
            <PlusCircle className="h-4 w-4" />
            Add Batch
          </Button>
        </div>

        {batches.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date Added</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Cost Price (₹)</TableHead>
                <TableHead className="text-right">Total Cost (₹)</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell>
                    {new Date(batch.date_added).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">{batch.quantity}</TableCell>
                  <TableCell className="text-right">₹{batch.cost_price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    ₹{(batch.quantity * batch.cost_price).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveBatch(batch.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-6 border rounded-md bg-muted/50">
            <p className="text-muted-foreground">No stock batches added yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StockBatchManager;
