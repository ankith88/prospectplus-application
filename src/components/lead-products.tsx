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
import { Package, Send, Clipboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductQuoteDialog } from './product-quote-dialog';
import { Lead } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface LeadProductsProps {
  lead?: Lead;
  onSendQuote?: () => void;
}

export function LeadProducts({ lead, onSendQuote }: LeadProductsProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricePlan, setPricePlan] = useState('Premium Merchant');
  const [availablePricePlans, setAvailablePricePlans] = useState<string[]>(['Premium Merchant', 'Standard', 'Enterprise']);
  const [surchargeRates, setSurchargeRates] = useState<{express: number, premium: number} | null>(null);
  
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSurcharge = async () => {
      try {
        const res = await fetch('/api/surcharge');
        const data = await res.json();
        if (data && !data.error) {
          setSurchargeRates(data);
        }
      } catch (error) {
        console.error("Error fetching surcharge rates:", error);
      }
    };
    fetchSurcharge();

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

  const sortProductsByWeight = (prods: any[]) => {
    return [...prods].sort((a, b) => {
      const parseWeight = (p: any) => {
        const weightStr = String(p.productWeight || p.weightRange || p.weight || '');
        const match = weightStr.match(/(\d+(?:\.\d+)?)\s*kg/i);
        return match ? parseFloat(match[1]) : 999;
      };
      return parseWeight(a) - parseWeight(b);
    });
  };

  const filteredProducts = sortProductsByWeight(products.filter(p => p.pricePlan === pricePlan));

  const getSurchargeRate = (speed: string) => {
    if (!surchargeRates || !speed) return 0;
    const lowerSpeed = speed.toLowerCase();
    if (lowerSpeed === 'premium') return surchargeRates.premium;
    if (lowerSpeed === 'express') return surchargeRates.express;
    return 0;
  };

  const copyTableToClipboard = async () => {
    try {
      const htmlTable = `
        <table style="border-collapse: collapse; width: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #333333; max-width: 800px;">
          <thead>
            <tr style="background-color: #f3f4f6; color: #111111; border-bottom: 2px solid #e5e7eb;">
              <th style="border: 1px solid #e5e7eb; text-align: left; padding: 10px; font-weight: bold;">Name</th>
              <th style="border: 1px solid #e5e7eb; text-align: left; padding: 10px; font-weight: bold;">Carrier</th>
              <th style="border: 1px solid #e5e7eb; text-align: left; padding: 10px; font-weight: bold;">Speed</th>
              <th style="border: 1px solid #e5e7eb; text-align: left; padding: 10px; font-weight: bold;">Weight</th>
              <th style="border: 1px solid #e5e7eb; text-align: right; padding: 10px; font-weight: bold;">Fuel Surcharge</th>
              <th style="border: 1px solid #e5e7eb; text-align: right; padding: 10px; font-weight: bold;">Price (Inc. GST)</th>
              <th style="border: 1px solid #e5e7eb; text-align: right; padding: 10px; font-weight: bold;">Total (Inc. Fuel Surcharge & GST)</th>
            </tr>
          </thead>
          <tbody>
            ${filteredProducts.map(p => {
              const basePrice = Number(p.salesPriceIncGst || Number(p.salesPriceExcGst || 0) * 1.1);
              const surchargePerc = getSurchargeRate(p.deliverySpeed);
              const surchargeAmt = basePrice * (surchargePerc / 100);
              const totalVal = basePrice + surchargeAmt;
              const surchargeText = surchargePerc === 0 ? '-' : `$${surchargeAmt.toFixed(2)} (${surchargePerc}%)`;
              return `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">${p.name || p.id}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">${p.carrier || '-'}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">${p.deliverySpeed || '-'}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">${p.productWeight || '-'}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">${surchargeText}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">$${basePrice.toFixed(2)}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right; font-weight: bold;">$${totalVal.toFixed(2)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;

      const plainText = filteredProducts.map(p => {
        const basePrice = Number(p.salesPriceIncGst || Number(p.salesPriceExcGst || 0) * 1.1);
        const surchargePerc = getSurchargeRate(p.deliverySpeed);
        const surchargeAmt = basePrice * (surchargePerc / 100);
        const totalVal = basePrice + surchargeAmt;
        const surchargeText = surchargePerc === 0 ? '-' : `$${surchargeAmt.toFixed(2)} (${surchargePerc}%)`;
        return `${p.name || p.id}\t${p.carrier || '-'}\t${p.deliverySpeed || '-'}\t${p.productWeight || '-'}\t${surchargeText}\t$${basePrice.toFixed(2)}\t$${totalVal.toFixed(2)}`;
      }).join('\n');

      const headerText = "Name\tCarrier\tSpeed\tWeight\tFuel Surcharge\tPrice (Inc. GST)\tTotal (Inc. Fuel Surcharge & GST)\n";
      const fullText = headerText + plainText;

      const blobHtml = new Blob([htmlTable], { type: 'text/html' });
      const blobText = new Blob([fullText], { type: 'text/plain' });

      const data = [new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText
      })];

      await navigator.clipboard.write(data);
      toast({
        title: 'Table Copied',
        description: 'The pricing table has been copied to your clipboard in email-friendly format.',
      });
    } catch (err) {
      console.error('Failed to copy table: ', err);
      toast({
        variant: 'destructive',
        title: 'Copy Failed',
        description: 'Could not copy pricing table to clipboard.',
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2 text-xl font-bold">
          <Package className="w-6 h-6 text-muted-foreground" />
          Premium Products Pricing
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copyTableToClipboard}
            className="gap-2"
            disabled={loading || filteredProducts.length === 0}
          >
            <Clipboard className="h-4 w-4" />
            Copy Table
          </Button>
          {lead && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSendQuote ? onSendQuote() : setIsQuoteDialogOpen(true)}
              className="gap-2"
              disabled={loading || filteredProducts.length === 0}
            >
              <Send className="h-4 w-4" />
              Send Quote
            </Button>
          )}
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
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader /></div>
        ) : filteredProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No products found for {pricePlan} plan.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Speed</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead className="text-right">Fuel Surcharge</TableHead>
                  <TableHead className="text-right">Price (Inc. GST)</TableHead>
                  <TableHead className="text-right">Total (Inc. Fuel Surcharge & GST)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map(product => {
                  const basePrice = Number(product.salesPriceIncGst || Number(product.salesPriceExcGst || 0) * 1.1);
                  const surchargePerc = getSurchargeRate(product.deliverySpeed);
                  const surchargeAmt = basePrice * (surchargePerc / 100);
                  const totalVal = basePrice + surchargeAmt;
                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name || product.id}</TableCell>
                      <TableCell>{product.carrier || '-'}</TableCell>
                      <TableCell>{product.deliverySpeed || '-'}</TableCell>
                      <TableCell>{product.productWeight || '-'}</TableCell>
                      <TableCell className="text-right">
                        {surchargePerc !== null ? (
                          surchargePerc === 0 ? '-' : `$${surchargeAmt.toFixed(2)} (${surchargePerc}%)`
                        ) : (
                          <span className="text-xs text-muted-foreground animate-pulse">Loading...</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">${basePrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold">
                        {surchargePerc !== null ? (
                          `$${totalVal.toFixed(2)}`
                        ) : (
                          <span className="text-xs text-muted-foreground animate-pulse">Loading...</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {lead && !onSendQuote && (
        <ProductQuoteDialog
          isOpen={isQuoteDialogOpen}
          onClose={() => setIsQuoteDialogOpen(false)}
          lead={lead}
          products={filteredProducts}
          surchargeRates={surchargeRates}
        />
      )}
    </Card>
  );
}
