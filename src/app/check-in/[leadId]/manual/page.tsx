'use client';

import { useEffect, useState, useMemo, Fragment, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, FormProvider, useFormContext, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getLeadFromFirebase, updateLeadDiscoveryData, addContactToLead, updateContactInLead, logActivity, getCompaniesFromFirebase, bulkMoveLeadsToBucket, updateLeadStatus, type Note } from '@/services/firebase';
import type { Lead, DiscoveryData, Contact, LeadStatus, Address } from '@/lib/types';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building, User, Phone, Mail, Sparkles, Calendar, ClipboardEdit, PhoneCall, Star, Briefcase, MapPin, Globe, Tag, Route, Check, MoreVertical, History, ExternalLink, Move } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { PostCallOutcomeDialog } from '@/components/post-call-outcome-dialog';
import { LogNoteDialog } from '@/components/log-note-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import React from 'react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { RevisitDialog } from '@/components/revisit-dialog';
import { ScheduleAppointmentDialog } from '@/components/schedule-appointment-dialog';
import { useAuth } from '@/hooks/use-auth';
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { calculateScoreAndRouting } from '@/lib/discovery-scoring';
import { Badge } from '@/components/ui/badge';


const discoverySchema = z.object({
  discoverySignals: z.array(z.string()).optional(),
  inconvenience: z.enum(['Very inconvenient', 'Somewhat inconvenient', 'Not a big issue']).optional(),
  occurrence: z.enum(['Daily', 'Weekly', 'Ad-hoc']).optional(),
  recurring: z.enum(['Yes - predictable', 'Sometimes', 'One-off']).optional(),
});

const newContactSchema = z.object({
    name: z.string().min(1, "Name is required."),
    title: z.string().min(1, "Title is required."),
    email: z.string().email("A valid email is required."),
    phone: z.string().min(1, "Phone number is required."),
});

const TOTAL_STEPS = 4;
const stepLabels = ["Company", "Contact", "Field Discovery", "Finish"];

