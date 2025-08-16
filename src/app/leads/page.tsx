
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
import type { Lead, LeadStatus } from '@/lib/types'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { updateLeadSalesRep } from '@/services/firebase'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, UserPlus, UserX, MapPin, ArrowUpDown } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { MapModal } from '@/components/map-modal'

type SortableLeadKeys = 'companyName' | 'status' | 'franchisee' | 'salesRepAssigned' | 'industryCategory' | 'industrySubCategory';

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectedMyLeads, setSelectedMyLeads] = useState<string[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortableLeadKeys; direction: 'ascending' | 'descending' } | null>(null);
  const [filters, setFilters] = useState({
    companyName: '',
    status: 'all',
    franchisee: 'all',
    industryCategory: 'all'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [leadsPerPage, setLeadsPerPage] = useState(100);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    async function getLeads() {
      if (!user && !authLoading) {
        router.push('/signin');
        return;
      }
      if (authLoading) return;

      try {
        setLoading(true);
        const allLeads = await getLeadsTool({ summary: true });
        const activeLeads = allLeads.filter(lead => lead.status !== 'Lost' && lead.status !== 'Qualified');
        setLeads(activeLeads);
      } catch (error) {
        console.error("Failed to fetch leads:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch leads." });
      } finally {
        setLoading(false);
      }
    }
    getLeads();
  }, [user, authLoading, router, toast]);

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

  const sortedLeads = useMemo(() => {
    let sortableItems = [...leads];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue, undefined, { numeric: true });
          if (comparison !== 0) {
            return sortConfig.direction === 'ascending' ? comparison : -comparison;
          }
        } else {
            if (aValue < bValue) {
              return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
              return sortConfig.direction === 'ascending' ? 1 : -1;
            }
        }
        return 0;
      });
    }
    return sortableItems;
  }, [leads, sortConfig]);

  const handleAssign = async (leadId: string, salesRep: string | null) => {
    try {
      await updateLeadSalesRep(leadId, salesRep);
      setLeads(prevLeads =>
        prevLeads.map(lead =>
          lead.id === leadId ? { ...lead, salesRepAssigned: salesRep || undefined } : lead
        )
      );
    } catch (error) {
      console.error("Failed to assign lead:", error);
    }
  };

  const handleBulkAssign = async () => {
    if (!user?.displayName) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to assign leads." });
      return;
    }
    try {
      const promises = selectedLeads.map(leadId => updateLeadSalesRep(leadId, user.displayName!));
      await Promise.all(promises);

      setLeads(prevLeads =>
        prevLeads.map(lead =>
          selectedLeads.includes(lead.id) ? { ...lead, salesRepAssigned: user.displayName! } : lead
        )
      );
      toast({ title: "Success", description: `${selectedLeads.length} lead(s) assigned to you.` });
      setSelectedLeads([]);
    } catch (error) {
      console.error("Failed to bulk assign leads:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to assign leads." });
    }
  }

  const handleBulkUnassign = async () => {
    try {
      const promises = selectedMyLeads.map(leadId => updateLeadSalesRep(leadId, null));
      await Promise.all(promises);
      
      setLeads(prevLeads =>
        prevLeads.map(lead =>
          selectedMyLeads.includes(lead.id) ? { ...lead, salesRepAssigned: undefined } : lead
        )
      );
      toast({ title: "Success", description: `${selectedMyLeads.length} lead(s) unassigned.` });
      setSelectedMyLeads([]);
    } catch (error) {
      console.error("Failed to bulk unassign leads:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to unassign leads." });
    }
  };

  const myLeads = useMemo(() => {
    if (!user) return [];
    return sortedLeads.filter(lead => lead.salesRepAssigned === user.displayName);
  }, [sortedLeads, user]);

  const filteredLeads = useMemo(() => {
    return sortedLeads.filter(lead => {
      const companyNameMatch = lead.companyName.toLowerCase().includes(filters.companyName.toLowerCase());
      const statusMatch = filters.status === 'all' || lead.status === filters.status;
      const franchiseeMatch = filters.franchisee === 'all' || lead.franchisee === filters.franchisee;
      const industryMatch = filters.industryCategory === 'all' || lead.industryCategory === filters.industryCategory;
      return companyNameMatch && statusMatch && franchiseeMatch && industryMatch;
    });
  }, [sortedLeads, filters]);

  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * leadsPerPage;
    const endIndex = startIndex + leadsPerPage;
    return filteredLeads.slice(startIndex, endIndex);
  }, [filteredLeads, currentPage, leadsPerPage]);

  const totalPages = Math.ceil(filteredLeads.length / leadsPerPage);

  const uniqueFranchisees = useMemo(() => [...new Set(leads.map(l => l.franchisee).filter(Boolean))], [leads]);
  const uniqueIndustries = useMemo(() => [...new Set(leads.map(l => l.industryCategory).filter(Boolean))], [leads]);
  const uniqueStatuses = useMemo(() => [...new Set(leads.map(l => l.status).filter(Boolean))], [leads]) as LeadStatus[];

  const handleSelectLead = (leadId: string, checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedLeads(prev => [...prev, leadId]);
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId));
    }
  }
  
  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedLeads(paginatedLeads.map(l => l.id));
    } else {
      setSelectedLeads([]);
    }
  }

  const handleSelectMyLead = (leadId: string, checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedMyLeads(prev => [...prev, leadId]);
    } else {
      setSelectedMyLeads(prev => prev.filter(id => id !== leadId));
    }
  };

  const handleSelectAllMyLeads = (checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedMyLeads(myLeads.map(l => l.id));
    } else {
      setSelectedMyLeads([]);
    }
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
        <h1 className="text-3xl font-bold tracking-tight">Outbound Leads</h1>
        <p className="text-muted-foreground">Manage and engage with your synced leads.</p>
      </header>
       <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            placeholder="Filter by Company Name..."
            value={filters.companyName}
            onChange={(e) => setFilters(prev => ({...prev, companyName: e.target.value}))}
          />
          <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({...prev, status: value}))}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {uniqueStatuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.franchisee} onValueChange={(value) => setFilters(prev => ({...prev, franchisee: value}))}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Franchisee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Franchisees</SelectItem>
              {uniqueFranchisees.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.industryCategory} onValueChange={(value) => setFilters(prev => ({...prev, industryCategory: value}))}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Industry" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Industries</SelectItem>
              {uniqueIndustries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
       </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>My Leads</CardTitle>
          {selectedMyLeads.length > 0 && (
              <Button onClick={handleBulkUnassign} variant="outline">
              <UserX className="mr-2 h-4 w-4" />
              Unassign {selectedMyLeads.length} Lead(s)
              </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                 <TableHead className="w-8">
                   <Checkbox
                     checked={myLeads.length > 0 && selectedMyLeads.length === myLeads.length}
                     onCheckedChange={handleSelectAllMyLeads}
                     aria-label="Select all my leads"
                   />
                 </TableHead>
                <TableHead className="w-[280px]">
                    <Button variant="ghost" onClick={() => requestSort('companyName')} className="px-0 group">
                        Company
                        {getSortIndicator('companyName')}
                    </Button>
                </TableHead>
                <TableHead>Address</TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('status')} className="px-0 group">
                        Status
                        {getSortIndicator('status')}
                    </Button>
                </TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('franchisee')} className="px-0 group">
                        Franchisee
                        {getSortIndicator('franchisee')}
                    </Button>
                </TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('industryCategory')} className="px-0 group">
                        Industry
                        {getSortIndicator('industryCategory')}
                    </Button>
                </TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('industrySubCategory')} className="px-0 group">
                        Industry Sub-Category
                        {getSortIndicator('industrySubCategory')}
                    </Button>
                </TableHead>
                <TableHead className="w-[50px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                 <TableRow>
                    <TableCell colSpan={8} className="text-center"><Loader /></TableCell>
                 </TableRow>
              ) : myLeads.length > 0 ? (
                myLeads.map((lead) => {
                  const addressString = formatAddress(lead.address);
                  return (
                  <TableRow key={lead.id} data-state={selectedMyLeads.includes(lead.id) && "selected"}>
                    <TableCell>
                      <Checkbox
                          checked={selectedMyLeads.includes(lead.id)}
                          onCheckedChange={(checked) => handleSelectMyLead(lead.id, checked)}
                          aria-label={`Select lead ${lead.companyName}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 group cursor-pointer" onClick={() => router.push(`/leads/${lead.id}`)}>
                        <Avatar>
                          <AvatarImage src={lead.avatarUrl} alt={lead.companyName} data-ai-hint="company logo" />
                          <AvatarFallback>{lead.companyName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium group-hover:underline">{lead.companyName}</span>
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
                    <TableCell>
                      {lead.industryCategory}
                    </TableCell>
                    <TableCell>
                      {lead.industrySubCategory}
                    </TableCell>
                     <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleAssign(lead.id, null)}>
                              Unassign
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                     </TableCell>
                  </TableRow>
                  )
                })
              ) : (
                <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                        You have not been assigned any leads.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Leads</CardTitle>
            {selectedLeads.length > 0 && (
                <Button onClick={handleBulkAssign}>
                <UserPlus className="mr-2 h-4 w-4" />
                Assign {selectedLeads.length} Lead(s) to Me
                </Button>
            )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                      <Checkbox
                          checked={paginatedLeads.length > 0 && selectedLeads.length === paginatedLeads.length}
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all"
                      />
                  </TableHead>
                  <TableHead className="w-[280px]">
                    <Button variant="ghost" onClick={() => requestSort('companyName')} className="px-0 group">
                        Company
                        {getSortIndicator('companyName')}
                    </Button>
                  </TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('status')} className="px-0 group">
                        Status
                        {getSortIndicator('status')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('franchisee')} className="px-0 group">
                        Franchisee
                        {getSortIndicator('franchisee')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('salesRepAssigned')} className="px-0 group">
                        Sales Rep
                        {getSortIndicator('salesRepAssigned')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('industryCategory')} className="px-0 group">
                        Industry
                        {getSortIndicator('industryCategory')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('industrySubCategory')} className="px-0 group">
                        Industry Sub-Category
                        {getSortIndicator('industrySubCategory')}
                    </Button>
                  </TableHead>
                  <TableHead className="w-[50px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center"><Loader /></TableCell>
                  </TableRow>
                ) : paginatedLeads.length > 0 ? (
                  paginatedLeads.map((lead) => {
                    const addressString = formatAddress(lead.address);
                    return (
                      <TableRow key={lead.id} data-state={selectedLeads.includes(lead.id) && "selected"}>
                        <TableCell>
                            <Checkbox
                                checked={selectedLeads.includes(lead.id)}
                                onCheckedChange={(checked) => handleSelectLead(lead.id, checked)}
                                aria-label={`Select lead ${lead.companyName}`}
                            />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => router.push(`/leads/${lead.id}`)}>
                            <Avatar>
                              <AvatarImage src={lead.avatarUrl} alt={lead.companyName} data-ai-hint="company logo" />
                              <AvatarFallback>{lead.companyName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium group-hover:underline">{lead.companyName}</span>
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
                        <TableCell>
                          {lead.industrySubCategory}
                        </TableCell>
                        <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleAssign(lead.id, user!.displayName)}>
                                  Assign to Me
                                </DropdownMenuItem>
                                {lead.salesRepAssigned && (
                                  <DropdownMenuItem onClick={() => handleAssign(lead.id, null)}>
                                    Unassign
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                      <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                          No leads found matching your filters.
                      </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                    {filteredLeads.length} Lead(s)
                </span>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Rows per page</span>
                    <Select
                        value={`${leadsPerPage}`}
                        onValueChange={(value) => {
                        setLeadsPerPage(Number(value));
                        setCurrentPage(1);
                        }}
                    >
                        <SelectTrigger className="w-[70px]">
                        <SelectValue placeholder={leadsPerPage} />
                        </SelectTrigger>
                        <SelectContent>
                        {[100, 250, 500, 1000].map((size) => (
                            <SelectItem key={size} value={`${size}`}>
                            {size}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
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
