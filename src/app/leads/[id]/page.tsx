
'use client'

import { notFound, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Building,
  Building2,
  Calendar,
  CheckCircle,
  Clipboard,
  Edit,
  Globe,
  Hash,
  Key,
  Lightbulb,
  Link as LinkIcon,
  MessageSquare,
  Mail,
  MoreVertical,
  Phone,
  PlusCircle,
  Sparkles,
  Tag,
  Trash2,
  User,
  Users,
  ClipboardEdit,
  Briefcase,
  MapPin,
  Info,
  Search,
} from 'lucide-react'
import { useEffect, useState, use } from 'react'
import type { Lead, Contact, Activity } from '@/lib/types'
import { aiLeadScoring, AiLeadScoringOutput } from '@/ai/flows/ai-lead-scoring'
import { improveScript, ImproveScriptOutput } from '@/ai/flows/improve-script'
import { getLeadsTool } from '@/ai/flows/get-leads-tool'
import { prospectWebsiteTool } from '@/ai/flows/prospect-website-tool'
import { deleteContactFromLead, logActivity } from '@/services/firebase'
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
import { EditLeadForm } from '@/components/edit-lead-form'
import { Loader } from '@/components/ui/loader'
import { Textarea } from '@/components/ui/textarea'
import { MapModal } from '@/components/map-modal'


