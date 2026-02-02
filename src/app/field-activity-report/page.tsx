
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function FieldActivityReportPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Field Activity Report</h1>
        <p className="text-muted-foreground">
          Track visit notes and their conversion to leads.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This report will provide insights into the visit notes captured by the field sales team,
            including conversion rates and status tracking.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
