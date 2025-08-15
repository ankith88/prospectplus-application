
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
import { MoreHorizontal } from 'lucide-react'

type LeadWithScore = Lead & { score: number };

export default function LeadsPage() {
  const [leadsWithScores, setLeadsWithScores] = useState<LeadWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    companyName: '',
    status: 'all',
    franchisee: 'all',
    industryCategory: 'all'
  });
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    async function getLeadsWithScores() {
      if (!user && !authLoading) {
        router.push('/signin');
        return;
      }
      if (authLoading) return;

      try {
        setLoading(true);
        const leads = await getLeadsTool({});
        const leadsWithScoresPromises = leads.map(async (lead) => {
          try {
            const { score } = await aiLeadScoring({ leadId: lead.id, leadProfile: lead.profile, websiteUrl: lead.websiteUrl });
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


  if (loading || authLoading) {
    return <div className="text-center p-8">Loading...</div>;
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
          <CardHeader>
            <CardTitle>My Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
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
                  <TableRow key={lead.id} >
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
      )}
      <Card>
        <CardHeader>
          <CardTitle>All Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
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
                  <TableCell colSpan={8} className="text-center">Loading leads...</TableCell>
                </TableRow>
              ) : filteredLeads.map((lead) => (
                <TableRow key={lead.id} >
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
