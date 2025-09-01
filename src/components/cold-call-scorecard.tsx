
'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { scoreColdCall, ScorecardAnalysis } from '@/ai/flows/score-cold-call';
import { addScorecard } from '@/services/firebase';
import type { Lead, Scorecard } from '@/lib/types';
import { Loader } from './ui/loader';
import { Star, FileQuestion } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { ScrollArea } from './ui/scroll-area';

const formSchema = z.object({
  openingClarity: z.enum(['clear', 'unclear', 'somewhat_clear']),
  openingRapport: z.boolean().default(false),
  diagnosticQuestionQuality: z.enum(['effective', 'ineffective', 'needs_improvement']),
  painPointIdentification: z.boolean().default(false),
  pitchClarity: z.enum(['clear', 'unclear', 'somewhat_clear']),
  pitchRelevance: z.enum(['relevant', 'irrelevant', 'somewhat_relevant']),
  valuePropositionCommunicated: z.boolean().default(false),
  nextStepsDefined: z.enum(['clear', 'unclear', 'not_defined']),
  objectionHandling: z.enum(['effective', 'ineffective', 'not_applicable']),
  callControl: z.enum(['strong', 'weak', 'moderate']),
  listeningSkills: z.enum(['strong', 'weak', 'moderate']),
  confidence: z.enum(['high', 'low', 'moderate']),
});

type ScorecardFormValues = z.infer<typeof formSchema>;

interface ColdCallScorecardDialogProps {
  lead: Lead;
  dialerName: string;
  onScorecardSubmit: () => void;
}

