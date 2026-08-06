"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, UploadCloud, File, X, Sparkles, AlertCircle, MessageSquare, CheckCircle2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { firestore as db, storage } from "@/lib/firebase";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAllUsers } from "@/services/firebase";
import { SUPER_ADMIN_UIDS } from "@/lib/constants";

function CreateAppTicketForm() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Form states
  const [title, setTitle] = useState(searchParams.get("title") || "");
  const [type, setType] = useState<"feature" | "bug" | "issue" | "feedback">(
    (searchParams.get("type") as any) || "feature"
  );
  const [platform, setPlatform] = useState<"ProspectPlus" | "LocalMile.Plus" | "LPO.Plus" | "Website">("ProspectPlus");
  const [description, setDescription] = useState(searchParams.get("desc") || "");
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Super admin assignment state (Default: Ankith Ravindran)
  const [superAdmins, setSuperAdmins] = useState<any[]>([]);
  const [assignedToUid, setAssignedToUid] = useState<string>("ncyhwLtOG1W7TZ43PkYCcObeCAf2");
  const [assignedToName, setAssignedToName] = useState<string>("Ankith Ravindran");
  const [assignedToEmail, setAssignedToEmail] = useState<string>("ankith.ravindran@mailplus.com.au");

  // Pre-generate a ticket ID for uploading attachments
  const [generatedTicketId] = useState(() => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15);
  });

  // Fetch active Super Admins for assignment
  useEffect(() => {
    getAllUsers()
      .then((allUsers) => {
        const activeAdmins = allUsers.filter((u: any) => {
          const isExplicitSuperAdmin = SUPER_ADMIN_UIDS.includes(u.uid);
          if (!isExplicitSuperAdmin && (u.disabled === true || u.status === "disabled" || u.status === "inactive")) return false;
          return (
            isExplicitSuperAdmin ||
            u.role === "admin" ||
            u.role === "superadmin" ||
            u.activeRole === "admin" ||
            u.activeRole === "superadmin" ||
            u.isSuperAdmin === true ||
            u.email?.toLowerCase() === "ankith.ravindran@mailplus.com.au"
          );
        });

        setSuperAdmins(activeAdmins);

        // Ensure Ankith Ravindran is found or defaulted
        const ankith = activeAdmins.find(
          (a) =>
            a.email?.toLowerCase().includes("ankith.ravindran") ||
            a.displayName?.toLowerCase().includes("ankith")
        );
        if (ankith) {
          setAssignedToUid(ankith.uid);
          setAssignedToName(ankith.displayName || "Ankith Ravindran");
          setAssignedToEmail(ankith.email || "ankith.ravindran@mailplus.com.au");
        }
      })
      .catch(console.error);
  }, []);

  if (loading) return <Loader2 className="h-8 w-8 animate-spin mx-auto mt-20" />;
  if (!user || !userProfile) {
    router.push("/signin");
    return null;
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingFiles(true);
    const newAttachments = [...attachments];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageRef = ref(storage, `app_tickets/attachments/${generatedTicketId}/${file.name}`);
        
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        
        newAttachments.push({
          name: file.name,
          url,
        });
      }
      setAttachments(newAttachments);
      toast.success("Files uploaded successfully.");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Error uploading files.");
    } finally {
      setUploadingFiles(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const removeAttachment = (index: number) => {
    const newAttachments = [...attachments];
    newAttachments.splice(index, 1);
    setAttachments(newAttachments);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const ticketRef = doc(db, "app_tickets", generatedTicketId);
      
      const payload = {
        title: title.trim(),
        type,
        platform,
        description: description.trim(),
        status: "open",
        attachments,
        createdBy: userProfile.uid,
        createdByName: userProfile.displayName || "Unknown User",
        createdByEmail: user.email || "No Email",
        assignedToUid: assignedToUid || "ncyhwLtOG1W7TZ43PkYCcObeCAf2",
        assignedToName: assignedToName || "Ankith Ravindran",
        assignedToEmail: assignedToEmail || "ankith.ravindran@mailplus.com.au",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        adminNotes: ""
      };

      await setDoc(ticketRef, payload);

      // Send assignment notification email to assigned Super Admin
      if (assignedToEmail) {
        try {
          const origin = typeof window !== "undefined" ? window.location.origin : "https://prospectplus.mailplus.com.au";
          const emailHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
  <h2 style="color: #095c7b; margin-top: 0; font-size: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">📌 New App Ticket Assigned to You</h2>
  <p>Hi <strong>${assignedToName}</strong>,</p>
  <p>A new App Ticket has been submitted and assigned to you by <strong>${userProfile.displayName || user.email}</strong>:</p>
  
  <div style="margin: 20px 0; padding: 16px; background-color: #f8fafc; border-left: 4px solid #095c7b; border-radius: 6px; border-top: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
    <p style="margin: 0 0 8px 0; color: #095c7b; font-weight: bold; font-size: 16px;">${title.trim()}</p>
    <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b;">
      <strong>Type:</strong> ${type} &nbsp;|&nbsp; 
      <strong>Platform:</strong> ${platform} &nbsp;|&nbsp; 
      <strong>Submitted By:</strong> ${userProfile.displayName || "User"} (${user.email})
    </p>
    <p style="margin: 8px 0 0 0; color: #334155; font-size: 14px; white-space: pre-wrap;">${description.trim()}</p>
  </div>

  <p style="font-size: 14px; color: #475569;">Click the button below to view and manage this ticket on the App Tickets page:</p>
  
  <div style="text-align: center; margin: 25px 0;">
    <a href="${origin}/admin/app-tickets?ticketId=${generatedTicketId}" 
       style="background-color: #095c7b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px; box-shadow: 0 2px 4px rgba(9, 92, 123, 0.1);">
       View Ticket on App Tickets Page
    </a>
  </div>
  
  <p style="font-size: 11px; color: #94a3b8; margin-top: 35px; border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center;">
    MailPlus Outbound Leads CRM &bull; App Tickets System
  </p>
</div>
          `;

          fetch("/api/campaigns/send-custom-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: assignedToEmail,
              subject: `[App Ticket Assigned] ${title.trim()}`,
              html: emailHtml
            })
          }).catch(err => console.error("Failed to dispatch assignment email:", err));
        } catch (emailErr) {
          console.error("Assignment email error:", emailErr);
        }
      }
      
      toast.success("Feedback submitted successfully! Thank you.");
      router.push("/app-tickets");
    } catch (error) {
      console.error("Error creating app ticket:", error);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-3xl mx-auto w-full animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#095c7b]">
            Submit Feedback / Bug
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Share feature suggestions, report application bugs, or report interface issues.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-t-4 border-t-[#095c7b] shadow-md bg-white">
          <CardHeader>
            <CardTitle className="text-xl text-[#095c7b]">Details</CardTitle>
            <CardDescription>Tell us what features you would like or what bugs you encountered.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Title */}
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-semibold text-gray-700">
                Short Title *
              </label>
              <Input
                id="title"
                placeholder="e.g. Add export to PDF button on reports"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={100}
                className="border-gray-200 focus-visible:ring-[#095c7b]"
              />
            </div>

            {/* Platform */}
            <div className="space-y-2">
              <label htmlFor="platform" className="text-sm font-semibold text-gray-700">
                Platform *
              </label>
              <select
                id="platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value as any)}
                required
                className="w-full text-sm rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#095c7b]"
              >
                <option value="ProspectPlus">ProspectPlus</option>
                <option value="LocalMile.Plus">LocalMile.Plus</option>
                <option value="LPO.Plus">LPO.Plus</option>
                <option value="Website">Website</option>
              </select>
            </div>

            {/* Assigned Super Admin */}
            <div className="space-y-2">
              <label htmlFor="assignedTo" className="text-sm font-semibold text-gray-700">
                Assigned Super Admin *
              </label>
              <select
                id="assignedTo"
                value={assignedToUid}
                onChange={(e) => {
                  const uid = e.target.value;
                  setAssignedToUid(uid);
                  const selected = superAdmins.find((s) => s.uid === uid);
                  if (selected) {
                    setAssignedToName(selected.displayName || selected.email);
                    setAssignedToEmail(selected.email || "");
                  } else if (uid === "ncyhwLtOG1W7TZ43PkYCcObeCAf2") {
                    setAssignedToName("Ankith Ravindran");
                    setAssignedToEmail("ankith.ravindran@mailplus.com.au");
                  }
                }}
                className="w-full text-sm rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#095c7b] font-medium"
              >
                <option value="ncyhwLtOG1W7TZ43PkYCcObeCAf2">Ankith Ravindran (Default)</option>
                {superAdmins
                  .filter((sa) => sa.uid !== "ncyhwLtOG1W7TZ43PkYCcObeCAf2")
                  .map((admin) => (
                    <option key={admin.uid} value={admin.uid}>
                      {admin.displayName || admin.email} ({admin.email})
                    </option>
                  ))}
              </select>
            </div>

            {/* Type selection */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Category *</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                
                {/* General Feedback */}
                <button
                  type="button"
                  onClick={() => setType("feedback")}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 text-center transition-all ${
                    type === "feedback"
                      ? "border-[#095c7b] bg-[#095c7b]/5 text-[#095c7b] shadow-sm font-semibold"
                      : "border-gray-100 hover:border-gray-200 text-gray-600 bg-white"
                  }`}
                >
                  <MessageCircle className={`h-5 w-5 mb-1.5 ${type === "feedback" ? "text-[#095c7b]" : "text-gray-400"}`} />
                  <span className="text-xs">General Feedback</span>
                </button>

                {/* Feature Request */}
                <button
                  type="button"
                  onClick={() => setType("feature")}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 text-center transition-all ${
                    type === "feature"
                      ? "border-[#095c7b] bg-[#095c7b]/5 text-[#095c7b] shadow-sm font-semibold"
                      : "border-gray-100 hover:border-gray-200 text-gray-600 bg-white"
                  }`}
                >
                  <Sparkles className={`h-5 w-5 mb-1.5 ${type === "feature" ? "text-[#095c7b]" : "text-gray-400"}`} />
                  <span className="text-xs">Feature Request</span>
                </button>

                {/* Bug Report */}
                <button
                  type="button"
                  onClick={() => setType("bug")}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 text-center transition-all ${
                    type === "bug"
                      ? "border-[#095c7b] bg-[#095c7b]/5 text-[#095c7b] shadow-sm font-semibold"
                      : "border-gray-100 hover:border-gray-200 text-gray-600 bg-white"
                  }`}
                >
                  <AlertCircle className={`h-5 w-5 mb-1.5 ${type === "bug" ? "text-[#095c7b]" : "text-gray-400"}`} />
                  <span className="text-xs">Bug Report</span>
                </button>

                {/* General Issue */}
                <button
                  type="button"
                  onClick={() => setType("issue")}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 text-center transition-all ${
                    type === "issue"
                      ? "border-[#095c7b] bg-[#095c7b]/5 text-[#095c7b] shadow-sm font-semibold"
                      : "border-gray-100 hover:border-gray-200 text-gray-600 bg-white"
                  }`}
                >
                  <MessageSquare className={`h-5 w-5 mb-1.5 ${type === "issue" ? "text-[#095c7b]" : "text-gray-400"}`} />
                  <span className="text-xs">General Issue</span>
                </button>
              </div>
            </div>

            {/* Description/Notes */}
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-semibold text-gray-700">
                Detailed Description & Notes *
              </label>
              <Textarea
                id="description"
                placeholder={
                  type === "bug"
                    ? "What steps did you take? What did you expect to happen, and what actually happened?"
                    : "Describe the feature or issue. What benefit does it bring to the team?"
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="min-h-[150px] border-gray-200 focus-visible:ring-[#095c7b] leading-relaxed resize-y"
              />
            </div>

          </CardContent>
        </Card>

        {/* Media Attachments */}
        <Card className="shadow-md bg-white border-t border-gray-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-[#095c7b]">Screenshots & Attachments</CardTitle>
            <CardDescription>Upload files or screenshots to help understand your request.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 bg-gray-50/50 hover:bg-gray-50 transition-colors flex flex-col items-center justify-center relative">
              <input
                type="file"
                multiple
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileUpload}
                disabled={uploadingFiles}
              />
              <div className="text-center space-y-2 pointer-events-none">
                <div className="flex justify-center">
                  {uploadingFiles ? (
                    <Loader2 className="h-8 w-8 text-[#095c7b] animate-spin" />
                  ) : (
                    <UploadCloud className="h-8 w-8 text-[#095c7b]" />
                  )}
                </div>
                <div className="text-sm font-semibold text-gray-700">
                  {uploadingFiles ? "Uploading..." : "Click or drag screenshots to upload"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Upload images, PDFs, or receipts
                </div>
              </div>
            </div>

            {attachments.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                {attachments.map((file, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-100 shadow-sm"
                  >
                    <div className="flex items-center space-x-2 overflow-hidden">
                      <File className="h-4 w-4 text-[#095c7b] flex-shrink-0" />
                      <span className="text-xs truncate max-w-[160px]" title={file.name}>{file.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => removeAttachment(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/app-tickets")}
            disabled={isSubmitting || uploadingFiles}
            className="border-gray-200"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-[#eaf143] text-[#095c7b] hover:bg-[#d8e032] font-bold px-6 shadow-sm"
            disabled={isSubmitting || uploadingFiles}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Submit Request
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function CreateAppTicketPage() {
  return (
    <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin mx-auto mt-20" />}>
      <CreateAppTicketForm />
    </Suspense>
  );
}
