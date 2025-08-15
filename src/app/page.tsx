import Link from 'next/link'
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
import type { Lead } from '@/lib/types'
import { LeadStatusBadge } from '@/components/lead-status-badge'
import { ScoreIndicator } from '@/components/score-indicator'

async function getLeadsWithScores() {
  const leads = await getLeadsTool({});
  const leadsWithScores = await Promise.all(
    leads.map(async (lead) => {
      try {
        const { score } = await aiLeadScoring({ leadProfile: lead.profile })
        return { ...lead, score }
      } catch (error) {
        console.error(`Failed to score lead ${lead.id}:`, error)
        // Assign a default/error score
        return { ...lead, score: 0 }
      }
    })
  );
  return leadsWithScores;
}

export default async function LeadsPage() {
  const leadsWithScores = await getLeadsWithScores();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Outbound Leads</h1>
        <p className="text-muted-foreground">Manage and engage with your synced leads.</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>All Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px]">Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">AI Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leadsWithScores.map((lead) => (
                <TableRow key={lead.id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/leads/${lead.id}`} className="flex items-center gap-3 group">
                      <Avatar>
                        <AvatarImage src={lead.avatarUrl} alt={lead.name} data-ai-hint="person portrait" />
                        <AvatarFallback>{lead.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium group-hover:underline">{lead.name}</span>
                        <span className="text-sm text-muted-foreground">{lead.title}</span>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>{lead.company}</TableCell>
                  <TableCell>
                    <LeadStatusBadge status={lead.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <ScoreIndicator score={lead.score} />
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
