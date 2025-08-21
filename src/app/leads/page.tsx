
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
import { updateLeadSalesRep } from '@/services/firebase'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, UserPlus, UserX, MapPin } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { MapModal } from '@/components/map-modal'

export default function LeadsPage() {
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [myLeads, setMyLeads] = useState<Lead[]>([]);
  const [unassignedLeads, setUnassignedLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectedMyLeads, setSelectedMyLeads] = useState<string[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
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
        const fetchedLeads = await getLeadsTool({ summary: true });
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

  useEffect(() => {
    if (user && allLeads.length > 0) {
      setMyLeads(allLeads.filter(lead => lead.salesRepAssigned === user.displayName));
      setUnassignedLeads(allLeads.filter(lead => !lead.salesRepAssigned));
    }
  }, [allLeads, user]);

  const handleAssign = async (leadId: string, salesRep: string | null) => {
    try {
      await updateLeadSalesRep(leadId, salesRep);
      const updatedLeads = allLeads.map(lead =>
        lead.id === leadId ? { ...lead, salesRepAssigned: salesRep || undefined } : lead
      );
      setAllLeads(updatedLeads);
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

      const updatedLeads = allLeads.map(lead =>
        selectedLeads.includes(lead.id) ? { ...lead, salesRepAssigned: user.displayName! } : lead
      );
      setAllLeads(updatedLeads);
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
      
      const updatedLeads = allLeads.map(lead =>
        selectedMyLeads.includes(lead.id) ? { ...lead, salesRepAssigned: undefined } : lead
      );
      setAllLeads(updatedLeads);
      toast({ title: "Success", description: `${selectedMyLeads.length} lead(s) unassigned.` });
      setSelectedMyLeads([]);
    } catch (error) {
      console.error("Failed to bulk unassign leads:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to unassign leads." });
    }
  };

  const handleSelectLead = (leadId: string, checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedLeads(prev => [...prev, leadId]);
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId));
    }
  }
  
  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedLeads(unassignedLeads.map(l => l.id));
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
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                          You have not been assigned any leads.
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
                          checked={unassignedLeads.length > 0 && selectedLeads.length === unassignedLeads.length}
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all"
                      />
                  </TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Franchisee</TableHead>
                  <TableHead>Sales Rep</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead className="w-[50px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center"><Loader /></TableCell>
                  </TableRow>
                ) : allLeads.length > 0 ? (
                  allLeads.map((lead) => {
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
                      <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                          No leads found in the database.
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

    