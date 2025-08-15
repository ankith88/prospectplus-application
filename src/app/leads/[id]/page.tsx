
'use client'

import { notFound, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Building,
  Building2,
  Calendar,
  CheckCircle,
  Edit,
  Globe,
  Lightbulb,
  Link as LinkIcon,
  LogOut,
  Mail,
  MoreVertical,
  Phone,
  PlusCircle,
  Sparkles,
  Tag,
  Trash2,
  User,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Lead, Contact } from '@/lib/types'
import { aiLeadScoring, AiLeadScoringOutput } from '@/ai/flows/ai-lead-scoring'
import { generateTalkingPoints, TalkingPointSuggestionsOutput } from '@/ai/flows/talking-point-suggestions'
import { getLeadsTool } from '@/ai/flows/get-leads-tool'
import { deleteContactFromLead, updateContactInLead } from '@/services/firebase'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LeadStatusBadge } from '@/components/lead-status-badge'
import { ScoreIndicator } from '@/components/score-indicator'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { AddContactForm } from '@/components/add-contact-form'
import { EditContactForm } from '@/components/edit-contact-form'
import { LogCallDialog } from '@/components/log-call-dialog'
import { useToast } from '@/hooks/use-toast'


export default function LeadProfilePage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params;
  const [lead, setLead] = useState<Lead | null>(null);
  const [scoringResult, setScoringResult] = useState<AiLeadScoringOutput | null>(null);
  const [talkingPointsResult, setTalkingPointsResult] = useState<TalkingPointSuggestionsOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const leads = await getLeadsTool({});
        const currentLead = leads.find((l) => l.id === id)

        if (!currentLead) {
          notFound()
          return;
        }
        setLead(currentLead);

        const [scoring, talkingPoints] = await Promise.all([
          aiLeadScoring({ leadId: currentLead.id, leadProfile: currentLead.profile, websiteUrl: currentLead.websiteUrl, activity: currentLead.activity }),
          generateTalkingPoints({ leadProfile: currentLead.profile }),
        ])
        setScoringResult(scoring);
        setTalkingPointsResult(talkingPoints);
      } catch (error) {
        console.error("Failed to fetch lead data:", error);
        // Optionally, handle error state in UI
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);
  
  const handleContactAdded = (newContact: any) => {
    if (lead) {
      // Create a more robust temporary unique ID for the key
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newContactWithId = { ...newContact, id: tempId, name: `${newContact.firstName} ${newContact.lastName}` };
      const updatedLead = {
        ...lead,
        contacts: [...lead.contacts, newContactWithId],
      };
      setLead(updatedLead);
    }
  };

  const handleContactUpdated = (updatedContact: Contact) => {
    if (lead) {
      const updatedContacts = lead.contacts.map(c => c.id === updatedContact.id ? updatedContact : c);
      setLead({ ...lead, contacts: updatedContacts });
    }
     setIsEditDialogOpen(false);
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!lead) return;
    try {
      await deleteContactFromLead(lead.id, contactId);
      setLead(prev => prev ? { ...prev, contacts: prev.contacts.filter(c => c.id !== contactId) } : null);
      toast({ title: "Success", description: "Contact deleted successfully." });
    } catch (error) {
      console.error("Failed to delete contact:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete contact." });
    }
  };

  const handleCallLogged = (updatedLead: Lead) => {
    setLead(updatedLead);
  }

  if (loading || !lead || !scoringResult || !talkingPointsResult) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <p>Loading lead details...</p>
      </div>
    );
  }

  const fullAddress = lead.address
    ? [lead.address.street, lead.address.city, lead.address.state, lead.address.zip, lead.address.country].filter(Boolean).join(', ')
    : 'No address available';

  const primaryContact = lead.contacts.length > 0 ? lead.contacts[0] : null;
  const callNumber = primaryContact?.phone || lead.customerPhone;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" asChild>
          <Link href="/leads">
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
          {callNumber ? (
            <Button asChild>
                <a href={`aircall:number:${callNumber}`} target="_blank" rel="noopener noreferrer">
                    <Phone className="mr-2 h-4 w-4" />
                    Call with AirCall
                </a>
            </Button>
          ) : (
            <Button disabled>
              <Phone className="mr-2 h-4 w-4" />
              No Phone Available
            </Button>
          )}
          <LogCallDialog lead={lead} onCallLogged={handleCallLogged}>
            <Button variant="secondary">
                <LogOut className="mr-2 h-4 w-4" />
                Log a Call
            </Button>
          </LogCallDialog>
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
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Contact
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Contact</DialogTitle>
                    <DialogDescription>
                      Enter the details for the new contact.
                    </DialogDescription>
                  </DialogHeader>
                  <AddContactForm leadId={lead.id} onContactAdded={handleContactAdded}/>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {lead.contacts.length > 0 ? (
                lead.contacts.map((contact) => (
                  <div key={contact.id} className="py-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-start relative group">
                     <div className="absolute top-4 right-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => { setSelectedContact(contact); setIsEditDialogOpen(true); }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                                  <span className="text-red-500">Delete</span>
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the contact {contact.name}.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteContact(contact.id)} className="bg-destructive hover:bg-destructive/90">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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
              {scoringResult.prospectedContacts && scoringResult.prospectedContacts.length > 0 &&
                scoringResult.prospectedContacts.map((contact, index) => (
                  <div key={`prospect-${index}`} className="py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              }
            </CardContent>
          </Card>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
             <DialogContent>
               <DialogHeader>
                 <DialogTitle>Edit Contact</DialogTitle>
                 <DialogDescription>
                   Update the details for the contact.
                 </DialogDescription>
               </DialogHeader>
               {selectedContact && (
                <EditContactForm
                  leadId={lead.id}
                  contact={selectedContact}
                  onContactUpdated={handleContactUpdated}
                />
               )}
             </DialogContent>
          </Dialog>

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
                        <p className="font-medium">{item.type} {item.type === 'Call' && item.duration && `(${item.duration})`}</p>
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
