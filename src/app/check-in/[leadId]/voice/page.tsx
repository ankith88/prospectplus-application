
'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { FullScreenLoader } from '@/components/ui/loader';

export default function VoiceRedirectPage() {
    const router = useRouter();
    const params = useParams();
    const leadId = params.leadId as string;

    useEffect(() => {
        if(leadId) {
            router.replace(`/check-in/${leadId}`);
        } else {
            router.replace('/field-sales');
        }
    }, [leadId, router]);

    return <FullScreenLoader message="Redirecting..." />;
}
