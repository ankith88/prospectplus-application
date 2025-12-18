
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getLeadFromFirebase, updateLeadDiscoveryData, addContactToLead } from '@/services/firebase';
import type { Lead, DiscoveryData, Contact } from '@/lib/types';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Building, User, Phone, Mail, Sparkles, Calendar, ClipboardEdit, PhoneCall, Star, Briefcase, MapPin, Globe, Tag } from 'lucide-react';
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

const discoverySchema = z.object({
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

const TOTAL_STEPS = 7;

export default function CheckInPage() {
    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentStep, setCurrentStep] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    
    // State for final action dialogs
    const [isLogOutcomeOpen, setIsLogOutcomeOpen] = useState(false);
    const [isServiceSelectionOpen, setIsServiceSelectionOpen] = useState(false);
    const [serviceSelectionMode, setServiceSelectionMode] = useState<'Free Trial' | 'Signup'>('Signup');
    const [isLogNoteOpen, setIsLogNoteOpen] = useState(false);

    const [isAddingContact, setIsAddingContact] = useState(false);
    const [contacts, setContacts] = useState<Contact[]>([]);

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
        let isValid = true;
        if (currentStep === 1) { // Validate company/contact details
             // For now, we assume these are pre-filled correctly
        }
        if (currentStep === 2) {
             // Step 2 is for adding contacts, which has its own form.
        }
        if (currentStep === 3) isValid = await methods.trigger(['postOfficeRelationship', 'logisticsSetup', 'servicePayment']);
        if (currentStep === 4) isValid = await methods.trigger(['shippingVolume', 'expressVsStandard', 'packageType']);
        if (currentStep === 5) isValid = await methods.trigger(['currentProvider', 'eCommerceTech']);
        if (currentStep === 6) isValid = await methods.trigger(['sameDayCourier', 'decisionMaker', 'painPoints']);

        if (isValid) {
            setCurrentStep(prev => prev + 1);
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

    const handleSaveDiscovery = async () => {
        const isValid = await methods.trigger();
        if (!isValid) {
            toast({ variant: "destructive", title: "Missing Information", description: "Please ensure all required discovery questions are answered." });
            return;
        }
        setIsSaving(true);
        try {
            await updateLeadDiscoveryData(lead!.id, methods.getValues());
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
            case 1: return <CompanyDetailsStep lead={lead!} />;
            case 2: return <ContactStep contacts={contacts} onAddContact={handleAddContact} form={newContactForm} isAddingContact={isAddingContact} />;
            case 3: return <DiscoveryStep1 />;
            case 4: return <DiscoveryStep2 />;
            case 5: return <DiscoveryStep3 />;
            case 6: return <DiscoveryStep4 />;
            case 7: return <FinalActionsStep onOpenDialog={(type) => {
                if (type === 'log-outcome') setIsLogOutcomeOpen(true);
                if (type === 'free-trial') { setServiceSelectionMode('Free Trial'); setIsServiceSelectionOpen(true); }
                if (type === 'signup') { setServiceSelectionMode('Signup'); setIsServiceSelectionOpen(true); }
                if (type === 'log-note') setIsLogNoteOpen(true);
            }} />;
            default: return null;
        }
    };

    if (loading) {
        return <div className="flex h-screen w-full items-center justify-center bg-gray-900"><Loader /></div>;
    }

    if (!lead) {
        return <div className="flex h-screen w-full items-center justify-center bg-gray-900 text-white"><p>Lead not found.</p></div>;
    }

    return (
        <FormProvider {...methods}>
            <div className="flex flex-col h-screen bg-gray-900 text-white p-4">
                 <header className="flex items-center justify-between mb-4 text-center">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft /></Button>
                    <div className="flex flex-col items-center">
                        <h1 className="text-lg font-bold">{lead.companyName}</h1>
                        <p className="text-sm text-gray-400">{lead.address?.city || ''} &bull; Territory auto-match</p>
                    </div>
                    <div className="w-10">
                        <div className="border border-gray-600 rounded-full px-2 py-1 text-xs">
                            Step {currentStep}/{TOTAL_STEPS}
                        </div>
                    </div>
                </header>

                <Progress value={(currentStep / TOTAL_STEPS) * 100} className="w-full mb-4 bg-gray-700 [&>div]:bg-blue-500" />
                
                <main className="flex-grow overflow-y-auto px-2">
                    {renderStep()}
                </main>

                <footer className="mt-4 flex items-center justify-between border-t border-gray-700 pt-4">
                    {currentStep > 1 && <Button variant="ghost" onClick={handleBack} className="bg-gray-800 hover:bg-gray-700">Back</Button>}
                    <div className="flex-grow"></div>
                    {currentStep < TOTAL_STEPS && <Button onClick={handleNext} className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white">Continue</Button>}
                    {currentStep === TOTAL_STEPS && <Button onClick={handleSaveDiscovery} disabled={isSaving} className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white">{isSaving ? <Loader /> : 'Save & Exit'}</Button>}
                </footer>

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

const StepWrapper = ({ title, description, children }: { title: string, description: string, children: React.ReactNode }) => (
    <div className="space-y-6">
        <div className="text-center">
            <h2 className="text-2xl font-bold">{title}</h2>
            <p className="text-gray-400">{description}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg space-y-6">
            {children}
        </div>
    </div>
);


const CompanyDetailsStep = ({ lead }: { lead: Lead }) => (
    <StepWrapper title="Prospect Header" description="Minimal details first - you can fill the rest after you've confirmed relevance.">
         <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="businessName" className="text-gray-400">Business name</Label>
                <Input id="businessName" readOnly value={lead.companyName} className="bg-gray-700 border-gray-600" />
            </div>
             <div className="space-y-2">
                <Label htmlFor="address" className="text-gray-400">Address</Label>
                <Input id="address" readOnly value={[lead.address?.street, lead.address?.city].filter(Boolean).join(', ')} className="bg-gray-700 border-gray-600" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="contactName" className="text-gray-400">Contact name</Label>
                    <Input id="contactName" readOnly value={lead.contacts?.[0]?.name || 'Optional'} className="bg-gray-700 border-gray-600" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="phone" className="text-gray-400">Phone</Label>
                    <Input id="phone" readOnly value={lead.contacts?.[0]?.phone || lead.customerPhone || 'Optional'} className="bg-gray-700 border-gray-600" />
                </div>
            </div>
             <div className="space-y-2">
                <Label htmlFor="decisionMaker" className="text-gray-400">I'm speaking with</Label>
                <Select>
                    <SelectTrigger className="w-full bg-gray-700 border-gray-600">
                        <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Owner">Owner</SelectItem>
                        <SelectItem value="Influencer">Influencer</SelectItem>
                        <SelectItem value="Gatekeeper">Gatekeeper</SelectItem>
                    </SelectContent>
                </Select>
                 <p className="text-xs text-gray-500 pt-2">Tip: if you're unsure who they are, continue anyway — authority is checked later.</p>
            </div>
         </div>
    </StepWrapper>
);

const ContactStep = ({ contacts, onAddContact, form, isAddingContact }: { contacts: Contact[], onAddContact: (values: any) => void, form: any, isAddingContact: boolean }) => (
    <StepWrapper title="Contacts" description="Review existing contacts or add a new one.">
        <div className="space-y-4">
            {contacts.length > 0 ? (
                contacts.map(contact => (
                    <div key={contact.id} className="p-3 border border-gray-700 rounded-md bg-gray-700/50">
                        <p className="font-semibold">{contact.name} <span className="font-normal text-gray-400">- {contact.title}</span></p>
                        <div className="text-sm text-gray-400 mt-1 space-y-1">
                            <p className="flex items-center gap-2"><Mail className="h-4 w-4"/>{contact.email}</p>
                            <p className="flex items-center gap-2"><Phone className="h-4 w-4"/>{contact.phone}</p>
                        </div>
                    </div>
                ))
            ) : <p className="text-sm text-center text-gray-500">No contacts found.</p>}
            
            <hr className="my-4 border-gray-700" />

            <h4 className="font-semibold">Add New Contact</h4>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onAddContact)} className="space-y-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} placeholder="John Doe" className="bg-gray-700 border-gray-600" /></FormControl><FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} placeholder="Manager" className="bg-gray-700 border-gray-600" /></FormControl><FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email" placeholder="john.d@example.com" className="bg-gray-700 border-gray-600" /></FormControl><FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} type="tel" placeholder="0412 345 678" className="bg-gray-700 border-gray-600" /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <Button type="submit" disabled={isAddingContact} className="bg-blue-600 hover:bg-blue-700">{isAddingContact ? <Loader /> : 'Add Contact'}</Button>
                </form>
            </Form>
        </div>
    </StepWrapper>
);

const currentProviders = [ { id: 'multiple', label: 'Multiple' }, { id: 'auspost', label: 'AusPost' }, { id: 'couriersplease', label: 'CouriersPlease' }, { id: 'aramex', label: 'Aramex' }, { id: 'startrack', label: 'StarTrack' }, { id: 'tge', label: 'TGE' }, { id: 'fedex', label: 'FedEx/TNT' }, { id: 'allied', label: 'Allied' }, { id: 'other', label: 'Other' } ] as const;
const eCommerceTechs = [ { id: 'mypost', label: 'MyPost' }, { id: 'shopify', label: 'Shopify' }, { id: 'woo', label: 'Woo' }, { id: 'sendle', label: 'Sendle' }, { id: 'other', label: 'Other' }, { id: 'none', label: 'None' } ] as const;
const packageTypes = [ { id: '500g', label: '&lt;500g' }, { id: '1-3kg', label: '1-3kg' }, { id: '5kg+', label: '5kg+' }, { id: '10kg+', label: '10kg+' }, { id: '20kg+', label: '20kg+' } ] as const;

const DiscoveryStep1 = () => {
    const { control, watch } = useFormContext();
    const watchLogisticsSetup = watch('logisticsSetup');
    return (
        <StepWrapper title="Discovery: Logistics" description="Understand their current process.">
             <FormField control={control} name="postOfficeRelationship" render={({ field }) => (
                <FormItem className="space-y-3"><FormLabel>Do you have a relationship with Australia Post?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col sm:flex-row gap-4"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Yes-Driver" /></FormControl><FormLabel className="font-normal">Yes - Driver</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Yes-Post Office walk up" /></FormControl><FormLabel className="font-normal">Yes - Post Office walk up</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={control} name="logisticsSetup" render={({ field }) => (
                <FormItem className="space-y-3"><FormLabel>How do you lodge items?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col sm:flex-row gap-4"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Drop-off" /></FormControl><FormLabel className="font-normal">Drop-off</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Routine collection" /></FormControl><FormLabel className="font-normal">Routine collection</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Ad-hoc" /></FormControl><FormLabel className="font-normal">Ad-hoc</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>
            )}/>
            {watchLogisticsSetup === 'Routine collection' && <FormField control={control} name="servicePayment" render={({ field }) => (
                <FormItem className="space-y-3 ml-6"><FormLabel>If using collection: Do you pay for this service?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="Yes" /></FormControl><FormLabel className="font-normal">Yes</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="No" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>
            )}/>}
        </StepWrapper>
    )
};

const DiscoveryStep2 = () => {
    const { control } = useFormContext();
    return (
        <StepWrapper title="Discovery: Shipping Profile" description="What and how much are they shipping?">
            <FormField control={control} name="shippingVolume" render={({ field }) => (
                <FormItem className="space-y-3"><FormLabel>How many items per week?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-x-4 gap-y-2">{(['&lt;5', '&lt;20', '20-100', '100+'] as const).map(val => (<FormItem key={`volume-${val}`} className="flex items-center space-x-2"><FormControl><RadioGroupItem value={val} /></FormControl><FormLabel className="font-normal">{val}</FormLabel></FormItem>))}</RadioGroup></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={control} name="expressVsStandard" render={({ field }) => (
                <FormItem className="space-y-3"><FormLabel>What % of your shipping is Express vs Standard?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col gap-4">{(['Mostly Standard (&gt;=80%)', 'Balanced Mix (20-79% Express)', 'Mostly Express (&gt;=80%)'] as const).map(val => (<FormItem key={`express-${val}`} className="flex items-center space-x-2"><FormControl><RadioGroupItem value={val} /></FormControl><FormLabel className="font-normal">{val}</FormLabel></FormItem>))}</RadioGroup></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={control} name="packageType" render={() => (
                <FormItem><div className="mb-4"><FormLabel className="text-base">What is typical size/weight?</FormLabel></div><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{packageTypes.map((item) => (<FormField key={item.id} control={control} name="packageType" render={({ field }) => (<FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(item.label)} onCheckedChange={(checked) => { return checked ? field.onChange([...(field.value || []), item.label]) : field.onChange(field.value?.filter((value) => value !== item.label)) }}/></FormControl><FormLabel className="font-normal">{item.label}</FormLabel></FormItem>)}/>))}</div><FormMessage /></FormItem>
            )}/>
        </StepWrapper>
    )
};

const DiscoveryStep3 = () => {
    const { control } = useFormContext();
    return (
         <StepWrapper title="Discovery: Providers &amp; Tech" description="Who are they using and what tech do they have?">
            <FormField control={control} name="currentProvider" render={() => (
                <FormItem><div className="mb-4"><FormLabel className="text-base">Who do you use for shipping?</FormLabel></div><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{currentProviders.map((item) => (<FormField key={item.id} control={control} name="currentProvider" render={({ field }) => (<FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(item.label)} onCheckedChange={(checked) => { return checked ? field.onChange([...(field.value || []), item.label]) : field.onChange(field.value?.filter((value) => value !== item.label)) }}/></FormControl><FormLabel className="font-normal">{item.label}</FormLabel></FormItem>)}/>))}</div><FormField control={control} name="otherProvider" render={({ field }) => (<FormItem className="mt-2"><FormLabel className="sr-only">Other Shipping Provider</FormLabel><FormControl><Input {...field} placeholder="Other provider..." className="bg-gray-700 border-gray-600" /></FormControl><FormMessage /></FormItem>)}/><FormMessage /></FormItem>
            )}/>
            <FormField control={control} name="eCommerceTech" render={() => (
                <FormItem><div className="mb-4"><FormLabel className="text-base">What platform do you use for labels?</FormLabel></div><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{eCommerceTechs.map((item) => (<FormField key={item.id} control={control} name="eCommerceTech" render={({ field }) => (<FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(item.label)} onCheckedChange={(checked) => { return checked ? field.onChange([...(field.value || []), item.label]) : field.onChange(field.value?.filter((value) => value !== item.label)) }}/></FormControl><FormLabel className="font-normal">{item.label}</FormLabel></FormItem>)}/>))}</div><FormField control={control} name="otherECommerceTech" render={({ field }) => (<FormItem className="mt-2"><FormLabel className="sr-only">Other E-commerce Tech</FormLabel><FormControl><Input {...field} placeholder="Other platform..." className="bg-gray-700 border-gray-600" /></FormControl><FormMessage /></FormItem>)}/><FormMessage /></FormItem>
            )}/>
        </StepWrapper>
    )
};

