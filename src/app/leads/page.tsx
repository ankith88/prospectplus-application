
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
import { aiLeadScoring } from '@/ai/flows/ai-lead-scoring'
import { LeadStatusBadge } from '@/components/lead-status-badge'
import { ScoreIndicator } from '@/components/score-indicator'
import type { Lead, LeadStatus } from '@/lib/types'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { updateLeadSalesRep } from '@/services/firebase'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, UserPlus, UserX } from 'lucide-react'
import { Loader } from '@/components/ui/loader'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'

type LeadWithScore = Lead & { score: number };

export default function LeadsPage() {
  const [leadsWithScores, setLeadsWithScores] = useState<LeadWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectedMyLeads, setSelectedMyLeads] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    companyName: '',
    status: 'all',
    franchisee: 'all',
    industryCategory: 'all'
  });
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    async function getLeadsWithScores() {
      if (!user && !authLoading) {
        router.push('/signin');
        return;
      }
      if (authLoading) return;

      try {
        setLoading(true);
        const allLeads = await getLeadsTool({});
        const activeLeads = allLeads.filter(lead => lead.status !== 'Lost' && lead.status !== 'Qualified');
        
        const leadsWithScoresPromises = activeLeads.map(async (lead) => {
          try {
            const { score } = await aiLeadScoring({ leadId: lead.id, leadProfile: lead.profile, websiteUrl: lead.websiteUrl, activity: lead.activity });
            return { ...lead, score: score ?? 0 };
          } catch (error) {
            console.error(`Failed to score lead ${lead.id}:`, error);
            return { ...lead, score: 0 };
          }
        });
        const resolvedLeads = await Promise.all(leadsWithScoresPromises);
        setLeadsWithScores(resolvedLeads);
      } catch (error) {
        console.error("Failed to fetch leads:", error);
      } finally {
        setLoading(false);
      }
    }
    getLeadsWithScores();
  }, [user, authLoading, router]);

  const handleAssign = async (leadId: string, salesRep: string | null) => {
    try {
      await updateLeadSalesRep(leadId, salesRep);
      setLeadsWithScores(prevLeads =>
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

      setLeadsWithScores(prevLeads =>
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
      
      setLeadsWithScores(prevLeads =>
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
    return leadsWithScores.filter(lead => lead.salesRepAssigned === user.displayName);
  }, [leadsWithScores, user]);

  const filteredLeads = useMemo(() => {
    return leadsWithScores.filter(lead => {
      const companyNameMatch = lead.companyName.toLowerCase().includes(filters.companyName.toLowerCase());
      const statusMatch = filters.status === 'all' || lead.status === filters.status;
      const franchiseeMatch = filters.franchisee === 'all' || lead.franchisee === filters.franchisee;
      const industryMatch = filters.industryCategory === 'all' || lead.industryCategory === filters.industryCategory;
      return companyNameMatch && statusMatch && franchiseeMatch && industryMatch;
    });
  }, [leadsWithScores, filters]);

  const uniqueFranchisees = useMemo(() => [...new Set(leadsWithScores.map(l => l.franchisee).filter(Boolean))], [leadsWithScores]);
  const uniqueIndustries = useMemo(() => [...new Set(leadsWithScores.map(l => l.industryCategory).filter(Boolean))], [leadsWithScores]);
  const uniqueStatuses = useMemo(() => [...new Set(leadsWithScores.map(l => l.status).filter(Boolean))], [leadsWithScores]) as LeadStatus[];

  const handleSelectLead = (leadId: string, checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedLeads(prev => [...prev, leadId]);
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId));
    }
  }
  
  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedLeads(filteredLeads.map(l => l.id));
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
      {myLeads.length > 0 && (
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
                  <TableHead className="w-[280px]">Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Franchisee</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Industry Sub-Category</TableHead>
                  <TableHead className="text-right">AI Score</TableHead>
                  <TableHead className="w-[50px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myLeads.map((lead) => (
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
                      <ScoreIndicator score={lead.score} />
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                    <Checkbox
                        checked={filteredLeads.length > 0 && selectedLeads.length === filteredLeads.length}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                    />
                </TableHead>
                <TableHead className="w-[280px]">Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Franchisee</TableHead>
                <TableHead>Sales Rep</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Industry Sub-Category</TableHead>
                <TableHead className="text-right">AI Score</TableHead>
                <TableHead className="w-[50px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center"><Loader /></TableCell>
                </TableRow>
              ) : filteredLeads.map((lead) => (
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
                    <ScoreIndicator score={lead.score} />
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