export function ColdCallScorecardDialog({
  lead,
  dialerName,
  onScorecardSubmit,
}: ColdCallScorecardDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [analysis, setAnalysis] = useState<ScorecardAnalysis | null>(null);
  const { toast } = useToast();

  const form = useForm<ScorecardFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      openingClarity: 'clear',
      openingRapport: false,
      diagnosticQuestionQuality: 'effective',
      painPointIdentification: false,
      pitchClarity: 'clear',
      pitchRelevance: 'relevant',
      valuePropositionCommunicated: false,
      nextStepsDefined: 'clear',
      objectionHandling: 'effective',
      callControl: 'strong',
      listeningSkills: 'strong',
      confidence: 'high',
    },
  });

  const handleSubmit = async (values: ScorecardFormValues) => {
    setIsScoring(true);
    setAnalysis(null);
    try {
      // 1. Add the initial scorecard data to Firebase
      const newScorecardData = {
        ...values,
        leadId: lead.id,
        dialerAssigned: dialerName,
      };
      const savedScorecard = await addScorecard(lead.id, newScorecardData);

      // 2. Call the AI scoring flow
      const analysisResult = await scoreColdCall({
        ...values,
        leadId: lead.id,
        scorecardId: savedScorecard.id,
      });

      setAnalysis(analysisResult);
      onScorecardSubmit(); // Re-fetch scorecards on lead profile
      toast({ title: 'Success', description: 'AI analysis complete.' });
    } catch (error) {
      console.error('Failed to score call:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to complete AI analysis. Please try again.',
      });
    } finally {
      setIsScoring(false);
    }
  };

  const resetDialog = () => {
    form.reset();
    setAnalysis(null);
    setIsScoring(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Star className="mr-2 h-4 w-4" />
          Open Scorecard
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[90vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Cold Call Scorecard</DialogTitle>
          <DialogDescription>
            Evaluate the call with {lead.companyName} for AI-powered feedback.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col md:flex-row gap-6 h-full overflow-hidden">
          <ScrollArea className="w-full md:w-1/2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pr-4">
                <Accordion type="multiple" defaultValue={['opening', 'diagnostics', 'pitch', 'close', 'overall']} className="w-full">
                  <AccordionItem value="opening">
                    <AccordionTrigger>Opening</AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      <FormField control={form.control} name="openingClarity" render={({ field }) => (
                          <FormItem><FormLabel>Opener Clarity</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="clear">Clear & Concise</SelectItem><SelectItem value="somewhat_clear">Somewhat Clear</SelectItem><SelectItem value="unclear">Unclear/Confusing</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )}
                      />
                      <FormField control={form.control} name="openingRapport" render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Attempted to build rapport?</FormLabel></div></FormItem>
                        )}
                      />
                    </AccordionContent>
                  </AccordionItem>
                   <AccordionItem value="diagnostics">
                    <AccordionTrigger>Diagnostics</AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      <FormField control={form.control} name="diagnosticQuestionQuality" render={({ field }) => (
                          <FormItem><FormLabel>Question Quality</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="effective">Effective & Probing</SelectItem><SelectItem value="needs_improvement">Needs Improvement</SelectItem><SelectItem value="ineffective">Ineffective/Generic</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )}
                      />
                      <FormField control={form.control} name="painPointIdentification" render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Successfully identified pain points?</FormLabel></div></FormItem>
                        )}
                      />
                    </AccordionContent>
                  </AccordionItem>
                   <AccordionItem value="pitch">
                    <AccordionTrigger>Pitch</AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      <FormField control={form.control} name="pitchClarity" render={({ field }) => (
                          <FormItem><FormLabel>Pitch Clarity</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="clear">Clear & Concise</SelectItem><SelectItem value="somewhat_clear">Somewhat Clear</SelectItem><SelectItem value="unclear">Unclear/Rambling</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )}
                      />
                       <FormField control={form.control} name="pitchRelevance" render={({ field }) => (
                          <FormItem><FormLabel>Pitch Relevance to Pain Points</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="relevant">Relevant</SelectItem><SelectItem value="somewhat_relevant">Somewhat Relevant</SelectItem><SelectItem value="irrelevant">Irrelevant</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )}
                      />
                      <FormField control={form.control} name="valuePropositionCommunicated" render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>Clearly communicated value proposition?</FormLabel></div></FormItem>
                        )}
                      />
                    </AccordionContent>
                  </AccordionItem>
                   <AccordionItem value="close">
                    <AccordionTrigger>Close</AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      <FormField control={form.control} name="nextStepsDefined" render={({ field }) => (
                          <FormItem><FormLabel>Next Steps</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="clear">Clear & Defined</SelectItem><SelectItem value="unclear">Vague/Unclear</SelectItem><SelectItem value="not_defined">Not Defined</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )}
                      />
                       <FormField control={form.control} name="objectionHandling" render={({ field }) => (
                          <FormItem><FormLabel>Objection Handling</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="effective">Effective</SelectItem><SelectItem value="ineffective">Ineffective</SelectItem><SelectItem value="not_applicable">Not Applicable</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )}
                      />
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="overall">
                    <AccordionTrigger>Overall Impression</AccordionTrigger>
                    <AccordionContent className="space-y-4">
                       <FormField control={form.control} name="callControl" render={({ field }) => (
                          <FormItem><FormLabel>Call Control</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="strong">Strong</SelectItem><SelectItem value="moderate">Moderate</SelectItem><SelectItem value="weak">Weak</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )}
                      />
                       <FormField control={form.control} name="listeningSkills" render={({ field }) => (
                          <FormItem><FormLabel>Listening Skills</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="strong">Strong</SelectItem><SelectItem value="moderate">Moderate</SelectItem><SelectItem value="weak">Weak</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )}
                      />
                       <FormField control={form.control} name="confidence" render={({ field }) => (
                          <FormItem><FormLabel>Confidence Level</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="moderate">Moderate</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                 <Button type="submit" className="w-full" disabled={isScoring || !!analysis}>
                  {isScoring ? <Loader /> : 'Submit for AI Scoring'}
                </Button>
              </form>
            </Form>
          </ScrollArea>

          <div className="w-full md:w-1/2 flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-center">AI Performance Matrix</h3>
            {isScoring ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                    <Loader />
                    <p className="text-muted-foreground">AI is analyzing the call...</p>
                </div>
            ) : analysis ? (
                <ScrollArea className="h-full">
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analysis.pillarScores}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="pillar" tick={{ fontSize: 12 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 10]} />
                            <Radar name="Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-4 p-4 text-sm">
                        <h4 className="font-semibold">Overall Feedback (Score: {analysis.overallScore.toFixed(1)}/10)</h4>
                        <p className="text-muted-foreground">{analysis.overallFeedback}</p>
                        <Accordion type="single" collapsible className="w-full">
                        {analysis.pillarScores.map(p => (
                            <AccordionItem value={p.pillar} key={p.pillar}>
                                <AccordionTrigger>{p.pillar} (Score: {p.score}/10)</AccordionTrigger>
                                <AccordionContent>{p.feedback}</AccordionContent>
                            </AccordionItem>
                        ))}
                        </Accordion>
                    </div>
                </ScrollArea>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 border-2 border-dashed rounded-lg">
                    <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
                    <h4 className="font-semibold">Awaiting Analysis</h4>
                    <p className="text-sm text-muted-foreground">
                        Fill out and submit the scorecard on the left to generate AI-powered feedback and a performance matrix.
                    </p>
                </div>
            )}
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary" onClick={resetDialog}>Close</Button>
                </DialogClose>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