const DiscoveryStep4 = () => {
    const { control } = useFormContext();
    return (
        <StepWrapper title="Discovery: Business Needs" description="Final questions to qualify the lead.">
            <FormField control={control} name="sameDayCourier" render={({ field }) => (
                <FormItem className="space-y-3"><FormLabel>Do you use same-day couriers?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">{(['Yes', 'Occasional', 'Never'] as const).map(val => (<FormItem key={`sameday-${val}`} className="flex items-center space-x-2"><FormControl><RadioGroupItem value={val} /></FormControl><FormLabel className="font-normal">{val}</FormLabel></FormItem>))}</RadioGroup></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={control} name="decisionMaker" render={({ field }) => (
                <FormItem className="space-y-3"><FormLabel>Who decides shipping?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">{(['Owner', 'Influencer', 'Gatekeeper'] as const).map(val => (<FormItem key={`decision-${val}`} className="flex items-center space-x-2"><FormControl><RadioGroupItem value={val} /></FormControl><FormLabel className="font-normal">{val}</FormLabel></FormItem>))}</RadioGroup></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={control} name="painPoints" render={({ field }) => (
                <FormItem><FormLabel>Pain Points</FormLabel><FormControl><Textarea placeholder="Describe any pain points the lead is experiencing..." {...field} className="bg-gray-700 border-gray-600" /></FormControl><FormMessage /></FormItem>
            )}/>
        </StepWrapper>
    )
};

const FinalActionsStep = ({ onOpenDialog }: { onOpenDialog: (type: 'log-outcome' | 'free-trial' | 'signup' | 'log-note') => void }) => (
    <StepWrapper title="Next Steps" description="The discovery phase is complete. Choose the next action for this lead.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button size="lg" className="h-auto py-4 bg-blue-600 hover:bg-blue-700" onClick={() => onOpenDialog('signup')}><Briefcase className="mr-2"/> Signup</Button>
            <Button size="lg" className="h-auto py-4 bg-green-600 hover:bg-green-700" onClick={() => onOpenDialog('free-trial')}><Star className="mr-2"/> Free Trial</Button>
            <Button size="lg" className="h-auto py-4 bg-gray-700 hover:bg-gray-600" onClick={() => onOpenDialog('log-outcome')}><PhoneCall className="mr-2"/> Log Outcome</Button>
            <Button size="lg" className="h-auto py-4 bg-gray-700 hover:bg-gray-600" onClick={() => onOpenDialog('log-note')}><ClipboardEdit className="mr-2"/> Log a Note</Button>
        </div>
    </StepWrapper>
);

    