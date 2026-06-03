'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader } from '@/components/ui/loader';
import { Package } from 'lucide-react';

export function LeadProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricePlan, setPricePlan] = useState('Premium Merchant');
  const [availablePricePlans, setAvailablePricePlans] = useState<string[]>(['Premium Merchant', 'Standard', 'Enterprise']);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(firestore, 'products'),
          where('deliverySpeed', '==', 'Premium'),
          where('isActive', '==', true)
        );
        const snapshot = await getDocs(q);
        const fetchedProducts = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        
        // Extract unique price plans if we want to populate the dropdown dynamically
        const plans = new Set<string>();
        fetchedProducts.forEach(p => {
            if (p.pricePlan) plans.add(p.pricePlan);
        });
        if (plans.size > 0) {
            setAvailablePricePlans(Array.from(plans));
            if (!plans.has('Premium Merchant')) {
                // If Premium Merchant is not in the list but was requested by default, ensure it's there
                setAvailablePricePlans(prev => ['Premium Merchant', ...prev]);
            }
        }
        
        setProducts(fetchedProducts);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(p => p.pricePlan === pricePlan);

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-xl font-bold">
          <Package className="w-6 h-6 text-muted-foreground" />
          Premium Products Pricing
        </CardTitle>
        <Select value={pricePlan} onValueChange={setPricePlan}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Price Plan" />
          </SelectTrigger>
          <SelectContent>
            {availablePricePlans.map(plan => (
              <SelectItem key={plan} value={plan}>{plan}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader /></div>
        ) : filteredProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No products found for {pricePlan} plan.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Speed</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead className="text-right">Price (Exc. GST)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map(product => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name || product.id}</TableCell>
                    <TableCell>{product.carrier || '-'}</TableCell>
                    <TableCell>{product.deliverySpeed || '-'}</TableCell>
                    <TableCell>{product.productWeight || '-'}</TableCell>
                    <TableCell className="text-right">${Number(product.salesPriceExcGst || 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
