'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getLeadFromFirebase, updateLeadCheckinQuestions } from '@/services/firebase';
import type { Lead, CheckinQuestion } from '@/lib/types';
import { Loader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mic, MicOff, Sparkles, Bot, ThumbsUp, ThumbsDown, CheckSquare, List, StickyNote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { analyzeCheckin, type CheckinAnalysis } from '@/ai/flows/analyze-checkin-flow';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';

export default function VoiceCheckInPage() {
    const [lead, setLead] = useState<Lead | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRecording, setIsRecording] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [analysisResult, setAnalysisResult] = useState<CheckinAnalysis | null>(null);
    const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

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
                const leadData = await getLeadFromFirebase(leadId, true);
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

        const getMicPermission = async () => {
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
                setHasMicPermission(true);
            } catch (error) {
                console.error("Microphone permission denied:", error);
                setHasMicPermission(false);
                toast({ variant: 'destructive', title: 'Microphone Required', description: 'Please enable microphone access in your browser settings.' });
            }
        };

        getMicPermission();
        fetchLeadData();
    }, [leadId, router, toast]);

    const startRecording = async () => {
        if (!hasMicPermission) {
            toast({ variant: 'destructive', title: 'Microphone Required', description: 'Please enable microphone permissions.' });
            return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
            audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = () => {
                const base64Audio = reader.result as string;
                handleAnalyze(base64Audio);
            };
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            // Stop all tracks on the stream to turn off the mic indicator
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            setIsAnalyzing(true); // Show analysis loader immediately
        }
    };
    
    const handleAnalyze = async (audioDataUri: string) => {
        if (!lead) return;
        setIsAnalyzing(true);
        try {
            const leadProfile = `Company: ${lead.companyName}, Industry: ${lead.industryCategory || 'N/A'}, Address: ${lead.address?.city || 'N/A'}`;
            const result = await analyzeCheckin({ leadId: lead.id, audioDataUri, leadProfile });
            setAnalysisResult(result);
            setTranscript(result.transcript);
        } catch (error: any) {
            console.error("Analysis failed:", error);
            toast({ variant: 'destructive', title: 'Analysis Failed', description: error.message || 'Could not analyze the recording.' });
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    const handleSave = async () => {
        if (!lead || !analysisResult) return;
        setIsAnalyzing(true); // Re-use the analyzing loader for saving
        try {
            await updateLeadCheckinQuestions(lead.id, analysisResult.checkinQuestions as CheckinQuestion[]);
            toast({ title: "Success", description: "Check-in analysis has been saved." });
            router.push('/field-sales');
        } catch (error) {
            console.error("Failed to save check-in analysis:", error);
            toast({ variant: "destructive", title: "Save Error", description: "Could not save the analysis." });
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    const sentimentIcon = {
        'Positive': <ThumbsUp className="h-5 w-5 text-green-500" />,
        'Negative': <ThumbsDown className="h-5 w-5 text-red-500" />,
        'Neutral': <Bot className="h-5 w-5 text-gray-500" />,
    }[analysisResult?.summary.includes('positive') ? 'Positive' : analysisResult?.summary.includes('negative') ? 'Negative' : 'Neutral'];


    if (loading) return <div className="flex h-screen w-full items-center justify-center"><Loader /></div>;
    if (!lead) return <div className="flex h-screen w-full items-center justify-center"><p>Lead not found.</p></div>;

    return (
        <div className="flex flex-col bg-background max-w-4xl mx-auto w-full h-svh p-4">
             <header className="flex-shrink-0 flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft /></Button>
                <div className="flex flex-col items-center">
                    <h1 className="text-lg font-bold">{lead.companyName}</h1>
                    <p className="text-sm text-muted-foreground">{lead.address?.city || ''}</p>
                </div>
                <div className="w-10"></div>
            </header>
            
            <main className="flex-grow mt-4 overflow-y-auto">
                 {!analysisResult ? (
                    <Card className="flex flex-col items-center justify-center text-center p-8 min-h-[50vh]">
                        <CardHeader>
                            <CardTitle>Voice Check-in</CardTitle>
                            <CardDescription>Record your conversation or a summary of your visit. The AI will do the rest.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           {hasMicPermission === false && (
                                <Alert variant="destructive">
                                    <AlertTitle>Microphone Access Required</AlertTitle>
                                    <AlertDescription>
                                        Please enable microphone permissions in your browser settings to use this feature.
                                    </AlertDescription>
                                </Alert>
                            )}
                            {isAnalyzing ? (
                                <div className="flex flex-col items-center gap-4">
                                    <Loader />
                                    <p>Analyzing... this may take a moment.</p>
                                </div>
                            ) : (
                                <Button
                                    size="lg"
                                    className={`h-20 w-20 rounded-full transition-all duration-300 ${isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-primary'}`}
                                    onClick={isRecording ? stopRecording : startRecording}
                                    disabled={hasMicPermission === false}
                                >
                                    {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
                                </Button>
                            )}
                            <p className="text-muted-foreground mt-4">{isRecording ? 'Recording...' : 'Tap to Record'}</p>
                        </CardContent>
                    </Card>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                             <CardHeader>
                                <CardTitle>Transcript</CardTitle>
                             </CardHeader>
                             <CardContent>
                                <Textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={20} className="text-sm"/>
                             </CardContent>
                        </Card>
                         <div className="space-y-4">
                            <Card>
                                <CardHeader><CardTitle className="flex items-center gap-2"><StickyNote className="h-5 w-5"/>Summary & Action Items</CardTitle></CardHeader>
                                <CardContent className="space-y-4 text-sm">
                                    <div>
                                        <h4 className="font-semibold mb-1">Summary</h4>
                                        <p className="text-muted-foreground">{analysisResult.summary}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Pain Points</h4>
                                        <div className="flex flex-wrap gap-1">
                                            {analysisResult.painPoints.map((item, i) => <Badge key={i} variant="destructive">{item}</Badge>)}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Action Items</h4>
                                        <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                                            {analysisResult.actionItems.map((item, i) => <li key={i}>{item}</li>)}
                                        </ul>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                 <CardHeader><CardTitle className="flex items-center gap-2"><CheckSquare className="h-5 w-5"/>Extracted Data</CardTitle></CardHeader>
                                 <CardContent>
                                     <div className="space-y-2 text-sm">
                                     {analysisResult.checkinQuestions.map((q, i) => (
                                         <div key={i}>
                                             <p className="font-semibold">{q.question}</p>
                                             <p className="text-muted-foreground">{Array.isArray(q.answer) ? q.answer.join(', ') : q.answer}</p>
                                         </div>
                                     ))}
                                     </div>
                                 </CardContent>
                            </Card>
                         </div>
                    </div>
                 )}
            </main>
            {analysisResult && (
                 <footer className="flex-shrink-0 pt-4 border-t flex justify-end">
                     <Button onClick={handleSave} disabled={isAnalyzing}>
                         {isAnalyzing ? <Loader/> : 'Save & Finish'}
                     </Button>
                 </footer>
            )}
        </div>
    );
}
