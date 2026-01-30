
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getLeadFromFirebase } from '@/services/firebase';
import type { Lead } from '@/lib/types';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mic, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function CheckInSelectionPage() {
    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    
    const leadId = params.leadId as string;

    useEffect(() => {
        const fetchLeadData = async () => {
            if (!leadId) {
                router.push('/field-sales');
                return;
            }
            try {
                const leadData = await getLeadFromFirebase(leadId, false);
                if (leadData) {
                    setLead(leadData);
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
    }, [leadId, router, toast]);

    if (loading) return <div className="flex h-screen w-full items-center justify-center"><Loader /></div>;
    if (!lead) return <div className="flex h-screen w-full items-center justify-center"><p>Lead not found.</p></div>;

    return (
        <div className="flex flex-col bg-background max-w-lg mx-auto w-full h-svh p-4">
             <header className="flex-shrink-0 flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft /></Button>
                <div className="flex flex-col items-center">
                    <h1 className="text-lg font-bold">{lead.companyName}</h1>
                    <p className="text-sm text-muted-foreground">{lead.address?.city || ''}</p>
                </div>
                <div className="w-10"></div>
            </header>
            
            <main className="flex-grow mt-4 flex items-center justify-center">
                <Card className="w-full">
                    <CardHeader>
                        <CardTitle>Select Check-in Method</CardTitle>
                        <CardDescription>Choose how you want to record your visit information.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button variant="outline" size="lg" className="h-24 flex-col" onClick={() => router.push(`/check-in/${leadId}/voice`)}>
                            <Mic className="h-8 w-8 mb-2" />
                            <span>Voice Check-in</span>
                        </Button>
                        <Button variant="outline" size="lg" className="h-24 flex-col" onClick={() => router.push(`/check-in/${leadId}/manual`)}>
                            <Edit className="h-8 w-8 mb-2" />
                            <span>Manual Entry</span>
                        </Button>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
