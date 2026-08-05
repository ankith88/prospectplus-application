"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Send,
  Paperclip,
  Lock,
  Mail,
  User,
  MessageSquare,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Shield,
  FileText,
  X
} from "lucide-react";
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";
import { firestore as db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface Attachment {
  name: string;
  url: string;
}

interface TicketCommunication {
  id?: string;
  timestamp: string;
  type?: string;
  direction?: 'Inbound' | 'Outbound' | 'Internal';
  visibility?: 'Public' | 'Internal';
  source?: 'Web' | 'Email' | 'System';
  from?: string;
  to?: string;
  subject?: string;
  body?: string;
  content?: string;
  author?: string;
  attachments?: Attachment[];
}

interface TicketCommentThreadProps {
  ticketId: string;
  ticketNumber?: string;
  currentStatus?: string;
  communications: TicketCommunication[];
  recipientEmail?: string;
  recipientName?: string;
  onCommentAdded?: () => void;
  onStatusChange?: (newStatus: string) => Promise<void> | void;
}

export function TicketCommentThread({
  ticketId,
  ticketNumber,
  currentStatus,
  communications = [],
  recipientEmail,
  recipientName,
  onCommentAdded,
  onStatusChange,
}: TicketCommentThreadProps) {
  const { userProfile } = useAuth();
  const [replyText, setReplyText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const newAttachments: Attachment[] = [...attachments];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageRef = ref(storage, `tickets/${ticketId}/comms_${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);
        newAttachments.push({ name: file.name, url: downloadUrl });
      }
      setAttachments(newAttachments);
      toast.success("File attached successfully");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload attachment");
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendComment = async (targetStatus?: string) => {
    if (!replyText.trim() && attachments.length === 0) {
      toast.error("Please enter a response message or add an attachment.");
      return;
    }

    setIsSubmitting(true);
    try {
      const authorName = userProfile?.displayName || userProfile?.email || "Support Staff";
      const nowIso = new Date().toISOString();

      const commDoc = {
        timestamp: nowIso,
        type: isInternal ? "Note" : "Comment",
        direction: isInternal ? "Internal" : "Outbound",
        visibility: isInternal ? "Internal" : "Public",
        source: "Web",
        from: userProfile?.email || "support@mailplus.com.au",
        to: isInternal ? "" : (recipientEmail || ""),
        subject: `[Ticket #${ticketNumber || ticketId}] Ticket Update`,
        content: replyText,
        body: replyText,
        author: authorName,
        attachments: attachments,
      };

      // Add to Firestore subcollection
      await addDoc(collection(db, "tickets", ticketId, "communications"), commDoc);

      // Update parent ticket's updatedAt timestamp
      const ticketRef = doc(db, "tickets", ticketId);
      const updatePayload: Record<string, any> = {
        updatedAt: nowIso,
      };

      if (targetStatus && targetStatus !== currentStatus) {
        updatePayload.currentStatus = targetStatus;
      }

      await updateDoc(ticketRef, updatePayload);

      // If updating status, trigger callback
      if (targetStatus && onStatusChange) {
        await onStatusChange(targetStatus);
      }

      // If public reply, trigger email notification to recipient
      if (!isInternal && recipientEmail) {
        const ticketUrl = `${window.location.origin}/admin/tickets/${ticketId}`;
        const emailSubject = `[Ticket #${ticketNumber || ticketId}] New response regarding your enquiry`;
        
        const htmlBody = `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h3 style="color: #095c7b;">Update on Ticket #${ticketNumber || ticketId}</h3>
            <p>Hi ${recipientName || 'Customer'},</p>
            <p>A new comment has been posted regarding your ticket:</p>
            <blockquote style="border-left: 4px solid #095c7b; margin: 15px 0; padding: 10px 15px; background: #f4f7f8; white-space: pre-wrap;">${replyText}</blockquote>
            <p style="margin-top: 20px;">
              <a href="${ticketUrl}" style="background-color: #095c7b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">View & Reply on Ticket</a>
            </p>
            <p style="font-size: 12px; color: #777; margin-top: 25px;">
              You can reply directly on the ticket using the link above, or reply directly to this email.
            </p>
          </div>
        `;

        await fetch("/api/campaigns/send-custom-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: recipientEmail,
            subject: emailSubject,
            html: htmlBody,
            customFrom: "tracking@mailplus.com.au",
            ticketId: ticketId,
          }),
        }).catch((err) => console.error("Email notification failed:", err));
      }

      toast.success(isInternal ? "Internal note added" : "Reply sent successfully");
      setReplyText("");
      setAttachments([]);
      if (onCommentAdded) onCommentAdded();
    } catch (err) {
      console.error("Failed to post comment:", err);
      toast.error("Failed to post comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-sm border">
      <CardHeader className="bg-slate-50/50 pb-3 border-b flex flex-row items-center justify-between">
        <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
          <MessageSquare className="w-4 h-4 text-sky-600" />
          Ticket Activity & Reply Thread
        </CardTitle>
        <Badge variant="outline" className="text-xs bg-white font-normal">
          {communications.length} {communications.length === 1 ? "entry" : "entries"}
        </Badge>
      </CardHeader>

      <CardContent className="p-4 space-y-6">
        {/* REPLY INPUT FORM */}
        <div className="bg-white border rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={!isInternal ? "default" : "outline"}
                size="sm"
                onClick={() => setIsInternal(false)}
                className={!isInternal ? "bg-sky-700 hover:bg-sky-800 text-white font-medium" : "text-slate-600"}
              >
                <Mail className="w-3.5 h-3.5 mr-1.5" />
                Public Reply
              </Button>
              <Button
                type="button"
                variant={isInternal ? "default" : "outline"}
                size="sm"
                onClick={() => setIsInternal(true)}
                className={isInternal ? "bg-amber-600 hover:bg-amber-700 text-white font-medium" : "text-slate-600"}
              >
                <Lock className="w-3.5 h-3.5 mr-1.5" />
                Internal Note
              </Button>
            </div>
            {recipientEmail && !isInternal && (
              <span className="text-xs text-slate-500 truncate max-w-[250px]">
                To: <span className="font-medium text-slate-700">{recipientEmail}</span>
              </span>
            )}
          </div>

          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={
              isInternal
                ? "Add an internal note visible only to staff..."
                : "Type your reply to the customer / requester..."
            }
            rows={4}
            className="w-full text-sm resize-y focus-visible:ring-sky-600"
          />

          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {attachments.map((att, idx) => (
                <Badge key={idx} variant="secondary" className="flex items-center gap-1.5 py-1 px-2 text-xs">
                  <Paperclip className="w-3 h-3 text-slate-500" />
                  <span className="truncate max-w-[150px]">{att.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <label className="cursor-pointer inline-flex items-center text-xs font-medium text-slate-600 hover:text-sky-700 border rounded-md px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 transition-colors">
                <Paperclip className="w-3.5 h-3.5 mr-1" />
                {isUploading ? "Attaching..." : "Attach File"}
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>

            <div className="flex items-center gap-2">
              {/* Quick Status Action Buttons */}
              {!isInternal && currentStatus !== "Closed" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => handleSendComment("Awaiting User Feedback")}
                  className="text-xs border-amber-300 text-amber-800 hover:bg-amber-50"
                >
                  <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" />
                  Reply & Await Feedback
                </Button>
              )}

              <Button
                type="button"
                size="sm"
                disabled={isSubmitting || isUploading}
                onClick={() => handleSendComment()}
                className={isInternal ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-sky-700 hover:bg-sky-800 text-white"}
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {isSubmitting ? "Sending..." : isInternal ? "Post Internal Note" : "Send Reply"}
              </Button>
            </div>
          </div>
        </div>

        {/* TIMELINE OF PAST COMMUNICATIONS */}
        <div className="space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 border-b pb-1">
            Communication History
          </div>

          {communications.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No communications logged yet.
            </div>
          ) : (
            <div className="space-y-3">
              {communications.map((comm, index) => {
                const isInternalNote = comm.visibility === "Internal" || comm.direction === "Internal" || comm.type === "Note";
                const isInbound = comm.direction === "Inbound" || comm.type === "RECEIVED";
                const dateStr = comm.timestamp ? new Date(comm.timestamp).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" }) : "N/A";
                const displayContent = comm.content || comm.body || "";

                return (
                  <div
                    key={comm.id || index}
                    className={`rounded-lg border p-3.5 text-sm transition-all ${
                      isInternalNote
                        ? "bg-amber-50/70 border-amber-200"
                        : isInbound
                        ? "bg-slate-50 border-slate-200"
                        : "bg-sky-50/40 border-sky-100"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isInternalNote ? (
                          <Badge className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] px-1.5">
                            <Lock className="w-3 h-3 mr-1" /> Internal Note
                          </Badge>
                        ) : isInbound ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] px-1.5">
                            <ArrowDownLeft className="w-3 h-3 mr-1" /> Inbound Reply ({comm.source || "Email"})
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-300 text-[10px] px-1.5">
                            <ArrowUpRight className="w-3 h-3 mr-1" /> Outbound ({comm.source || "Web"})
                          </Badge>
                        )}
                        <span className="font-semibold text-slate-800 text-xs">
                          {comm.author || comm.from || "Staff"}
                        </span>
                      </div>

                      <span className="text-[11px] text-slate-400 font-mono">
                        {dateStr}
                      </span>
                    </div>

                    {comm.subject && (
                      <div className="font-medium text-xs text-slate-700 mb-1">
                        {comm.subject}
                      </div>
                    )}

                    <div className="text-slate-700 whitespace-pre-wrap leading-relaxed text-xs">
                      {displayContent}
                    </div>

                    {/* Attachments */}
                    {comm.attachments && comm.attachments.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-200/60 flex flex-wrap gap-2">
                        {comm.attachments.map((att, aIdx) => (
                          <a
                            key={aIdx}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-[11px] text-sky-700 hover:underline bg-white border px-2 py-0.5 rounded shadow-xs"
                          >
                            <FileText className="w-3 h-3 mr-1 text-slate-400" />
                            {att.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
