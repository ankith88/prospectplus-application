
'use client';

import type { Transcript } from '@/lib/types';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface TranscriptViewerProps {
    transcript: Transcript;
    leadName: string;
}

interface Utterance {
    speaker: string;
    text: string;
    participant_type: 'internal' | 'external';
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

export function TranscriptViewer({ transcript, leadName }: TranscriptViewerProps) {
    const [groupedUtterances, setGroupedUtterances] = useState<GroupedUtterance[]>([]);

    useEffect(() => {
        let utterances: Utterance[] = [];
        try {
            // The content might be a JSON string, so it needs to be parsed.
            const parsedContent = JSON.parse(transcript.content);
            // Check if parsed content has an 'utterances' property
            utterances = parsedContent.utterances || parsedContent;
            if (!Array.isArray(utterances)) {
                utterances = [];
            }
        } catch (error) {
            console.error("Failed to parse transcript content:", error);
            // Handle case where content is not a valid JSON string
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
            const speakerName = isInternal ? transcript.author : leadName;

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

    }, [transcript, leadName]);


    if (groupedUtterances.length === 0) {
        return <div className="text-center text-muted-foreground p-8">No valid transcript content available.</div>;
    }
    
    return (
        <ScrollArea className="h-96">
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
    );
}