export default function LeadProfilePage({
  params: { id },
}: {
  params: { id: string }
}) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [scoringResult, setScoringResult] = useState<AiLeadScoringOutput['scoredLeads'][number] | null>(null);
  const [userScript, setUserScript] = useState('');
  const [improvedScript, setImprovedScript] = useState<ImproveScriptOutput | null>(null);
  const [isImprovingScript, setIsImprovingScript] = useState(false);
  const [isProspecting, setIsProspecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scoringLoading, setScoringLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditLeadDialogOpen, setIsEditLeadDialogOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const leads = await getLeadsTool({ leadId: id });
        const currentLead = leads[0];

        if (!currentLead) {
          notFound()
          return;
        }
        setLead(currentLead);

      } catch (error) {
        console.error("Failed to fetch lead data:", error);
        // Optionally, handle error state in UI
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const handleCalculateScore = async () => {
    if (!lead) return;
    try {
        setScoringLoading(true);
        const leadToScore = {
            leadId: lead.id,
            leadProfile: lead.profile,
            websiteUrl: lead.websiteUrl,
            activity: lead.activity || []
        };
        const scoring = await aiLeadScoring([leadToScore]);
        if (scoring.scoredLeads.length > 0) {
            setScoringResult(scoring.scoredLeads[0]);
        }
    } catch (error) {
        console.error("Failed to calculate score:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to calculate AI score." });
    } finally {
        setScoringLoading(false);
    }
  }

  const handleProspectWebsite = async () => {
    if (!lead || !lead.websiteUrl) {
        toast({ variant: "destructive", title: "No Website", description: "No website URL available for this lead to prospect." });
        return;
    }
    try {
        setIsProspecting(true);
        const result = await prospectWebsiteTool({
            leadId: lead.id,
            websiteUrl: lead.websiteUrl,
        });

        if (result.contacts && result.contacts.length > 0) {
            let newContactsAdded = 0;
            setLead(prev => {
                if (!prev) return null;
                const existingEmails = new Set((prev.contacts || []).map(c => c.email));
                const uniqueNewContacts = result.contacts!.filter(
                    (newContact: any) => newContact.email && !existingEmails.has(newContact.email)
                );
                
                newContactsAdded = uniqueNewContacts.length;

                return { ...prev, contacts: [...(prev.contacts || []), ...uniqueNewContacts] };
            });

            // The scoring result should probably reflect all found contacts, not just new ones
            setScoringResult(prev => ({
                ...prev!,
                prospectedContacts: result.contacts || [],
            }));
            
            if (newContactsAdded > 0) {
                toast({ title: "Success", description: `${newContactsAdded} new contact(s) found and added.` });
            } else {
                toast({ title: "No New Contacts", description: "Prospecting found contacts that are already in your list." });
            }

        } else {
            toast({ title: "No Contacts Found", description: "No contacts were found on the website." });
        }
    } catch (error) {
        console.error("Failed to prospect website:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to prospect website." });
    } finally {
        setIsProspecting(false);
    }
  };

  const handleImproveScript = async () => {
    if (!lead || !userScript) return;
    try {
        setIsImprovingScript(true);
        setImprovedScript(null);
        const result = await improveScript({
            leadProfile: lead.profile,
            userScript: userScript,
        });
        setImprovedScript(result);
    } catch (error) {
        console.error("Failed to improve script:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to improve script." });
    } finally {
        setIsImprovingScript(false);
    }
  };

  const addActivity = (newActivity: Omit<Activity, 'id'>) => {
    if (lead) {
        const activityWithId: Activity = {
            ...newActivity,
            id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };
        const updatedActivities = [activityWithId, ...(lead.activity || [])];
        setLead({ ...lead, activity: updatedActivities });
    }
  };
  
  const handleContactAdded = (newContact: any) => {
    if (lead) {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newContactWithId = { ...newContact, id: tempId, name: `${newContact.firstName} ${newContact.lastName}` };
      const updatedLead = {
        ...lead,
        contacts: [...(lead.contacts || []), newContactWithId],
      };
      setLead(updatedLead);
       addActivity({
          type: 'Update',
          date: new Date().toISOString(),
          notes: `New contact added: ${newContactWithId.name}`,
       });
    }
  };

  const handleContactUpdated = (updatedContact: Contact, oldContact: Contact) => {
    if (lead && lead.contacts) {
      const updatedContacts = lead.contacts.map(c => c.id === updatedContact.id ? updatedContact : c);
      setLead({ ...lead, contacts: updatedContacts });
       addActivity({
          type: 'Update',
          date: new Date().toISOString(),
          notes: `Contact ${oldContact.name} updated to ${updatedContact.name}.`,
       });
    }
     setIsEditDialogOpen(false);
  };

  const handleLeadUpdated = (updatedLeadData: Partial<Lead>, oldLead: Lead) => {
    if (lead) {
        const changes: string[] = [];
        if (updatedLeadData.companyName && updatedLeadData.companyName !== oldLead.companyName) {
            changes.push(`Company name to "${updatedLeadData.companyName}".`);
        }
        if (updatedLeadData.customerServiceEmail && updatedLeadData.customerServiceEmail !== oldLead.customerServiceEmail) {
            changes.push(`Email to "${updatedLeadData.customerServiceEmail}".`);
        }
        if (updatedLeadData.customerPhone && updatedLeadData.customerPhone !== oldLead.customerPhone) {
            changes.push(`Phone to "${updatedLeadData.customerPhone}".`);
        }

        if (changes.length > 0) {
           addActivity({
              type: 'Update',
              date: new Date().toISOString(),
              notes: `Lead details updated: ${changes.join(' ')}`,
           });
        }
      setLead({ ...lead, ...updatedLeadData });
    }
    setIsEditLeadDialogOpen(false);
  }

  const handleDeleteContact = async (contact: Contact) => {
    if (!lead) return;
    try {
      await deleteContactFromLead(lead.id, contact.id, contact.name);
      setLead(prev => prev ? { ...prev, contacts: (prev.contacts || []).filter(c => c.id !== contact.id) } : null);
      addActivity({
        type: 'Update',
        date: new Date().toISOString(),
        notes: `Contact ${contact.name} deleted.`,
      });
      toast({ title: "Success", description: "Contact deleted successfully." });
    } catch (error) {
      console.error("Failed to delete contact:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete contact." });
    }
  };

  const handleCallLogged = (updatedLead: Lead) => {
    setLead(updatedLead);
  }

  const handleAirCallClick = async () => {
    if (!lead || !callNumber) return;
    try {
        await logActivity(lead.id, { type: 'Call', notes: 'Initiated call with AirCall.' });
        addActivity({
            type: 'Call',
            date: new Date().toISOString(),
            notes: 'Initiated call with AirCall.',
        });
        window.location.href = `aircall:number:${callNumber}`;
    } catch (error) {
        console.error("Failed to log AirCall activity:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to log AirCall click." });
    }
  };

  const handleCopy = (text: string | null | undefined, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({
        title: "Copied to clipboard",
        description: `${fieldName} copied successfully.`,
    });
  };

  if (loading || !lead) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center">
        <Loader />
      </div>
    );
  }

  const fullAddress = lead.address
    ? [lead.address.street, lead.address.city, lead.address.state, lead.address.zip, lead.address.country].filter(Boolean).join(', ')
    : 'No address available';

  const primaryContact = lead.contacts && lead.contacts.length > 0 ? lead.contacts[0] : null;
  const callNumber = primaryContact?.phone || lead.customerPhone;

  return (
    <>
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
            <div className="flex items-center gap-2 mt-1">
              <LeadStatusBadge status={lead.status} />
              <p className="text-muted-foreground">
                &bull; {lead.contacts?.length || 0} {lead.contacts?.length === 1 ? 'Contact' : 'Contacts'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {callNumber ? (
            <Button onClick={handleAirCallClick}>
                <Phone className="mr-2 h-4 w-4" />
                Call with AirCall
            </Button>
          ) : (
            <Button disabled>
              <Phone className="mr-2 h-4 w-4" />
              No Phone Available
            </Button>
          )}
          <LogCallDialog lead={lead} onCallLogged={handleCallLogged}>
            <Button variant="secondary">
                <ClipboardEdit className="mr-2 h-4 w-4" />
                Log an Activity
            </Button>
          </LogCallDialog>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
             <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
               <CardTitle className="flex items-center gap-2">
                 <Building className="w-5 h-5 text-muted-foreground" />
                 Company Details
               </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleProspectWebsite} disabled={isProspecting || !lead.websiteUrl}>
                        {isProspecting ? <Loader /> : <><Search className="mr-2 h-4 w-4" /><span>Prospect Website</span></>}
                    </Button>
                    <Dialog open={isEditLeadDialogOpen} onOpenChange={setIsEditLeadDialogOpen}>
                      <DialogTrigger asChild>
                         <Button variant="outline" size="sm">
                           <Edit className="mr-2 h-4 w-4" />
                           Edit
                         </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Lead Details</DialogTitle>
                        </DialogHeader>
                        <EditLeadForm lead={lead} onLeadUpdated={(updatedData) => handleLeadUpdated(updatedData, lead)} />
                      </DialogContent>
                    </Dialog>
                </div>
             </CardHeader>
             <CardContent className="space-y-4">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                 <div className="flex items-start gap-3">
                   <Key className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                   <div>
                     <p className="text-muted-foreground">Customer ID</p>
                     <div className="flex items-center gap-1">
                        <p className="font-medium break-all">{lead.entityId ?? 'N/A'}</p>
                        {lead.entityId && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(lead.entityId, 'Customer ID')}>
                                <Clipboard className="w-3 h-3" />
                            </Button>
                        )}
                     </div>
                   </div>
                 </div>
                 <div className="flex items-start gap-3">
                   <Hash className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                   <div>
                     <p className="text-muted-foreground">NetSuite Internal ID</p>
                     <div className="flex items-center gap-1">
                        <p className="font-medium break-all">{lead.id ?? 'N/A'}</p>
                        {lead.id && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(lead.id, 'NetSuite Internal ID')}>
                                <Clipboard className="w-3 h-3" />
                            </Button>
                        )}
                     </div>
                   </div>
                 </div>
                 <div className="flex items-start gap-3">
                   <Tag className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                   <div>
                     <p className="text-muted-foreground">Franchisee</p>
                     <p className="font-medium">{lead.franchisee ?? 'N/A'}</p>
                   </div>
                 </div>
                 <div className="flex items-start gap-3">
                   <Globe className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                   <div>
                     <p className="text-muted-foreground">Website</p>
                     {lead.websiteUrl ? (
                        <a href={lead.websiteUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline flex items-center gap-1 break-all">
                            <span>{lead.websiteUrl}</span>
                            <LinkIcon className="w-3 h-3 shrink-0" />
                        </a>
                     ) : (
                        <p className="font-medium">N/A</p>
                     )}
                   </div>
                 </div>
                 <div className="flex items-start gap-3">
                    <Tag className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                   <div>
                     <p className="text-muted-foreground">Industry</p>
                     <p className="font-medium">{lead.industryCategory ?? 'N/A'}</p>
                   </div>
                 </div>
                 <div className="flex items-start gap-3">
                   <Tag className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                   <div>
                     <p className="text-muted-foreground">Sub-Industry</p>
                     <p className="font-medium">{lead.industrySubCategory || 'N/A'}</p>
                   </div>
                 </div>
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <div className="flex items-center gap-1">
                        <p className="font-medium break-all">{lead.customerServiceEmail ?? 'N/A'}</p>
                        {lead.customerServiceEmail && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(lead.customerServiceEmail, 'Email')}>
                                <Clipboard className="w-3 h-3" />
                            </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-muted-foreground">Phone</p>
                      <div className="flex items-center gap-1">
                        <p className="font-medium break-all">{lead.customerPhone ?? 'N/A'}</p>
                        {lead.customerPhone && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(lead.customerPhone, 'Phone')}>
                                <Clipboard className="w-3 h-3" />
                            </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-muted-foreground">Sales Rep Assigned</p>
                      <p className="font-medium">{lead.salesRepAssigned ?? 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Briefcase className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-muted-foreground">Lead Source</p>
                      <p className="font-medium">{lead.campaign ?? 'N/A'}</p>
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
              <div className="flex items-center gap-2">
                <button
                    onClick={() => fullAddress !== 'No address available' && setSelectedAddress(fullAddress)}
                    disabled={fullAddress === 'No address available'}
                    className="p-1 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    title="View on map"
                >
                    <MapPin className="h-4 w-4 text-muted-foreground hover:text-primary" />
                </button>
                <p className="text-sm text-muted-foreground">{fullAddress}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
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
              {lead.contacts && lead.contacts.length > 0 ? (
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
                                  <AlertDialogAction onClick={() => handleDeleteContact(contact)} className="bg-destructive hover:bg-destructive/90">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    <div className="flex items-center gap-3 font-medium sm:col-span-1">
                      <User className="w-5 h-5 text-muted-foreground shrink-0" />
                      <span className="break-all">{contact.name}</span>
                    </div>
                    <p className="text-muted-foreground sm:col-span-2 break-all">{contact.title}</p>
                    <div className="flex items-center gap-3 sm:col-start-2 sm:col-span-2">
                      <Mail className="w-5 h-5 text-muted-foreground shrink-0" />
                      <a href={`mailto:${contact.email}`} className="text-primary hover:underline break-all">
                        {contact.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-3 sm:col-start-2 sm:col-span-2">
                      <Phone className="w-5 h-5 text-muted-foreground shrink-0" />
                      <a href={`tel:${contact.phone}`} className="text-primary hover:underline break-all">
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
              {scoringResult?.prospectedContacts && scoringResult.prospectedContacts.length > 0 &&
                scoringResult.prospectedContacts.map((contact, index) => (
                  <div key={`prospect-${index}`} className="py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 font-medium sm:col-span-1">
                      <User className="w-5 h-5 text-muted-foreground shrink-0" />
                      <span className="break-all">{contact.name}</span>
                      <Badge variant="outline">Found on website</Badge>
                    </div>
                    <p className="text-muted-foreground sm:col-span-2 break-all">{contact.title}</p>
                    <div className="flex items-center gap-3 sm:col-start-2 sm:col-span-2">
                      <Mail className="w-5 h-5 text-muted-foreground shrink-0" />
                      <a href={`mailto:${contact.email}`} className="text-primary hover:underline break-all">
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
                  onContactUpdated={(updatedContact) => handleContactUpdated(updatedContact, selectedContact)}
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
                {lead.activity && lead.activity.map((item, index) => (
                  <li key={item.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="bg-secondary rounded-full p-2">
                        {item.type === 'Call' && <Phone className="h-4 w-4 text-muted-foreground" />}
                        {item.type === 'Email' && <Mail className="h-4 w-4 text-muted-foreground" />}
                        {item.type === 'Meeting' && <Calendar className="h-4 w-4 text-muted-foreground" />}
                        {item.type === 'Update' && <MessageSquare className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      {lead.activity && index < lead.activity.length - 1 && (
                        <div className="w-px h-full bg-border"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{item.type} {item.type === 'Call' && item.duration && `(${item.duration})`}</p>
                        <p className="text-sm text-muted-foreground">{new Date(item.date).toLocaleDateString()}</p>
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
              {scoringLoading ? (
                <Loader />
              ) : scoringResult ? (
                <>
                  <ScoreIndicator score={scoringResult.score} size="lg" />
                  <p className="text-sm text-muted-foreground">{scoringResult.reason}</p>
                </>
              ) : (
                <div className="flex flex-col items-center text-center gap-4 p-4 border-2 border-dashed rounded-lg">
                    <div className="flex items-start text-left text-sm text-muted-foreground bg-gray-50 p-3 rounded-md">
                        <Info className="h-4 w-4 mr-2 mt-0.5 shrink-0"/>
                        <div>
                        The AI score (0-100) indicates how well this lead fits our target profile: businesses shipping parcels (1-20kg) within Australia. The AI analyzes the lead's profile, website, and activity to make its assessment. Higher scores mean a better potential match.
                        </div>
                    </div>
                    <Button onClick={handleCalculateScore} disabled={scoringLoading}>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Calculate AI Score
                    </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                AI Script Enhancer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Textarea
                    placeholder="Paste your sales script here..."
                    value={userScript}
                    onChange={(e) => setUserScript(e.target.value)}
                    rows={6}
                    className="w-full"
                />
                <Button onClick={handleImproveScript} disabled={isImprovingScript || !userScript} className="w-full">
                    {isImprovingScript ? <Loader /> : <><Sparkles className="mr-2 h-4 w-4" /><span>Improve Script</span></>}
                </Button>
                {improvedScript && (
                    <div className="p-4 border-t mt-4">
                        <h4 className="font-semibold mb-2">Suggested Improvement:</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{improvedScript.improvedScript}</p>
                    </div>
                )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
    <MapModal
        isOpen={!!selectedAddress}
        onClose={() => setSelectedAddress(null)}
        address={selectedAddress || ''}
      />
    </>
  )
}
