"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, UploadCloud, File, X, Sparkles, AlertCircle, MessageSquare, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { firestore as db, storage } from "@/lib/firebase";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function CreateAppTicketPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  // Form states
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"feature" | "bug" | "issue">("feature");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Pre-generate a ticket ID for uploading attachments
  const [generatedTicketId] = useState(() => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15);
  });

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
        description: description.trim(),
        status: "open",
        attachments,
        createdBy: userProfile.uid,
        createdByName: userProfile.displayName || "Unknown User",
        createdByEmail: user.email || "No Email",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        adminNotes: ""
      };

      await setDoc(ticketRef, payload);
      
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

            {/* Type selection */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Category *</label>
              <div className="grid grid-cols-3 gap-3">
                
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
