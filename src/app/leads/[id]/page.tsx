import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Lightbulb,
  Mail,
  Phone,
  Sparkles,
  User,
} from 'lucide-react'

import { aiLeadScoring } from '@/ai/flows/ai-lead-scoring'
import { generateTalkingPoints } from '@/ai/flows/talking-point-suggestions'
import { getLeadsTool } from '@/ai/flows/get-leads-tool'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LeadStatusBadge } from '@/components/lead-status-badge'
import { ScoreIndicator } from '@/components/score-indicator'
import { Separator } from '@/components/ui/separator'

export default async function LeadProfilePage({
  params,
}: {
  params: { id: string }
}) {
  const leads = await getLeadsTool({});
  const lead = leads.find((l) => l.id === params.id)

  if (!lead) {
    notFound()
  }

  const [scoringResult, talkingPointsResult] = await Promise.all([
    aiLeadScoring({ leadProfile: lead.profile }),
    generateTalkingPoints({ leadProfile: lead.profile }),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Leads
          </Link>
        </Button>
      </div>

      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={lead.avatarUrl} alt={lead.name} data-ai-hint="person portrait" />
            <AvatarFallback>{lead.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">{lead.name}</h1>
            <p className="text-muted-foreground">
              {lead.title} at {lead.company}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LeadStatusBadge status={lead.status} />
          <Button variant="outline">
            <Mail className="mr-2 h-4 w-4" />
            Email
          </Button>
          <Button>
            <Phone className="mr-2 h-4 w-4" />
            Call Lead
          </Button>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-muted-foreground" />
                <span>{lead.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <span>{lead.company}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                  {lead.email}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <a href={`tel:${lead.phone}`} className="text-primary hover:underline">
                  {lead.phone}
                </a>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Activity History</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {lead.activity.map((item, index) => (
                  <li key={item.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="bg-secondary rounded-full p-2">
                        {item.type === 'Call' && <Phone className="h-4 w-4 text-muted-foreground" />}
                        {item.type === 'Email' && <Mail className="h-4 w-4 text-muted-foreground" />}
                        {item.type === 'Meeting' && <Calendar className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      {index < lead.activity.length - 1 && (
                        <div className="w-px h-full bg-border"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{item.type} {item.type === 'Call' && `(${item.duration})`}</p>
                        <p className="text-sm text-muted-foreground">{item.date}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.notes}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                AI Lead Score
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center text-center gap-4">
              <ScoreIndicator score={scoringResult.score} size="lg" />
              <p className="text-sm text-muted-foreground">{scoringResult.reason}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                AI Talking Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {talkingPointsResult.talkingPoints.map((point, index) => (
                  <li key={index} className="flex gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-1" />
                    <span className="flex-1 text-sm">{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
