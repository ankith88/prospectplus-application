
'use client';

import type { Transcript, TranscriptAnalysis, UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Loader } from './ui/loader';
import { Sparkles, Bot, ThumbsUp, ThumbsDown, CheckSquare, List, StickyNote } from 'lucide-react';
import { analyzeTranscript } from '@/ai/flows/analyze-transcript-flow';
import { useToast } from '@/hooks/use-toast';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { getAllUsers } from '@/services/firebase';

interface TranscriptViewerProps {
    transcript: Transcript;
    leadId: string;
    leadName: string;
    onAnalysisComplete: (analysis: TranscriptAnalysis) => void;
}

interface Utterance {
    speaker: string;
    text: string;
    participant_type: 'internal' | 'external';
    user_id?: string;
}

interface GroupedUtterance {
    speakerName: string;
    isInternal: boolean;
    initials: string;
    texts: string[];
}

function getInitials(name: string) {
    if (!name) return '??';
    const words = name.split(' ');
    if (words.length > 1 && words[0] && words[1]) {
        return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

export function TranscriptViewer({ transcript, leadId, leadName, onAnalysisComplete }: TranscriptViewerProps) {
    const [groupedUtterances, setGroupedUtterances] = useState<GroupedUtterance[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<TranscriptAnalysis | undefined>(transcript.analysis);
    const [userMap, setUserMap] = useState<Map<string, string>>(new Map());
    const { toast } = useToast();
    
    useEffect(() => {
        const fetchUsers = async () => {
            const users = await getAllUsers();
            const map = new Map<string, string>();
            users.forEach(user => {
                const displayName = `${user.firstName} ${user.lastName}`;
                if (user.aircallUserId && displayName.trim()) {
                    map.set(user.aircallUserId, displayName);
                }
            });
            setUserMap(map);

        };
        fetchUsers();
    }, []);

    const formattedTranscriptForAnalysis = groupedUtterances.map(g => `${g.speakerName}: ${g.texts.join(' ')}`).join('\n');
    
    useEffect(() => {
        if (userMap.size === 0) return; // Wait for userMap to be populated

        let utterances: Utterance[] = [];
        try {
            const parsedContent = JSON.parse(transcript.content);
            // Handle both {utterances: []} and direct array formats
            if (Array.isArray(parsedContent)) {
              utterances = parsedContent;
            } else if (parsedContent && Array.isArray(parsedContent.utterances)) {
              utterances = parsedContent.utterances;
            }
        } catch (error) {
            console.error("Failed to parse transcript content:", error);
            utterances = [];
        }

        if (utterances.length === 0) {
            setGroupedUtterances([]);
            return;
        }

        const groups: GroupedUtterance[] = [];
        let currentGroup: GroupedUtterance | null = null;

        for (const utt of utterances) {
            const isInternal = utt.participant_type === 'internal';
            let speakerName = 'Unknown';
            if (isInternal) {
                // Use the userMap to find the display name from aircallUserId
                speakerName = (utt.user_id && userMap.get(utt.user_id)) || utt.speaker || transcript.author || 'Internal Agent';
            } else {
                speakerName = leadName;
            }

            if (currentGroup && currentGroup.speakerName === speakerName) {
                currentGroup.texts.push(utt.text);
            } else {
                if (currentGroup) {
                    groups.push(currentGroup);
                }
                currentGroup = {
                    speakerName: speakerName,
                    isInternal: isInternal,
                    initials: getInitials(speakerName),
                    texts: [utt.text],
                };
            }
        }
        if (currentGroup) {
            groups.push(currentGroup);
        }
        
        setGroupedUtterances(groups);

    }, [transcript, leadName, userMap]);

    const handleAnalyzeTranscript = async () => {
        setIsAnalyzing(true);
        try {
            const result = await analyzeTranscript({
                leadId,
                transcriptId: transcript.id,
                transcriptContent: formattedTranscriptForAnalysis
            });

            if (result.error) {
                toast({ variant: 'destructive', title: 'Analysis Failed', description: result.error });
            } else {
                setAnalysis(result.analysis);
                onAnalysisComplete(result.analysis);
                toast({ title: 'Success', description: 'Transcript analysis complete.' });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'An unknown error occurred during analysis.' });
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    if (groupedUtterances.length === 0) {
        return <div className="text-center text-muted-foreground p-8">No valid transcript content available.</div>;
    }
    
    const sentimentIcon = {
        'Positive': <ThumbsUp className="h-5 w-5 text-green-500" />,
        'Negative': <ThumbsDown className="h-5 w-5 text-red-500" />,
        'Neutral': <Bot className="h-5 w-5 text-gray-500" />,
    }[analysis?.sentiment || 'Neutral'];

    return (
        <div className="flex flex-col md:flex-row gap-4 h-[70vh]">
            <ScrollArea className="flex-1 md:w-1/2">
                <div className="p-4 space-y-6">
                    {groupedUtterances.map((group, groupIndex) => (
                        <div key={groupIndex} className="flex items-start gap-3">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback className={cn(group.isInternal ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground')}>
                                    {group.initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className={cn(
                                    "font-bold text-sm mb-1",
                                    group.isInternal ? "text-primary" : "text-foreground"
                                )}>{group.speakerName}</p>
                                <div className="space-y-2">
                                    {group.texts.map((text, textIndex) => (
                                        <div key={textIndex} className="flex items-start">
                                            <div className={cn(
                                                "w-1 rounded-full mr-3 shrink-0 self-stretch",
                                                group.isInternal ? "bg-blue-500" : "bg-gray-300"
                                            )}></div>
                                            <p className="text-foreground text-sm">{text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
            <div className="md:w-1/2 flex flex-col gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                AI Analysis
                            </span>
                             <Button onClick={handleAnalyzeTranscript} disabled={isAnalyzing || !!analysis}>
                                {isAnalyzing ? <Loader /> : (analysis ? 'Analyzed' : 'Analyze Transcript')}
                             </Button>
                        </CardTitle>
                    </CardHeader>
                    {analysis && (
                         <CardContent className="space-y-4 text-sm">
                            <div>
                                <h4 className="font-semibold flex items-center gap-2 mb-1"><StickyNote className="h-4 w-4" /> Summary</h4>
                                <p className="text-muted-foreground">{analysis.summary}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold flex items-center gap-2 mb-1">Sentiment</h4>
                                <div className="flex items-center gap-2">
                                    {sentimentIcon}
                                    <Badge variant="outline">{analysis.sentiment}</Badge>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold flex items-center gap-2 mb-1"><List className="h-4 w-4" /> Key Topics</h4>
                                <div className="flex flex-wrap gap-1">
                                    {analysis.keyTopics.map((topic, i) => <Badge key={i} variant="secondary">{topic}</Badge>)}
                                </div>
                            </div>
                             {analysis.actionItems.length > 0 && (
                                <div>
                                    <h4 className="font-semibold flex items-center gap-2 mb-1"><CheckSquare className="h-4 w-4" /> Action Items</h4>
                                    <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                                        {analysis.actionItems.map((item, i) => <li key={i}>{item}</li>)}
                                    </ul>
                                </div>
                             )}
                         </CardContent>
                    )}
                </Card>
            </div>
        </div>
    );
}
