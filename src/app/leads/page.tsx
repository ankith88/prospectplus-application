
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
import { getLeadsTool } from '@/ai/flows/get-leads-tool'
import { LeadStatusBadge } from '@/components/lead-status-badge'
import type { Lead, LeadStatus } from '@/lib/types'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { updateLeadDialerRep } from '@/services/firebase'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, UserX, MapPin, SlidersHorizontal, X } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { MapModal } from '@/components/map-modal'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function LeadsPage() {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMyLeads, setSelectedMyLeads] = useState<string[]>([]);
  const [selectedAllLeads, setSelectedAllLeads] = useState<string[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    companyName: '',
    status: 'all',
    franchisee: '',
    industryCategory: '',
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    async function getLeads() {
      if (!user && !authLoading) {
        router.push('/signin');
        return;
      }
      if (authLoading) return;

      try {
        setLoading(true);
        const fetchedLeads = await getLeadsTool({});
        setAllLeads(fetchedLeads);
      } catch (error) {
        console.error("Failed to fetch leads:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not fetch leads." });
      } finally {
        setLoading(false);
      }
    }
    getLeads();
  }, [user, authLoading, router, toast]);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({
      companyName: '',
      status: 'all',
      franchisee: '',
      industryCategory: '',
    });
  };

  const filteredLeads = useMemo(() => {
    return allLeads.filter(lead => {
      const companyMatch = filters.companyName ? lead.companyName.toLowerCase().includes(filters.companyName.toLowerCase()) : true;
      const statusMatch = filters.status !== 'all' ? lead.status === filters.status : true;
      const franchiseeMatch = filters.franchisee ? (lead.franchisee || '').toLowerCase().includes(filters.franchisee.toLowerCase()) : true;
      const industryMatch = filters.industryCategory ? (lead.industryCategory || '').toLowerCase().includes(filters.industryCategory.toLowerCase()) : true;
      return companyMatch && statusMatch && franchiseeMatch && industryMatch;
    });
  }, [allLeads, filters]);

  const myLeads = useMemo(() => {
    if (user?.displayName) {
      const actionableStatuses: LeadStatus[] = ['New', 'Contacted', 'In Progress', 'Connected', 'High Touch', 'Unqualified'];
      return filteredLeads.filter(lead => 
        lead.dialerAssigned === user.displayName && actionableStatuses.includes(lead.status)
      );
    }
    return [];
  }, [filteredLeads, user]);

  const unassignedLeads = useMemo(() => {
    const nonActionableStatuses: LeadStatus[] = ['Lost', 'Won', 'Qualified', 'LPO Review'];
    return filteredLeads.filter(lead => !lead.dialerAssigned && !nonActionableStatuses.includes(lead.status));
  }, [filteredLeads]);


  const handleBulkUnassign = async () => {
    if (selectedMyLeads.length === 0) return;
    try {
      const promises = selectedMyLeads.map(leadId => updateLeadDialerRep(leadId, null));
      await Promise.all(promises);
      
      const updatedLeads = allLeads.map(lead =>
        selectedMyLeads.includes(lead.id) ? { ...lead, dialerAssigned: undefined } : lead
      );
      setAllLeads(updatedLeads);
      toast({ title: "Success", description: `${selectedMyLeads.length} lead(s) unassigned.` });
      setSelectedMyLeads([]);
    } catch (error) {
      console.error("Failed to bulk unassign leads:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to unassign leads." });
    }
  };
  
  const handleBulkAssign = async () => {
    if (selectedAllLeads.length === 0 || !user?.displayName) return;
    try {
        const promises = selectedAllLeads.map(leadId => updateLeadDialerRep(leadId, user.displayName!));
        await Promise.all(promises);
        
        const updatedLeads = allLeads.map(lead =>
            selectedAllLeads.includes(lead.id) ? { ...lead, dialerAssigned: user.displayName! } : lead
        );
        setAllLeads(updatedLeads);
        toast({ title: "Success", description: `${selectedAllLeads.length} lead(s) assigned to you.` });
        setSelectedAllLeads([]);
    } catch (error) {
        console.error("Failed to bulk assign leads:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to assign leads." });
    }
  };

  const handleSelectMyLead = (leadId: string, checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedMyLeads(prev => [...prev, leadId]);
    } else {
      setSelectedMyLeads(prev => prev.filter(id => id !== leadId));
    }
  };
  
  const handleSelectAllLead = (leadId: string, checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedAllLeads(prev => [...prev, leadId]);
    } else {
      setSelectedAllLeads(prev => prev.filter(id => id !== leadId));
    }
  };

  const handleSelectAllMyLeads = (checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedMyLeads(myLeads.map(l => l.id));
    } else {
      setSelectedMyLeads([]);
    }
  };
  
  const handleSelectAllUnassignedLeads = (checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedAllLeads(unassignedLeads.map(l => l.id));
    } else {
      setSelectedAllLeads([]);
    }
  };

  const handleUnassign = async (leadId: string) => {
    try {
      await updateLeadDialerRep(leadId, null);
      const updatedLeads = allLeads.map(lead =>
        lead.id === leadId ? { ...lead, dialerAssigned: undefined } : lead
      );
      setAllLeads(updatedLeads);
      toast({ title: "Success", description: "Lead unassigned." });
    } catch (error) {
      console.error("Failed to unassign lead:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to unassign lead." });
    }
  };
  
  const handleAssign = async (leadId: string) => {
    if (!user?.displayName) return;
    try {
        await updateLeadDialerRep(leadId, user.displayName);
        const updatedLeads = allLeads.map(lead =>
            lead.id === leadId ? { ...lead, dialerAssigned: user.displayName! } : lead
        );
        setAllLeads(updatedLeads);
        toast({ title: "Success", description: "Lead assigned to you." });
    } catch (error) {
        console.error("Failed to assign lead:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to assign lead." });
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

  const hasActiveFilters = Object.values(filters).some(val => val && val !== 'all');

  return (
    <>
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Outbound Leads</h1>
        <p className="text-muted-foreground">Manage and engage with your leads.</p>
      </header>

      <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Filters</CardTitle>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                        <SlidersHorizontal className="h-4 w-4" />
                        <span className="ml-2">{isFilterOpen ? 'Close' : 'Open'} Filters</span>
                    </Button>
                </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input id="companyName" value={filters.companyName} onChange={(e) => handleFilterChange('companyName', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                        <SelectTrigger id="status">
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            {(['New', 'Contacted', 'In Progress', 'Connected', 'High Touch', 'LPO Review', 'Qualified', 'Unqualified', 'Won', 'Lost'] as LeadStatus[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="franchisee">Franchisee</Label>
                    <Input id="franchisee" value={filters.franchisee} onChange={(e) => handleFilterChange('franchisee', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Input id="industry" value={filters.industryCategory} onChange={(e) => handleFilterChange('industryCategory', e.target.value)} />
                  </div>
              </CardContent>
              {hasActiveFilters && (
                <CardContent>
                    <Button variant="ghost" onClick={clearFilters}>
                        <X className="mr-2 h-4 w-4" /> Clear Filters
                    </Button>
                </CardContent>
              )}
            </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>My Assigned Leads</CardTitle>
          {selectedMyLeads.length > 0 && (
              <Button onClick={handleBulkUnassign} variant="outline">
              <UserX className="mr-2 h-4 w-4" />
              Unassign {selectedMyLeads.length} Lead(s)
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
                      checked={myLeads.length > 0 && selectedMyLeads.length === myLeads.length}
                      onCheckedChange={handleSelectAllMyLeads}
                      aria-label="Select all my leads"
                    />
                  </TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Franchisee</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead className="w-[50px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                      <TableCell colSpan={7} className="text-center"><Loader /></TableCell>
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
                      <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleUnassign(lead.id)}>
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
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                          You have no actionable leads assigned.
                      </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

       <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>All Unassigned Leads</CardTitle>
             {selectedAllLeads.length > 0 && (
                <Button onClick={handleBulkAssign} variant="outline">
                <UserX className="mr-2 h-4 w-4" />
                Assign {selectedAllLeads.length} Lead(s) to Me
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
                        checked={unassignedLeads.length > 0 && selectedAllLeads.length === unassignedLeads.length}
                        onCheckedChange={handleSelectAllUnassignedLeads}
                        aria-label="Select all unassigned leads"
                    />
                  </TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Franchisee</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead className="w-[50px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                      <TableCell colSpan={7} className="text-center"><Loader /></TableCell>
                  </TableRow>
                ) : unassignedLeads.length > 0 ? (
                  unassignedLeads.map((lead) => {
                    const addressString = formatAddress(lead.address);
                    return (
                    <TableRow key={lead.id} data-state={selectedAllLeads.includes(lead.id) && "selected"}>
                      <TableCell>
                        <Checkbox
                            checked={selectedAllLeads.includes(lead.id)}
                            onCheckedChange={(checked) => handleSelectAllLead(lead.id, checked)}
                            aria-label={`Select lead ${lead.companyName}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => router.push(`/leads/${lead.id}`)}>
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
                      <TableCell className="text-right">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleAssign(lead.id)}>
                                Assign to Me
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                          No unassigned leads found.
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