const ResponsiveProgress = ({ currentStep, totalSteps, labels, onStepClick }: { currentStep: number; totalSteps: number; labels: string[]; onStepClick: (step: number) => void; }) => {
    return (
        <div className="flex items-center w-full" aria-label={"Step " + currentStep + " of " + totalSteps}>
            {labels.map((label, index) => {
                const step = index + 1;
                const isCompleted = currentStep > step;
                const isCurrent = currentStep === step;

                return (
                    <React.Fragment key={step}>
                        <button
                            type="button"
                            onClick={() => onStepClick(step)}
                            className="flex flex-col items-center text-center cursor-pointer disabled:cursor-not-allowed group"
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 group-hover:ring-2 group-hover:ring-primary/50",
                                isCompleted ? "bg-primary text-primary-foreground" : isCurrent ? "border-2 border-primary bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                            )}>
                                {isCompleted ? <Check className="w-5 h-5" /> : step}
                            </div>
                            <p className={cn("text-xs mt-1 hidden md:block", isCurrent ? "font-bold text-primary" : "text-muted-foreground")}>
                                {label}
                            </p>
                        </button>
                        {step < labels.length && (
                            <div className={cn("flex-1 h-0.5 transition-all duration-300", currentStep > step ? "bg-primary" : "bg-muted")} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default function ManualCheckinPage() {
    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentStep, setCurrentStep] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    
    const [isLogOutcomeOpen, setIsLogOutcomeOpen] = useState(false);
    const [isLogNoteOpen, setIsLogNoteOpen] = useState(false);
    const [isRevisitDialogOpen, setIsRevisitDialogOpen] = useState(false);
    const [isScheduleAppointmentOpen, setIsScheduleAppointmentOpen] = useState(false);
    const [isMoveToOutboundOpen, setIsMoveToOutboundOpen] = useState(false);
    const [isMoving, setIsMoving] = useState(false);

    const [isAddingContact, setIsAddingContact] = useState(false);
    const [contacts, setContacts] = useState<Contact[]>([]);

    const [isNearbyCustomersOpen, setIsNearbyCustomersOpen] = useState(false);
    const [nearbyCustomers, setNearbyCustomers] = useState<Lead[]>([]);
    const [allCompanies, setAllCompanies] = useState<Lead[]>([]);
    
    const { userProfile } = useAuth();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();

    const methods = useForm<Partial<z.infer<typeof discoverySchema>>>({
        resolver: zodResolver(discoverySchema.partial()),
    });
    
    const newContactForm = useForm<z.infer<typeof newContactSchema>>({
        resolver: zodResolver(newContactSchema),
        defaultValues: { name: '', title: '', email: '', phone: '' }
    });

    useEffect(() => {
        const fetchInitialData = async () => {
            const leadId = params.leadId as string;
            if (!leadId) {
                router.push('/field-sales');
                return;
            }
            try {
                const [leadData, companiesData] = await Promise.all([
                    getLeadFromFirebase(leadId, true),
                    getCompaniesFromFirebase()
                ]);

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
                setAllCompanies(companiesData);
            } catch (error) {
                console.error(error);
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to load lead data.' });
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [params.leadId, router, toast, methods]);

    const handleSaveAndNext = async () => {
        setIsSaving(true);
        const formValues = methods.getValues();

        try {
            if(lead?.id) {
                const discoveryData = calculateScoreAndRouting(formValues);
                await updateLeadDiscoveryData(lead.id, discoveryData);
                setLead(prev => prev ? { ...prev, discoveryData } : null);
            }
            if (currentStep === 3) {
                 await logActivity(lead!.id, { type: 'Update', notes: 'Manual check-in discovery form was completed.' });
            }
            setCurrentStep(prev => prev + 1);
        } catch (error) {
             toast({ variant: "destructive", title: "Save Error", description: "Could not save progress." });
        } finally {
            setIsSaving(false);
        }
    };

    const handleBack = () => setCurrentStep(prev => prev - 1);
    const handleStepClick = (step: number) => setCurrentStep(step);
    
    const handleMoveToOutbound = async () => {
        if (!lead) return;
        setIsMoving(true);
        
        const assignees = ['Lachlan Ball', 'Grant Leddy'];
        const assignee = assignees[Math.floor(Math.random() * assignees.length)];
    
        try {
            await bulkMoveLeadsToBucket({
                leadIds: [lead.id],
                fieldSales: false,
                assigneeDisplayName: assignee,
                activityNote: 'Moved to Outbound',
                author: userProfile?.displayName
            });
            
            await updateLeadStatus(lead.id, 'Priority Field Lead');
    
            toast({ title: "Success", description: `Lead moved to Outbound bucket and assigned to ${assignee}.` });
            router.push('/field-sales');
    
        } catch (error) {
            console.error("Failed to move lead to outbound:", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not move lead." });
        } finally {
            setIsMoving(false);
            setIsMoveToOutboundOpen(false);
        }
    }
    
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
            toast({ variant: "destructive", title: "Error", description: "Failed to add contact." });
        } finally {
            setIsAddingContact(false);
        }
    };
    
    const handleNoteLogged = (newNote: Note) => {
        setLead(prev => prev ? { ...prev, notes: [newNote, ...(prev.notes || [])] } : null);
        setIsLogNoteOpen(false);
    };

    const handleRevisitScheduled = () => {
        setIsRevisitDialogOpen(false);
        router.push('/field-sales');
    };
    
    const handleFindNearbyCustomers = () => {
        if (!lead?.latitude || !lead.longitude || !window.google?.maps?.geometry) {
            toast({ variant: 'destructive', title: 'Location Missing', description: 'Lead has no coordinates.' });
            return;
        }
        const leadLatLng = new window.google.maps.LatLng(lead.latitude, lead.longitude);
        const nearby = allCompanies.filter(company => {
            if (!company.latitude || !company.longitude) return false;
            const companyLatLng = new window.google.maps.LatLng(company.latitude, company.longitude);
            return window.google.maps.geometry.spherical.computeDistanceBetween(leadLatLng, companyLatLng) <= 1000;
        });
        setNearbyCustomers(nearby);
        setIsNearbyCustomersOpen(true);
    };

    const renderStep = () => {
        const onNextAction = currentStep === 3 ? handleSaveAndNext : () => setCurrentStep(prev => prev + 1);

        const stepProps = {
            onNext: onNextAction,
            onBack: handleBack,
            isSaving: isSaving,
            onOpenLogOutcome: () => setIsLogOutcomeOpen(true),
            onOpenLogNote: () => setIsLogNoteOpen(true),
            onOpenRevisitDialog: () => setIsRevisitDialogOpen(true),
            onMoveToOutbound: () => setIsMoveToOutboundOpen(true)
        };
        switch (currentStep) {
            case 1: return <CompanyDetailsStep lead={lead!} onFindNearby={handleFindNearbyCustomers} {...stepProps} />;
            case 2: return <ContactDetailsStep contacts={contacts} onAddContact={handleAddContact} form={newContactForm} isAddingContact={isAddingContact} {...stepProps} />;
            case 3: return <FieldDiscoveryStep {...stepProps} />;
            case 4: return <FinishStep onBack={handleBack} lead={lead!} onOpenScheduleAppointment={() => setIsScheduleAppointmentOpen(true)} onOpenLogOutcome={() => setIsLogOutcomeOpen(true)} onOpenRevisitDialog={() => setIsRevisitDialogOpen(true)} onMoveToOutbound={() => setIsMoveToOutboundOpen(true)} />;
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
                        <div className="w-20 text-center"><div className="border border-border rounded-full px-2 py-1 text-xs">Step {currentStep}/{TOTAL_STEPS}</div></div>
                    </header>
                    <div className="my-4 flex-shrink-0"><ResponsiveProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} labels={stepLabels} onStepClick={handleStepClick} /></div>
                </div>
                
                <main className="flex-grow overflow-y-auto px-4 pb-4">{renderStep()}</main>
                 
                <PostCallOutcomeDialog isOpen={isLogOutcomeOpen} onClose={() => setIsLogOutcomeOpen(false)} lead={lead} onOutcomeLogged={() => { setIsLogOutcomeOpen(false); router.push('/field-sales'); }} />
                <LogNoteDialog lead={lead} onNoteLogged={handleNoteLogged} isOpen={isLogNoteOpen} onOpenChange={setIsLogNoteOpen} />
                {isRevisitDialogOpen && <RevisitDialog isOpen={isRevisitDialogOpen} onOpenChange={setIsRevisitDialogOpen} lead={lead} onRevisitScheduled={handleRevisitScheduled} />}
                {isScheduleAppointmentOpen && <ScheduleAppointmentDialog isOpen={isScheduleAppointmentOpen} onOpenChange={setIsScheduleAppointmentOpen} lead={lead} />}
                <NearbyCustomersDialog isOpen={isNearbyCustomersOpen} onOpenChange={setIsNearbyCustomersOpen} customers={nearbyCustomers} />
                 <AlertDialog open={isMoveToOutboundOpen} onOpenChange={setIsMoveToOutboundOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Move Lead to Outbound?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will move the lead to the outbound bucket and randomly assign it to an available dialer. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isMoving}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleMoveToOutbound} disabled={isMoving}>
                                {isMoving ? <Loader /> : 'Confirm & Move'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </FormProvider>
    );
}

const StepWrapper = ({ title, script, children, onNext, onBack, onOpenLogOutcome, onOpenLogNote, onOpenRevisitDialog, onMoveToOutbound, isSaving }: { title: string, script?: string, children: React.ReactNode, onNext?: () => void; onBack?: () => void; onOpenLogOutcome: () => void; onOpenLogNote: () => void; onOpenRevisitDialog: () => void; onMoveToOutbound: () => void; isSaving?: boolean }) => {
    return (
        <div className="space-y-6">
            <div className="text-left space-y-2">
                <h2 className="text-2xl font-bold">{title}</h2>
                {script && <p className="text-sm italic text-primary p-2 bg-primary/10 border-l-4 border-primary rounded-r-md">"{script}"</p>}
            </div>
            <Card>
                <CardContent className="p-6">{children}</CardContent>
                {(onNext || onBack) && (
                    <CardFooter className="flex justify-between items-center gap-2">
                         {onBack && <Button variant="outline" onClick={onBack} disabled={isSaving}>Back</Button>}
                         <div className="flex items-center gap-2">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="outline"><MoreVertical className="mr-2 h-4 w-4"/>Actions</Button></DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onSelect={onOpenLogOutcome}><PhoneCall className="mr-2 h-4 w-4"/>Log Outcome</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={onOpenLogNote}><ClipboardEdit className="mr-2 h-4 w-4"/>Log Note</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={onOpenRevisitDialog}><History className="mr-2 h-4 w-4"/>Schedule Revisit</DropdownMenuItem>
                                    <DropdownMenuItem onSelect={onMoveToOutbound}><Move className="mr-2 h-4 w-4"/>Move to Outbound</DropdownMenuItem>
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

const CompanyDetailsStep = ({ lead, onNext, onFindNearby, isSaving, onOpenLogOutcome, onOpenLogNote, onOpenRevisitDialog, onMoveToOutbound }: { lead: Lead; onNext: () => void; onFindNearby: () => void; isSaving?: boolean; onOpenLogOutcome: () => void; onOpenLogNote: () => void; onOpenRevisitDialog: () => void; onMoveToOutbound: () => void; }) => (
    <StepWrapper title="Company Details" script="Confirm you're at the right place." onNext={onNext} onOpenLogOutcome={onOpenLogOutcome} onOpenLogNote={onOpenLogNote} onOpenRevisitDialog={onOpenRevisitDialog} onMoveToOutbound={onMoveToOutbound} isSaving={isSaving}>
        <div className="space-y-4">
             <div className="space-y-2"><Label>Business name</Label><Input readOnly value={lead.companyName} /></div>
             <div className="space-y-2"><Label>Address</Label><Input readOnly value={[lead.address?.address1, lead.address?.street, lead.address?.city, lead.address?.state, lead.address?.zip].filter(Boolean).join(', ')} /></div>
             <Button variant="outline" onClick={onFindNearby} className="w-full"><Building className="mr-2 h-4 w-4" />Nearby Signed Customers</Button>
        </div>
    </StepWrapper>
);

const ContactDetailsStep = ({ contacts, onAddContact, form, isAddingContact, onNext, onBack, isSaving, onOpenLogOutcome, onOpenLogNote, onOpenRevisitDialog, onMoveToOutbound }: { contacts: Contact[], onAddContact: (values: any) => void, form: any, isAddingContact: boolean, onNext: () => void; onBack: () => void; isSaving?: boolean; onOpenLogOutcome: () => void; onOpenLogNote: () => void; onOpenRevisitDialog: () => void; onMoveToOutbound: () => void; }) => (
    <StepWrapper title="Contact Details" script='"Hi there, I was hoping to speak to the person in charge of your postage and deliveries?"' onNext={onNext} onBack={onBack} onOpenLogOutcome={onOpenLogOutcome} onOpenLogNote={onOpenLogNote} onOpenRevisitDialog={onOpenRevisitDialog} onMoveToOutbound={onMoveToOutbound} isSaving={isSaving}>
        <div className="space-y-4">
            <h4 className="font-semibold text-lg">Existing Contacts</h4>
            {contacts.length > 0 ? <div className="space-y-3">{contacts.map(c => <div key={c.id} className="p-3 border rounded-md"><p className="font-semibold">{c.name} ({c.title})</p><p className="text-sm text-muted-foreground">{c.email}</p><p className="text-sm text-muted-foreground">{c.phone}</p></div>)}</div> : <p className="text-sm text-center text-muted-foreground">No contacts found.</p>}
            <hr className="my-4" />
            <h4 className="font-semibold">Add New Contact</h4>
            <Form {...form}><form onSubmit={form.handleSubmit(onAddContact)} className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/><FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/><FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)}/><FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)}/></div><Button type="submit" disabled={isAddingContact}>{isAddingContact ? <Loader /> : 'Add Contact'}</Button></form></Form>
        </div>
    </StepWrapper>
);

const discoverySignals = [
  { id: 'pays_aus_post', label: 'Pays Australia Post (Services)', description: 'They currently pay for Australia Post' },
  { id: 'staff_handle_post', label: 'Staff Handle Post', description: 'Staff leave the office to lodge' },
  { id: 'drop_off_hassle', label: 'Drop-off is a Hassle', description: 'Drop-offs are inconvenient' },
  { id: 'uses_couriers_lt_5kg', label: 'Uses Other Couriers (<5kg)', description: 'TGE, StarTrack, TNT' },
  { id: 'uses_couriers_100_plus', label: 'Uses Other Couriers (100+/wk)', description: 'High-volume standard freight' },
  { id: 'banking_runs', label: 'Banking Runs', description: 'Staff leave office for banking' },
  { id: 'needs_same_day', label: 'Needs Same-Day Delivery', description: 'Uses or wants same-day' },
  { id: 'inter_office', label: 'Inter-Office Deliveries', description: 'Movement between offices' },
];

const FieldDiscoveryStep = ({ onNext, onBack, isSaving, onOpenLogOutcome, onOpenLogNote, onOpenRevisitDialog, onMoveToOutbound }: { onNext: () => void; onBack: () => void; isSaving?: boolean; onOpenLogOutcome: () => void; onOpenLogNote: () => void; onOpenRevisitDialog: () => void; onMoveToOutbound: () => void; }) => {
    const { control } = useFormContext<z.infer<typeof discoverySchema>>();

    return (
         <StepWrapper title="Field Discovery" onNext={onNext} onBack={onBack} onOpenLogOutcome={onOpenLogOutcome} onOpenLogNote={onOpenLogNote} onOpenRevisitDialog={onOpenRevisitDialog} onMoveToOutbound={onMoveToOutbound} isSaving={isSaving}>
            <div className="space-y-8">
                <FormField
                    control={control}
                    name="discoverySignals"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-lg font-semibold">Discovery Signals</FormLabel>
                            <FormDescription>Capture observable behaviour and decision context.</FormDescription>
                            <div className="flex flex-wrap gap-2 pt-2">
                                {discoverySignals.map((signal) => {
                                    const isSelected = field.value?.includes(signal.label);
                                    return (
                                        <Button
                                            key={signal.id}
                                            type="button"
                                            variant={isSelected ? 'default' : 'outline'}
                                            className="h-auto flex flex-col items-start p-3 text-left"
                                            onClick={() => {
                                                const newValue = isSelected
                                                    ? field.value?.filter((v) => v !== signal.label)
                                                    : [...(field.value || []), signal.label];
                                                field.onChange(newValue);
                                            }}
                                        >
                                            <span className="font-semibold">{signal.label}</span>
                                            <span className="text-xs font-normal opacity-70">{signal.description}</span>
                                        </Button>
                                    );
                                })}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="space-y-6 pt-4 border-t">
                    <h3 className="text-lg font-semibold">Qualification Context (Fast Picks)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <FormField
                            control={control}
                            name="inconvenience"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>How inconvenient is this today?</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                                            <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Very inconvenient" /></FormControl><FormLabel className="font-normal">Very inconvenient</FormLabel></FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Somewhat inconvenient" /></FormControl><FormLabel className="font-normal">Somewhat inconvenient</FormLabel></FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Not a big issue" /></FormControl><FormLabel className="font-normal">Not a big issue</FormLabel></FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={control}
                            name="occurrence"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>How often does this occur?</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                                            <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Daily" /></FormControl><FormLabel className="font-normal">Daily</FormLabel></FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Weekly" /></FormControl><FormLabel className="font-normal">Weekly</FormLabel></FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Ad-hoc" /></FormControl><FormLabel className="font-normal">Ad-hoc</FormLabel></FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={control}
                            name="recurring"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Is this recurring?</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-1">
                                            <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Yes - predictable" /></FormControl><FormLabel className="font-normal">Yes - predictable</FormLabel></FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="Sometimes" /></FormControl><FormLabel className="font-normal">Sometimes</FormLabel></FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="One-off" /></FormControl><FormLabel className="font-normal">One-off</FormLabel></FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
            </div>
        </StepWrapper>
    );
};

const FinishStep = ({ onBack, lead, onOpenScheduleAppointment, onOpenLogOutcome, onOpenRevisitDialog, onMoveToOutbound }: { onBack: () => void; lead: Lead; onOpenScheduleAppointment: () => void; onOpenLogOutcome: () => void; onOpenRevisitDialog: () => void; onMoveToOutbound: () => void; }) => {
    const router = useRouter();
    
    return (
        <StepWrapper title="Finish" onBack={onBack} onOpenLogOutcome={onOpenLogOutcome} onOpenLogNote={() => {}} onOpenRevisitDialog={onOpenRevisitDialog} onMoveToOutbound={onMoveToOutbound}>
            <div className="text-center space-y-4">
                 <Card>
                    <CardHeader>
                        <CardTitle>Discovery Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <p className="text-muted-foreground">Based on the answers provided, here is the lead analysis:</p>
                        <div className="flex items-center justify-center gap-6 p-4 rounded-lg bg-muted">
                            <div className="flex flex-col items-center">
                                <p className="text-sm text-muted-foreground">Score</p>
                                <p className="text-3xl font-bold">{lead.discoveryData?.score ?? 'N/A'}</p>
                            </div>
                            <div className="flex flex-col items-center">
                                <p className="text-sm text-muted-foreground">Routing Tag</p>
                                <Badge variant="outline" className="text-lg mt-1">{lead.discoveryData?.routingTag ?? 'N/A'}</Badge>
                            </div>
                        </div>
                        {lead.discoveryData?.scoringReason && (
                             <p className="text-xs text-muted-foreground p-2 border-t">
                                <strong>Scoring Rationale:</strong> {lead.discoveryData.scoringReason}
                            </p>
                        )}
                    </CardContent>
                </Card>

                <h3 className="text-xl font-semibold">Check-in Complete! Choose your next action.</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                    <Button size="lg" className="h-auto py-4" onClick={() => router.push(`/check-in/${lead.id}/select-services?mode=signup`)}><Briefcase className="mr-2"/> Signup</Button>
                    <Button size="lg" className="h-auto py-4 bg-green-600 hover:bg-green-700" onClick={() => router.push(`/check-in/${lead.id}/select-services?mode=service-trial`)}><Star className="mr-2"/> Free Trial</Button>
                    <Button size="lg" className="h-auto py-4" variant="secondary" onClick={onOpenScheduleAppointment}><Calendar className="mr-2"/> Schedule Appointment</Button>
                    <Button size="lg" className="h-auto py-4" variant="secondary" onClick={onOpenRevisitDialog}><History className="mr-2"/> Schedule Revisit</Button>
                    <Button size="lg" className="h-auto py-4" variant="secondary" onClick={onOpenLogOutcome}><PhoneCall className="mr-2"/> Log Outcome</Button>
                    <Button size="lg" className="h-auto py-4" variant="secondary" onClick={() => router.push('/saved-routes')}><Route className="mr-2"/> Back to Route</Button>
                </div>
            </div>
        </StepWrapper>
    );
};

const NearbyCustomersDialog = ({ isOpen, onOpenChange, customers }: { isOpen: boolean, onOpenChange: (open: boolean) => void, customers: Lead[] }) => (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Nearby Signed Customers</DialogTitle>
                <DialogDescription>Found {customers.length} customer(s) within a 1km radius.</DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto">
                {customers.length > 0 ? (
                    <Table>
                        <TableHeader><TableRow><TableHead>Company Name</TableHead><TableHead>Address</TableHead><TableHead>Industry</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {customers.map(c => (
                                <TableRow key={c.id}>
                                    <TableCell><Button asChild variant="link" className="p-0 h-auto"><Link href={`/companies/${c.id}`} target="_blank">{c.companyName}</Link></Button></TableCell>
                                    <TableCell>{[c.address?.street, c.address?.city].filter(Boolean).join(', ')}</TableCell>
                                    <TableCell>{c.industryCategory || 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : <p className="text-center py-8 text-muted-foreground">No nearby customers found.</p>}
            </div>
        </DialogContent>
    </Dialog>
);
