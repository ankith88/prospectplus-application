

'use client';

import { useEffect, useState, useMemo, Fragment, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getLeadFromFirebase, updateLeadDiscoveryData, addContactToLead, updateContactInLead, logActivity, updateLeadAvatar, updateLeadStatus } from '@/services/firebase';
import { prospectWebsiteTool } from '@/ai/flows/prospect-website-tool';
import type { Lead, DiscoveryData, Contact, LeadStatus } from '@/lib/types';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building, User, Phone, Mail, Sparkles, Calendar, ClipboardEdit, PhoneCall, Star, Briefcase, MapPin, Globe, Tag, Route, Check, MoreVertical, History } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { PostCallOutcomeDialog } from '@/components/post-call-outcome-dialog';
import { ServiceSelectionDialog } from '@/components/service-selection-dialog';
import { LogNoteDialog } from '@/components/log-note-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DiscoveryRadarChart } from '@/components/discovery-radar-chart';
import { calculateScoreAndRouting } from '@/lib/discovery-scoring';
import { Badge } from '@/components/ui/badge';
import { ScoreIndicator } from '@/components/score-indicator';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import React from 'react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { LocalMileAccessDialog } from '@/components/localmile-access-dialog';
import { initiateLocalMileTrial } from '@/services/netsuite-localmile-proxy';
import { initiateMPProductsTrial } from '@/services/netsuite-mpproducts-proxy';
import { RevisitDialog } from '@/components/revisit-dialog';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';

const discoverySchema = z.object({
  relevanceCheck: z.enum(['Yes', 'No'], { required_error: "This field is required." }),
  reasonsToLeave: z.array(z.string()).optional(),
  postOfficeRelationship: z.enum(['Yes-Driver', 'Yes-Post Office walk up', 'No'], { required_error: "This field is required." }),
  logisticsSetup: z.enum(['Drop-off', 'Routine collection', 'Ad-hoc'], { required_error: "This field is required." }),
  servicePayment: z.enum(['Yes', 'No']).optional(),
  shippingVolume: z.enum(['<5', '<20', '20-100', '100+'], { required_error: "This field is required." }),
  expressVsStandard: z.enum(['Mostly Standard (>=80%)', 'Balanced Mix (20-79% Express)', 'Mostly Express (>=80%)'], { required_error: "This field is required." }),
  packageType: z.array(z.string()).min(1, "Please select at least one package type."),
  currentProvider: z.array(z.string()).min(1, "Please select at least one provider."),
  otherProvider: z.string().optional(),
  eCommerceTech: z.array(z.string()).min(1, "Please select at least one platform."),
  otherECommerceTech: z.string().optional(),
  sameDayCourier: z.enum(['Yes', 'Occasional', 'Never'], { required_error: "This field is required." }),
  decisionMaker: z.enum(['Owner', 'Influencer', 'Gatekeeper'], { required_error: "This field is required." }),
  painPoints: z.string().optional(),
  checkInCompleted: z.boolean().default(true),
});

const newContactSchema = z.object({
    name: z.string().min(1, "Name is required."),
    title: z.string().min(1, "Title is required."),
    email: z.string().email("A valid email is required."),
    phone: z.string().min(1, "Phone number is required."),
});

const TOTAL_STEPS = 8;
const stepLabels = [
    "Company",
    "Contact",
    "Relevance",
    "Reasons",
    "Logistics",
    "Shipping",
    "Providers",
    "Needs",
    "Finish"
];

const salesReps = [
    { name: 'Lee Russell', url: 'https://calendly.com/lee-russell-mailplus/mailplus-intro-call-lee' },
    { name: 'Kerina Helliwell', url: 'https://calendly.com/kerina-helliwell-mailplus/mailplus-intro-call-kerina' },
    { name: 'Luke Forbes', url: 'https://calendly.com/luke-forbes-mailplus/mailplus-intro-call-luke' },
];

