
'use client';

import type { Transcript } from '@/lib/types';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';

interface TranscriptViewerProps {
    transcript: Transcript;
    leadName: string;
}

interface Utterance {
    speaker: string;
    text: string;
    participant_type: 'internal' | 'external';
}

function getInitials(name: string) {
    const words = name.split(' ');
    if (words.length > 1) {
        return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

export function TranscriptViewer({ transcript, leadName }: TranscriptViewerProps) {
    
    let utterances: Utterance[] = [];
    try {
        if (typeof transcript.content === 'string' && transcript.content.trim().startsWith('[')) {
            utterances = JSON.parse(transcript.content);
        } else if (Array.isArray(transcript.content)) {
            // This case handles data that might not have been stringified upon saving
            utterances = transcript.content;
        } else if (typeof transcript.content === 'string') {
             // Fallback for plain text content
            utterances = [{ speaker: transcript.author, text: transcript.content, participant_type: 'internal' }];
        }
    } catch(e) {
        console.error("Could not parse transcript content:", e);
        // Fallback for plain text content
        if (typeof transcript.content === 'string') {
            utterances = [{ speaker: transcript.author, text: transcript.content, participant_type: 'internal' }];
        }
    }

    if (!utterances || utterances.length === 0) {
        return <div className="text-center text-muted-foreground p-8">No transcript content available.</div>;
    }
    
    return (
        <ScrollArea className="h-96">
            <div className="p-4 space-y-6">
                {utterances.map((utt, index) => {
                    const isInternal = utt.participant_type === 'internal';
                    const speakerName = isInternal ? transcript.author : leadName;
                    
                    return (
                        <div key={index} className="flex items-start gap-4">
                             <Avatar className="h-8 w-8">
                                <AvatarFallback className={cn(isInternal ? 'bg-primary text-primary-foreground' : 'bg-secondary')}>
                                    {getInitials(speakerName)}
                                </AvatarFallback>
                            </Avatar>
                            <div className={cn(
                                "flex-1 border-l-2 pl-4",
                                isInternal ? "border-green-500" : "border-blue-500"
                            )}>
                                <p className={cn(
                                    "font-bold text-sm",
                                     isInternal ? "text-green-600" : "text-blue-600"
                                )}>{speakerName}</p>
                                <p className="text-foreground">{utt.text}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </ScrollArea>
    );
}
