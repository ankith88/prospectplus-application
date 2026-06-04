'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormControl,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { Mic, MicOff, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { PATHWAYS, LOST_PROPERTY_OPTIONS } from '@/lib/discovery-constants';


const DiscoveryNoteInput = ({ 
  label, 
  value, 
  onChange, 
  placeholder = "Capture notes here..." 
}: { 
  label: string; 
  value: string; 
  onChange: (val: string) => void;
  placeholder?: string;
}) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        variant: 'destructive',
        title: 'Not Supported',
        description: 'Speech recognition is not supported in this browser.',
      });
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-AU';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        onChange((value ? value + ' ' : '') + finalTranscript);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <div className="space-y-2">
      <FormLabel className="text-sm font-medium">{label}</FormLabel>
      <div className="relative">
        <Textarea 
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-12 min-h-[100px] resize-none"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "absolute bottom-2 right-2 h-8 w-8 rounded-full",
            isListening ? "bg-red-100 text-red-600 animate-pulse" : "text-muted-foreground hover:text-primary"
          )}
          onClick={toggleListening}
        >
          {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};

export default function FieldDiscoveryStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { control, watch, setValue } = useFormContext();
  const { userProfile } = useAuth();
  const selectedPathway = watch('managementPathway');
  const pathwayNotes = watch('pathwayNotes') || {};
  const lostPropertyProcess = watch('lostPropertyProcess');

  const isDashbackOnly = userProfile?.activeRole?.toLowerCase() === 'dashback';
  const isAdminOrFranchisee = ['admin', 'Franchisee'].includes(userProfile?.activeRole || '');
  const isRoleEligibleForLostProperty = isDashbackOnly || isAdminOrFranchisee;

  const handlePathwaySelect = (pathwayId: string) => {
    setValue('managementPathway', pathwayId);
    if (pathwayId === 'no_aus_post_usage') {
      // Clear notes if switching to no opportunity
      setValue('pathwayNotes', {});
      // Move to next step (handled in the main logic or via onNext)
    }
  };

  const handleNoteChange = (questionId: string, value: string) => {
    setValue('pathwayNotes', {
      ...pathwayNotes,
      [questionId]: value
    });
  };

  const activePathway = PATHWAYS.find(p => p.id === selectedPathway);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {!isDashbackOnly && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">Field Discovery</h2>
          <p className="text-muted-foreground">How are they currently managing their mail and parcels?</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PATHWAYS.map((pathway) => (
              <button
                key={pathway.id}
                type="button"
                onClick={() => handlePathwaySelect(pathway.id)}
                className={cn(
                  "relative flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 transition-all duration-300 text-center space-y-2",
                  selectedPathway === pathway.id 
                    ? cn(pathway.color, "text-white border-transparent scale-[1.02] shadow-lg ring-4 ring-offset-2", pathway.id === 'self_managed' ? "ring-blue-200" : pathway.id === 'aus_post_managed' ? "ring-emerald-200" : "ring-red-200")
                    : "bg-white border-muted hover:border-primary/30 text-muted-foreground hover:scale-[1.01]"
                )}
              >
                <span className={cn("text-sm font-black tracking-widest", selectedPathway === pathway.id ? "text-white/90" : "text-muted-foreground/70")}>
                  {pathway.title}
                </span>
                <span className="text-xs font-medium opacity-80">{pathway.description}</span>
                {selectedPathway === pathway.id && (
                  <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-white/90" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {isDashbackOnly && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">Returns Discovery</h2>
          <p className="text-muted-foreground">Understand how the business manages lost property and returns.</p>
        </div>
      )}

      {selectedPathway === 'no_aus_post_usage' && (
        <div className="p-6 rounded-3xl bg-red-50 border-2 border-red-100 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-300">
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-red-900 uppercase tracking-wide">No Opportunity Identified</h3>
            <p className="text-sm text-red-700">This visit will be marked as "No Opportunity". Move to notes to finalize.</p>
          </div>
          <Button 
            type="button" 
            className="bg-red-600 hover:bg-red-700 text-white rounded-full px-8"
            onClick={onNext}
          >
            Mark as Closed & Continue
          </Button>
        </div>
      )}

      {activePathway && activePathway.questions.length > 0 && (
        <div className="space-y-6 pt-4 border-t animate-in fade-in duration-500">
          {activePathway.questions.map((q) => (
            <DiscoveryNoteInput
              key={q.id}
              label={q.label}
              value={pathwayNotes[q.id] || ''}
              onChange={(val) => handleNoteChange(q.id, val)}
            />
          ))}
        </div>
      )}

      {isRoleEligibleForLostProperty && (
        <div className="space-y-6 pt-6 border-t">
          <div className="space-y-1">
            <h3 className="text-base font-bold">How do you handle guest lost property returns?</h3>
            <p className="text-xs text-muted-foreground italic">Admin/Dashback Module</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {LOST_PROPERTY_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setValue('lostPropertyProcess', option.label)}
                className={cn(
                  "flex flex-col items-start p-5 rounded-[1.5rem] border-2 transition-all duration-200 text-left space-y-1",
                  lostPropertyProcess === option.label
                    ? "bg-[#d9e6da] border-[#b8ccba] text-[#1a3a1e]"
                    : "bg-white border-muted hover:border-[#d9e6da] text-muted-foreground"
                )}
              >
                <span className="font-bold text-sm">{option.label}</span>
                <span className="text-xs opacity-70">{option.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-8">
        <Button type="button" variant="outline" onClick={onBack} className="rounded-full px-8">Back</Button>
        <Button 
          type="button" 
          onClick={onNext} 
          disabled={isDashbackOnly ? false : !selectedPathway}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-8"
        >
          {isDashbackOnly || selectedPathway === 'no_aus_post_usage' ? 'Continue' : 'Next Step'}
        </Button>
      </div>
    </div>
  );
}
