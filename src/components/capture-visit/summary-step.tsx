'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { calculateScoreAndRouting } from '@/lib/discovery-scoring';
import type { DiscoveryData } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Route } from 'lucide-react';
import { Loader } from '../ui/loader';
import { DiscoveryRadarChart } from '../discovery-radar-chart';

interface SummaryStepProps {
  discoveryData: Partial<DiscoveryData>;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export default function SummaryStep({ discoveryData, onSubmit, onBack, isSubmitting }: SummaryStepProps) {
  const { score, routingTag, scoringReason, dashbackOpportunity } = calculateScoreAndRouting(discoveryData);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Discovery Analysis & Summary</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">Based on the answers provided, here is the lead analysis:</p>
          <div className="flex items-center justify-center gap-6 p-4 rounded-lg bg-muted">
            <div className="flex flex-col items-center">
              <p className="text-sm text-muted-foreground">Score</p>
              <p className="text-3xl font-bold">{score}</p>
            </div>
            <div className="flex flex-col items-center">
              <p className="text-sm text-muted-foreground">Routing Tag</p>
              <Badge variant="outline" className="text-lg mt-1 flex items-center gap-1">
                <Route className="h-4 w-4" />
                {routingTag}
              </Badge>
            </div>
            {dashbackOpportunity && (
                <div className="flex flex-col items-center border-l pl-6">
                    <p className="text-sm text-muted-foreground">Dashback</p>
                    <Badge variant="secondary" className="text-lg mt-1">
                        {dashbackOpportunity}
                    </Badge>
                </div>
            )}
          </div>
          <DiscoveryRadarChart discoveryData={discoveryData as DiscoveryData} />
          {scoringReason && (
            <p className="text-xs text-muted-foreground p-2 border-t">
              <strong>Scoring Rationale:</strong> {scoringReason}
            </p>
          )}
        </CardContent>
      </Card>
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>Back</Button>
        <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? <Loader /> : 'Submit Visit Note'}
        </Button>
      </div>
    </div>
  );
}
