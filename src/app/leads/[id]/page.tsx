import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Building,
  Building2,
  Calendar,
  CheckCircle,
  Globe,
  Lightbulb,
  Link as LinkIcon,
  Mail,
  Phone,
  PlusCircle,
  Sparkles,
  Tag,
  User,
  Users,
} from 'lucide-react'

import { aiLeadScoring } from '@/ai/flows/ai-lead-scoring'
import { generateTalkingPoints } from '@/ai/flows/talking-point-suggestions'
import { getLeadsTool } from '@/ai/flows/get-leads-tool'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LeadStatusBadge } from '@/components/lead-status-badge'
import { ScoreIndicator } from '@/components/score-indicator'
import { Badge } from '@/components/ui/badge'

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
    aiLeadScoring({ leadId: lead.id, leadProfile: lead.profile, websiteUrl: lead.websiteUrl }),
    generateTalkingPoints({ leadProfile: lead.profile }),
  ])

  const fullAddress = lead.address
    ? [lead.address.street, lead.address.city, lead.address.state, lead.address.zip, lead.address.country].filter(Boolean).join(', ')
    : 'No address available';
  

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
            <AvatarImage src={lead.avatarUrl} alt={lead.companyName} data-ai-hint="company logo" />
            <AvatarFallback>{lead.companyName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">{lead.companyName}</h1>
            <p className="text-muted-foreground">
              {lead.contacts.length} {lead.contacts.length === 1 ? 'Contact' : 'Contacts'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LeadStatusBadge status={lead.status} />
          <Button>
            <Phone className="mr-2 h-4 w-4" />
            Log a Call
          </Button>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <Building className="w-5 h-5 text-muted-foreground" />
                 Company Details
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
               <div className="grid grid-cols-2 gap-4 text-sm">
                 <div className="flex items-start gap-3">
                   <Tag className="w-4 h-4 mt-1 text-muted-foreground" />
                   <div>
                     <p className="text-muted-foreground">Franchisee</p>
                     <p className="font-medium">{lead.franchisee ?? 'N/A'}</p>
                   </div>
                 </div>
                 <div className="flex items-start gap-3">
                   <Globe className="w-4 h-4 mt-1 text-muted-foreground" />
                   <div>
                     <p className="text-muted-foreground">Website</p>
                     {lead.websiteUrl ? (
                        <a href={lead.websiteUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline flex items-center gap-1">
                            {lead.websiteUrl}
                            <LinkIcon className="w-3 h-3" />
                        </a>
                     ) : (
                        <p className="font-medium">N/A</p>
                     )}
                   </div>
                 </div>
                 <div className="flex items-start gap-3">
                    <Tag className="w-4 h-4 mt-1 text-muted-foreground" />
                   <div>
                     <p className="text-muted-foreground">Industry</p>
                     <p className="font-medium">{lead.industryCategory ?? 'N/A'}</p>
                   </div>
                 </div>
                 <div className="flex items-start gap-3">
                   <Tag className="w-4 h-4 mt-1 text-muted-foreground" />
                   <div>
                     <p className="text-muted-foreground">Sub-Industry</p>
                     <p className="font-medium">{lead.industrySubCategory || 'N/A'}</p>
                   </div>
                 </div>
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium">{lead.customerServiceEmail ?? 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Phone</p>
                      <p className="font-medium">{lead.customerPhone ?? 'N/A'}</p>
                    </div>
                  </div>
               </div>
             </CardContent>
           </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{fullAddress}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-muted-foreground" />
                Contacts
              </CardTitle>
              <Button variant="outline" size="sm">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Contact
              </Button>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {lead.contacts.length > 0 ? (
                lead.contacts.map((contact) => (
                  <div key={contact.id} className="py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 font-medium sm:col-span-1">
                      <User className="w-5 h-5 text-muted-foreground" />
                      <span>{contact.name}</span>
                    </div>
                    <p className="text-muted-foreground sm:col-span-2">{contact.title}</p>
                    <div className="flex items-center gap-3 sm:col-start-2 sm:col-span-2">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                      <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                        {contact.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-3 sm:col-start-2 sm:col-span-2">
                      <Phone className="w-5 h-5 text-muted-foreground" />
                      <a href={`tel:${contact.phone}`} className="text-primary hover:underline">
                        {contact.phone}
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-muted-foreground">
                  No existing contacts found.
                </div>
              )}
              {scoringResult.prospectedContacts && scoringResult.prospectedContacts.length > 0 ? (
                scoringResult.prospectedContacts.map((contact, index) => (
                  <div key={index} className="py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 font-medium sm:col-span-1">
                      <User className="w-5 h-5 text-muted-foreground" />
                      <span>{contact.name}</span>
                      <Badge variant="outline">Found on website</Badge>
                    </div>
                    <p className="text-muted-foreground sm:col-span-2">{contact.title}</p>
                    <div className="flex items-center gap-3 sm:col-start-2 sm:col-span-2">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                      <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                        {contact.email}
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-muted-foreground">
                  No new contacts found from website.
                </div>
              )}
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
