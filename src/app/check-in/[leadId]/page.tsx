
'use client';

import { useEffect, useState, useMemo, Fragment, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getLeadFromFirebase, updateLeadDiscoveryData, addContactToLead, updateContactInLead, logActivity } from '@/services/firebase';
import type { Lead, DiscoveryData, Contact } from '@/lib/types';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building, User, Phone, Mail, Sparkles, Calendar, ClipboardEdit, PhoneCall, Star, Briefcase, MapPin, Globe, Tag, Route, Check } from 'lucide-react';
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

const ResponsiveProgress = ({ currentStep, totalSteps, labels }: { currentStep: number, totalSteps: number, labels: string[] }) => {
  return (
    <div className="flex items-center w-full" aria-label={`Step ${currentStep} of ${totalSteps}`}>
      {labels.map((label, index) => {
        const step = index + 1;
        const isCompleted = currentStep > step;
        const isCurrent = currentStep === step;

        return (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                  isCompleted ? "bg-primary text-primary-foreground" :
                  isCurrent ? "border-2 border-primary text-primary" :
                  "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : step}
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
    const [isServiceSelectionOpen, setIsServiceSelectionOpen] = useState(false);
    const [serviceSelectionMode, setServiceSelectionMode] = useState<'Free Trial' | 'Signup'>('Signup');
    const [isLogNoteOpen, setIsLogNoteOpen] = useState(false);

    const [isAddingContact, setIsAddingContact] = useState(false);
    const [contacts, setContacts] = useState<Contact[]>([]);
    
    const [finalDiscoveryData, setFinalDiscoveryData] = useState<DiscoveryData | null>(null);

    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();

    const methods = useForm<z.infer<typeof discoverySchema>>({
        resolver: zodResolver(discoverySchema),
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
        const stepFields: (keyof z.infer<typeof discoverySchema>)[] = [
            [], // Step 1 is company info
            [], // Step 2 is contact info
            ['relevanceCheck'], // Step 3
            ['reasonsToLeave'], // Step 4
            ['postOfficeRelationship', 'logisticsSetup', 'servicePayment'], // Step 5
            ['shippingVolume', 'expressVsStandard', 'packageType'], // Step 6
            ['currentProvider', 'eCommerceTech'], // Step 7
            ['sameDayCourier', 'decisionMaker', 'painPoints'], // Step 8
        ];

        const fieldsToValidate = stepFields[currentStep -1];
        const isValid = fieldsToValidate.length > 0 ? await methods.trigger(fieldsToValidate) : true;
        
        if (isValid) {
            if (currentStep === TOTAL_STEPS) {
                const allFieldsValid = await methods.trigger();
                if (allFieldsValid) {
                    const discoveryData = calculateScoreAndRouting(methods.getValues());
                    setFinalDiscoveryData(discoveryData);
                    setCurrentStep(prev => prev + 1);
                } else {
                     toast({ variant: "destructive", title: "Missing Information", description: "Please go back and fill out all required fields." });
                }
            } else {
                setCurrentStep(prev => prev + 1);
            }
        } else {
            toast({ variant: "destructive", title: "Missing Information", description: "Please fill out all required fields before proceeding." });
        }
    };

    const handleBack = () => setCurrentStep(prev => prev - 1);
    
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

    const handleSaveDiscovery = async () => {
        if (!finalDiscoveryData) {
            toast({ variant: "destructive", title: "Error", description: "Could not calculate discovery score. Please review your answers." });
            return;
        }
        setIsSaving(true);
        try {
            await updateLeadDiscoveryData(lead!.id, finalDiscoveryData);
            toast({ title: "Success", description: "Check-in and discovery data saved." });
            router.push(`/leads/${lead!.id}`);
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Error", description: "Failed to save data." });
        } finally {
            setIsSaving(false);
        }
    };
    
    const renderStep = () => {
        switch (currentStep) {
            case 1: return <CompanyDetailsStep lead={lead!} onNext={handleNext} />;
            case 2: return <ContactDetailsStep contacts={contacts} onAddContact={handleAddContact} form={newContactForm} isAddingContact={isAddingContact} onTitleUpdate={handleContactTitleUpdate} onNext={handleNext} onBack={handleBack} />;
            case 3: return <DiscoveryStep0 onNext={handleNext} onBack={handleBack} />;
            case 4: return <DiscoveryStep1 onNext={handleNext} onBack={handleBack} />;
            case 5: return <DiscoveryStep2 onNext={handleNext} onBack={handleBack} />;
            case 6: return <DiscoveryStep3 onNext={handleNext} onBack={handleBack} />;
            case 7: return <DiscoveryStep4 onNext={handleNext} onBack={handleBack} />;
            case 8: return <DiscoveryStep5 onNext={handleNext} onBack={handleBack} />;
            case 9: return <FinalActionsStep onBack={handleBack} discoveryData={finalDiscoveryData} onOpenDialog={(type) => {
                if (type === 'log-outcome') setIsLogOutcomeOpen(true);
                if (type === 'free-trial') { setServiceSelectionMode('Free Trial'); setIsServiceSelectionOpen(true); }
                if (type === 'signup') { setServiceSelectionMode('Signup'); setIsServiceSelectionOpen(true); }
                if (type === 'log-note') setIsLogNoteOpen(true);
            }} />;
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
                      <ResponsiveProgress currentStep={currentStep} totalSteps={TOTAL_STEPS + 1} labels={stepLabels} />
                    </div>
                </div>
                
                <main className="flex-grow overflow-y-auto px-4">
                    {renderStep()}
                </main>
                 
                {/* Dialogs for Final Actions */}
                <PostCallOutcomeDialog 
                    isOpen={isLogOutcomeOpen} 
                    onClose={() => setIsLogOutcomeOpen(false)}
                    lead={lead}
                    onOutcomeLogged={() => { setIsLogOutcomeOpen(false); router.push('/field-sales'); }}
                />
                <ServiceSelectionDialog 
                    isOpen={isServiceSelectionOpen} 
                    onOpenChange={setIsServiceSelectionOpen}
                    leadId={lead.id}
                    mode={serviceSelectionMode}
                />
                <LogNoteDialog 
                    lead={lead} 
                    onNoteLogged={() => { setIsLogNoteOpen(false); }}
                >
                    <div data-trigger-log-note={isLogNoteOpen}></div>
                </LogNoteDialog>
            </div>
        </FormProvider>
    );
}

const StepWrapper = ({ title, description, script, children, onNext, onBack }: { title: string, description: string, script?: string, children: React.ReactNode, onNext?: () => void, onBack?: () => void }) => (
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
                <CardFooter className="flex justify-between">
                    {onBack ? <Button variant="outline" onClick={onBack}>Back</Button> : <div />}
                    {onNext && <Button onClick={onNext}>Continue</Button>}
                </CardFooter>
            )}
        </Card>
    </div>
);


const CompanyDetailsStep = ({ lead, onNext }: { lead: Lead, onNext: () => void }) => {
    return (
        <StepWrapper title="Company Details" description="Confirm you're at the right place." onNext={onNext}>
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
            </div>
        </StepWrapper>
    );
};

const ContactDetailsStep = ({ contacts, onAddContact, form, isAddingContact, onTitleUpdate, onNext, onBack }: { contacts: Contact[], onAddContact: (values: any) => void, form: any, isAddingContact: boolean, onTitleUpdate: (contactId: string, newTitle: string) => void, onNext: () => void, onBack: () => void }) => {
    const [editingTitle, setEditingTitle] = useState<{ [key: string]: string }>({});

    const handleTitleChange = (contactId: string, value: string) => {
        setEditingTitle(prev => ({ ...prev, [contactId]: value }));
    };

    return (
        <StepWrapper title="Contact Details" description="Confirm you're speaking to the right person or add a new contact." script='"Hi there, I was hoping to speak to the person in charge of your postage and deliveries?"' onNext={onNext} onBack={onBack}>
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

const DiscoveryStep0 = ({ onNext, onBack }: { onNext: () => void; onBack: () => void; }) => {
    const { control } = useFormContext();
    return (
        <StepWrapper title="Relevance Check" description="Hard stop: if nobody leaves the business, we don't force a sale." script="Do people here ever leave the office during the day to get things done?" onNext={onNext} onBack={onBack}>
             <FormField control={control} name="relevanceCheck" render={({ field }) => (
                <FormItem className="space-y-3"><FormLabel>Do people leave the office during the day?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col gap-4"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">Yes, people do leave the office.</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">No, they rarely/never leave.</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>
            )}/>
        </StepWrapper>
    )
};

const reasonsToLeave = ['Post office', 'Banking / deposits', 'Local deliveries', 'Supplier drop-offs', 'Admin / errands', 'Other'];
const DiscoveryStep1 = ({ onNext, onBack }: { onNext: () => void; onBack: () => void; }) => {
    const { control } = useFormContext();
    return (
        <StepWrapper title="Reasons People Leave" description="Select all that apply. This is the primary segmentation key." script="What are some of the things people have to leave the office for?" onNext={onNext} onBack={onBack}>
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


const DiscoveryStep2 = ({ onNext, onBack }: { onNext: () => void, onBack: () => void }) => {
    const { control, watch } = useFormContext();
    const watchLogisticsSetup = watch('logisticsSetup');
    return (
        <StepWrapper title="Discovery: Logistics" description="Understand their current postage process." script="How do you currently manage your post and parcels? Do you go to the post office, or does someone pick it up?" onNext={onNext} onBack={onBack}>
             <FormField control={control} name="postOfficeRelationship" render={({ field }) => (
                <FormItem className="space-y-3"><FormLabel>Do you have a relationship with Australia Post?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-x-4 gap-y-2"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Yes-Driver" /></FormControl><FormLabel className="font-normal">Yes - Driver</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Yes-Post Office walk up" /></FormControl><FormLabel className="font-normal">Yes - Post Office walk up</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={control} name="logisticsSetup" render={({ field }) => (
                <FormItem className="space-y-3"><FormLabel>How do you lodge items?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-x-4 gap-y-2"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Drop-off" /></FormControl><FormLabel className="font-normal">Drop-off</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Routine collection" /></FormControl><FormLabel className="font-normal">Routine collection</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Ad-hoc" /></FormControl><FormLabel className="font-normal">Ad-hoc</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>
            )}/>
            {watchLogisticsSetup === 'Routine collection' && <FormField control={control} name="servicePayment" render={({ field }) => (
                <FormItem className="space-y-3 ml-6"><FormLabel>If using collection: Do you pay for this service?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>
            )}/>}
        </StepWrapper>
    )
};

const packageTypes = [ { id: '500g', label: '<500g' }, { id: '1-3kg', label: '1-3kg' }, { id: '5kg+', label: '5kg+' }, { id: '10kg+', label: '10kg+' }, { id: '20kg+', label: '20kg+' } ] as const;
const DiscoveryStep3 = ({ onNext, onBack }: { onNext: () => void, onBack: () => void }) => {
    const { control } = useFormContext();
    return (
        <StepWrapper title="Discovery: Shipping Profile" description="What and how much are they shipping?" script="Roughly how many parcels would you send a week? And what's the typical size and weight?" onNext={onNext} onBack={onBack}>
            <FormField control={control} name="shippingVolume" render={({ field }) => (
                <FormItem className="space-y-3"><FormLabel>How many items per week?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-x-4 gap-y-2">{(['<5', '<20', '20-100', '100+'] as const).map(val => (<FormItem key={`volume-${val}`} className="flex items-center space-x-2"><FormControl><RadioGroupItem value={val} /></FormControl><FormLabel className="font-normal">{val}</FormLabel></FormItem>))}</RadioGroup></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={control} name="expressVsStandard" render={({ field }) => (
                <FormItem className="space-y-3"><FormLabel>What % of your shipping is Express vs Standard?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-x-4 gap-y-2">{(['Mostly Standard (>=80%)', 'Balanced Mix (20-79% Express)', 'Mostly Express (>=80%)'] as const).map(val => (<FormItem key={`express-${val}`} className="flex items-center space-x-2"><FormControl><RadioGroupItem value={val} /></FormControl><FormLabel className="font-normal">{val}</FormLabel></FormItem>))}</RadioGroup></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={control} name="packageType" render={() => (
                <FormItem><div className="mb-4"><FormLabel className="text-base">What is typical size/weight?</FormLabel></div><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{packageTypes.map((item) => (<FormField key={item.id} control={control} name="packageType" render={({ field }) => (<FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(item.label)} onCheckedChange={(checked) => { return checked ? field.onChange([...(field.value || []), item.label]) : field.onChange(field.value?.filter((value) => value !== item.label)) }}/></FormControl><FormLabel className="font-normal">{item.label}</FormLabel></FormItem>)}/>))}</div><FormMessage /></FormItem>
            )}/>
        </StepWrapper>
    )
};

const currentProviders = [ { id: 'multiple', label: 'Multiple' }, { id: 'auspost', label: 'AusPost' }, { id: 'couriersplease', label: 'CouriersPlease' }, { id: 'aramex', label: 'Aramex' }, { id: 'startrack', label: 'StarTrack' }, { id: 'tge', label: 'TGE' }, { id: 'fedex', label: 'FedEx/TNT' }, { id: 'allied', label: 'Allied' }, { id: 'other', label: 'Other' } ] as const;
const eCommerceTechs = [ { id: 'mypost', label: 'MyPost' }, { id: 'shopify', label: 'Shopify' }, { id: 'woo', label: 'Woo' }, { id: 'sendle', label: 'Sendle' }, { id: 'other', label: 'Other' }, { id: 'none', label: 'None' } ] as const;
const DiscoveryStep4 = ({ onNext, onBack }: { onNext: () => void, onBack: () => void }) => {
    const { control } = useFormContext();
    return (
         <StepWrapper title="Discovery: Providers & Tech" description="Who are they using and what tech do they have?" script="Which shipping carriers do you use at the moment? And what software do you use to manage labels?" onNext={onNext} onBack={onBack}>
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
        </StepWrapper>
    )
};

const DiscoveryStep5 = ({ onNext, onBack }: { onNext: () => void, onBack: () => void }) => {
    const { control } = useFormContext();
    return (
        <StepWrapper title="Discovery: Business Needs" description="Final questions to qualify the lead and identify pain points." script="Last couple of questions - do you ever use same-day couriers? And who in the business makes the final call on shipping partners?" onNext={onNext} onBack={onBack}>
            <FormField control={control} name="sameDayCourier" render={({ field }) => (
                <FormItem className="space-y-3"><FormLabel>Do you use same-day couriers?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-x-4 gap-y-2">{(['Yes', 'Occasional', 'Never'] as const).map(val => (<FormItem key={`sameday-${val}`} className="flex items-center space-x-2"><FormControl><RadioGroupItem value={val} /></FormControl><FormLabel className="font-normal">{val}</FormLabel></FormItem>))}</RadioGroup></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={control} name="decisionMaker" render={({ field }) => (
                <FormItem className="space-y-3"><FormLabel>Who decides shipping?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-x-4 gap-y-2">{(['Owner', 'Influencer', 'Gatekeeper'] as const).map(val => (<FormItem key={`decision-${val}`} className="flex items-center space-x-2"><FormControl><RadioGroupItem value={val} /></FormControl><FormLabel className="font-normal">{val}</FormLabel></FormItem>))}</RadioGroup></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={control} name="painPoints" render={({ field }) => (
                <FormItem><FormLabel>Pain Points</FormLabel><FormControl><Textarea placeholder="Describe any pain points the lead is experiencing..." {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
        </StepWrapper>
    )
};

const FinalActionsStep = ({ onOpenDialog, discoveryData, onBack }: { onOpenDialog: (type: 'log-outcome' | 'free-trial' | 'signup' | 'log-note') => void, discoveryData: DiscoveryData | null, onBack: () => void }) => (
    <StepWrapper title="Next Steps & Analysis" description="The discovery phase is complete. Review the analysis and choose the next action for this lead." onBack={onBack}>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
            <Button size="lg" className="h-auto py-4" onClick={() => onOpenDialog('signup')}><Briefcase className="mr-2"/> Signup</Button>
            <Button size="lg" className="h-auto py-4 bg-green-600 hover:bg-green-700" onClick={() => onOpenDialog('free-trial')}><Star className="mr-2"/> Free Trial</Button>
            <Button size="lg" className="h-auto py-4" variant="secondary" onClick={() => onOpenDialog('log-outcome')}><PhoneCall className="mr-2"/> Log Outcome</Button>
            <Button size="lg" className="h-auto py-4" variant="secondary" onClick={() => onOpenDialog('log-note')}><ClipboardEdit className="mr-2"/> Log a Note</Button>
        </div>
    </StepWrapper>
);

    
