"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

interface QuickTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTitle?: string;
  leadId?: string;
  companyName?: string;
  onTaskCreated?: (task: any) => void;
}

export function QuickTaskDialog({
  isOpen,
  onClose,
  defaultTitle = "",
  leadId,
  companyName,
  onTaskCreated,
}: QuickTaskDialogProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(defaultTitle || "Follow up on query results");
  const [dueDate, setDueDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Please enter a task title");
      return;
    }
    if (!user) {
      toast.error("Please login to create a task");
      return;
    }

    setLoading(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/ask/quick-task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          dueDate,
          leadId,
          companyName,
          notes: notes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create task");

      toast.success("Task created successfully!");
      if (onTaskCreated) onTaskCreated(data.task);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px] bg-white border border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-serif text-slate-800">
            <CheckCircle className="h-5 w-5 text-[#095c7b]" />
            Create Quick CRM Task
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {companyName && (
            <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700">
              <span className="font-semibold text-slate-900">Linked Account:</span> {companyName}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-title" className="text-xs font-semibold text-slate-700">
              Task Title <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Call lead regarding contract renewal"
              className="text-sm bg-[#FFFDF6]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-duedate" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-500" /> Due Date
            </Label>
            <Input
              id="task-duedate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="text-sm bg-[#FFFDF6]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-notes" className="text-xs font-semibold text-slate-700">
              Action Notes (Optional)
            </Label>
            <Textarea
              id="task-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any specific context or follow-up instructions..."
              rows={3}
              className="text-sm bg-[#FFFDF6]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleCreate}
            disabled={loading}
            className="bg-[#095c7b] hover:bg-[#07475f] text-white"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
