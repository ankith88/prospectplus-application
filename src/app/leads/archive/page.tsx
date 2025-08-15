
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

export default function ArchivedLeadsPage() {
  const [archivedLeads, setArchivedLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
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
        const allLeads = await getLeadsTool({});
        const filteredLeads = allLeads.filter(lead => lead.status === 'Lost' || lead.status === 'Qualified');
        setArchivedLeads(filteredLeads);
      } catch (error) {
        console.error("Failed to fetch leads:", error);
      } finally {
        setLoading(false);
      }
    }
    getArchivedLeads();
  }, [user, authLoading, router]);

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
        <h1 className="text-3xl font-bold tracking-tight">Archived Leads</h1>
        <p className="text-muted-foreground">View your qualified and lost leads.</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Processed Leads</CardTitle>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center"><Loader /></TableCell>
                </TableRow>
              ) : archivedLeads.map((lead) => (
                <TableRow key={lead.id} onClick={() => router.push(`/leads/${lead.id}`)} className="cursor-pointer">
                  <TableCell>
                    <div className="flex items-center gap-3">
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
                    <LeadStatusBadge status={lead.status} />
                  </TableCell>
                  <TableCell>{lead.franchisee ?? 'N/A'}</TableCell>
                  <TableCell>{lead.salesRepAssigned ?? 'N/A'}</TableCell>
                  <TableCell>
                    {lead.industryCategory}
                  </TableCell>
                </TableRow>
              ))}
              {archivedLeads.length === 0 && !loading && (
                <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No archived leads found.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
