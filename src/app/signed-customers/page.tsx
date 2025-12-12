
"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Lead, Address } from '@/lib/types'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Loader } from '@/components/ui/loader'
import { Button } from '@/components/ui/button'
import { Building, Mail, MapPin, Phone, Star } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getLeadsFromFirebase } from '@/services/firebase'
import { Badge } from '@/components/ui/badge'

export default function SignedCustomersPage() {
  const [signedLeads, setSignedLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user, authLoading } = useAuth();
  const { toast } = useToast();

  const fetchSignedLeads = async () => {
    try {
      setLoading(true);
      const allLeads = await getLeadsFromFirebase({ summary: true });
      const wonLeads = allLeads.filter(lead => lead.status === 'Won');
      setSignedLeads(wonLeads);
    } catch (error) {
      console.error("Failed to fetch signed customers:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch signed customers.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/signin');
      return;
    }
    if (authLoading) return;
    
    fetchSignedLeads();

  }, [user, authLoading, router, toast]);

  const formatAddress = (address?: Address) => {
    if (!address) return 'N/A';
    return [address.street, address.city, address.state, address.zip].filter(Boolean).join(', ');
  }

  if (loading || authLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Signed Customers</h1>
        <p className="text-muted-foreground">A list of all your won accounts.</p>
      </header>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  <span>All Signed Customers</span>
                </CardTitle>
                <Badge variant="secondary">{signedLeads.length} customer(s)</Badge>
            </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Franchisee</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center"><Loader /></TableCell>
                  </TableRow>
                ) : signedLeads.length > 0 ? (
                  signedLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                         <Button variant="link" className="p-0 h-auto flex items-center gap-2 text-left" onClick={() => window.open(`/leads/${lead.id}`, '_blank')}>
                            <Building className="h-4 w-4" />
                            {lead.companyName}
                        </Button>
                      </TableCell>
                      <TableCell>
                        {lead.franchisee || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{formatAddress(lead.address)}</span>
                        </div>
                      </TableCell>
                       <TableCell>
                        <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{lead.customerServiceEmail || 'N/A'}</span>
                        </div>
                       </TableCell>
                       <TableCell>
                        <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{lead.customerPhone || 'N/A'}</span>
                        </div>
                       </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                          No signed customers found.
                      </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
