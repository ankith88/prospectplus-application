'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lead } from '@/lib/types';
import { format } from 'date-fns';

interface LeadNotesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
}

export function LeadNotesDialog({ isOpen, onClose, lead }: LeadNotesDialogProps) {
  if (!lead) return null;

  // Sort activities by date descending
  const sortedActivities = (lead.activity || []).sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Recent Activities & Notes</DialogTitle>
          <DialogDescription>
            History for {lead.companyName}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-slate-50">
          {sortedActivities.length === 0 ? (
            <div className="text-center text-muted-foreground p-8">
              No recent activities or notes.
            </div>
          ) : (
            <div className="space-y-4">
              {sortedActivities.map((activity, index) => (
                <div key={index} className="flex flex-col space-y-1 pb-4 border-b last:border-0 last:pb-0">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-sm">{activity.type}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(activity.date), 'PP p')}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-slate-500">
                    By {activity.author || 'System'}
                  </div>
                  {activity.notes && (
                    <div className="text-sm mt-2 whitespace-pre-wrap">
                      {activity.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
