'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/ui/loader';
import { useAuth } from '@/hooks/use-auth';
import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { logNoteActivity } from '@/services/firebase';
import { Lead } from '@/lib/types';
import { format } from 'date-fns';
import { Plus, FileText, PhoneCall, MessageSquare, User, Calendar } from 'lucide-react';

interface LeadNotesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
}

interface ActivityItem {
  id: string;
  type: string;
  date: string;
  author: string;
  notes: string;
  outcome?: string;
}

export function LeadNotesDialog({ isOpen, onClose, lead }: LeadNotesDialogProps) {
  const { userProfile } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const authorName = userProfile
    ? userProfile.displayName || [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ') || userProfile.email || 'System'
    : 'System';

  const fetchNotesAndActivities = useCallback(async (leadId: string, collectionType: 'leads' | 'companies' = 'leads') => {
    setLoading(true);
    try {
      const items: ActivityItem[] = [];

      // 1. Fetch 'activity' subcollection
      try {
        const actSnap = await getDocs(collection(firestore, collectionType, leadId, 'activity'));
        actSnap.docs.forEach((doc) => {
          const data = doc.data();
          items.push({
            id: doc.id,
            type: data.type || 'Update',
            date: data.date || data.createdAt || '',
            author: data.author || 'System',
            notes: data.notes || data.content || '',
            outcome: data.outcome,
          });
        });
      } catch (err) {
        console.warn('Could not fetch activity subcollection:', err);
      }

      // 2. Fetch 'notes' subcollection
      try {
        const notesSnap = await getDocs(collection(firestore, collectionType, leadId, 'notes'));
        notesSnap.docs.forEach((doc) => {
          const data = doc.data();
          items.push({
            id: doc.id,
            type: 'Note',
            date: data.date || data.createdAt || '',
            author: data.author || 'System',
            notes: data.content || data.notes || '',
          });
        });
      } catch (err) {
        console.warn('Could not fetch notes subcollection:', err);
      }

      // 3. Fetch 'cs_calls' subcollection
      try {
        const csSnap = await getDocs(collection(firestore, collectionType, leadId, 'cs_calls'));
        csSnap.docs.forEach((doc) => {
          const data = doc.data();
          const notesText = data.notes
            ? `[CS Outcome: ${data.outcome || 'Called'}] ${data.notes}`
            : `[CS Outcome: ${data.outcome || 'Called'}]`;
          items.push({
            id: doc.id,
            type: 'CS Call',
            date: data.date || '',
            author: data.author || 'System',
            notes: notesText,
            outcome: data.outcome,
          });
        });
      } catch (err) {
        console.warn('Could not fetch cs_calls subcollection:', err);
      }

      // 4. Merge embedded fields from lead prop if available
      if (lead) {
        if (Array.isArray(lead.activity)) {
          lead.activity.forEach((act: any, idx: number) => {
            if (act && (act.notes || act.type)) {
              items.push({
                id: act.id || `embedded-act-${idx}`,
                type: act.type || 'Activity',
                date: act.date || '',
                author: act.author || 'System',
                notes: act.notes || '',
                outcome: act.outcome,
              });
            }
          });
        }

        if (Array.isArray(lead.notes)) {
          lead.notes.forEach((n: any, idx: number) => {
            if (n && (n.content || n.notes)) {
              items.push({
                id: n.id || `embedded-note-${idx}`,
                type: 'Note',
                date: n.date || '',
                author: n.author || 'System',
                notes: n.content || n.notes || '',
              });
            }
          });
        }

        if ((lead as any).visitNotes) {
          items.push({
            id: 'visit-notes',
            type: 'Visit Note',
            date: lead.dateLeadEntered || '',
            author: 'System',
            notes: (lead as any).visitNotes,
          });
        }

        if ((lead.discoveryData as any)?.notes) {
          items.push({
            id: 'discovery-notes',
            type: 'Discovery Note',
            date: lead.dateLeadEntered || '',
            author: 'System',
            notes: (lead.discoveryData as any).notes,
          });
        }

        if (lead.lastCsNotes) {
          items.push({
            id: 'last-cs-note',
            type: 'CS Call',
            date: lead.lastContactedDate || lead.lastCsContactedDate || '',
            author: lead.lastCsAuthor || 'CS Rep',
            notes: lead.lastCsOutcome ? `[${lead.lastCsOutcome}] ${lead.lastCsNotes}` : lead.lastCsNotes,
            outcome: lead.lastCsOutcome,
          });
        }
      }

      // Deduplicate items by notes content + type + date
      const uniqueItems: ActivityItem[] = [];
      const seenKeys = new Set<string>();

      items.forEach((item) => {
        if (!item.notes || !item.notes.trim()) return;
        const key = `${item.type}-${item.notes.trim().toLowerCase()}-${(item.date || '').slice(0, 16)}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          uniqueItems.push(item);
        }
      });

      // Sort by date descending
      uniqueItems.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });

      setActivities(uniqueItems);
    } catch (error) {
      console.error('Error loading notes and activities:', error);
    } finally {
      setLoading(false);
    }
  }, [lead]);

  useEffect(() => {
    if (isOpen && lead?.id) {
      const colType = (lead as any).type === 'companies' ? 'companies' : 'leads';
      fetchNotesAndActivities(lead.id, colType);
    } else {
      setActivities([]);
      setNewNote('');
    }
  }, [isOpen, lead, fetchNotesAndActivities]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !lead?.id) return;
    setIsSubmitting(true);
    const nowStr = new Date().toISOString();
    const colType = (lead as any).type === 'companies' ? 'companies' : 'leads';
    try {
      await logNoteActivity(lead.id, {
        content: newNote.trim(),
        author: authorName,
        date: nowStr,
      }, colType);

      const addedItem: ActivityItem = {
        id: `new-${Date.now()}`,
        type: 'Note',
        date: nowStr,
        author: authorName,
        notes: newNote.trim(),
      };

      setActivities((prev) => [addedItem, ...prev]);
      setNewNote('');
    } catch (error) {
      console.error('Failed to add note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateStr = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return format(d, 'PP p');
    } catch {
      return dateStr;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'note':
      case 'visit note':
      case 'discovery note':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'call':
      case 'cs call':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'email':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'meeting':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-[#095c7b] font-bold flex items-center gap-2">
            <FileText className="h-5 w-5" /> Recent Activities & Notes
          </DialogTitle>
          <DialogDescription>
            History for <span className="font-semibold text-slate-800">{lead.companyName}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Add New Note Section */}
        <div className="space-y-2 border-b pb-4">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
            <Plus className="h-3.5 w-3.5 text-[#095c7b]" /> Add New Note
          </label>
          <div className="flex gap-2">
            <Textarea
              placeholder="Type a new note here..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[60px] text-xs resize-none bg-white"
            />
            <Button
              size="sm"
              onClick={handleAddNote}
              disabled={isSubmitting || !newNote.trim()}
              className="bg-[#095c7b] text-white hover:bg-[#084c66] self-end shrink-0"
            >
              {isSubmitting ? 'Saving...' : 'Add Note'}
            </Button>
          </div>
        </div>

        {/* Timeline List */}
        <ScrollArea className="h-[380px] w-full rounded-md border p-4 bg-slate-50">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader />
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center text-muted-foreground p-8 text-sm">
              No activities or notes logged for this lead yet.
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex flex-col space-y-1 pb-4 border-b last:border-0 last:pb-0">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] font-semibold ${getTypeBadgeColor(activity.type)}`}>
                        {activity.type}
                      </Badge>
                      <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-400" /> {activity.author}
                      </span>
                    </div>
                    {activity.date && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" /> {formatDateStr(activity.date)}
                      </span>
                    )}
                  </div>
                  {activity.notes && (
                    <div className="text-xs mt-2 text-slate-700 whitespace-pre-wrap leading-relaxed bg-white p-2.5 rounded border border-slate-200 shadow-xs">
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