const ResponsiveProgress = ({ currentStep, totalSteps, labels, onStepClick }: { currentStep: number; totalSteps: number; labels: string[], onStepClick: (step: number) => void; }) => {
    const isCompleted = currentStep >= totalSteps;

    return (
        <div className="flex items-center w-full" aria-label={`Step ${currentStep} of ${totalSteps}`}>
            {labels.map((label, index) => {
                const step = index + 1;
                const isStepCompleted = currentStep > step;
                const isCurrent = currentStep === step;

                return (
                    <React.Fragment key={step}>
                        <div className="flex flex-col items-center">
                            <button
                                onClick={() => isCompleted && onStepClick(step)}
                                disabled={!isCompleted}
                                className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300",
                                    isStepCompleted ? "bg-primary text-primary-foreground" :
                                    isCurrent ? "border-2 border-primary bg-primary/10 text-primary" :
                                    "bg-muted text-muted-foreground",
                                    isCompleted && "cursor-pointer hover:ring-2 hover:ring-primary"
                                )}
                            >
                                {isStepCompleted ? <Check className="w-5 h-5" /> : step}
                            </button>
                            <p className={cn(
                                "text-xs mt-1 text-center hidden md:block",
                                isCurrent ? "font-bold text-primary" : "text-muted-foreground"
                            )}>
                                {label}
                            </p>
                        </div>
                        {step < labels.length && (
                            <div className={cn(
                                "flex-1 h-0.5 transition-all duration-300",
                                currentStep > step ? "bg-primary" : "bg-muted"
                            )} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default function CheckInPage() {
    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentStep, setCurrentStep] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    
    const [isLogOutcomeOpen, setIsLogOutcomeOpen] = useState(false);
    const [isServiceSelectionOpen, setIsServiceSelectionOpen] = useState(false);
    const [serviceSelectionMode, setServiceSelectionMode] = useState<'Free Trial' | 'Signup'>('Signup');
    const [isLogNoteOpen, setIsLogNoteOpen] = useState(false);
    const [isLocalMileAccessOpen, setIsLocalMileAccessOpen] = useState(false);
    const [isRevisitDialogOpen, setIsRevisitDialogOpen] = useState(false);

    const [isAddingContact, setIsAddingContact] = useState(false);
    const [contacts, setContacts] = useState<Contact[]>([]);
    
    const [finalDiscoveryData, setFinalDiscoveryData] = useState<DiscoveryData | null>(null);
    const [isProspecting, setIsProspecting] = useState(false);
    const [isLoadingLocalMile, setIsLoadingLocalMile] = useState(false);
    const [isLoadingMPProducts, setIsLoadingMPProducts] = useState(false);

    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();

    const methods = useForm<Partial<z.infer<typeof discoverySchema>>>({
        resolver: zodResolver(discoverySchema.partial()),
        defaultValues: {
            checkInCompleted: true
        }
    });
    
    const newContactForm = useForm<z.infer<typeof newContactSchema>>({
        resolver: zodResolver(newContactSchema),
        defaultValues: { name: '', title: '', email: '', phone: '' }
    });

    useEffect(() => {
        const fetchLeadData = async () => {
            const leadId = params.leadId as string;
            if (!leadId) {
                router.push('/field-sales');
                return;
            }
            try {
                const leadData = await getLeadFromFirebase(leadId, true);
                if (leadData) {
                    setLead(leadData);
                    setContacts(leadData.contacts || []);
                    if (leadData.discoveryData) {
                        methods.reset(leadData.discoveryData);
                    }
                    await logActivity(leadId, { type: 'Update', notes: 'Checked in at location via map.' });
                } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'Lead not found.' });
                    router.push('/field-sales');
                }
            } catch (error) {
                console.error(error);
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to load lead data.' });
            } finally {
                setLoading(false);
            }
        };
        fetchLeadData();
    }, [params.leadId, router, toast, methods]);

    const handleNext = async () => {
        setIsSaving(true);
        try {
            let isValid = true;
            if (currentStep === 3) {
                 isValid = await methods.trigger(['relevanceCheck']);
                 if (!isValid) {
                    toast({ variant: "destructive", title: "Missing Information", description: "Please answer the relevance question before proceeding." });
                    setIsSaving(false);
                    return;
                 }
            }
            
            const currentData = { ...methods.getValues() };
            
            // Sanitize undefined values before saving to Firestore
            for (const key in currentData) {
                if (currentData[key as keyof typeof currentData] === undefined) {
                    delete currentData[key as keyof typeof currentData];
                }
            }

            if(lead?.id && Object.keys(currentData).length > 0) {
                const leadRef = doc(firestore, 'leads', lead.id);
                await updateDoc(leadRef, { discoveryData: currentData });
            }
            
            if (currentStep === TOTAL_STEPS) { // If it's the last data entry step
                const discoveryData = calculateScoreAndRouting(methods.getValues());
                setFinalDiscoveryData(discoveryData);
                await updateLeadDiscoveryData(lead!.id, discoveryData);
                await logActivity(lead!.id, { type: 'Update', notes: 'Discovery questions form was completed.' });
                setCurrentStep(prev => prev + 1); // Go to final actions step
            } else if (currentStep === 3 && methods.getValues('relevanceCheck') === 'No') {
                    setCurrentStep(prev => prev + 2); // Skip step 4
            } else {
                setCurrentStep(prev => prev + 1);
            }
        } catch (error: any) {
            console.error("Failed to save discovery data:", error);
            toast({ variant: "destructive", title: "Save Error", description: `Could not save progress. Please try again. Error: ${error.message}` });
        } finally {
            setIsSaving(false);
        }
    };

    const handleBack = () => {
         if (currentStep === 5 && methods.getValues('relevanceCheck') === 'No') {
            setCurrentStep(prev => prev - 2); // Go back to step 3
        } else {
            setCurrentStep(prev => prev - 1);
        }
    };
    
    const handleStepClick = (step: number) => {
        if (currentStep >= TOTAL_STEPS + 1) {
            setCurrentStep(step);
        }
    };
    
    const handleAddContact = async (values: z.infer<typeof newContactSchema>) => {
        if (!lead) return;
        setIsAddingContact(true);
        try {
            const newContactId = await addContactToLead(lead.id, values);
            const newContact: Contact = { ...values, id: newContactId };
            setContacts(prev => [...prev, newContact]);
            newContactForm.reset();
            toast({ title: "Success", description: "New contact added." });
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to add contact." });
        } finally {
            setIsAddingContact(false);
        }
    };
    
     const handleContactTitleUpdate = async (contactId: string, newTitle: string) => {
        if (!lead) return;
        try {
            await updateContactInLead(lead.id, contactId, { title: newTitle });
            setContacts(prev => prev.map(c => c.id === contactId ? { ...c, title: newTitle } : c));
            toast({ title: 'Success', description: 'Contact title updated.' });
        } catch (error) {
            console.error('Failed to update contact title:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update contact title.' });
        }
    };
    
     const handleProspectWebsite = async () => {
        if (!lead || !lead.websiteUrl) {
            toast({ variant: "destructive", title: "No Website", description: "No website URL available for this lead to prospect." });
            return;
        }
        setIsProspecting(true);
        try {
            const result = await prospectWebsiteTool({ leadId: lead.id, websiteUrl: lead.websiteUrl });

            if (result.logoUrl) {
                await updateLeadAvatar(lead.id, result.logoUrl);
                setLead(prev => prev ? { ...prev, avatarUrl: result.logoUrl! } : null);
                toast({ title: "Logo Found!", description: "Company logo has been updated." });
            }
            if (result.companyDescription) {
                setLead(prev => prev ? { ...prev, companyDescription: result.companyDescription! } : null);
                toast({ title: "Description Generated", description: "Company description has been updated." });
            }
            if (result.contacts && result.contacts.length > 0) {
                setContacts(prev => [...prev, ...result.contacts!]);
                toast({ title: "Success", description: `${result.contacts.length} new contact(s) found and saved.` });
            } else {
                toast({ title: "No New Contacts", description: "No new contacts were found on the website." });
            }
        } catch (error) {
            console.error("Failed to prospect website:", error);
            toast({ variant: "destructive", title: "Error", description: "Failed to prospect website." });
        } finally {
            setIsProspecting(false);
        }
    };

    const handleNoteLogged = () => {
      // Re-fetch or optimistically update lead data if necessary.
      // For now, just closes the dialog.
      setIsLogNoteOpen(false);
    };

    const handleLocalMileTrial = async () => {
        if (!lead) return;
        setIsLoadingLocalMile(true);
        const { id: toastId } = toast({ title: 'Processing...', description: 'Setting up LocalMile free trial.' });
        try {
            const responseBody = await initiateLocalMileTrial({ leadId: lead.id });

            if (responseBody.success === true) {
                await updateLeadStatus(lead.id, 'LocalMile Pending');
                toast.update(toastId, { title: 'Success!', description: 'LocalMile free trial initiated. Lead status updated to "LocalMile Pending".' });
                router.push('/leads/map');
            } else if (responseBody.success === false && responseBody.message === "Lead Already Synced to LocalMile") {
                toast.update(toastId, { variant: "default", title: 'Already Synced', description: 'This lead has already been synced for a LocalMile trial.' });
            } else {
                throw new Error(responseBody.message || 'An unknown error occurred in NetSuite.');
            }

        } catch (error: any) {
            console.error('LocalMile free trial failed:', error);
            toast.update(toastId, { variant: 'destructive', title: 'Error', description: error.message || 'Could not initiate LocalMile free trial.' });
        } finally {
            setIsLoadingLocalMile(false);
        }
    };

    const openLocalMileDialog = () => {
        if (!lead?.contacts || lead.contacts.length === 0) {
            toast({
                variant: 'destructive',
                title: 'No Contacts Found',
                description: 'Please add at least one contact before initiating a LocalMile trial.',
            });
            return;
        }
        setIsLocalMileAccessOpen(true);
    };

    const handleMPProductsTrial = async () => {
        if (!lead) return;
        setIsLoadingMPProducts(true);
        const { id: toastId } = toast({ title: 'Processing...', description: 'Initiating ShipMate free trial.' });
        try {
            const responseBody = await initiateMPProductsTrial({ leadId: lead.id });
            if (responseBody.success) {
                await updateLeadStatus(lead.id, 'Trialing ShipMate');
                toast.update(toastId, { title: 'Success!', description: 'ShipMate free trial has been initiated and lead status updated.' });
                router.push('/leads/map');
            } else {
                throw new Error(responseBody.message || 'An unknown error occurred in NetSuite.');
            }
        } catch (error: any) {
            console.error('ShipMate free trial failed:', error);
            toast.update(toastId, { variant: 'destructive', title: 'Error', description: error.message || 'Could not initiate ShipMate free trial.' });
        } finally {
            setIsLoadingMPProducts(false);
        }
    };

    const handleRevisitScheduled = () => {
        setIsRevisitDialogOpen(false);
        router.push('/field-sales');
    };


    const renderStep = () => {
        switch (currentStep) {
            case 1: return <CompanyDetailsStep lead={lead!} onNext={handleNext} onProspect={handleProspectWebsite} isProspecting={isProspecting} onOpenLogOutcome={() => setIsLogOutcomeOpen(true)} onOpenLogNote={() => setIsLogNoteOpen(true)} isSaving={isSaving} onOpenRevisitDialog={() => setIsRevisitDialogOpen(true)} />;
            case 2: return <ContactDetailsStep contacts={contacts} onAddContact={handleAddContact} form={newContactForm} isAddingContact={isAddingContact} onTitleUpdate={handleContactTitleUpdate} onNext={handleNext} onBack={handleBack} onOpenLogOutcome={() => setIsLogOutcomeOpen(true)} onOpenLogNote={() => setIsLogNoteOpen(true)} isSaving={isSaving} onOpenRevisitDialog={() => setIsRevisitDialogOpen(true)} />;
            case 3: return <DiscoveryStep0 onNext={handleNext} onBack={handleBack} onOpenLogOutcome={() => setIsLogOutcomeOpen(true)} onOpenLogNote={() => setIsLogNoteOpen(true)} isSaving={isSaving} onOpenRevisitDialog={() => setIsRevisitDialogOpen(true)} />;
            case 4: return <DiscoveryStep1 onNext={handleNext} onBack={handleBack} onOpenLogOutcome={() => setIsLogOutcomeOpen(true)} onOpenLogNote={() => setIsLogNoteOpen(true)} isSaving={isSaving} onOpenRevisitDialog={() => setIsRevisitDialogOpen(true)} />;
            case 5: return <DiscoveryStep2 onNext={handleNext} onBack={handleBack} onOpenLogOutcome={() => setIsLogOutcomeOpen(true)} onOpenLogNote={() => setIsLogNoteOpen(true)} isSaving={isSaving} onOpenRevisitDialog={() => setIsRevisitDialogOpen(true)} />;
            case 6: return <DiscoveryStep3 onNext={handleNext} onBack={handleBack} onOpenLogOutcome={() => setIsLogOutcomeOpen(true)} onOpenLogNote={() => setIsLogNoteOpen(true)} isSaving={isSaving} onOpenRevisitDialog={() => setIsRevisitDialogOpen(true)} />;
            case 7: return <DiscoveryStep4 onNext={handleNext} onBack={handleBack} onOpenLogOutcome={() => setIsLogOutcomeOpen(true)} onOpenLogNote={() => setIsLogNoteOpen(true)} isSaving={isSaving} onOpenRevisitDialog={() => setIsRevisitDialogOpen(true)} />;
            case 8: return <DiscoveryStep5 onNext={handleNext} onBack={handleBack} onOpenLogOutcome={() => setIsLogOutcomeOpen(true)} onOpenLogNote={() => setIsLogNoteOpen(true)} isSaving={isSaving} onOpenRevisitDialog={() => setIsRevisitDialogOpen(true)} />;
            case 9: return <FinalActionsStep onBack={handleBack} lead={lead!} discoveryData={finalDiscoveryData} onOpenDialog={(type) => {
                setServiceSelectionMode(type === 'free-trial' ? 'Free Trial' : 'Signup');
                setIsServiceSelectionOpen(true);
            }} onOpenLogOutcome={() => setIsLogOutcomeOpen(true)} onOpenLogNote={() => setIsLogNoteOpen(true)} onOpenRevisitDialog={() => setIsRevisitDialogOpen(true)} handleOpenLocalMileDialog={openLocalMileDialog} isLoadingLocalMile={isLoadingLocalMile} handleMPProductsTrial={handleMPProductsTrial} isLoadingMPProducts={isLoadingMPProducts} />;
            default: return null;
        }
    };

    if (loading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader /></div>;
    }

    if (!lead) {
        return <div className="flex h-screen w-full items-center justify-center"><p>Lead not found.</p></div>;
    }

    return (
        <FormProvider {...methods}>
            <div className="flex flex-col bg-background max-w-2xl mx-auto w-full h-svh">
                <div className='p-4'>
                    <header className="flex-shrink-0 flex items-center justify-between">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft /></Button>
                        <div className="flex flex-col items-center">
                            <h1 className="text-lg font-bold">{lead.companyName}</h1>
                            <p className="text-sm text-muted-foreground">{lead.address?.city || ''}</p>
                        </div>
                        <div className="w-20 text-center">
                            <div className="border border-border rounded-full px-2 py-1 text-xs">
                                Step {Math.min(currentStep, TOTAL_STEPS + 1)}/{TOTAL_STEPS + 1}
                            </div>
                        </div>
                    </header>

                    <div className="my-4 flex-shrink-0">
                      <ResponsiveProgress currentStep={currentStep} totalSteps={TOTAL_STEPS + 1} labels={stepLabels} onStepClick={handleStepClick} />
                    </div>
                </div>
                
                <main className="flex-grow overflow-y-auto px-4 pb-4">
                    {renderStep()}
                </main>
                 
                {/* Dialogs for Actions */}
                <PostCallOutcomeDialog 
                    isOpen={isLogOutcomeOpen} 
                    onClose={() => setIsLogOutcomeOpen(false)}
                    lead={lead}
                    onOutcomeLogged={() => { setIsLogOutcomeOpen(false); router.push('/field-sales'); }}
                />
                 <Dialog open={isServiceSelectionOpen} onOpenChange={setIsServiceSelectionOpen}>
                    <DialogContent>
                        <ServiceSelectionDialog
                            isOpen={isServiceSelectionOpen}
                            onOpenChange={setIsServiceSelectionOpen}
                            leadId={lead.id}
                            mode={serviceSelectionMode}
                        />
                    </DialogContent>
                </Dialog>
                 <LogNoteDialog lead={lead} onNoteLogged={handleNoteLogged} isOpen={isLogNoteOpen} onOpenChange={setIsLogNoteOpen}>
                    {/* This is just a holder, the dialog is controlled by isOpen state */}
                    <div/>
                 </LogNoteDialog>
                  {isLocalMileAccessOpen && (
                    <LocalMileAccessDialog
                        isOpen={isLocalMileAccessOpen}
                        onOpenChange={setIsLocalMileAccessOpen}
                        lead={lead}
                        onConfirm={handleLocalMileTrial}
                    />
                 )}
                 {isRevisitDialogOpen && (
                    <RevisitDialog 
                        isOpen={isRevisitDialogOpen}
                        onOpenChange={setIsRevisitDialogOpen}
                        lead={lead}
                        onRevisitScheduled={handleRevisitScheduled}
                    />
                 )}
            </div>
        </FormProvider>
    );
}

const StepWrapper = ({ title, description, script, children, onNext, onBack, onOpenLogOutcome, onOpenLogNote, onOpenRevisitDialog, isSaving }: { title: string, description: string, script?: string, children: React.ReactNode, onNext?: () => void; onBack?: () => void; onOpenLogOutcome: () => void; onOpenLogNote: () => void; onOpenRevisitDialog: () => void; isSaving?: boolean }) => {
    return (
        <div className="space-y-6">
            <div className="text-left space-y-2">
                <h2 className="text-2xl font-bold">{title}</h2>
                <p className="text-muted-foreground">{description}</p>
                {script && <p className="text-sm italic text-primary p-2 bg-primary/10 border-l-4 border-primary rounded-r-md">"{script}"</p>}
            </div>
            <Card>
                <CardContent className="p-6">
                    {children}
                </CardContent>
                {(onNext || onBack) && (
                    <CardFooter className="flex justify-between items-center gap-2">
                         {onBack && <Button variant="outline" onClick={onBack} disabled={isSaving}>Back</Button>}
                         <div className="flex items-center gap-2">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline"><MoreVertical className="mr-2 h-4 w-4"/>Actions</Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onSelect={onOpenLogOutcome}><PhoneCall className="mr-2 h-4 w-4"/>Log Outcome</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={onOpenLogNote}><ClipboardEdit className="mr-2 h-4 w-4"/>Log Note</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={onOpenRevisitDialog}><History className="mr-2 h-4 w-4"/>Schedule Revisit</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            {onNext && <Button onClick={onNext} disabled={isSaving}>{isSaving ? <Loader /> : 'Continue'}</Button>}
                         </div>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
};

const CompanyDetailsStep = ({ lead, onNext, onProspect, isProspecting, onOpenLogOutcome, onOpenLogNote, onOpenRevisitDialog, isSaving }: { lead: Lead; onNext: () => void; onProspect: () => void; isProspecting: boolean; onOpenLogOutcome: () => void; onOpenLogNote: () => void; onOpenRevisitDialog: () => void; isSaving?: boolean }) => {
    return (
        <StepWrapper title="Company Details" description="Confirm you're at the right place." onNext={onNext} onOpenLogOutcome={onOpenLogOutcome} onOpenLogNote={onOpenLogNote} onOpenRevisitDialog={onOpenRevisitDialog} isSaving={isSaving}>
            <div className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="businessName">Business name</Label>
                    <Input id="businessName" readOnly value={lead.companyName} />
                </div>
                <div className="space-y-2">
                    <Label>Address</Label>
                    <div className="grid grid-cols-1 gap-2 border p-3 rounded-md bg-secondary/30">
                        <Input readOnly value={lead.address?.address1 || ''} placeholder="Address 1" />
                        <Input readOnly value={lead.address?.street || ''} placeholder="Street" />
                        <div className="grid grid-cols-3 gap-2">
                            <Input readOnly value={lead.address?.city || ''} placeholder="Suburb" />
                            <Input readOnly value={lead.address?.state || ''} placeholder="State" />
                            <Input readOnly value={lead.address?.zip || ''} placeholder="Postcode" />
                        </div>
                    </div>
                </div>
                 <Button variant="outline" size="sm" onClick={onProspect} disabled={isProspecting || !lead.websiteUrl} className="w-full">
                    {isProspecting ? <Loader /> : <><Sparkles className="mr-2 h-4 w-4" /><span>AI Prospect</span></>}
                </Button>
            </div>
        </StepWrapper>
    );
};

const ContactDetailsStep = ({ contacts, onAddContact, form, isAddingContact, onTitleUpdate, onNext, onBack, onOpenLogOutcome, onOpenLogNote, onOpenRevisitDialog, isSaving }: { contacts: Contact[], onAddContact: (values: any) => void, form: any, isAddingContact: boolean, onTitleUpdate: (contactId: string, newTitle: string) => void, onNext: () => void; onBack: () => void; onOpenLogOutcome: () => void; onOpenLogNote: () => void; onOpenRevisitDialog: () => void; isSaving?: boolean }) => {
    const [editingTitle, setEditingTitle] = useState<{ [key: string]: string }>({});

    const handleTitleChange = (contactId: string, value: string) => {
        setEditingTitle(prev => ({ ...prev, [contactId]: value }));
    };

    return (
        <StepWrapper title="Contact Details" description="Confirm you're speaking to the right person or add a new contact." script='"Hi there, I was hoping to speak to the person in charge of your postage and deliveries?"' onNext={onNext} onBack={onBack} onOpenLogOutcome={onOpenLogOutcome} onOpenLogNote={onOpenLogNote} onOpenRevisitDialog={onOpenRevisitDialog} isSaving={isSaving}>
            <div className="space-y-4">
                <h4 className="font-semibold text-lg">Existing Contacts</h4>
                <p className="text-sm text-muted-foreground">Select the title of the person you are speaking with.</p>
                 {contacts.length > 0 ? (
                    <div className="space-y-3">
                    {contacts.map(contact => (
                        <Card key={contact.id} className="p-3 bg-secondary/30">
                            <CardContent className="p-0 space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="font-semibold">{contact.name}</p>
                                    <div className="w-1/2">
                                        <Select
                                            value={editingTitle[contact.id] ?? contact.title}
                                            onValueChange={(value) => {
                                                handleTitleChange(contact.id, value);
                                                onTitleUpdate(contact.id, value);
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select title..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Owner">Owner</SelectItem>
                                                <SelectItem value="Influencer">Influencer</SelectItem>
                                                <SelectItem value="Gatekeeper">Gatekeeper</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="text-sm text-muted-foreground mt-1 space-y-1">
                                    <p className="flex items-center gap-2"><Mail className="h-4 w-4"/>{contact.email}</p>
                                    <p className="flex items-center gap-2"><Phone className="h-4 w-4"/>{contact.phone}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    </div>
                ) : <p className="text-sm text-center text-muted-foreground">No contacts found.</p>}
                
                <hr className="my-4 border-border" />

                <h4 className="font-semibold">Add New Contact</h4>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onAddContact)} className="space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} placeholder="John Doe" /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="title" render={({ field }) => (
                                <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} placeholder="Manager" /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email" placeholder="john.d@example.com" /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="phone" render={({ field }) => (
                                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} type="tel" placeholder="0412 345 678" /></FormControl><FormMessage /></FormItem>
                            )}/>
                         </div>
                        <Button type="submit" disabled={isAddingContact}>{isAddingContact ? <Loader /> : 'Add Contact'}</Button>
                    </form>
                </Form>
            </div>
        </StepWrapper>
    );
};

const DiscoveryStep0 = ({ onNext, onBack, onOpenLogOutcome, onOpenLogNote, onOpenRevisitDialog, isSaving }: { onNext: () => void; onBack: () => void; onOpenLogOutcome: () => void; onOpenLogNote: () => void; onOpenRevisitDialog: () => void; isSaving?: boolean }) => {
    const { control } = useFormContext();
    return (
        <StepWrapper title="Relevance Check" description="Hard stop: if nobody leaves the business, we don't force a sale." script="Do people here ever leave the office during the day to get things done?" onNext={onNext} onBack={onBack} onOpenLogOutcome={onOpenLogOutcome} onOpenLogNote={onOpenLogNote} onOpenRevisitDialog={onOpenRevisitDialog} isSaving={isSaving}>
             <FormField control={control} name="relevanceCheck" render={({ field }) => (
                <FormItem className="space-y-3"><FormLabel>Do people leave the office during the day?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col gap-4"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">Yes, people do leave the office.</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">No, they rarely/never leave.</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>
            )}/>
        </StepWrapper>
    )
};

const reasonsToLeave = ['Post office', 'Banking / deposits', 'Local deliveries', 'Supplier drop-offs', 'Admin / errands', 'Other'];
const DiscoveryStep1 = ({ onNext, onBack, onOpenLogOutcome, onOpenLogNote, onOpenRevisitDialog, isSaving }: { onNext: () => void; onBack: () => void; onOpenLogOutcome: () => void; onOpenLogNote: () => void; onOpenRevisitDialog: () => void; isSaving?: boolean }) => {
    const { control } = useFormContext();
    return (
        <StepWrapper title="Reasons People Leave" description="Select all that apply. This is the primary segmentation key." script="What are some of the things people have to leave the office for?" onNext={onNext} onBack={onBack} onOpenLogOutcome={onOpenLogOutcome} onOpenLogNote={onOpenLogNote} onOpenRevisitDialog={onOpenRevisitDialog} isSaving={isSaving}>
            <FormField
                control={control}
                name="reasonsToLeave"
                render={() => (
                    <FormItem>
                        <div className="grid grid-cols-2 gap-4">
                            {reasonsToLeave.map((item) => (
                                <FormField
                                    key={item}
                                    control={control}
                                    name="reasonsToLeave"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value?.includes(item)}
                                                    onCheckedChange={(checked) => {
                                                        const newValue = checked
                                                            ? [...(field.value || []), item]
                                                            : field.value?.filter((value) => value !== item);
                                                        field.onChange(newValue);
                                                    }}
                                                />
                                            </FormControl>
                                            <FormLabel className="font-normal">{item}</FormLabel>
                                        </FormItem>
                                    )}
                                />
                            ))}
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </StepWrapper>
    );
};


const DiscoveryStep2 = ({ onNext, onBack, onOpenLogOutcome, onOpenLogNote, onOpenRevisitDialog, isSaving }: { onNext: () => void; onBack: () => void; onOpenLogOutcome: () => void; onOpenLogNote: () => void; onOpenRevisitDialog: () => void; isSaving?: boolean }) => {
    const { control, watch } = useFormContext();
    const watchLogisticsSetup = watch('logisticsSetup');
    return (
        <StepWrapper title="Discovery: Logistics" description="Understand their current postage process." script="How do you currently manage your post and parcels? Do you go to the post office, or does someone pick it up?" onNext={onNext} onBack={onBack} onOpenLogOutcome={onOpenLogOutcome} onOpenLogNote={onOpenLogNote} onOpenRevisitDialog={onOpenRevisitDialog} isSaving={isSaving}>
            <div className="space-y-8">
                <FormField control={control} name="postOfficeRelationship" render={({ field }) => (
                    <FormItem className="space-y-3"><FormLabel>Do you have a relationship with Australia Post?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-x-4 gap-y-2"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Yes-Driver" /></FormControl><FormLabel className="font-normal">Yes - Driver</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Yes-Post Office walk up" /></FormControl><FormLabel className="font-normal">Yes - Post Office walk up</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={control} name="logisticsSetup" render={({ field }) => (
                    <FormItem className="space-y-3"><FormLabel>How do you lodge items?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-x-4 gap-y-2"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Drop-off" /></FormControl><FormLabel className="font-normal">Drop-off</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Routine collection" /></FormControl><FormLabel className="font-normal">Routine collection</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Ad-hoc" /></FormControl><FormLabel className="font-normal">Ad-hoc</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>
                )}/>
                {watchLogisticsSetup === 'Routine collection' && <FormField control={control} name="servicePayment" render={({ field }) => (
                    <FormItem className="space-y-3 ml-6"><FormLabel>If using collection: Do you pay for this service?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>
                )}/>}
            </div>
        </StepWrapper>
    )
};

const packageTypes = [ { id: '500g', label: '<500g' }, { id: '1-3kg', label: '1-3kg' }, { id: '5kg+', label: '5kg+' }, { id: '10kg+', label: '10kg+' }, { id: '20kg+', label: '20kg+' } ] as const;
const DiscoveryStep3 = ({ onNext, onBack, onOpenLogOutcome, onOpenLogNote, onOpenRevisitDialog, isSaving }: { onNext: () => void; onBack: () => void; onOpenLogOutcome: () => void; onOpenLogNote: () => void; onOpenRevisitDialog: () => void; isSaving?: boolean }) => {
    const { control } = useFormContext();
    return (
        <StepWrapper title="Discovery: Shipping Profile" description="What and how much are they shipping?" script="Roughly how many parcels would you send a week? And what's the typical size and weight?" onNext={onNext} onBack={onBack} onOpenLogOutcome={onOpenLogOutcome} onOpenLogNote={onOpenLogNote} onOpenRevisitDialog={onOpenRevisitDialog} isSaving={isSaving}>
            <div className="space-y-8">
                <FormField control={control} name="shippingVolume" render={({ field }) => (
                    <FormItem className="space-y-3"><FormLabel>How many items per week?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-x-4 gap-y-2">{(['<5', '<20', '20-100', '100+'] as const).map(val => (<FormItem key={`volume-${val}`} className="flex items-center space-x-2"><FormControl><RadioGroupItem value={val} /></FormControl><FormLabel className="font-normal">{val}</FormLabel></FormItem>))}</RadioGroup></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={control} name="expressVsStandard" render={({ field }) => (
                    <FormItem className="space-y-3"><FormLabel>What % of your shipping is Express vs Standard?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-x-4 gap-y-2">{(['Mostly Standard (>=80%)', 'Balanced Mix (20-79% Express)', 'Mostly Express (>=80%)'] as const).map(val => (<FormItem key={`express-${val}`} className="flex items-center space-x-2"><FormControl><RadioGroupItem value={val} /></FormControl><FormLabel className="font-normal">{val}</FormLabel></FormItem>))}</RadioGroup></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={control} name="packageType" render={() => (
                    <FormItem><div className="mb-4"><FormLabel className="text-base">What is typical size/weight?</FormLabel></div><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{packageTypes.map((item) => (<FormField key={item.id} control={control} name="packageType" render={({ field }) => (<FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(item.label)} onCheckedChange={(checked) => { return checked ? field.onChange([...(field.value || []), item.label]) : field.onChange(field.value?.filter((value) => value !== item.label)) }}/></FormControl><FormLabel className="font-normal">{item.label}</FormLabel></FormItem>)}/>))}</div><FormMessage /></FormItem>
                )}/>
            </div>
        </StepWrapper>
    )
};

const currentProviders = [ { id: 'multiple', label: 'Multiple' }, { id: 'auspost', label: 'AusPost' }, { id: 'couriersplease', label: 'CouriersPlease' }, { id: 'aramex', label: 'Aramex' }, { id: 'startrack', label: 'StarTrack' }, { id: 'tge', label: 'TGE' }, { id: 'fedex', label: 'FedEx/TNT' }, { id: 'allied', label: 'Allied' }, { id: 'other', label: 'Other' } ] as const;
const eCommerceTechs = [ { id: 'mypost', label: 'MyPost' }, { id: 'shopify', label: 'Shopify' }, { id: 'woo', label: 'Woo' }, { id: 'sendle', label: 'Sendle' }, { id: 'other', label: 'Other' }, { id: 'none', label: 'None' } ] as const;
const DiscoveryStep4 = ({ onNext, onBack, onOpenLogOutcome, onOpenLogNote, onOpenRevisitDialog, isSaving }: { onNext: () => void; onBack: () => void; onOpenLogOutcome: () => void; onOpenLogNote: () => void; onOpenRevisitDialog: () => void; isSaving?: boolean }) => {
    const { control } = useFormContext();
    return (
         <StepWrapper title="Discovery: Providers & Tech" description="Who are they using and what tech do they have?" script="Which shipping carriers do you use at the moment? And what software do you use to manage labels?" onNext={onNext} onBack={onBack} onOpenLogOutcome={onOpenLogOutcome} onOpenLogNote={onOpenLogNote} onOpenRevisitDialog={onOpenRevisitDialog} isSaving={isSaving}>
            <div className="space-y-8">
                <FormField
                    control={control}
                    name="currentProvider"
                    render={() => (
                        <FormItem>
                            <FormLabel className="text-base">Who do you use for shipping?</FormLabel>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                                {currentProviders.map((item) => (
                                    <FormField
                                        key={item.id}
                                        control={control}
                                        name="currentProvider"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value?.includes(item.label)}
                                                        onCheckedChange={(checked) => {
                                                            const newValue = checked
                                                                ? [...(field.value || []), item.label]
                                                                : field.value?.filter((value) => value !== item.label);
                                                            field.onChange(newValue);
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormLabel className="font-normal">{item.label}</FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                ))}
                            </div>
                            <FormField control={control} name="otherProvider" render={({ field }) => (
                                <FormItem className="mt-2">
                                    <FormLabel className="sr-only">Other Shipping Provider</FormLabel>
                                    <FormControl><Input {...field} placeholder="Other provider..." /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormMessage />
                        </FormItem>
                )}/>
                <FormField control={control} name="eCommerceTech" render={() => (
                    <FormItem><div className="mb-4"><FormLabel className="text-base">What platform do you use for labels?</FormLabel></div><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{eCommerceTechs.map((item) => (<FormField key={item.id} control={control} name="eCommerceTech" render={({ field }) => (<FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(item.label)} onCheckedChange={(checked) => { return checked ? field.onChange([...(field.value || []), item.label]) : field.onChange(field.value?.filter((value) => value !== item.label)) }}/></FormControl><FormLabel className="font-normal">{item.label}</FormLabel></FormItem>)}/>))}</div><FormField control={control} name="otherECommerceTech" render={({ field }) => (<FormItem className="mt-2"><FormLabel className="sr-only">Other E-commerce Tech</FormLabel><FormControl><Input {...field} placeholder="Other platform..." /></FormControl><FormMessage /></FormItem>)}/><FormMessage /></FormItem>
                )}/>
            </div>
        </StepWrapper>
    )
};

const DiscoveryStep5 = ({ onNext, onBack, onOpenLogOutcome, onOpenLogNote, onOpenRevisitDialog, isSaving }: { onNext: () => void; onBack: () => void; onOpenLogOutcome: () => void; onOpenLogNote: () => void; onOpenRevisitDialog: () => void; isSaving?: boolean }) => {
    const { control } = useFormContext();
    return (
        <StepWrapper title="Discovery: Business Needs" description="Final questions to qualify the lead and identify pain points." script="Last couple of questions - do you ever use same-day couriers? And who in the business makes the final call on shipping partners?" onNext={onNext} onBack={onBack} onOpenLogOutcome={onOpenLogOutcome} onOpenLogNote={onOpenLogNote} onOpenRevisitDialog={onOpenRevisitDialog} isSaving={isSaving}>
            <div className="space-y-8">
                <FormField control={control} name="sameDayCourier" render={({ field }) => (
                    <FormItem className="space-y-3"><FormLabel>Do you use same-day couriers?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-x-4 gap-y-2">{(['Yes', 'Occasional', 'Never'] as const).map(val => (<FormItem key={`sameday-${val}`} className="flex items-center space-x-2"><FormControl><RadioGroupItem value={val} /></FormControl><FormLabel className="font-normal">{val}</FormLabel></FormItem>))}</RadioGroup></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={control} name="decisionMaker" render={({ field }) => (
                    <FormItem className="space-y-3"><FormLabel>Who decides shipping?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-x-4 gap-y-2">{(['Owner', 'Influencer', 'Gatekeeper'] as const).map(val => (<FormItem key={`decision-${val}`} className="flex items-center space-x-2"><FormControl><RadioGroupItem value={val} /></FormControl><FormLabel className="font-normal">{val}</FormLabel></FormItem>))}</RadioGroup></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={control} name="painPoints" render={({ field }) => (
                    <FormItem><FormLabel>Pain Points</FormLabel><FormControl><Textarea placeholder="Describe any pain points the lead is experiencing..." {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
            </div>
        </StepWrapper>
    )
};

const FinalActionsStep = ({ onOpenDialog, lead, discoveryData, onBack, onOpenLogOutcome, onOpenLogNote, onOpenRevisitDialog, isLoadingLocalMile, handleOpenLocalMileDialog, isLoadingMPProducts, handleMPProductsTrial }: { onOpenDialog: (type: 'free-trial' | 'signup') => void, lead: Lead, discoveryData: DiscoveryData | null, onBack: () => void, onOpenLogOutcome: () => void; onOpenLogNote: () => void; onOpenRevisitDialog: () => void; isLoadingLocalMile: boolean; handleOpenLocalMileDialog: () => void; isLoadingMPProducts: boolean; handleMPProductsTrial: () => void; }) => {
    const handleRepSelection = (repName: string, repUrl: string) => {
        const calendlyUrl = new URL(repUrl);
        if (lead.id) calendlyUrl.searchParams.append('a1', lead.id);
        window.open(calendlyUrl.toString(), '_blank');
    };
    const router = useRouter();

  return (
    <div className="space-y-6">
        <div className="text-left space-y-2">
            <h2 className="text-2xl font-bold">Next Steps & Analysis</h2>
            <p className="text-muted-foreground">The discovery phase is complete. Review the analysis and choose the next action for this lead.</p>
        </div>
        <Card>
            <CardContent className="p-6">
                 {discoveryData ? (
                    <div className="space-y-4">
                            <div className="flex items-center justify-center gap-6 p-4 rounded-lg bg-muted">
                                <div className="flex flex-col items-center">
                                    <p className="text-sm text-muted-foreground">Score</p>
                                    <p className="text-3xl font-bold">{discoveryData.score}</p>
                                </div>
                                <div className="flex flex-col items-center">
                                    <p className="text-sm text-muted-foreground">Routing Tag</p>
                                    <Badge variant="outline" className="text-lg mt-1"><Route className="h-4 w-4 mr-2"/>{discoveryData.routingTag}</Badge>
                                </div>
                            </div>
                            <DiscoveryRadarChart discoveryData={discoveryData} />
                            {discoveryData.scoringReason && (
                                <div className="text-xs text-muted-foreground p-2 border-t">
                                    <strong>Scoring Rationale:</strong> {discoveryData.scoringReason}
                                </div>
                            )}
                    </div>
                ) : (
                    <div className="text-center py-10 text-muted-foreground">Could not generate discovery analysis.</div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t mt-4">
                    <Button size="lg" className="h-auto py-4" onClick={() => onOpenDialog('signup')}><Briefcase className="mr-2"/> Signup</Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="lg" className="h-auto py-4 bg-green-600 hover:bg-green-700">
                          <Star className="mr-2"/> Free Trial
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => onOpenDialog('free-trial')}>Service</DropdownMenuItem>
                        <DropdownMenuItem onSelect={handleMPProductsTrial} disabled={isLoadingMPProducts}>
                            {isLoadingMPProducts ? <Loader /> : 'ShipMate'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={handleOpenLocalMileDialog} disabled={isLoadingLocalMile}>
                            {isLoadingLocalMile ? <Loader /> : 'LocalMile'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="lg" className="h-auto py-4" variant="secondary"><Calendar className="mr-2"/> Schedule Appointment</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            {salesReps.map(rep => (
                                <DropdownMenuItem key={rep.name} onSelect={() => handleRepSelection(rep.name, rep.url)}>{rep.name}</DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button size="lg" className="h-auto py-4" variant="secondary" onClick={onOpenRevisitDialog}><History className="mr-2"/> Schedule Revisit</Button>
                    <Button size="lg" className="h-auto py-4" variant="secondary" onClick={onOpenLogOutcome}><PhoneCall className="mr-2"/> Log Outcome</Button>
                    <Button size="lg" className="h-auto py-4" variant="secondary" onClick={() => router.push('/leads/map')}><Route className="mr-2"/> Back to Route</Button>
                </div>
            </CardContent>
            <CardFooter className="flex justify-start">
                 <Button variant="outline" onClick={onBack}>Back</Button>
            </CardFooter>
        </Card>
    </div>
  )
};

    
