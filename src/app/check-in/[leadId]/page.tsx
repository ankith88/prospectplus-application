
'use client';

import { useEffect, useState, useMemo, Fragment, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getLeadFromFirebase, updateLeadCheckinQuestions, addContactToLead, updateContactInLead, logActivity, getCompaniesFromFirebase } from '@/services/firebase';
import type { Lead, Contact, Address, CheckinQuestion } from '@/lib/types';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building, User, Phone, Mail, Check, MoreVertical, History, PhoneCall, ClipboardEdit, Star, Briefcase, Route } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { PostCallOutcomeDialog } from '@/components/post-call-outcome-dialog';
import { LogNoteDialog } from '@/components/log-note-dialog';
import { RevisitDialog } from '@/components/revisit-dialog';
import { ScheduleAppointmentDialog } from '@/components/schedule-appointment-dialog';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import React from 'react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';

const checkinSchema = z.object({
  ausPostRelationship: z.enum(['Yes', 'No']).optional(),
  ausPostUsage: z.string().optional(),
  ausPostDropoff: z.enum(['Drop-off', 'They collect']).optional(),
  otherCouriers: z.enum(['Yes', 'No']).optional(),
  usedCouriers: z.array(z.string()).optional(),
  localDeliveries: z.enum(['Yes', 'No']).optional(),
  peopleLeaveOffice: z.enum(['Yes', 'No']).optional(),
  reasonsToLeave: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof checkinSchema>;

const TOTAL_STEPS = 6;
const stepLabels = ["Company", "Contact", "AusPost", "Couriers", "Errands", "Finish"];

const ResponsiveProgress = ({ currentStep, totalSteps, labels }: { currentStep: number; totalSteps: number; labels: string[] }) => {
    return (
        <div className="flex items-center w-full" aria-label={`Step ${currentStep} of ${totalSteps}`}>
            {labels.map((label, index) => {
                const step = index + 1;
                const isStepCompleted = currentStep > step;
                const isCurrent = currentStep === step;

                return (
                    <React.Fragment key={step}>
                        <div className="flex flex-col items-center">
                            <div
                                className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300",
                                    isStepCompleted ? "bg-primary text-primary-foreground" :
                                    isCurrent ? "border-2 border-primary bg-primary/10 text-primary" :
                                    "bg-muted text-muted-foreground",
                                )}
                            >
                                {isStepCompleted && currentStep <= totalSteps ? <Check className="w-5 h-5" /> : step}
                            </div>
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
    const [isLogNoteOpen, setIsLogNoteOpen] = useState(false);
    const [isRevisitDialogOpen, setIsRevisitDialogOpen] = useState(false);
    const [isScheduleAppointmentOpen, setIsScheduleAppointmentOpen] = useState(false);

    const [isAddingContact, setIsAddingContact] = useState(false);
    const [contacts, setContacts] = useState<Contact[]>([]);
    
    const [nearbyCompanies, setNearbyCompanies] = useState<Lead[]>([]);
    const [isNearbyCompaniesDialogOpen, setIsNearbyCompaniesDialogOpen] = useState(false);
    const [isFindingNearby, setIsFindingNearby] = useState(false);

    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { userProfile } = useAuth();
    
    const leadId = params.leadId as string;

    const methods = useForm<FormValues>({
        resolver: zodResolver(checkinSchema),
        defaultValues: {},
    });

    const newContactForm = useForm({
        resolver: zodResolver(z.object({
            name: z.string().min(1, "Name is required."),
            title: z.string().min(1, "Title is required."),
            email: z.string().email("A valid email is required."),
            phone: z.string().min(1, "Phone number is required."),
        })),
        defaultValues: { name: '', title: '', email: '', phone: '' }
    });

    useEffect(() => {
        const fetchLeadData = async () => {
            if (!leadId) {
                router.push('/field-sales');
                return;
            }
            try {
                const leadData = await getLeadFromFirebase(leadId, true);
                if (leadData) {
                    setLead(leadData);
                    setContacts(leadData.contacts || []);
                    if (leadData.checkinQuestions) {
                        const restoredData = leadData.checkinQuestions.reduce((acc, q) => {
                            const key = q.question.toLowerCase().replace(/[^a-z0-9]/gi, '_'); // simple key generation
                             if (key.includes('auspost_relationship')) acc.ausPostRelationship = q.answer as 'Yes' | 'No';
                            if (key.includes('auspost_usage')) acc.ausPostUsage = q.answer as string;
                            if (key.includes('auspost_dropoff')) acc.ausPostDropoff = q.answer as 'Drop-off' | 'They collect';
                            if (key.includes('other_couriers')) acc.otherCouriers = q.answer as 'Yes' | 'No';
                            if (key.includes('which_courier')) acc.usedCouriers = q.answer as string[];
                            if (key.includes('local_deliveries')) acc.localDeliveries = q.answer as 'Yes' | 'No';
                            if (key.includes('people_leave_office')) acc.peopleLeaveOffice = q.answer as 'Yes' | 'No';
                            if (key.includes('reasons_to_leave')) acc.reasonsToLeave = q.answer as string[];
                            return acc;
                        }, {} as Partial<FormValues>);
                        methods.reset(restoredData);
                    }
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
    }, [leadId, router, toast, methods]);

    const handleFinish = async () => {
        if (!lead) return;
        setIsSaving(true);
        try {
            const formData = methods.getValues();
            const checkinQuestions: CheckinQuestion[] = [
                { question: "Do you have a relationship with Australia Post?", answer: formData.ausPostRelationship || 'N/A' },
                ...(formData.ausPostRelationship === 'Yes' ? [
                    { question: "What do you use them for?", answer: formData.ausPostUsage || 'N/A' },
                    { question: "Do you drop it off or do they come here?", answer: formData.ausPostDropoff || 'N/A' },
                ] : []),
                { question: "Do you use any other couriers?", answer: formData.otherCouriers || 'N/A' },
                ...(formData.otherCouriers === 'Yes' ? [
                    { question: "Which Courier do you use?", answer: formData.usedCouriers || [] },
                    { question: "Do you have any need for local deliveries?", answer: formData.localDeliveries || 'N/A' },
                ] : []),
                { question: "Do people leave the office during the day?", answer: formData.peopleLeaveOffice || 'N/A' },
                ...(formData.peopleLeaveOffice === 'Yes' ? [
                    { question: "Reasons People Leave", answer: formData.reasonsToLeave || [] },
                ] : []),
            ];

            await updateLeadCheckinQuestions(lead.id, checkinQuestions);
            toast({ title: "Success", description: "Check-in data has been saved." });
            setCurrentStep(TOTAL_STEPS);

        } catch (error) {
            console.error("Failed to save checkin data:", error);
            toast({ variant: "destructive", title: "Save Error", description: "Could not save check-in data." });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleNext = () => setCurrentStep(prev => prev + 1);
    const handleBack = () => setCurrentStep(prev => prev - 1);
    const handleCourierSelect = () => setIsScheduleAppointmentOpen(true);

    const handleAddContact = async (values: { name: string; title: string; email: string; phone: string; }) => {
        if (!lead) return;
        setIsAddingContact(true);
        try {
            const newContactId = await addContactToLead(lead.id, values);
            const newContact: Contact = { ...values, id: newContactId };
            setContacts(prev => [...prev, newContact]);
            newContactForm.reset();
            toast({ title: "Success", description: "New contact added." });
            setIsAddingContact(false);
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to add contact." });
        } finally {
            setIsAddingContact(false);
        }
    };
    
    const handleFindNearbyCompanies = useCallback(async () => {
        if (!lead?.latitude || !lead?.longitude || !window.google?.maps?.geometry) {
            toast({ variant: 'destructive', title: 'Location Missing', description: 'This lead does not have valid coordinates to find nearby customers.' });
            return;
        }

        setIsFindingNearby(true);
        try {
            const leadLatLng = new window.google.maps.LatLng(lead.latitude, lead.longitude);
            const allCompanies = await getCompaniesFromFirebase();
            const nearby = allCompanies.filter(company => {
              if (!company.latitude || !company.longitude || company.id === lead.id) return false;
              const itemLatLng = new window.google.maps.LatLng(company.latitude, company.longitude);
              const distance = window.google.maps.geometry.spherical.computeDistanceBetween(leadLatLng, itemLatLng);
              return distance <= 1000;
            });
            setNearbyCompanies(nearby);
            setIsNearbyCompaniesDialogOpen(true);
            if(nearby.length === 0) toast({ title: 'No Nearby Customers', description: 'No signed customers found within a 1km radius.' });
        } catch (error) {
            console.error("Error finding nearby companies:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch nearby companies.' });
        } finally {
            setIsFindingNearby(false);
        }
    }, [lead, toast]);

    const handleNoteLogged = () => setIsLogNoteOpen(false);
    const handleRevisitScheduled = () => { setIsRevisitDialogOpen(false); router.push('/field-sales'); };
    const handleOutcomeLogged = () => { setIsLogOutcomeOpen(false); router.push('/field-sales'); };
    const formatAddress = (address?: Address) => !address ? 'N/A' : [address.street, address.city, address.state, address.zip].filter(Boolean).join(', ');

    const renderStep = () => {
        switch (currentStep) {
            case 1: return <CompanyDetailsStep onNext={handleNext} lead={lead!} onFindNearby={handleFindNearbyCompanies} isFindingNearby={isFindingNearby} />;
            case 2: return <ContactDetailsStep onNext={handleNext} onBack={handleBack} contacts={contacts} onAddContact={handleAddContact} form={newContactForm} isAddingContact={isAddingContact} />;
            case 3: return <Step3 onNext={handleNext} onBack={handleBack} />;
            case 4: return <Step4 onNext={handleNext} onBack={handleBack} onCourierSelect={handleCourierSelect} />;
            case 5: return <Step5 onNext={handleFinish} onBack={handleBack} isSaving={isSaving} />;
            case 6: return <FinishStep onBack={handleBack} onOpenScheduleAppointment={() => setIsScheduleAppointmentOpen(true)} onOpenLogOutcome={() => setIsLogOutcomeOpen(true)} onOpenRevisitDialog={() => setIsRevisitDialogOpen(true)} userProfile={userProfile} />;
            default: return null;
        }
    };

    if (loading) return <div className="flex h-screen w-full items-center justify-center"><Loader /></div>;
    if (!lead) return <div className="flex h-screen w-full items-center justify-center"><p>Lead not found.</p></div>;

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
                            <div className="border border-border rounded-full px-2 py-1 text-xs">Step {currentStep}/{TOTAL_STEPS}</div>
                        </div>
                    </header>
                    <div className="my-4 flex-shrink-0">
                      <ResponsiveProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} labels={stepLabels} />
                    </div>
                </div>
                <main className="flex-grow overflow-y-auto px-4 pb-4">{renderStep()}</main>
                
                <PostCallOutcomeDialog isOpen={isLogOutcomeOpen} onClose={() => setIsLogOutcomeOpen(false)} lead={lead} onOutcomeLogged={handleOutcomeLogged}/>
                <LogNoteDialog lead={lead} onNoteLogged={handleNoteLogged} isOpen={isLogNoteOpen} onOpenChange={setIsLogNoteOpen}><div/></LogNoteDialog>
                {isRevisitDialogOpen && <RevisitDialog isOpen={isRevisitDialogOpen} onOpenChange={setIsRevisitDialogOpen} lead={lead} onRevisitScheduled={handleRevisitScheduled}/>}
                {isScheduleAppointmentOpen && <ScheduleAppointmentDialog isOpen={isScheduleAppointmentOpen} onOpenChange={setIsScheduleAppointmentOpen} lead={lead}/>}
                <Dialog open={isNearbyCompaniesDialogOpen} onOpenChange={setIsNearbyCompaniesDialogOpen}>
                  <DialogContent className="max-w-3xl">
                      <DialogHeader>
                          <DialogTitle>Nearby Signed Customers</DialogTitle>
                          <DialogDescription>Found {nearbyCompanies.length} signed customer(s) within a 1km radius of {lead.companyName}.</DialogDescription>
                      </DialogHeader>
                      <ScrollArea className="max-h-[60vh]"><Table>
                          <TableHeader><TableRow><TableHead>Company Name</TableHead><TableHead>Address</TableHead><TableHead>Industry</TableHead></TableRow></TableHeader>
                          <TableBody>{nearbyCompanies.map(company => (
                              <TableRow key={company.id}>
                                  <TableCell className="font-semibold whitespace-normal">
                                      <Button variant="link" asChild className="p-0 h-auto text-left whitespace-normal">
                                          <Link href={`/companies/${company.id}`} target="_blank">{company.companyName}</Link>
                                      </Button>
                                  </TableCell>
                                  <TableCell className="whitespace-normal">{formatAddress(company.address as Address)}</TableCell>
                                  <TableCell className="whitespace-normal">{company.industryCategory || 'N/A'}</TableCell>
                              </TableRow>
                          ))}</TableBody>
                      </Table></ScrollArea>
                      <DialogFooter><Button onClick={() => setIsNearbyCompaniesDialogOpen(false)}>Close</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
            </div>
        </FormProvider>
    );
}

const StepWrapper = ({ title, children, onNext, onBack, isSaving, isFinish = false }: { title: string, children: React.ReactNode, onNext?: () => void; onBack?: () => void; isSaving?: boolean, isFinish?: boolean }) => (
    <div className="space-y-6">
        <div className="text-left space-y-2"><h2 className="text-2xl font-bold">{title}</h2></div>
        <Card>
            <CardContent className="p-6">{children}</CardContent>
            {(onNext || onBack) && (
                <CardFooter className="flex justify-between items-center gap-2">
                     {onBack && <Button variant="outline" onClick={onBack} disabled={isSaving}>Back</Button>}
                     {onNext && <Button onClick={onNext} disabled={isSaving}>{isSaving ? <Loader /> : isFinish ? 'Finish' : 'Continue'}</Button>}
                </CardFooter>
            )}
        </Card>
    </div>
);

const CompanyDetailsStep = ({ lead, onNext, onFindNearby, isFindingNearby }: { lead: Lead, onNext: () => void, onFindNearby: () => void, isFindingNearby: boolean }) => {
    return (
        <StepWrapper title="Company Details" onNext={onNext}>
            <div className="space-y-4">
                 <div className="space-y-2"><Label>Business name</Label><Input readOnly value={lead.companyName} /></div>
                <div className="space-y-2"><Label>Address</Label><Input readOnly value={[lead.address?.address1, lead.address?.street, lead.address?.city, lead.address?.state, lead.address?.zip].filter(Boolean).join(', ')} /></div>
                <Button variant="outline" size="sm" onClick={onFindNearby} disabled={isFindingNearby} className="w-full">{isFindingNearby ? <Loader /> : <><Building className="mr-2 h-4 w-4" />Nearby Customers</>}</Button>
            </div>
        </StepWrapper>
    );
};

const ContactDetailsStep = ({ contacts, onAddContact, form, isAddingContact, onNext, onBack }: { contacts: Contact[], onAddContact: (values: any) => void, form: any, isAddingContact: boolean, onNext: () => void; onBack: () => void; }) => {
    return (
        <StepWrapper title="Contact Details" onNext={onNext} onBack={onBack}>
            <div className="space-y-4">
                <h4 className="font-semibold text-lg">Existing Contacts</h4>
                 {contacts.length > 0 ? <div className="space-y-3">{contacts.map(contact => (<Card key={contact.id} className="p-3 bg-secondary/30"><CardContent className="p-0 space-y-3"><p className="font-semibold">{contact.name}</p><div className="text-sm text-muted-foreground mt-1 space-y-1"><p className="flex items-center gap-2"><Mail className="h-4 w-4"/>{contact.email}</p><p className="flex items-center gap-2"><Phone className="h-4 w-4"/>{contact.phone}</p></div></CardContent></Card>))}</div> : <p className="text-sm text-center text-muted-foreground">No contacts found.</p>}
                <hr className="my-4 border-border" />
                <h4 className="font-semibold">Add New Contact</h4>
                <Form {...form}><form onSubmit={form.handleSubmit(onAddContact)} className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/><FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/><FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)}/><FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)}/></div><Button type="submit" disabled={isAddingContact}>{isAddingContact ? <Loader /> : 'Add Contact'}</Button></form></Form>
            </div>
        </StepWrapper>
    );
};

const Step3 = ({ onNext, onBack }: { onNext: () => void; onBack: () => void; }) => {
    const { control, watch } = useFormContext<FormValues>();
    const ausPostRelationship = watch('ausPostRelationship');
    return (
        <StepWrapper title="Australia Post" onNext={onNext} onBack={onBack}>
            <div className="space-y-8">
                <FormField control={control} name="ausPostRelationship" render={({ field }) => (<FormItem className="space-y-3"><FormLabel>Do you have a relationship with Australia Post?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel>Yes</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="No" /></FormControl><FormLabel>No</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                {ausPostRelationship === 'Yes' && (<>
                    <FormField control={control} name="ausPostUsage" render={({ field }) => (<FormItem><FormLabel>What do you use them for?</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={control} name="ausPostDropoff" render={({ field }) => (<FormItem className="space-y-3"><FormLabel>Do you drop it off or do they come here?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Drop-off" /></FormControl><FormLabel>Drop-off</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="They collect" /></FormControl><FormLabel>They collect</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                </>)}
            </div>
        </StepWrapper>
    );
};

const couriers = ["TGE (upto 5kg)", "StarTrack (upto 5kg)", "TNT (upto 5kg)", "Couriers Please", "Aramex"];
const Step4 = ({ onNext, onBack, onCourierSelect }: { onNext: () => void; onBack: () => void; onCourierSelect: (courier: string) => void }) => {
    const { control, watch, setValue } = useFormContext<FormValues>();
    const otherCouriers = watch('otherCouriers');
    return (
        <StepWrapper title="Other Couriers" onNext={onNext} onBack={onBack}>
            <div className="space-y-8">
                <FormField control={control} name="otherCouriers" render={({ field }) => (<FormItem className="space-y-3"><FormLabel>Do you use any other couriers?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel>Yes</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="No" /></FormControl><FormLabel>No</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                {otherCouriers === 'Yes' && (<>
                    <FormField control={control} name="usedCouriers" render={() => (<FormItem><FormLabel>Which Courier do you use?</FormLabel><div className="grid grid-cols-2 gap-2">{couriers.map(c => <Button key={c} type="button" variant="outline" onClick={() => onCourierSelect(c)}>{c}</Button>)}</div><FormMessage /></FormItem>)} />
                    <FormField control={control} name="localDeliveries" render={({ field }) => (<FormItem className="space-y-3"><FormLabel>Do you have any need for local deliveries?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel>Yes</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="No" /></FormControl><FormLabel>No</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                </>)}
            </div>
        </StepWrapper>
    );
};

const reasons = ["Banking", "Local Same Day"];
const Step5 = ({ onNext, onBack, isSaving }: { onNext: () => void; onBack: () => void; isSaving?: boolean }) => {
    const { control, watch } = useFormContext<FormValues>();
    const peopleLeave = watch('peopleLeaveOffice');
    return (
        <StepWrapper title="Office Errands" onNext={onNext} onBack={onBack} isSaving={isSaving} isFinish={true}>
            <div className="space-y-8">
                <FormField control={control} name="peopleLeaveOffice" render={({ field }) => (<FormItem className="space-y-3"><FormLabel>Do people leave the office during the day?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel>Yes</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="No" /></FormControl><FormLabel>No</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                {peopleLeave === 'Yes' && (
                    <FormField control={control} name="reasonsToLeave" render={() => (<FormItem><FormLabel>Reasons People Leave</FormLabel><div className="space-y-2">{reasons.map(r => (<FormField key={r} control={control} name="reasonsToLeave" render={({ field }) => (<FormItem className="flex items-center space-x-3"><FormControl><Checkbox checked={field.value?.includes(r)} onCheckedChange={checked => field.onChange(checked ? [...(field.value || []), r] : field.value?.filter(v => v !== r))} /></FormControl><FormLabel className="font-normal">{r}</FormLabel></FormItem>)} />))}</div><FormMessage /></FormItem>)} />
                )}
            </div>
        </StepWrapper>
    );
};

const FinishStep = ({ onBack, onOpenScheduleAppointment, onOpenLogOutcome, onOpenRevisitDialog, userProfile }: { onBack: () => void; onOpenScheduleAppointment: () => void; onOpenLogOutcome: () => void; onOpenRevisitDialog: () => void; userProfile: UserProfile | null; }) => {
    const router = useRouter();
    const canShowSpecialButtons = userProfile?.role === 'admin' || userProfile?.uid === 'R1skvdcPUGdXEmJDS9Yh1Wbv77K2';
    return (
        <div className="space-y-6">
            <div className="text-left space-y-2"><h2 className="text-2xl font-bold">Finish & Actions</h2><p className="text-muted-foreground">The check-in is complete. Choose your next action.</p></div>
            <Card>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button size="lg" className="h-auto py-4" variant="secondary" onClick={onOpenScheduleAppointment}><Calendar className="mr-2"/> Schedule Appointment</Button>
                        <Button size="lg" className="h-auto py-4" variant="secondary" onClick={onOpenRevisitDialog}><History className="mr-2"/> Schedule Revisit</Button>
                        <Button size="lg" className="h-auto py-4" variant="secondary" onClick={onOpenLogOutcome}><PhoneCall className="mr-2"/> Log Outcome</Button>
                        <Button size="lg" className="h-auto py-4" variant="secondary" onClick={() => router.push('/field-sales')}><Route className="mr-2"/> Back to Route</Button>
                        {canShowSpecialButtons && <>
                            <Button size="lg" className="h-auto py-4" onClick={() => router.push(`/check-in/${(useParams().leadId as string)}/select-services?mode=signup`)}><Briefcase className="mr-2"/> Signup</Button>
                            <Button size="lg" className="h-auto py-4 bg-green-600 hover:bg-green-700" onClick={() => router.push(`/check-in/${(useParams().leadId as string)}/select-services?mode=service-trial`)}><Star className="mr-2"/> Free Trial</Button>
                        </>}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-start"><Button variant="outline" onClick={onBack}>Back</Button></CardFooter>
            </Card>
        </div>
    );
};
