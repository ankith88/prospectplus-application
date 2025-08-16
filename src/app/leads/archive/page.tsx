
"use client"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
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
import { getLeadsTool } from '@/ai/flows/get-leads-tool'
import { LeadStatusBadge } from '@/components/lead-status-badge'
import type { Lead } from '@/lib/types'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Loader } from '@/components/ui/loader'
import { MapModal } from '@/components/map-modal'
import { MapPin, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

type SortableLeadKeys = 'companyName' | 'status' | 'franchisee' | 'salesRepAssigned' | 'industryCategory';

export default function ArchivedLeadsPage() {
  const [archivedLeads, setArchivedLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortableLeadKeys; direction: 'ascending' | 'descending' } | null>(null);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    async function getArchivedLeads() {
      if (!user && !authLoading) {
        router.push('/signin');
        return;
      }
      if (authLoading) return;

      try {
        setLoading(true);
        const allLeads = await getLeadsTool({ summary: true });
        const filteredLeads = allLeads.filter(lead => 
            lead.status === 'Lost' || 
            lead.status === 'Qualified' || 
            lead.status === 'Won' || 
            lead.status === 'Unqualified'
        );
        setArchivedLeads(filteredLeads);
      } catch (error) {
        console.error("Failed to fetch leads:", error);
      } finally {
        setLoading(false);
      }
    }
    getArchivedLeads();
  }, [user, authLoading, router]);

  const sortedLeads = useMemo(() => {
    let sortableItems = [...archivedLeads];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [archivedLeads, sortConfig]);

  const requestSort = (key: SortableLeadKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: SortableLeadKeys) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-50" />;
    }
    return sortConfig.direction === 'ascending' ? '▲' : '▼';
  };

  const formatAddress = (address: Lead['address']) => {
    if (!address) return 'N/A';
    return [address.street, address.city, address.state, address.zip, address.country].filter(Boolean).join(', ');
  }

  if (loading || authLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  return (
    <>
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Archived Leads</h1>
        <p className="text-muted-foreground">View your qualified and lost leads.</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Processed Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[280px]">
                    <Button variant="ghost" onClick={() => requestSort('companyName')} className="group -ml-4">
                      Company
                      {getSortIndicator('companyName')}
                    </Button>
                  </TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('status')} className="group -ml-4">
                      Status
                      {getSortIndicator('status')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('franchisee')} className="group -ml-4">
                      Franchisee
                      {getSortIndicator('franchisee')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('salesRepAssigned')} className="group -ml-4">
                      Sales Rep
                      {getSortIndicator('salesRepAssigned')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('industryCategory')} className="group -ml-4">
                      Industry
                      {getSortIndicator('industryCategory')}
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center"><Loader /></TableCell>
                  </TableRow>
                ) : sortedLeads.length > 0 ? (
                  sortedLeads.map((lead) => {
                    const addressString = formatAddress(lead.address);
                    return (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div onClick={() => router.push(`/leads/${lead.id}`)} className="flex items-center gap-3 cursor-pointer">
                          <Avatar>
                            <AvatarImage src={lead.avatarUrl} alt={lead.companyName} data-ai-hint="company logo"/>
                            <AvatarFallback>{lead.companyName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium">{lead.companyName}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => addressString !== 'N/A' && setSelectedAddress(addressString)}
                            disabled={addressString === 'N/A'}
                            className="p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="View on map"
                          >
                            <MapPin className="h-4 w-4 text-muted-foreground hover:text-primary" />
                          </button>
                          <span>{addressString}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <LeadStatusBadge status={lead.status} />
                      </TableCell>
                      <TableCell>{lead.franchisee ?? 'N/A'}</TableCell>
                      <TableCell>{lead.salesRepAssigned ?? 'N/A'}</TableCell>
                      <TableCell>
                        {lead.industryCategory}
                      </TableCell>
                    </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          No archived leads found.
                      </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
    <MapModal
        isOpen={!!selectedAddress}
        onClose={() => setSelectedAddress(null)}
        address={selectedAddress || ''}
      />
    </>
  )
}
