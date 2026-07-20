"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { useRouter, useParams } from "next/navigation";
import { FullScreenLoader } from "@/components/ui/loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  Mail,
  FileText,
  UserPlus,
  Building2,
  AlertTriangle,
  Calendar,
  Plus,
  Send,
  Clock,
  User,
  ExternalLink,
  Lock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Wrench,
  Paperclip,
  RefreshCw,
  Truck,
  Info,
  Activity,
  ArrowUpRight,
  Download,
  Check,
  MapPin,
  Tag,
  Copy,
  Eye,
  Phone
} from "lucide-react";
import Link from "next/link";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  serverTimestamp,
  where,
  limit
} from "firebase/firestore";
import { firestore as db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAllUsers } from "@/services/firebase";
import { toast } from "sonner";
import { VisualIframeEditor } from "@/components/ui/visual-iframe-editor";

const parseCommContent = (content: string) => {
  if (!content) return { subject: "", body: "" };
  if (content.startsWith("Subject: ")) {
    const doubleNewlineIndex = content.indexOf("\n\n");
    if (doubleNewlineIndex !== -1) {
      const subject = content.substring(9, doubleNewlineIndex);
      const body = content.substring(doubleNewlineIndex + 2);
      return { subject, body };
    }
  }
  return { subject: "", body: content };
};

const formatToDDMMYYYY = (dateVal: string | number | Date | null | undefined) => {
  if (!dateVal) return "N/A";
  try {
    const rawDate = new Date(dateVal);
    if (isNaN(rawDate.getTime())) return String(dateVal);
    const sydneyStr = rawDate.toLocaleString("en-US", { timeZone: "Australia/Sydney" });
    const date = new Date(sydneyStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    
    return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds} ${ampm}`;
  } catch (e) {
    return String(dateVal);
  }
};

const parseLocationFromAddress = (address?: string, state?: string) => {
  const stateUpper = state?.trim().toUpperCase();
  if (stateUpper) {
    if (stateUpper === 'WA') return { zone: 'Australia/Perth', label: 'Perth, WA', state: 'WA' };
    if (stateUpper === 'SA') return { zone: 'Australia/Adelaide', label: 'Adelaide, SA', state: 'SA' };
    if (stateUpper === 'NT') return { zone: 'Australia/Darwin', label: 'Darwin, NT', state: 'NT' };
    if (stateUpper === 'QLD') return { zone: 'Australia/Brisbane', label: 'Brisbane, QLD', state: 'QLD' };
    if (stateUpper === 'TAS') return { zone: 'Australia/Hobart', label: 'Hobart, TAS', state: 'TAS' };
    if (stateUpper === 'VIC') return { zone: 'Australia/Melbourne', label: 'Melbourne, VIC', state: 'VIC' };
    if (stateUpper === 'ACT') return { zone: 'Australia/Canberra', label: 'Canberra, ACT', state: 'ACT' };
    if (stateUpper === 'NSW') return { zone: 'Australia/Sydney', label: 'Sydney, NSW', state: 'NSW' };
  }

  if (!address) return { zone: 'Australia/Sydney', label: 'Sydney, NSW', state: 'NSW' };
  const addr = address.toUpperCase();
  
  const hasWord = (word: string) => new RegExp(`\\b${word}\\b`).test(addr);

  if (hasWord('WA') || addr.includes('WESTERN AUSTRALIA') || addr.includes('PERTH')) {
    return { zone: 'Australia/Perth', label: 'Perth, WA', state: 'WA' };
  }
  if (hasWord('SA') || addr.includes('SOUTH AUSTRALIA') || addr.includes('ADELAIDE')) {
    return { zone: 'Australia/Adelaide', label: 'Adelaide, SA', state: 'SA' };
  }
  if (hasWord('NT') || addr.includes('NORTHERN TERRITORY') || addr.includes('DARWIN')) {
    return { zone: 'Australia/Darwin', label: 'Darwin, NT', state: 'NT' };
  }
  if (hasWord('QLD') || addr.includes('QUEENSLAND') || addr.includes('BRISBANE')) {
    return { zone: 'Australia/Brisbane', label: 'Brisbane, QLD', state: 'QLD' };
  }
  if (hasWord('TAS') || addr.includes('TASMANIA') || addr.includes('HOBART')) {
    return { zone: 'Australia/Hobart', label: 'Hobart, TAS', state: 'TAS' };
  }
  if (hasWord('VIC') || addr.includes('VICTORIA') || addr.includes('MELBOURNE')) {
    return { zone: 'Australia/Melbourne', label: 'Melbourne, VIC', state: 'VIC' };
  }
  if (hasWord('ACT') || addr.includes('CANBERRA')) {
    return { zone: 'Australia/Canberra', label: 'Canberra, ACT', state: 'ACT' };
  }
  
  return { zone: 'Australia/Sydney', label: 'Sydney, NSW', state: 'NSW' };
};

const getLocalTimeDetails = (zone: string) => {
  try {
    const now = new Date();
    
    const timeOptions: Intl.DateTimeFormatOptions = {
      timeZone: zone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    
    const dayOptions: Intl.DateTimeFormatOptions = {
      timeZone: zone,
      weekday: 'short'
    };
    
    const timeStr = now.toLocaleTimeString('en-AU', timeOptions).toLowerCase();
    const dayStr = now.toLocaleDateString('en-AU', dayOptions);
    
    const formatter = new Intl.DateTimeFormat('en-AU', {
      timeZone: zone,
      timeZoneName: 'short'
    });
    const parts = formatter.formatToParts(now);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    const tzAbbr = tzPart ? tzPart.value : '';

    const locDateStr = now.toLocaleString('en-US', { timeZone: zone });
    const sysDateStr = now.toLocaleString('en-US');
    const locDate = new Date(locDateStr);
    const sysDate = new Date(sysDateStr);
    const diffMs = locDate.getTime() - sysDate.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));

    const targetHour = locDate.getHours();
    const targetDay = locDate.getDay();
    const isOpen = targetDay >= 1 && targetDay <= 5 && targetHour >= 8 && targetHour < 17;

    return {
      timeStr,
      dayStr,
      tzAbbr,
      diffHours,
      isOpen
    };
  } catch (error) {
    console.error("Error calculating local time details:", error);
    return {
      timeStr: '',
      dayStr: '',
      tzAbbr: '',
      diffHours: 0,
      isOpen: false
    };
  }
};

export default function TicketDetailsPage() {
  const { userProfile, loading } = useAuth();
  const { canView } = usePermissions();
  const router = useRouter();
  const params = useParams();
  const ticketId = params.ticketId as string;

  // Ticket & Package States
  const [ticket, setTicket] = useState<any>(null);
  const [loadingTicket, setLoadingTicket] = useState(true);
  const [packageDetails, setPackageDetails] = useState<any>(null);
  const [loadingPackage, setLoadingPackage] = useState(false);
  const [csUsers, setCsUsers] = useState<any[]>([]);
  const [childTickets, setChildTickets] = useState<any[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);

  const [isEditingEnquiryTypes, setIsEditingEnquiryTypes] = useState(false);
  const ENQUIRY_TYPE_OPTIONS = [
    'Alternate Delivery Point / Post Office',
    'ATL image requested',
    'Check Address',
    'Damaged Item',
    'Dangerous Goods',
    'Delayed Item',
    'Delivered to Incorrect Address',
    'Dispute of Delivery',
    'Duplicate Shipment / Duplicate Label',
    'ETA Requested',
    'General Enquiry',
    'Lost In Transit',
    'Missorted',
    'Not Dispatched',
    'Other',
    'Packaging Issue',
    'POD Request',
    'Returned to Sender',
    'Unable to Deliver',
    'Unserviced / Remote Area'
  ];

  const handleUpdateEnquiryTypes = async (newTypes: string[]) => {
    try {
      const ticketRef = doc(db, "tickets", ticketId);
      await updateDoc(ticketRef, { enquiryType: newTypes, updatedAt: new Date().toISOString() });
      setTicket((prev: any) => ({ ...prev, enquiryType: newTypes }));
      toast.success("Enquiry types updated successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update enquiry types");
    }
  };

  // Local Time Clock State
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // Update every 30 seconds
    return () => clearInterval(timer);
  }, []);

  // Company Contacts States
  const [companyContacts, setCompanyContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [prospectPlusId, setProspectPlusId] = useState<string>("");

  // Load child tickets if this is a Master Case
  useEffect(() => {
    if (!ticket || !ticket.isMasterCase) return;

    setLoadingChildren(true);
    const childQuery = query(collection(db, "tickets"));
    
    const unsubChildren = onSnapshot(childQuery, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data.parentTicketId === ticket.id) {
          list.push({ id: d.id, ...data });
        }
      });
      setChildTickets(list);
      setLoadingChildren(false);
    });

    return () => unsubChildren();
  }, [ticket]);

  // Subcollections States
  const [actions, setActions] = useState<any[]>([]);
  const [communications, setCommunications] = useState<any[]>([]);
  const [staffNotes, setStaffNotes] = useState<any[]>([]);

  // Modal / Input States
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [newActionType, setNewActionType] = useState("Contact depot");
  const [newActionNotes, setNewActionNotes] = useState("");
  const [newActionStatus, setNewActionStatus] = useState("Pending");

  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);
  const [escalateType, setEscalateType] = useState<"Operations" | "IT">("Operations");
  const [escalateAssignee, setEscalateAssignee] = useState("");

  const [isAssignStaffModalOpen, setIsAssignStaffModalOpen] = useState(false);
  const [assignStaffSelectedUser, setAssignStaffSelectedUser] = useState("");
  const [assignStaffEscalationOption, setAssignStaffEscalationOption] = useState<"None" | "Operations" | "IT">("None");

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailFrom, setEmailFrom] = useState("tracking@mailplus.com.au");
  const [emailCc, setEmailCc] = useState("");
  const [emailBcc, setEmailBcc] = useState("");
  const [quickAddTab, setQuickAddTab] = useState<"contacts" | "users">("contacts");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [selectedAttachments, setSelectedAttachments] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("custom");
  const [selectedCommToPreview, setSelectedCommToPreview] = useState<any>(null);
  const [isCommPreviewOpen, setIsCommPreviewOpen] = useState(false);
  const [brandProfile, setBrandProfile] = useState<any>(null);

  const insertPlaceholder = (placeholder: string) => {
    if (typeof window !== "undefined" && (window as any).__iframeEditorInsert) {
      (window as any).__iframeEditorInsert(placeholder);
    } else {
      setEmailBody(prev => prev + placeholder);
    }
  };

  const addContactToField = (email: string, field: "to" | "cc" | "bcc") => {
    const setter = field === "to" ? setEmailRecipient : (field === "cc" ? setEmailCc : setEmailBcc);
    const currentValue = field === "to" ? emailRecipient : (field === "cc" ? emailCc : emailBcc);
    
    const emails = currentValue
      ? currentValue.split(",").map(e => e.trim()).filter(Boolean)
      : [];
      
    if (!emails.includes(email)) {
      emails.push(email);
    }
    
    setter(emails.join(", "));
  };

  // Franchisee & Operator details states
  const [franchiseeInfo, setFranchiseeInfo] = useState<any>(null);
  const [operatorInfo, setOperatorInfo] = useState<any>(null);
  const [loadingFranchiseeOperator, setLoadingFranchiseeOperator] = useState(false);

  useEffect(() => {
    const companyId = ticket?.companyId || packageDetails?.customerDetails?.companyId;
    
    // Find operator ID from scans
    let opId = packageDetails?.operator_ns_id;
    if (!opId && packageDetails?.scans && packageDetails.scans.length > 0) {
      const scanWithOp = packageDetails.scans.find((s: any) => s.operator_ns_id);
      if (scanWithOp) opId = scanWithOp.operator_ns_id;
    }
    if (!opId && packageDetails?.enrichedScans && packageDetails.enrichedScans.length > 0) {
      const scanWithOp = packageDetails.enrichedScans.find((s: any) => s.operator_ns_id);
      if (scanWithOp) opId = scanWithOp.operator_ns_id;
    }

    if (!companyId && !opId) {
      setFranchiseeInfo(null);
      setOperatorInfo(null);
      return;
    }

    async function fetchFranchiseeAndOperator() {
      setLoadingFranchiseeOperator(true);
      try {
        let finalFranchiseeDoc: any = null;

        // 1. Get Franchisee details from company/lead document
        if (companyId) {
          let companySnap = await getDoc(doc(db, "companies", companyId));
          let compData = companySnap.exists() ? companySnap.data() : null;

          if (!compData) {
            const leadSnap = await getDoc(doc(db, "leads", companyId));
            if (leadSnap.exists()) {
              compData = leadSnap.data();
            }
          }

          if (compData) {
            const franchiseeId = compData.franchisee_id || compData.franchiseeId;
            const franchiseeName = compData.franchisee || compData.franchisee_name;

            if (franchiseeId) {
              const franSnap = await getDoc(doc(db, "franchisees", String(franchiseeId)));
              if (franSnap.exists()) {
                finalFranchiseeDoc = { id: franSnap.id, ...franSnap.data() };
              }
            }

            if (!finalFranchiseeDoc && franchiseeName) {
              const q = query(collection(db, "franchisees"), where("name", "==", franchiseeName), limit(1));
              const snap = await getDocs(q);
              if (!snap.empty) {
                finalFranchiseeDoc = { id: snap.docs[0].id, ...snap.docs[0].data() };
              }
            }
          }
        }

        // Fallback to ticket/package details name lookup
        if (!finalFranchiseeDoc) {
          const fallbackName = ticket?.franchisee || packageDetails?.franchisee;
          if (fallbackName && fallbackName !== 'Unknown') {
            const q = query(collection(db, "franchisees"), where("name", "==", fallbackName), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty) {
              finalFranchiseeDoc = { id: snap.docs[0].id, ...snap.docs[0].data() };
            }
          }
        }

        setFranchiseeInfo(finalFranchiseeDoc);

        // 2. Fetch Operator details matching internalId
        if (opId) {
          const q = query(collection(db, "operators"), where("internalId", "==", String(opId)));
          const snap = await getDocs(q);
          
          if (!snap.empty) {
            setOperatorInfo({ id: snap.docs[0].id, ...snap.docs[0].data() });
          } else {
            const qNum = query(collection(db, "operators"), where("internalId", "==", Number(opId)));
            const snapNum = await getDocs(qNum);
            if (!snapNum.empty) {
              setOperatorInfo({ id: snapNum.docs[0].id, ...snapNum.docs[0].data() });
            } else {
              const docSnap = await getDoc(doc(db, "operators", String(opId)));
              if (docSnap.exists()) {
                setOperatorInfo({ id: docSnap.id, ...docSnap.data() });
              } else {
                setOperatorInfo(null);
              }
            }
          }
        } else {
          setOperatorInfo(null);
        }

      } catch (error) {
        console.error("Error fetching franchisee/operator details:", error);
      } finally {
        setLoadingFranchiseeOperator(false);
      }
    }

    fetchFranchiseeAndOperator();
  }, [ticket?.companyId, ticket?.franchisee, packageDetails?.customerDetails?.companyId, packageDetails?.franchisee, packageDetails?.operator_ns_id, packageDetails?.scans, packageDetails?.enrichedScans]);

  const [isMissedSweepModalOpen, setIsMissedSweepModalOpen] = useState(false);
  const [isSendingMissedSweep, setIsSendingMissedSweep] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [newEnquiryNumber, setNewEnquiryNumber] = useState("");
  const [newStaffNote, setNewStaffNote] = useState("");

  // Status Change Confirmation States
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");
  const [statusConfirmNotes, setStatusConfirmNotes] = useState("");
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);
  const [isFreightSafeEligible, setIsFreightSafeEligible] = useState(false);

  // Correct Receiver Details Dialog States
  const [isReceiverModalOpen, setIsReceiverModalOpen] = useState(false);
  const [editHasNewReceiverDetails, setEditHasNewReceiverDetails] = useState(false);
  const [editNewReceiverName, setEditNewReceiverName] = useState("");
  const [editNewReceiverAddress, setEditNewReceiverAddress] = useState("");
  const [editNewReceiverEmail, setEditNewReceiverEmail] = useState("");
  const [editNewReceiverPhone, setEditNewReceiverPhone] = useState("");
  const [isSavingReceiverDetails, setIsSavingReceiverDetails] = useState(false);

  const handleSaveReceiverDetails = async () => {
    setIsSavingReceiverDetails(true);
    try {
      const ticketRef = doc(db, "tickets", ticketId);
      const updateData = {
        hasNewReceiverDetails: editHasNewReceiverDetails,
        newReceiverName: editNewReceiverName,
        newReceiverAddress: editNewReceiverAddress,
        newReceiverEmail: editNewReceiverEmail,
        newReceiverPhone: editNewReceiverPhone,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(ticketRef, updateData);
      setTicket((prev: any) => ({
        ...prev,
        ...updateData
      }));
      
      setIsReceiverModalOpen(false);
      toast.success("Receiver details updated successfully!");

      // Log action in history
      await addDoc(collection(db, "tickets", ticketId, "actions"), {
        action: "Receiver Details Corrected",
        user: userProfile?.displayName || userProfile?.email || "System",
        date: new Date().toISOString(),
        status: "Complete",
        notes: editHasNewReceiverDetails 
          ? `Flagged as incorrect. Corrected details: ${editNewReceiverName}, ${editNewReceiverAddress}`
          : "Unflagged incorrect receiver details."
      });
    } catch (err) {
      console.error("Failed to update receiver details:", err);
      toast.error("Failed to update receiver details.");
    } finally {
      setIsSavingReceiverDetails(false);
    }
  };

  // Group active users by role
  const activeUsersGroupedByRole = useMemo(() => {
    const activeUsers = csUsers.filter((u: any) => {
      if (u.disabled) return false;
      
      const role = (u.defaultRole || u.role || '').toLowerCase().trim();
      if (role === 'field sales' || role === 'field sales admin' || role === 'dashback') {
        return false;
      }
      
      if (userSearchQuery.trim()) {
        const query = userSearchQuery.toLowerCase();
        const name = (u.displayName || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        return name.includes(query) || email.includes(query);
      }
      
      return true;
    });

    const groups: Record<string, any[]> = {};
    activeUsers.forEach((u: any) => {
      const role = u.defaultRole || u.role || 'Other';
      if (!groups[role]) {
        groups[role] = [];
      }
      groups[role].push(u);
    });
    return groups;
  }, [csUsers, userSearchQuery]);

  // Load staff users
  useEffect(() => {
    async function loadUsers() {
      try {
        const users = await getAllUsers();
        setCsUsers(users || []);
      } catch (err) {
        console.error("Failed to load staff users:", err);
      }
    }
    loadUsers();
  }, []);

  // Fetch email templates
  useEffect(() => {
    async function fetchTemplatesAndBrand() {
      try {
        const [templatesSnap, brandSnap] = await Promise.all([
          getDocs(collection(db, 'marketing_templates')),
          getDoc(doc(db, 'brandProfiles', 'default_company'))
        ]);
        const list = templatesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTemplates(list);
        if (brandSnap.exists()) {
          setBrandProfile(brandSnap.data());
        }
      } catch (error) {
        console.error('Error fetching templates/brand', error);
      }
    }
    if (isEmailModalOpen) {
      fetchTemplatesAndBrand();
      setSelectedTemplate('custom');
      setEmailSubject("MailPlus Delivery Investigation Update");
      setEmailBody("");
      setEmailFrom("tracking@mailplus.com.au");
      setEmailCc("tracking@mailplus.com.au");
      setEmailBcc("");
      setQuickAddTab("contacts");
      setUserSearchQuery("");
      setSelectedAttachments([]);
    }
  }, [isEmailModalOpen]);

  const applyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId === 'custom') {
      setEmailSubject("MailPlus Delivery Investigation Update");
      setEmailBody('');
      return;
    }
    const template = templates.find(t => t.id === templateId);
    if (template) {
      const contactName = ticket?.customerContactName || "Customer";
      const companyName = ticket?.customerCompany || "";
      const representativeName = userProfile?.displayName || userProfile?.firstName || 'Customer Service Rep';
      
      const receiverName = packageDetails?.receiverFullDetails?.name || packageDetails?.receiverDetails?.name || "";
      const receiverAddress = packageDetails?.receiverFullDetails?.address || packageDetails?.receiverDetails?.address || "";
      const ticketNumber = ticket?.ticketNumber || ticketId || "";
      const trackingId = ticket?.trackingIdentifier || packageDetails?.packageInfo?.code || "";

      let parsedSubject = template.subject || "MailPlus Delivery Investigation Update";
      parsedSubject = parsedSubject.replace(/\{\{Contact\.Name\}\}/g, contactName);
      parsedSubject = parsedSubject.replace(/\{\{Company\.Name\}\}/g, companyName);
      parsedSubject = parsedSubject.replace(/\{\{SalesRep\.Name\}\}/g, representativeName);
      parsedSubject = parsedSubject.replace(/\{\{Ticket\.Id\}\}/g, ticketId || '');
      parsedSubject = parsedSubject.replace(/\{\{Receiver\.Name\}\}/g, receiverName);
      parsedSubject = parsedSubject.replace(/\{\{Receiver\.FullAddress\}\}/g, receiverAddress);
      parsedSubject = parsedSubject.replace(/\{\{Ticket\.Number\}\}/g, ticketNumber);
      parsedSubject = parsedSubject.replace(/\{\{Tracking\.ID\}\}/g, trackingId);

      setEmailSubject(parsedSubject);
      
      let parsedBody = template.body || '';
      parsedBody = parsedBody.replace(/\{\{Contact\.Name\}\}/g, contactName);
      parsedBody = parsedBody.replace(/\{\{Company\.Name\}\}/g, companyName);
      parsedBody = parsedBody.replace(/\{\{SalesRep\.Name\}\}/g, representativeName);
      parsedBody = parsedBody.replace(/\{\{Ticket\.Id\}\}/g, ticketId || '');
      
      parsedBody = parsedBody.replace(/\{\{Receiver\.Name\}\}/g, receiverName);
      parsedBody = parsedBody.replace(/\{\{Receiver\.FullAddress\}\}/g, receiverAddress);
      parsedBody = parsedBody.replace(/\{\{Ticket\.Number\}\}/g, ticketNumber);
      parsedBody = parsedBody.replace(/\{\{Tracking\.ID\}\}/g, trackingId);
      
      setEmailBody(parsedBody);
    }
  };

  // Fetch ticket details
  useEffect(() => {
    if (loading) return;

    if (!userProfile) {
      router.push("/signin");
      return;
    }

    if (!canView("tickets")) {
      router.push("/admin/dashboard");
      return;
    }

    const fetchTicket = async () => {
      try {
        const docRef = doc(db, "tickets", ticketId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const tData = docSnap.data();
          setTicket({ id: docSnap.id, ...tData });

          // Auto trigger package lookup
          if (tData.trackingIdentifier) {
            fetchPackageData(tData.trackingIdentifier, tData.customerCompany);
          }
        } else {
          toast.error("Ticket not found.");
        }
      } catch (error) {
        console.error("Error fetching ticket:", error);
      } finally {
        setLoadingTicket(false);
      }
    };

    if (ticketId) {
      fetchTicket();
    }
  }, [userProfile, loading, router, ticketId]);

  // Fetch company contacts when companyId is available
  useEffect(() => {
    const companyId = ticket?.companyId || packageDetails?.customerDetails?.companyId;
    if (!companyId) {
      setCompanyContacts([]);
      return;
    }

    async function fetchContacts() {
      setLoadingContacts(true);
      try {
        // Try companies collection first
        let contactsRef = collection(db, "companies", companyId, "contacts");
        let contactsSnap = await getDocs(contactsRef);
        let list = contactsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // If empty, fallback to leads collection
        if (list.length === 0) {
          contactsRef = collection(db, "leads", companyId, "contacts");
          contactsSnap = await getDocs(contactsRef);
          list = contactsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        setCompanyContacts(list);
      } catch (error) {
        console.error("Error fetching company contacts:", error);
      } finally {
        setLoadingContacts(false);
      }
    }

    fetchContacts();
  }, [ticket?.companyId, packageDetails?.customerDetails?.companyId]);

  // Fetch Prospect+ ID when companyId is available
  useEffect(() => {
    const companyId = ticket?.companyId || packageDetails?.customerDetails?.companyId;
    if (!companyId) {
      setProspectPlusId("");
      return;
    }

    async function fetchCompanyDetails() {
      try {
        const compRef = doc(db, "companies", companyId);
        const compSnap = await getDoc(compRef);
        if (compSnap.exists() && compSnap.data()?.prospectPlusId) {
          setProspectPlusId(compSnap.data().prospectPlusId);
          return;
        }

        const leadRef = doc(db, "leads", companyId);
        const leadSnap = await getDoc(leadRef);
        if (leadSnap.exists() && leadSnap.data()?.prospectPlusId) {
          setProspectPlusId(leadSnap.data().prospectPlusId);
        }
      } catch (error) {
        console.error("Error fetching company details for prospectPlusId:", error);
      }
    }

    fetchCompanyDetails();
  }, [ticket?.companyId, packageDetails?.customerDetails?.companyId]);

  // Real-time subcollection sync
  useEffect(() => {
    if (!ticketId) return;

    // Actions
    const actionsRef = collection(db, "tickets", ticketId, "actions");
    const qActions = query(actionsRef, orderBy("date", "desc"));
    const unsubActions = onSnapshot(qActions, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setActions(list);
    });

    // Communications
    const commsRef = collection(db, "tickets", ticketId, "communications");
    const qComms = query(commsRef, orderBy("timestamp", "desc"));
    const unsubComms = onSnapshot(qComms, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setCommunications(list);
    });

    // Staff Notes
    const notesRef = collection(db, "tickets", ticketId, "staffNotes");
    const qNotes = query(notesRef, orderBy("timestamp", "desc"));
    const unsubNotes = onSnapshot(qNotes, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setStaffNotes(list);
    });

    return () => {
      unsubActions();
      unsubComms();
      unsubNotes();
    };
  }, [ticketId]);

  const fetchPackageData = async (identifier: string, currentCustomerCompany?: string) => {
    setLoadingPackage(true);
    try {
      const response = await fetch(`/api/packages/lookup?id=${encodeURIComponent(identifier)}`);
      if (response.ok) {
        const data = await response.json();
        setPackageDetails(data);

        // Check if the current company is "Website Customer"
        const isWebsiteCustomer = currentCustomerCompany === 'Website Customer' || ticket?.customerCompany === 'Website Customer';
        if (isWebsiteCustomer && data.customerDetails?.company) {
          const ticketRef = doc(db, "tickets", ticketId);
          const updates = {
            customerCompany: data.customerDetails.company || 'Website Customer',
            companyId: data.customerDetails.companyId || '',
            customerAccountNumber: data.customerDetails.accountNumber || 'N/A',
            customerTier: data.customerDetails.tier || 'Standard',
            customerContactName: data.customerDetails.contactName || '',
            customerEmail: data.customerDetails.email || '',
            customerPhone: data.customerDetails.phone || '',
            updatedAt: new Date().toISOString()
          };

          await updateDoc(ticketRef, updates);
          
          setTicket((prev: any) => {
            if (!prev) return prev;
            return {
              ...prev,
              ...updates
            };
          });
        }
      }
    } catch (error) {
      console.error("Error fetching package details:", error);
    } finally {
      setLoadingPackage(false);
    }
  };

  // Update main ticket status
  const updateTicketStatus = async (newStatus: string, notes?: string) => {
    setIsSubmittingStatus(true);
    try {
      const ticketRef = doc(db, "tickets", ticketId);
      const isCloseStatus = newStatus === "Closed" || newStatus === "Lost in Transit" || newStatus === "Damaged";
      
      const nowIso = new Date().toISOString();
      const updateData: any = { 
        status: newStatus,
        updatedAt: nowIso
      };
      if (isCloseStatus) {
        updateData.freightSafeEligible = isFreightSafeEligible;
      }
      
      await updateDoc(ticketRef, updateData);
      setTicket((prev: any) => {
        const updated = { ...prev, status: newStatus, updatedAt: nowIso };
        if (isCloseStatus) {
          updated.freightSafeEligible = isFreightSafeEligible;
        }
        return updated;
      });
      toast.success(`Ticket status updated to ${newStatus}`);

      const actionNotes = notes && notes.trim()
        ? `Ticket status set to '${newStatus}'. Notes: ${notes}`
        : `Ticket status set to '${newStatus}'`;

      // Log action in history
      await addDoc(collection(db, "tickets", ticketId, "actions"), {
        action: "Status Update",
        user: userProfile?.displayName || userProfile?.email || "System",
        date: new Date().toISOString(),
        status: "Complete",
        notes: actionNotes
      });

      // Add to internal staff notes if notes are provided
      if (notes && notes.trim()) {
        await addDoc(collection(db, "tickets", ticketId, "staffNotes"), {
          author: userProfile?.displayName || userProfile?.email || "Staff",
          timestamp: new Date().toISOString(),
          content: `[Status Change to ${newStatus}] ${notes}`
        });
      }
    } catch (err) {
      console.error("Failed to update ticket status:", err);
      toast.error("Failed to update ticket status.");
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  const promptStatusChange = (status: string) => {
    setPendingStatus(status);
    setStatusConfirmNotes("");
    setIsFreightSafeEligible(ticket.freightSafeEligible || false);
    setIsStatusConfirmOpen(true);
  };

  // Add Action handler
  const handleAddAction = async () => {
    try {
      await addDoc(collection(db, "tickets", ticketId, "actions"), {
        action: newActionType,
        user: userProfile?.displayName || userProfile?.email || "Staff",
        date: new Date().toISOString(),
        status: newActionStatus,
        notes: newActionNotes
      });

      // Update parent ticket's updatedAt timestamp
      const nowIso = new Date().toISOString();
      await updateDoc(doc(db, "tickets", ticketId), {
        updatedAt: nowIso
      });
      setTicket((prev: any) => ({
        ...prev,
        updatedAt: nowIso
      }));

      setIsActionModalOpen(false);
      setNewActionNotes("");
      toast.success("Action logged successfully.");
    } catch (err) {
      toast.error("Failed to save action.");
    }
  };

  // Escalation Handler (IT/Operations Ticket)
  const handleEscalate = async () => {
    if (!escalateAssignee) {
      toast.error("Please select a staff member to assign this escalation to.");
      return;
    }

    const selectedUserObj = csUsers.find(u => u.uid === escalateAssignee || u.displayName === escalateAssignee);
    const assigneeName = selectedUserObj?.displayName || selectedUserObj?.email || escalateAssignee;

    try {
      // Create subcollection escalation record
      await addDoc(collection(db, "tickets", ticketId, "escalations"), {
        type: escalateType,
        assignedUser: escalateAssignee,
        assignedUserName: assigneeName,
        createdAt: new Date().toISOString(),
        status: "Open"
      });

      // Write to top-level collections operations_tickets or it_tickets
      const todayDate = new Date();
      const raisedFormatted = todayDate.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        timeZone: "Australia/Sydney",
      }) + " - auto-escalated";

      if (escalateType === "Operations") {
        const opsSnap = await getDocs(collection(db, "operations_tickets"));
        const opsNum = 42 + opsSnap.size;
        await addDoc(collection(db, "operations_tickets"), {
          ticketId: `#OPS-${String(opsNum).padStart(4, "0")}`,
          type: ticket?.enquiryType || "Missed sweep",
          linkedTrackingTicket: ticket?.trackingIdentifier || ticketId || "—",
          depot: ticket?.depot || "Botany Depot",
          status: "Investigating",
          assignee: assigneeName,
          raised: raisedFormatted,
          createdAt: new Date().toISOString(),
          description: ticket?.description || ticket?.notes || "Escalated from tracking ticket."
        });
      } else {
        const itSnap = await getDocs(collection(db, "it_tickets"));
        const itNum = 89 + itSnap.size;
        await addDoc(collection(db, "it_tickets"), {
          ticketId: `#IT-${String(itNum).padStart(4, "0")}`,
          type: "System issue",
          linkedTrackingTicket: ticket?.trackingIdentifier || ticketId || "—",
          description: ticket?.description || ticket?.notes || "Scan data missing from depot run",
          status: "Investigating",
          priority: (ticket?.priority || "STANDARD").toUpperCase(),
          raised: raisedFormatted,
          createdAt: new Date().toISOString()
        });
      }

      // Update parent ticket status based on the escalation
      const newStatus = escalateType === "Operations" ? "Awaiting Operations" : "Awaiting IT";
      const nowIso = new Date().toISOString();
      await updateDoc(doc(db, "tickets", ticketId), {
        status: newStatus,
        assignedUser: assigneeName,
        updatedAt: nowIso
      });

      setTicket((prev: any) => ({
        ...prev,
        status: newStatus,
        assignedUser: assigneeName,
        updatedAt: nowIso
      }));

      // Log in investigation actions
      await addDoc(collection(db, "tickets", ticketId, "actions"), {
        action: `Escalate to ${escalateType}`,
        user: userProfile?.displayName || userProfile?.email || "Staff",
        date: new Date().toISOString(),
        status: "Pending",
        notes: `Escalated ticket to ${escalateType} department. Assigned to ${assigneeName}.`
      });

      setIsEscalateModalOpen(false);
      toast.success(`Ticket escalated to ${escalateType} and status updated to ${newStatus}`);
    } catch (err) {
      console.error(err);
      toast.error("Escalation failed.");
    }
  };

  const handleAssignStaff = async () => {
    if (!assignStaffSelectedUser) {
      toast.error("Please select a staff member to assign.");
      return;
    }

    const selectedUserObj = csUsers.find(
      (u) => u.uid === assignStaffSelectedUser || u.displayName === assignStaffSelectedUser
    );
    const assigneeName = selectedUserObj?.displayName || selectedUserObj?.email || assignStaffSelectedUser;
    const nowIso = new Date().toISOString();

    try {
      if (assignStaffEscalationOption !== "None") {
        // Run escalation sub-workflow
        await addDoc(collection(db, "tickets", ticketId, "escalations"), {
          type: assignStaffEscalationOption,
          assignedUser: assignStaffSelectedUser,
          assignedUserName: assigneeName,
          createdAt: nowIso,
          status: "Open"
        });

        const todayDate = new Date();
        const raisedFormatted = todayDate.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          timeZone: "Australia/Sydney",
        }) + " - auto-escalated";

        if (assignStaffEscalationOption === "Operations") {
          const opsSnap = await getDocs(collection(db, "operations_tickets"));
          const opsNum = 42 + opsSnap.size;
          await addDoc(collection(db, "operations_tickets"), {
            ticketId: `#OPS-${String(opsNum).padStart(4, "0")}`,
            type: ticket?.enquiryType || "Missed sweep",
            linkedTrackingTicket: ticket?.trackingIdentifier || ticketId || "—",
            depot: ticket?.depot || "Botany Depot",
            status: "Investigating",
            assignee: assigneeName,
            raised: raisedFormatted,
            createdAt: nowIso,
            description: ticket?.description || ticket?.notes || "Escalated from tracking ticket."
          });
        } else {
          const itSnap = await getDocs(collection(db, "it_tickets"));
          const itNum = 89 + itSnap.size;
          await addDoc(collection(db, "it_tickets"), {
            ticketId: `#IT-${String(itNum).padStart(4, "0")}`,
            type: "System issue",
            linkedTrackingTicket: ticket?.trackingIdentifier || ticketId || "—",
            description: ticket?.description || ticket?.notes || "Scan data missing from depot run",
            status: "Investigating",
            priority: (ticket?.priority || "STANDARD").toUpperCase(),
            raised: raisedFormatted,
            createdAt: nowIso
          });
        }

        const newStatus = assignStaffEscalationOption === "Operations" ? "Awaiting Operations" : "Awaiting IT";
        await updateDoc(doc(db, "tickets", ticketId), {
          status: newStatus,
          assignedUser: assigneeName,
          updatedAt: nowIso
        });

        setTicket((prev: any) => ({
          ...prev,
          status: newStatus,
          assignedUser: assigneeName,
          updatedAt: nowIso
        }));

        await addDoc(collection(db, "tickets", ticketId, "actions"), {
          action: `Escalate to ${assignStaffEscalationOption}`,
          user: userProfile?.displayName || userProfile?.email || "Staff",
          date: nowIso,
          status: "Pending",
          notes: `Escalated ticket to ${assignStaffEscalationOption} department. Assigned to ${assigneeName}.`
        });
      } else {
        // Just assign staff
        await updateDoc(doc(db, "tickets", ticketId), {
          assignedUser: assigneeName,
          updatedAt: nowIso
        });

        setTicket((prev: any) => ({
          ...prev,
          assignedUser: assigneeName,
          updatedAt: nowIso
        }));

        await addDoc(collection(db, "tickets", ticketId, "actions"), {
          action: "Assign Staff",
          user: userProfile?.displayName || userProfile?.email || "Staff",
          date: nowIso,
          status: "Complete",
          notes: `Assigned ticket to ${assigneeName}.`
        });
      }

      setIsAssignStaffModalOpen(false);
      toast.success("Staff assigned successfully.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to assign staff.");
    }
  };

  // Email Composer Handler
  const handleSendEmail = async () => {
    if (!emailRecipient || !emailSubject || !emailBody) {
      toast.error("All email fields are required.");
      return;
    }

    setIsSendingEmail(true);
    try {
      const attachmentPayload = selectedAttachments.map(a => ({
        name: a.name,
        url: a.url
      }));

      // Log in communications subcollection
      await addDoc(collection(db, "tickets", ticketId, "communications"), {
        type: "SENT",
        timestamp: new Date().toISOString(),
        from: emailFrom,
        to: emailRecipient,
        cc: emailCc || "",
        bcc: emailBcc || "",
        content: `Subject: ${emailSubject}\n\n${emailBody}`,
        attachments: attachmentPayload
      });

      // Update parent ticket's updatedAt timestamp
      const nowIso = new Date().toISOString();
      await updateDoc(doc(db, "tickets", ticketId), {
        updatedAt: nowIso
      });
      setTicket((prev: any) => ({
        ...prev,
        updatedAt: nowIso
      }));

      // Attempt to invoke direct mail sender endpoint
      const response = await fetch("/api/campaigns/send-custom-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailRecipient,
          subject: emailSubject,
          html: emailBody,
          customFrom: emailFrom,
          cc: emailCc || "",
          bcc: emailBcc || "",
          attachments: attachmentPayload,
          isTemplate: selectedTemplate !== 'custom',
          ticketId: ticketId
        })
      });

      const data = await response.json();

      if (data.success) {
        setIsEmailModalOpen(false);
        setEmailSubject("");
        setEmailBody("");
        setEmailCc("");
        setEmailBcc("");
        setSelectedAttachments([]);
        toast.success(`Email successfully logged and dispatched to ${emailRecipient}`);
      } else {
        toast.error(data.message || "Email dispatch failed.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Email dispatch failed.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Missed Sweep Handler
  const handleSendMissedSweep = async () => {
    setIsSendingMissedSweep(true);
    try {
      const res = await fetch("/api/tickets/missed-sweep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          userDisplayName: userProfile?.displayName || userProfile?.email || "Staff"
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Missed Sweep alert successfully sent to Operations & Fiona.");
        setTicket((prev: any) => ({ ...prev, status: "Awaiting Operations" }));
        setIsMissedSweepModalOpen(false);
      } else {
        toast.error(data.message || "Failed to dispatch Missed Sweep alert.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while sending the Missed Sweep alert.");
    } finally {
      setIsSendingMissedSweep(false);
    }
  };

  // Handle Attachment Upload (Pics, Docs, PDFs)
  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return null;

    setIsUploadingAttachment(true);
    try {
      const storageRef = ref(storage, `tickets/attachments/${ticketId}/${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      const attachmentObj = {
        name: file.name,
        url,
        uploadedAt: new Date().toISOString(),
        uploadedBy: userProfile?.displayName || userProfile?.email || "Staff"
      };

      const existingAttachments = ticket.attachments || [];
      const newAttachments = [
        ...existingAttachments,
        attachmentObj
      ];

      await updateDoc(doc(db, "tickets", ticketId), {
        attachments: newAttachments
      });

      setTicket((prev: any) => ({
        ...prev,
        attachments: newAttachments
      }));

      await addDoc(collection(db, "tickets", ticketId, "actions"), {
        action: `Uploaded Attachment`,
        user: userProfile?.displayName || userProfile?.email || "Staff",
        date: new Date().toISOString(),
        status: "Complete",
        notes: `Uploaded file: ${file.name}`
      });

      toast.success(`File "${file.name}" uploaded successfully!`);
      return attachmentObj;
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload file.");
      return null;
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  // Add Enquiry Number
  const handleAddEnquiry = async () => {
    if (!newEnquiryNumber.trim()) return;

    const currentEnquiries = ticket?.starTrackEnquiries || [];
    if (currentEnquiries.includes(newEnquiryNumber.trim())) {
      toast.warning("Enquiry number already exists.");
      return;
    }

    try {
      const updated = [...currentEnquiries, newEnquiryNumber.trim()];
      await updateDoc(doc(db, "tickets", ticketId), {
        starTrackEnquiries: updated
      });
      setTicket((prev: any) => ({ ...prev, starTrackEnquiries: updated }));
      setNewEnquiryNumber("");
      toast.success("StarTrack enquiry number added.");
    } catch (err) {
      toast.error("Failed to add enquiry number.");
    }
  };

  // Add Staff Note
  const handleAddStaffNote = async () => {
    if (!newStaffNote.trim()) return;
    try {
      await addDoc(collection(db, "tickets", ticketId, "staffNotes"), {
        author: userProfile?.displayName || userProfile?.email || "Staff",
        timestamp: new Date().toISOString(),
        content: newStaffNote
      });

      // Update parent ticket's updatedAt timestamp
      const nowIso = new Date().toISOString();
      await updateDoc(doc(db, "tickets", ticketId), {
        updatedAt: nowIso
      });
      setTicket((prev: any) => ({
        ...prev,
        updatedAt: nowIso
      }));

      setNewStaffNote("");
      toast.success("Staff note added.");
    } catch (err) {
      toast.error("Failed to add staff note.");
    }
  };

  if (loading || loadingTicket) return <FullScreenLoader message="Loading ticket details..." />;

  if (!ticket) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#eef2ed] min-h-screen">
        <div className="text-center p-8 bg-white rounded-xl shadow-md max-w-md">
          <h2 className="text-2xl font-bold text-[#095c7b] mb-4">Ticket Not Found</h2>
          <Button onClick={() => router.push("/admin/tickets")} className="bg-[#095c7b] hover:bg-[#053647]">
            Back to Tickets
          </Button>
        </div>
      </div>
    );
  }

  // Calculate ticket age & SLA
  const createdDate = ticket.createdAt ? (ticket.createdAt.toDate ? ticket.createdAt.toDate() : new Date(ticket.createdAt)) : new Date();
  const ticketAgeHours = Math.max(0, Math.round((Date.now() - createdDate.getTime()) / (1000 * 60 * 60)));
  
  const lastUpdate = ticket.updatedAt || ticket.createdAt;
  const lastUpdateDate = lastUpdate ? (lastUpdate.toDate ? lastUpdate.toDate() : new Date(lastUpdate)) : new Date();
  const hoursSinceLastUpdate = Math.max(0, (Date.now() - lastUpdateDate.getTime()) / (1000 * 60 * 60));
  
  const isSlaPaused = ticket.status === "Awaiting Operations" || ticket.status === "Awaiting IT" || ticket.status === "Closed" || ticket.status === "Resolved" || ticket.status === "Lost in Transit" || ticket.status === "Damaged";

  let slaColorClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
  let slaDotColor = "bg-emerald-500";
  let slaLabel = `SLA Active • Within SLA (${Math.round(hoursSinceLastUpdate)}h since update)`;

  if (hoursSinceLastUpdate > 24) {
    slaColorClass = "bg-red-50 text-red-700 border-red-200";
    slaDotColor = "bg-red-500";
    slaLabel = `SLA Breached • No activity > 24h (${Math.round(hoursSinceLastUpdate)}h elapsed)`;
  } else if (hoursSinceLastUpdate > 12) {
    slaColorClass = "bg-amber-50 text-amber-700 border-amber-200";
    slaDotColor = "bg-amber-500";
    slaLabel = `SLA Approaching • Update required (${Math.round(hoursSinceLastUpdate)}h elapsed)`;
  }

  // Check no movement warnings
  let lastMovementTime: Date | null = null;
  let movementDiffHours = 0;
  if (packageDetails?.realTimeStatus?.updated_at) {
    lastMovementTime = new Date(packageDetails.realTimeStatus.updated_at);
    movementDiffHours = Math.round((Date.now() - lastMovementTime.getTime()) / (1000 * 60 * 60));
  } else if (packageDetails?.trackingData?.lastMovementRaw) {
    lastMovementTime = new Date(packageDetails.trackingData.lastMovementRaw);
    movementDiffHours = Math.round((Date.now() - lastMovementTime.getTime()) / (1000 * 60 * 60));
  } else if (packageDetails?.trackingData?.lastMovement) {
    lastMovementTime = new Date(packageDetails.trackingData.lastMovement);
    movementDiffHours = Math.round((Date.now() - lastMovementTime.getTime()) / (1000 * 60 * 60));
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-800 font-sans p-4 md:p-6 pb-20">
      <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn">
        
        {ticket.parentTicketId && (
          <div className="bg-[#EAF1E7] border border-[#C3D2C2] text-[#0E3D3B] p-4 rounded-2xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="bg-[#095c7b] text-white text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase">
                Child Case
              </span>
              <span className="text-sm font-medium text-slate-700">
                This consignment is part of a multi-consignment investigation.
              </span>
            </div>
            <Link href={`/admin/tickets/${ticket.parentTicketId}`}>
              <Button size="sm" className="bg-[#095c7b] hover:bg-[#053647] text-white text-xs font-semibold rounded-lg shadow-sm">
                View Master Case →
              </Button>
            </Link>
          </div>
        )}
        
        {/* Modern Header Panel */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-2">
          <div className="flex items-start gap-4">
            <Link href="/admin/tickets">
              <Button variant="outline" size="icon" className="h-10 w-10 bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-350 text-[#095c7b] rounded-xl shrink-0 shadow-sm">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={`px-2.5 py-0.5 text-xs font-bold rounded-full border shadow-sm ${
                  ticket.status === "Closed" || ticket.status === "Resolved"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : ticket.status === "Lost in Transit"
                    ? "bg-red-50 text-red-700 border-red-200"
                    : ticket.status === "Damaged"
                    ? "bg-orange-50 text-orange-700 border-orange-200"
                    : "bg-[#095c7b]/10 text-[#095c7b] border-[#095c7b]/20"
                }`}>
                  {ticket.status}
                </Badge>
                {ticket.priority && (
                  <Badge className={`px-2.5 py-0.5 text-xs font-bold rounded-full border shadow-sm ${
                    ticket.priority.toLowerCase() === "urgent"
                      ? "bg-red-500 text-white border-none shadow-sm shadow-red-200"
                      : ticket.priority.toLowerCase() === "high"
                      ? "bg-orange-50 text-orange-700 border-orange-200"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}>
                    {ticket.priority.toUpperCase()}
                  </Badge>
                )}
                {(Array.isArray(ticket.enquiryType) ? ticket.enquiryType : [ticket.enquiryType || "Dispute of Delivery"]).includes("Dispute of Delivery") && (
                  <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 rounded-full px-2.5 py-0.5">
                    Lost in transit?
                  </Badge>
                )}
                {ticket.freightSafeEligible && (
                  <Badge className="bg-emerald-500 text-white border-none shadow-sm px-2.5 py-0.5 rounded-full text-xs font-bold">
                    FreightSafe Eligible
                  </Badge>
                )}
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight mt-1 flex items-center gap-2 flex-wrap">
                <span className="text-slate-800 font-bold">#{ticket.ticketNumber || ticketId.slice(0, 8).toUpperCase()}</span>
                <button
                  onClick={() => {
                    const idToCopy = ticket.ticketNumber || ticketId;
                    navigator.clipboard.writeText(idToCopy);
                    toast.success("Ticket ID copied!");
                  }}
                  className="p-1 hover:bg-slate-200/50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                  title="Copy Ticket ID"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                {ticket.parentTicketId ? `Linked to Master Case #${ticket.parentTicketId.slice(0, 8).toUpperCase()}` : "Primary Support Ticket"}
              </p>
            </div>
          </div>

          {/* SLA Badge Panel */}
          <div className="flex items-center shrink-0">
            {isSlaPaused ? (
              <div className="bg-slate-100 text-slate-650 py-2 px-4 rounded-xl border border-slate-200/60 text-xs flex items-center gap-2 font-semibold shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 animate-pulse"></span>
                SLA Paused ({ticket.status})
              </div>
            ) : (
              <div className={`py-2 px-4 rounded-xl text-xs flex items-center gap-2.5 font-semibold shadow-sm border ${slaColorClass}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${slaDotColor} animate-pulse`}></span>
                {slaLabel}
              </div>
            )}
          </div>
        </div>

        {/* Local Time Zone Indicator Banner */}
        {ticket && (
          (() => {
            const senderLoc = parseLocationFromAddress(
              ticket.senderAddress || ticket.senderDetails?.address || packageDetails?.trackingData?.sender || "",
              ticket.senderState || ticket.senderDetails?.state || ticket.enrichedScans?.[0]?.sender_state || ""
            );
            const senderTime = getLocalTimeDetails(senderLoc.zone);
            const senderDiffHoursAbs = Math.abs(senderTime.diffHours);
            const senderDiffText = senderTime.diffHours === 0 
              ? "same timezone as you" 
              : `${senderDiffHoursAbs}h ${senderTime.diffHours > 0 ? "ahead of" : "behind"} you`;

            const recLoc = parseLocationFromAddress(
              ticket.newReceiverAddress || 
              ticket.receiverAddress || 
              packageDetails?.receiverFullDetails?.address || 
              packageDetails?.receiverDetails?.address,
              ticket.newReceiverState || 
              ticket.receiverState || 
              packageDetails?.receiverFullDetails?.state || 
              packageDetails?.receiverDetails?.state
            );
            const recTime = getLocalTimeDetails(recLoc.zone);
            const recDiffHoursAbs = Math.abs(recTime.diffHours);
            const recDiffText = recTime.diffHours === 0 
              ? "same timezone as you" 
              : `${recDiffHoursAbs}h ${recTime.diffHours > 0 ? "ahead of" : "behind"} you`;

            return (
              <div className="p-4 px-6 rounded-2xl flex flex-col gap-4 border border-slate-200/80 bg-slate-50/60 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 w-full">
                  {/* Sender Timezone */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sender:</span>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${senderTime.isOpen ? "bg-emerald-500" : "bg-amber-500"}`} />
                    <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="font-bold text-slate-800 text-sm">
                      {senderTime.timeStr} {senderTime.dayStr}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600 text-xs font-semibold">
                      {senderLoc.label} ({senderTime.tzAbbr})
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500 text-xs font-medium">
                      {senderTime.isOpen ? "Open" : "Outside hours"} ({senderDiffText})
                    </span>
                  </div>

                  {/* Divider for larger screens */}
                  <div className="hidden lg:block w-px h-6 bg-slate-200 self-stretch" />

                  {/* Receiver Timezone */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Receiver:</span>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${recTime.isOpen ? "bg-emerald-500" : "bg-amber-500"}`} />
                    <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="font-bold text-slate-800 text-sm">
                      {recTime.timeStr} {recTime.dayStr}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600 text-xs font-semibold">
                      {recLoc.label} ({recTime.tzAbbr})
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500 text-xs font-medium">
                      {recTime.isOpen ? "Open" : "Outside hours"} ({recDiffText})
                    </span>
                  </div>
                </div>
              </div>
            );
          })()
        )}

        {/* Two-Tier Metadata Panel (Option 1) */}
        <div className="space-y-4">
          {/* Top Row: Context Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Enquiry Type Card */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col justify-between min-h-[90px]">
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1.5">Enquiry Type</span>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {(Array.isArray(ticket.enquiryType) ? ticket.enquiryType : [ticket.enquiryType || 'Dispute of Delivery']).map((type: string) => (
                    <Badge key={type} className="bg-[#EAF1E7] border border-[#C3D2C2] text-[#0E3D3B] text-[11px] font-bold px-2.5 py-0.5 rounded-md">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="mt-2.5 flex justify-end">
                <button 
                  onClick={() => setIsEditingEnquiryTypes(true)}
                  className="text-xs text-[#095c7b] hover:underline font-bold p-1 hover:bg-[#095c7b]/10 rounded-lg flex items-center gap-1"
                >
                  ✏️ Edit Enquiry Types
                </button>
              </div>
            </div>

            {/* Issue Summary Card */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col justify-between min-h-[90px]">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold">Issue Summary & Notes</span>
                  {ticket.raisedBy && (
                    <Badge variant="outline" className="text-[9px] bg-slate-50 border-slate-200 text-slate-500 font-bold px-1.5 py-0.5 rounded leading-none shrink-0">
                      By {ticket.raisedBy}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-600 font-medium leading-relaxed max-h-16 overflow-y-auto pr-1">
                  {ticket.description || ticket.notes || "Customer advises consignment issues."}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Row: Stats Grid */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 divide-y md:divide-y-0 lg:divide-x divide-slate-100">
            <div className="pt-2 md:pt-0 first:pt-0">
              <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold">Assigned To</span>
              <span className="text-sm font-bold text-slate-755 mt-1 block truncate">
                {ticket.assignedUser || "Unassigned"}
              </span>
            </div>
            <div className="pt-3 md:pt-0 lg:pl-4">
              <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold">Date Created</span>
              <span className="text-sm font-semibold text-slate-700 mt-1 block">
                {createdDate.toLocaleDateString("en-AU", { day: 'numeric', month: 'short', timeZone: 'Australia/Sydney' })}, {createdDate.toLocaleTimeString("en-AU", { hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Sydney' })}
              </span>
            </div>
            <div className="pt-3 md:pt-0 lg:pl-4">
              <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold">Ticket Age</span>
              <span className="text-sm font-semibold text-slate-700 mt-1 block">
                {ticketAgeHours}h
              </span>
            </div>
            <div className="pt-3 md:pt-0 lg:pl-4">
              <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold">Last Updated</span>
              <span className="text-sm font-semibold text-slate-700 mt-1 block">
                {lastUpdateDate.toLocaleDateString("en-AU", { day: 'numeric', month: 'short', timeZone: 'Australia/Sydney' })}, {lastUpdateDate.toLocaleTimeString("en-AU", { hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Sydney' })}
              </span>
            </div>
            <div className="pt-3 md:pt-0 lg:pl-4">
              <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold">Open Cases</span>
              <span className="text-sm font-semibold text-slate-700 mt-1 block">
                {packageDetails?.openTickets?.length || 1}
              </span>
            </div>
          </div>
        </div>

        {/* Warning Alerts */}
        <div className="space-y-3">
          {movementDiffHours >= 48 && !packageDetails?.realTimeStatus?.delivered && packageDetails?.realTimeStatus?.status?.toLowerCase() !== 'delivered' && (
            <div className="bg-red-50 border border-red-200 text-red-900 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <h4 className="text-sm font-bold text-red-950">No package movement detected for {movementDiffHours} hours</h4>
                <p className="text-xs text-red-800 mt-0.5">
                  Last recorded scan was at {packageDetails?.trackingData?.lastScan || "Botany Depot"} on {lastMovementTime ? formatToDDMMYYYY(lastMovementTime) : "Recently"}. This exceeds the threshold of 48 hours without scanning activity.
                </p>
              </div>
            </div>
          )}

          {(Array.isArray(ticket.enquiryType) ? ticket.enquiryType : [ticket.enquiryType || "Dispute of Delivery"]).includes("Dispute of Delivery") && (
            <div className="bg-amber-50/80 border border-amber-200 text-amber-900 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-950">Delivery scan is contested by the customer</h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  The delivery status shows as completed, but the receiver states they did not receive the package. Proof of Delivery (POD) and Authority to Leave (ATL) verification is required.
                </p>
              </div>
            </div>
          )}
        </div>

      {/* Quick Actions Integrated Toolbar (Option 1) */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6">
          
          {/* Status Section */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status:</span>
            <div className="flex items-center gap-1.5">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => promptStatusChange("Open")}
                className="bg-slate-50 border-slate-200 text-slate-700 text-xs px-2.5 h-8 rounded-lg font-medium hover:bg-slate-100"
              >
                🟢 Open
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => promptStatusChange("Closed")}
                className="bg-slate-50 border-slate-200 text-slate-700 text-xs px-2.5 h-8 rounded-lg font-medium hover:bg-slate-100"
              >
                ✅ Closed
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => promptStatusChange("Lost in Transit")}
                className="bg-slate-50 border-slate-200 text-slate-700 text-xs px-2.5 h-8 rounded-lg font-medium hover:bg-slate-100"
              >
                🔴 Lost
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => promptStatusChange("Damaged")}
                className="bg-slate-50 border-slate-200 text-slate-700 text-xs px-2.5 h-8 rounded-lg font-medium hover:bg-slate-100"
              >
                🟡 Damaged
              </Button>
            </div>
          </div>

          <div className="w-px h-6 bg-slate-100 hidden md:block" />

          {/* Actions Section */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tasks:</span>
            <div className="flex items-center gap-1.5">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setEmailRecipient(ticket.customerEmail || packageDetails?.customerDetails?.email || "");
                  setIsEmailModalOpen(true);
                }}
                className="bg-slate-50 border-slate-250 text-slate-700 text-xs px-3 h-8 rounded-lg hover:bg-slate-100 gap-1.5"
              >
                <Mail className="h-3.5 w-3.5 text-slate-400" /> Email
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const noteInput = document.getElementById("staff-note-input");
                  noteInput?.focus();
                  noteInput?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-slate-50 border-slate-250 text-slate-700 text-xs px-3 h-8 rounded-lg hover:bg-slate-100 gap-1.5"
              >
                <FileText className="h-3.5 w-3.5 text-slate-400" /> Note
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setAssignStaffSelectedUser("");
                  setAssignStaffEscalationOption("None");
                  setIsAssignStaffModalOpen(true);
                }}
                className="bg-slate-50 border-slate-250 text-slate-700 text-xs px-3 h-8 rounded-lg hover:bg-slate-100 gap-1.5"
              >
                <UserPlus className="h-3.5 w-3.5 text-slate-400" /> Assign
              </Button>
            </div>
          </div>

          <div className="w-px h-6 bg-slate-100 hidden md:block" />

          {/* Escalations Section */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Escalate:</span>
            <div className="flex items-center gap-1.5">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setEscalateType("Operations");
                  setIsEscalateModalOpen(true);
                }}
                className="text-xs border-amber-250 text-amber-700 hover:bg-amber-50 h-8 font-bold rounded-lg px-3"
              >
                ⚙️ Ops
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setEscalateType("IT");
                  setIsEscalateModalOpen(true);
                }}
                className="text-xs border-slate-305 text-slate-800 hover:bg-slate-50 h-8 font-bold rounded-lg px-3"
              >
                💻 IT
              </Button>
            </div>
          </div>

        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsMissedSweepModalOpen(true)}
            className="bg-[#D0DFCD] hover:bg-[#C2D4BE] text-[#0E3D3B] text-xs font-bold rounded-full h-8 px-4 border-none gap-1.5 shadow-sm transition-all"
          >
            <AlertCircle className="h-3.5 w-3.5 text-[#0E3D3B]" /> Missed sweep
          </Button>
        </div>
      </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* LEFT 2 COLUMNS: Tracking Status, Customer Details, Issue Summary, Timeline, Communications */}
          <div className="lg:col-span-2 space-y-6">

            {/* 4. Tracking Timeline (Consignment Scan Log) */}
            <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="border-b border-slate-50 bg-slate-50/50 py-4 px-6 flex justify-between items-center">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#095c7b]" /> Consignment Scan Log
                </CardTitle>
                <span className="text-xs text-slate-400 font-semibold bg-slate-100/60 px-2 py-0.5 rounded-full">
                  Carrier Pulled Data
                </span>
              </CardHeader>
              <CardContent className="p-6">
                {loadingPackage ? (
                  <div className="text-center py-8 text-sm text-slate-400 animate-pulse flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="h-6 w-6 animate-spin text-[#095c7b]" />
                    <span>Synchronizing scan history...</span>
                  </div>
                ) : (packageDetails?.enrichedScans?.length > 0 || packageDetails?.realTimeStatus) ? (
                  <div className="relative pl-6 border-l-2 border-emerald-100 space-y-6">
                    {/* Real-time status scan from Protechly API */}
                    {packageDetails?.realTimeStatus && (
                      <div className="relative">
                        {/* Timeline Bullet */}
                        <div className="absolute -left-[31px] top-1 w-4.5 h-4.5 rounded-full border-2 bg-emerald-50 flex items-center justify-center border-emerald-500 text-emerald-500 shadow-sm shadow-emerald-100 animate-pulse">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-400">
                              {packageDetails.realTimeStatus.updated_at ? new Date(packageDetails.realTimeStatus.updated_at).toLocaleString("en-AU", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Sydney' }) : "N/A"}
                            </span>
                            <Badge className="bg-[#095c7b]/10 border border-[#095c7b]/20 text-[#095c7b] text-[9px] font-bold rounded px-1.5">Last Carrier Scan (API)</Badge>
                          </div>
                          <h4 className="text-sm font-bold text-slate-800 mt-0.5">{packageDetails.realTimeStatus.status}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">{packageDetails.realTimeStatus.last_location || "Carrier Location"}</p>
                        </div>
                      </div>
                    )}

                    {packageDetails?.enrichedScans?.map((scan: any, i: number) => (
                      <div key={i} className="relative">
                        {/* Timeline Bullet */}
                        <div className={`absolute -left-[31px] top-1 w-4.5 h-4.5 rounded-full border-2 bg-white flex items-center justify-center ${
                          !packageDetails?.realTimeStatus && i === 0 ? "border-emerald-500 text-emerald-500 shadow-sm shadow-emerald-100" : "border-slate-350 text-slate-350"
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${!packageDetails?.realTimeStatus && i === 0 ? "bg-emerald-500" : "bg-slate-300"}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-400">
                              {scan.updated_at ? new Date(scan.updated_at).toLocaleString("en-AU", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Sydney' }) : "N/A"}
                            </span>
                            {!packageDetails?.realTimeStatus && i === 0 && (
                              <Badge className="bg-emerald-50 border border-emerald-250 text-emerald-700 text-[9px] font-bold rounded px-1.5 hover:bg-emerald-50">Latest Event</Badge>
                            )}
                            {scan.scan_type?.toLowerCase().includes("dispute") && (
                              <Badge className="bg-red-50 border border-red-200 text-red-700 text-[9px] font-bold rounded px-1.5">Disputed</Badge>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-slate-800 mt-0.5">{scan.scan_type}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">{scan.partnerLocationName || scan.depot_id} {scan.partnerLocationAddress}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm text-slate-400 italic">No timeline entries found for this tracking code.</div>
                )}
              </CardContent>
            </Card>

            {/* 6. Customer Communication Timeline (Customer Update Hub) */}
            <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="border-b border-slate-50 bg-slate-50/50 py-4 px-6 flex justify-between items-center">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Mail className="h-5 w-5 text-[#095c7b]" /> Customer Update Hub
                </CardTitle>
                <Button 
                  onClick={() => {
                    setEmailRecipient(ticket.customerEmail || packageDetails?.customerDetails?.email || "");
                    setIsEmailModalOpen(true);
                  }}
                  disabled={!!ticket.parentTicketId}
                  className="bg-[#095c7b] hover:bg-[#053647] text-white text-xs h-8 px-4 flex items-center gap-1.5 rounded-lg shadow-sm"
                >
                  <Send className="h-3.5 w-3.5" /> Send Email
                </Button>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {ticket.parentTicketId ? (
                  <div className="bg-[#fffcf6] border border-[#ffe3b3] text-[#a06d28] p-4.5 rounded-2xl text-xs space-y-2.5">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="h-4.5 w-4.5 text-[#b7791f]" /> Customer Correspondence is Centralized
                    </p>
                    <p className="leading-relaxed">
                      All messages, threads, and history for this package are routed through the Parent Master Case. Go to the master case to communicate with the client.
                    </p>
                    <Link href={`/admin/tickets/${ticket.parentTicketId}`} className="inline-block mt-1">
                      <Button size="sm" variant="outline" className="text-xs border-[#ffe0b2] hover:bg-[#fff7ea] text-[#b7791f] font-bold rounded-lg">
                        Go to Master Case
                      </Button>
                    </Link>
                  </div>
                ) : communications.length > 0 ? (
                  <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                    {communications.map((comm) => (
                      <div key={comm.id} className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
                        <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                          <Badge className={`rounded-full text-[10px] font-bold px-2 py-0.5 border ${
                            comm.type === "SENT" 
                              ? "bg-slate-100 text-slate-700 border-slate-200" 
                              : "bg-emerald-50 text-emerald-800 border-emerald-250"
                          }`}>
                            {comm.type === "SENT" ? "OUTBOUND EMAIL" : "INCOMING MESSAGE"}
                          </Badge>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {comm.timestamp ? new Date(comm.timestamp).toLocaleString("en-AU", { timeZone: "Australia/Sydney" }) : ""}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-450">
                          From: <span className="font-bold text-slate-655">{comm.from}</span> to <span className="font-bold text-slate-655">{comm.to}</span>
                        </p>
                        {(() => {
                          const { subject, body } = parseCommContent(comm.content);
                          const isHtml = /<[a-z][\s\S]*>/i.test(body);

                          return (
                            <div className="space-y-2 mt-3">
                              {subject && (
                                <p className="text-[11px] text-slate-500 font-semibold">
                                  Subject: <span className="text-slate-700">{subject}</span>
                                </p>
                              )}
                              {isHtml ? (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-100 p-3.5 rounded-xl shadow-sm">
                                  <div className="text-xs text-slate-400 font-medium italic flex items-center gap-1.5">
                                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                                    Rich HTML Email
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedCommToPreview(comm);
                                      setIsCommPreviewOpen(true);
                                    }}
                                    className="bg-[#095c7b] hover:bg-[#053647] text-white text-xs h-7 px-3 flex items-center gap-1 rounded-md"
                                  >
                                    <Eye className="h-3.5 w-3.5" /> View Sent Email
                                  </Button>
                                </div>
                              ) : (
                                <div className="text-xs text-slate-700 font-medium whitespace-pre-wrap leading-relaxed bg-white border border-slate-100 p-3 rounded-xl">
                                  {body}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-sm text-slate-450 italic">No correspondence records logged.</div>
                )}
              </CardContent>
            </Card>

            {/* 1. Customer Details Box (Placed directly at the top) */}
            <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="border-b border-slate-50 bg-slate-50/50 py-3.5 px-6 flex flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#095c7b]/10 text-[#095c7b] rounded-xl">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-[#095c7b]">Customer Details</CardTitle>
                    <p className="text-[11px] text-slate-450">Account information and primary contact channels</p>
                  </div>
                </div>
                <Badge className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold text-[10px] tracking-wider uppercase">
                  {ticket.customerTier || "Standard"} Tier
                </Badge>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-2 md:grid-cols-5 gap-6 text-sm">
                <div className="col-span-2 md:col-span-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Company Name</span>
                  {(ticket.companyId || packageDetails?.customerDetails?.companyId) ? (
                    <Link 
                      href={`/companies/${ticket.companyId || packageDetails.customerDetails.companyId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-[#095c7b] hover:text-[#053647] hover:underline text-sm block"
                    >
                      {ticket.customerCompany || ticket.customerName || "Northside Trading"}
                    </Link>
                  ) : (
                    <span className="font-bold text-slate-800 text-sm block">
                      {ticket.customerCompany || ticket.customerName || "Northside Trading"}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Prospect+ ID</span>
                  <span className="font-semibold text-slate-700 text-sm block">{prospectPlusId || ticket.prospectPlusId || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Contact Name</span>
                  <span className="font-medium text-slate-700 text-sm block">{ticket.customerContactName || "Primary Contact"}</span>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Email (Send Update)</span>
                  <button 
                    onClick={() => {
                      setEmailRecipient(ticket.customerEmail || packageDetails?.customerDetails?.email || "");
                      setIsEmailModalOpen(true);
                    }}
                    className="font-bold text-[#095c7b] hover:text-[#053647] hover:underline text-left block truncate w-full text-sm flex items-center gap-1"
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {ticket.customerEmail || "N/A"}
                  </button>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Phone</span>
                  <span className="font-semibold text-slate-700 text-sm block">{ticket.customerPhone || "N/A"}</span>
                  {ticket.customerPhone && ticket.customerPhone !== "N/A" && (
                    (() => {
                      const customerLoc = parseLocationFromAddress(
                        ticket.customerAddress || ticket.receiverAddress || packageDetails?.customerDetails?.address,
                        ticket.customerState || ticket.receiverState || packageDetails?.customerDetails?.state
                      );
                      const customerTime = getLocalTimeDetails(customerLoc.zone);
                      return (
                        <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-600">
                          <span className={`w-1.5 h-1.5 rounded-full ${customerTime.isOpen ? "bg-emerald-500" : "bg-amber-500"}`} />
                          <span>{customerTime.timeStr} local · {customerLoc.state}</span>
                        </div>
                      );
                    })()
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Company Contacts Section */}
            <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="border-b border-slate-50 bg-slate-50/50 py-3.5 px-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#095c7b]/10 text-[#095c7b] rounded-xl">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-[#095c7b]">Company Contacts</CardTitle>
                    <p className="text-[11px] text-slate-450">All contacts associated with this company</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {loadingContacts ? (
                  <div className="flex items-center justify-center py-4 gap-2 text-slate-500 text-sm">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Loading company contacts...</span>
                  </div>
                ) : companyContacts.length === 0 ? (
                  <div className="text-center py-4 text-slate-500 text-sm">
                    No contacts found for this company.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {companyContacts.map((contact) => (
                      <div key={contact.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50/30 hover:bg-slate-50 transition-colors flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                              {contact.name}
                              {contact.isPrimary && (
                                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0 rounded text-[9px] uppercase tracking-wider scale-90 origin-left">
                                  Primary
                                </Badge>
                              )}
                            </span>
                            {contact.title && (
                              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                {contact.title}
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-1 text-xs text-slate-600">
                            {contact.email && (
                              <div className="flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <button 
                                  onClick={() => {
                                    setEmailRecipient(contact.email);
                                    setIsEmailModalOpen(true);
                                  }}
                                  className="font-medium text-[#095c7b] hover:underline text-left truncate"
                                >
                                  {contact.email}
                                </button>
                              </div>
                            )}
                            {contact.phone && (
                              <div className="flex flex-col gap-1 mt-1">
                                <div className="flex items-center gap-1.5">
                                  <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  <span className="text-slate-700 font-semibold">{contact.phone}</span>
                                </div>
                                {(() => {
                                  const contactLoc = parseLocationFromAddress(
                                    contact.address || ticket.receiverAddress || ticket.customerAddress,
                                    contact.state
                                  );
                                  const contactTime = getLocalTimeDetails(contactLoc.zone);
                                  return (
                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-600 w-fit">
                                      <span className={`w-1.5 h-1.5 rounded-full ${contactTime.isOpen ? "bg-emerald-500" : "bg-amber-500"}`} />
                                      <span>{contactTime.timeStr} local · {contactLoc.state}</span>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Franchisee & Operator Details Section */}
            <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="border-b border-slate-50 bg-slate-50/50 py-3.5 px-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#095c7b]/10 text-[#095c7b] rounded-xl">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-[#095c7b]">Franchisee & Operator Details</CardTitle>
                    <p className="text-[11px] text-slate-450">Logistics contact details linked to this package</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {loadingFranchiseeOperator ? (
                  <div className="flex items-center justify-center py-4 gap-2 text-slate-500 text-sm">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Loading details...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Franchisee Card */}
                    <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/30">
                      <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-[#095c7b]" />
                        Franchisee Details
                      </h4>
                      {franchiseeInfo ? (
                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Franchise Name</span>
                            <span className="font-semibold text-slate-700">{franchiseeInfo.name || "N/A"}</span>
                          </div>
                          {franchiseeInfo.mainContact && (
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Main Contact</span>
                              <span className="font-semibold text-slate-700">{franchiseeInfo.mainContact}</span>
                            </div>
                          )}
                          {franchiseeInfo.mobile && (
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</span>
                              <span className="font-semibold text-slate-700">{franchiseeInfo.mobile}</span>

                            </div>
                          )}
                          {franchiseeInfo.email && (
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
                              <a href={`mailto:${franchiseeInfo.email}`} className="font-semibold text-[#095c7b] hover:underline">
                                {franchiseeInfo.email}
                              </a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-slate-400 italic text-xs py-2">
                          No franchisee details linked to this package (Franchisee: {ticket?.franchisee || packageDetails?.franchisee || "Unknown"}).
                        </div>
                      )}
                    </div>

                    {/* Operator Card */}
                    <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/30">
                      <h4 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-1.5">
                        <User className="h-4 w-4 text-[#095c7b]" />
                        Operator Details (Linked to Barcode)
                      </h4>
                      {operatorInfo ? (
                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Operator Name</span>
                            <span className="font-semibold text-slate-700">
                              {`${operatorInfo.givenNames || ""} ${operatorInfo.surname || ""}`.trim() || "N/A"}
                            </span>
                          </div>
                          {operatorInfo.contactPhone && (
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</span>
                              <span className="font-semibold text-slate-700">{operatorInfo.contactPhone}</span>
                              {(() => {
                                const opLoc = parseLocationFromAddress(operatorInfo.address || operatorInfo.depot || operatorInfo.state, operatorInfo.state);
                                const opTime = getLocalTimeDetails(opLoc.zone);
                                return (
                                  <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-650 w-fit block">
                                    <span className={`w-1.5 h-1.5 rounded-full ${opTime.isOpen ? "bg-emerald-500" : "bg-amber-500"}`} />
                                    <span>{opTime.timeStr} local · {opLoc.state}</span>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                          {operatorInfo.contactEmail && (
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
                              <a href={`mailto:${operatorInfo.contactEmail}`} className="font-semibold text-[#095c7b] hover:underline">
                                {operatorInfo.contactEmail}
                              </a>
                            </div>
                          )}
                          {operatorInfo.title && (
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Role / Title</span>
                              <span className="font-semibold text-slate-700">{operatorInfo.title}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-slate-400 italic text-xs py-2">
                          No specific operator details found for this barcode scan.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Receiver Details Section */}
            <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="border-b border-slate-50 bg-slate-50/50 py-3.5 px-6 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#095c7b]/10 text-[#095c7b] rounded-xl">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-[#095c7b]">Receiver Details</CardTitle>
                    <p className="text-[11px] text-slate-450">Delivery recipient contact and address details</p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setEditHasNewReceiverDetails(ticket.hasNewReceiverDetails || false);
                    setEditNewReceiverName(ticket.newReceiverName || ticket.receiverName || packageDetails?.receiverFullDetails?.name || packageDetails?.receiverDetails?.name || "");
                    setEditNewReceiverAddress(ticket.newReceiverAddress || ticket.receiverAddress || packageDetails?.receiverFullDetails?.address || packageDetails?.receiverDetails?.address || "");
                    setEditNewReceiverEmail(ticket.newReceiverEmail || ticket.receiverEmail || packageDetails?.receiverFullDetails?.email || packageDetails?.receiverDetails?.email || "");
                    setEditNewReceiverPhone(ticket.newReceiverPhone || ticket.receiverPhone || packageDetails?.receiverFullDetails?.phone || packageDetails?.receiverDetails?.phone || "");
                    setIsReceiverModalOpen(true);
                  }}
                  variant="outline"
                  size="sm"
                  className="h-8 border-[#095c7b]/20 text-[#095c7b] hover:bg-[#095c7b]/5 flex items-center gap-1.5 rounded-xl font-bold"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  Correct Details
                </Button>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {ticket.hasNewReceiverDetails && (
                  <div className="p-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl text-xs flex items-start gap-2.5 shadow-sm">
                    <AlertCircle className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-900 block mb-0.5">⚠️ Incorrect Package Details Flagged</span>
                      The package barcode scans are associated with the original details below, but corrected details have been registered for operations and reporting.
                    </div>
                  </div>
                )}
                
                <div className={`grid grid-cols-1 ${ticket.hasNewReceiverDetails ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6 text-sm`}>
                  {/* Form Submission Details */}
                  <div className="space-y-4 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 border-b pb-1">
                      Submitted Details (API/Website)
                    </span>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Receiver Name</span>
                        <span className="font-semibold text-slate-700 text-sm block">
                          {ticket.receiverName || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Delivery Address</span>
                        <span className="font-semibold text-slate-700 text-sm block leading-relaxed">
                          {ticket.receiverAddress || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Email</span>
                        {ticket.receiverEmail ? (
                          <button 
                            onClick={() => {
                              setEmailRecipient(ticket.receiverEmail || "");
                              setIsEmailModalOpen(true);
                            }}
                            className="font-bold text-[#095c7b] hover:text-[#053647] hover:underline text-left block truncate w-full text-sm flex items-center gap-1"
                          >
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            {ticket.receiverEmail}
                          </button>
                        ) : (
                          <span className="font-semibold text-slate-700 text-sm block">N/A</span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Phone</span>
                        <span className="font-semibold text-slate-700 text-sm block">
                          {ticket.receiverPhone || "N/A"}
                        </span>
                        {ticket.receiverPhone && ticket.receiverPhone !== "N/A" && (
                          (() => {
                            const recLoc = parseLocationFromAddress(ticket.receiverAddress, ticket.receiverState);
                            const recTime = getLocalTimeDetails(recLoc.zone);
                            return (
                              <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-600 w-fit">
                                <span className={`w-1.5 h-1.5 rounded-full ${recTime.isOpen ? "bg-emerald-500" : "bg-amber-500"}`} />
                                <span>{recTime.timeStr} local · {recLoc.state}</span>
                              </div>
                            );
                          })()
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Barcode Linked Details */}
                  <div className={`space-y-4 ${ticket.hasNewReceiverDetails ? 'border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4' : ''}`}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 border-b pb-1">
                      Barcode Linked Details (Scan)
                    </span>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Receiver Name</span>
                        <span className="font-semibold text-slate-700 text-sm block">
                          {packageDetails?.receiverFullDetails?.name || packageDetails?.receiverDetails?.name || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Delivery Address</span>
                        <span className="font-semibold text-slate-700 text-sm block leading-relaxed">
                          {packageDetails?.receiverFullDetails?.address || packageDetails?.receiverDetails?.address || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Email</span>
                        {packageDetails?.receiverFullDetails?.email || packageDetails?.receiverDetails?.email ? (
                          <button 
                            onClick={() => {
                              setEmailRecipient(packageDetails?.receiverFullDetails?.email || packageDetails?.receiverDetails?.email || "");
                              setIsEmailModalOpen(true);
                            }}
                            className="font-bold text-[#095c7b] hover:text-[#053647] hover:underline text-left block truncate w-full text-sm flex items-center gap-1"
                          >
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            {packageDetails?.receiverFullDetails?.email || packageDetails?.receiverDetails?.email}
                          </button>
                        ) : (
                          <span className="font-semibold text-slate-700 text-sm block">N/A</span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Phone</span>
                        <span className="font-semibold text-slate-700 text-sm block">
                          {packageDetails?.receiverFullDetails?.phone || packageDetails?.receiverDetails?.phone || "N/A"}
                        </span>
                        {(packageDetails?.receiverFullDetails?.phone || packageDetails?.receiverDetails?.phone) && (
                          (() => {
                            const recLoc = parseLocationFromAddress(
                               packageDetails?.receiverFullDetails?.address || packageDetails?.receiverDetails?.address,
                               packageDetails?.receiverFullDetails?.state || packageDetails?.receiverDetails?.state
                            );
                            const recTime = getLocalTimeDetails(recLoc.zone);
                            return (
                              <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-650 w-fit">
                                <span className={`w-1.5 h-1.5 rounded-full ${recTime.isOpen ? "bg-emerald-500" : "bg-amber-500"}`} />
                                <span>{recTime.timeStr} local · {recLoc.state}</span>
                              </div>
                            );
                          })()
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Corrected Receiver Details */}
                  {ticket.hasNewReceiverDetails && (
                    <div className="space-y-4">
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-2 border-b border-amber-100 pb-1 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Corrected Details
                      </span>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Receiver Name</span>
                          <span className="font-bold text-[#095c7b] text-sm block">
                            {ticket.newReceiverName || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Delivery Address</span>
                          <span className="font-bold text-[#095c7b] text-sm block leading-relaxed">
                            {ticket.newReceiverAddress || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Email</span>
                          {ticket.newReceiverEmail ? (
                            <button 
                              onClick={() => {
                                setEmailRecipient(ticket.newReceiverEmail || "");
                                setIsEmailModalOpen(true);
                              }}
                              className="font-bold text-[#095c7b] hover:text-[#053647] hover:underline text-left block truncate w-full text-sm flex items-center gap-1"
                            >
                              <Mail className="h-3.5 w-3.5 shrink-0" />
                              {ticket.newReceiverEmail}
                            </button>
                          ) : (
                            <span className="font-semibold text-slate-700 text-sm block">N/A</span>
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Phone</span>
                          <span className="font-semibold text-slate-700 text-sm block">
                            {ticket.newReceiverPhone || "N/A"}
                          </span>
                          {ticket.newReceiverPhone && ticket.newReceiverPhone !== "N/A" && (
                            (() => {
                              const recLoc = parseLocationFromAddress(ticket.newReceiverAddress, ticket.newReceiverState);
                              const recTime = getLocalTimeDetails(recLoc.zone);
                              return (
                                <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-650 w-fit">
                                  <span className={`w-1.5 h-1.5 rounded-full ${recTime.isOpen ? "bg-emerald-500" : "bg-amber-500"}`} />
                                  <span>{recTime.timeStr} local · {recLoc.state}</span>
                                </div>
                              );
                            })()
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 2. Tracking Status & Lodgement Section (Placed directly below Customer Details) */}
            <Card className="border border-[#bcf0c2] bg-[#f8fdf9] shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-[#bcf0c2]/30 bg-[#eefaf1] py-4 px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-[#d1f5d8] text-[#1e5c32] rounded-xl">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-[#1a4a2b]">Tracking Status & Lodgement</CardTitle>
                    <p className="text-[11px] text-[#2b6d3f]">Real-time scans and depot franchisee details</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    if (ticket?.trackingIdentifier) {
                      fetchPackageData(ticket.trackingIdentifier);
                    }
                  }}
                  disabled={loadingPackage}
                  className="bg-[#095c7b] hover:bg-[#053647] text-white text-xs h-8 px-4 flex items-center gap-1.5 shadow-sm rounded-lg"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingPackage ? "animate-spin" : ""}`} />
                  Get Real-Time Status
                </Button>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                
                {/* Barcode details block */}
                <div className="bg-[#edf9f0] border border-[#bcf0c2] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#2f855a] uppercase tracking-wider block">Barcode / Consignment ID</span>
                    <span className="font-mono text-base sm:text-lg font-bold text-[#1a4a2b]">{ticket.trackingIdentifier || "N/A"}</span>
                  </div>
                  
                  {packageDetails?.packageInfo ? (
                    <div className="flex flex-wrap gap-2">
                      {packageDetails.packageInfo.serviceType && (
                        <Badge variant="outline" className="bg-white border-[#bcf0c2] text-[#1a4a2b] font-semibold text-[11px] px-2.5 py-0.5 rounded-full">
                          {packageDetails.packageInfo.serviceType}
                        </Badge>
                      )}
                      {packageDetails.packageInfo.weight && (
                        <Badge variant="outline" className="bg-white border-[#bcf0c2] text-[#1a4a2b] font-semibold text-[11px] px-2.5 py-0.5 rounded-full">
                          Weight: {packageDetails.packageInfo.weight}
                        </Badge>
                      )}
                      {packageDetails.packageInfo.dimensions && (
                        <Badge variant="outline" className="bg-white border-[#bcf0c2] text-[#1a4a2b] font-semibold text-[11px] px-2.5 py-0.5 rounded-full">
                          Dimensions: {packageDetails.packageInfo.dimensions}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic flex items-center gap-1">
                      <Info className="h-4 w-4 text-emerald-600" /> Click status button to retrieve package properties.
                    </p>
                  )}
                </div>

                {packageDetails?.packageInfo && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-4 border-b border-[#bcf0c2]/30">
                    <div className="bg-white border border-[#bcf0c2]/30 p-3 rounded-xl">
                      <span className="text-[9px] font-bold text-[#2f855a] uppercase tracking-wider block">Order Number</span>
                      <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{packageDetails.packageInfo.orderNumber || "N/A"}</span>
                    </div>
                    <div className="bg-white border border-[#bcf0c2]/30 p-3 rounded-xl md:col-span-2">
                      <span className="text-[9px] font-bold text-[#2f855a] uppercase tracking-wider block">Attached Info / Description</span>
                      <span className="font-medium text-slate-800 text-sm mt-0.5 block truncate" title={packageDetails.packageInfo.description}>{packageDetails.packageInfo.description || "N/A"}</span>
                    </div>
                  </div>
                )}

                {/* Primary tracking info cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-[#bcf0c2]/30 p-4 rounded-xl shadow-sm">
                    <span className="text-[10px] font-bold text-[#2f855a] uppercase tracking-wider block mb-1">Current Status</span>
                    <span className="text-sm font-bold text-[#1a4a2b] block">{packageDetails?.trackingData?.currentStatus || "N/A"}</span>
                  </div>
                  <div className="bg-white border border-[#bcf0c2]/30 p-4 rounded-xl shadow-sm">
                    <span className="text-[10px] font-bold text-[#2f855a] uppercase tracking-wider block mb-1">Last Carrier Scan</span>
                    <span className="text-sm font-semibold text-slate-700 block">{formatToDDMMYYYY(packageDetails?.trackingData?.statusUpdatedAtRaw || packageDetails?.trackingData?.statusUpdatedAt) || "N/A"}</span>
                  </div>
                  <div className="bg-white border border-[#bcf0c2]/30 p-4 rounded-xl shadow-sm col-span-2 md:col-span-1">
                    <span className="text-[10px] font-bold text-[#2f855a] uppercase tracking-wider block mb-1">Last MailPlus Scan</span>
                    <span className="text-sm font-semibold text-slate-700 block">{formatToDDMMYYYY(packageDetails?.trackingData?.lastMovementRaw || packageDetails?.trackingData?.lastMovement) || "N/A"}</span>
                  </div>
                  <div className="bg-white border border-[#bcf0c2]/30 p-4 rounded-xl shadow-sm">
                    <span className="text-[10px] font-bold text-[#2f855a] uppercase tracking-wider block mb-1">Current Depot</span>
                    <span className="text-sm font-semibold text-slate-700 block truncate" title={packageDetails?.trackingData?.currentDepot}>{packageDetails?.trackingData?.currentDepot || "N/A"}</span>
                  </div>
                  <div className="bg-white border border-[#bcf0c2]/30 p-4 rounded-xl shadow-sm">
                    <span className="text-[10px] font-bold text-[#2f855a] uppercase tracking-wider block mb-1">Sender</span>
                    <span className="text-sm font-semibold text-slate-700 block truncate" title={packageDetails?.trackingData?.sender}>{packageDetails?.trackingData?.sender || "N/A"}</span>
                  </div>
                  <div className="bg-white border border-[#bcf0c2]/30 p-4 rounded-xl shadow-sm">
                    <span className="text-[10px] font-bold text-[#2f855a] uppercase tracking-wider block mb-1">Receiver</span>
                    <span className="text-sm font-semibold text-slate-700 block truncate" title={packageDetails?.trackingData?.receiver}>{packageDetails?.trackingData?.receiver || "N/A"}</span>
                  </div>
                </div>

                {/* Franchisee / Lodgement Hub detail list */}
                <div className="pt-5 border-t border-[#bcf0c2]/30 space-y-4">
                  <h4 className="text-[11px] font-bold text-[#1e5c32] uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[#2f855a]" /> Lodgement & Franchisee Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-white border border-slate-100 p-3 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Lodgement Hub</span>
                      <span className="text-xs font-semibold text-slate-700 mt-0.5 block">{packageDetails?.trackingData?.lodgementHub || "N/A"}</span>
                    </div>
                    <div className="bg-white border border-slate-100 p-3 rounded-xl col-span-1 sm:col-span-2 md:col-span-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Hub Address</span>
                      <span className="text-xs font-semibold text-slate-700 mt-0.5 block truncate" title={packageDetails?.trackingData?.hubAddress}>{packageDetails?.trackingData?.hubAddress || "N/A"}</span>
                    </div>
                    <div className="bg-white border border-slate-100 p-3 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Lodging Driver</span>
                      <span className="text-xs font-semibold text-slate-700 mt-0.5 block truncate" title={packageDetails?.trackingData?.lodgingDriver}>{packageDetails?.trackingData?.lodgingDriver || "N/A"}</span>
                    </div>
                    <div className="bg-white border border-slate-100 p-3 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Franchisee Contact</span>
                      <span className="text-xs font-semibold text-slate-700 mt-0.5 block">{packageDetails?.trackingData?.franchiseeContact || "N/A"}</span>
                    </div>
                    <div className="bg-white border border-slate-100 p-3 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Last MP Scan</span>
                      <span className="text-xs font-semibold text-slate-700 mt-0.5 block truncate" title={packageDetails?.trackingData?.lastScan}>{packageDetails?.trackingData?.lastScan || "N/A"}</span>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* 5. Linked Child Tickets / Barcodes (Master Case only) */}
            {ticket.isMasterCase && (
              <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
                <CardHeader className="border-b border-slate-50 bg-slate-50/50 py-4 px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#095c7b]" /> Multi-Consignment Barcodes ({childTickets.length})
                  </CardTitle>
                  <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                    <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Resolved ({childTickets.filter(t => ['Resolved', 'Closed', 'Lost in Transit', 'Damaged'].includes(t.status) && t.status !== 'Lost in Transit' && t.status !== 'Damaged').length})
                    </span>
                    <span className="bg-red-50 text-red-700 px-2.5 py-0.5 rounded-full border border-red-200">
                      Lost/Damaged ({childTickets.filter(t => t.status === 'Lost in Transit' || t.status === 'Damaged').length})
                    </span>
                    <span className="bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200">
                      Active ({childTickets.filter(t => !['Resolved', 'Closed', 'Lost in Transit', 'Damaged'].includes(t.status)).length})
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingChildren ? (
                    <div className="text-center py-8 text-sm text-slate-400 animate-pulse">Loading package list...</div>
                  ) : childTickets.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase">
                          <tr>
                            <th className="py-3 px-6">Barcode / ID</th>
                            <th className="py-3 px-6">Case Description</th>
                            <th className="py-3 px-6">Status</th>
                            <th className="py-3 px-6">Assignee</th>
                            <th className="py-3 px-6 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {childTickets.map((child) => (
                            <tr key={child.id} className="hover:bg-slate-50/40 transition-colors">
                              <td className="py-3.5 px-6 font-mono font-bold text-slate-800">{child.trackingIdentifier}</td>
                              <td className="py-3.5 px-6 text-slate-500 text-xs max-w-xs truncate" title={child.description}>
                                {child.description}
                              </td>
                              <td className="py-3.5 px-6">
                                <Badge className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  child.status === "Resolved" || child.status === "Closed"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : child.status === "Lost in Transit"
                                    ? "bg-red-50 text-red-700 border border-red-200"
                                    : child.status === "Damaged"
                                    ? "bg-orange-50 text-orange-700 border border-orange-200"
                                    : "bg-amber-50 text-amber-700"
                                }`}>
                                  {child.status}
                                </Badge>
                              </td>
                              <td className="py-3.5 px-6 text-slate-650 text-xs">{child.assignedUser || "Unassigned"}</td>
                              <td className="py-3.5 px-6 text-right">
                                <Link href={`/admin/tickets/${child.id}`}>
                                  <Button size="sm" variant="outline" className="text-xs text-[#095c7b] border-[#095c7b]/20 hover:bg-[#095c7b]/5 rounded-lg">
                                    Investigate →
                                  </Button>
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-slate-400 italic">No child tickets.</div>
                  )}
                </CardContent>
              </Card>
            )}

          </div>

          {/* RIGHT COLUMN: Sidebar Quick Actions, Escalations, Investigation */}
          <div className="space-y-6">

            {/* Investigation Actions Log Panel */}
            <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="border-b border-slate-50 bg-slate-50/50 py-3.5 px-6 flex justify-between items-center">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Wrench className="h-4.5 w-4.5 text-[#095c7b]" /> Investigation Log
                </CardTitle>
                <Button 
                  onClick={() => setIsActionModalOpen(true)}
                  className="bg-[#095c7b] hover:bg-[#053647] text-white text-[11px] h-7 px-2.5 flex items-center gap-1 rounded-lg"
                >
                  <Plus className="h-3.5 w-3.5" /> Log Action
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[300px] overflow-y-auto">
                  {actions.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {actions.map((act) => (
                        <div key={act.id} className="p-4 hover:bg-slate-50/40 transition-colors space-y-1 text-xs">
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-bold text-slate-800">{act.action}</span>
                            <select
                              value={act.status || "Pending"}
                              onChange={async (e) => {
                                const newStatus = e.target.value;
                                try {
                                  await updateDoc(doc(db, "tickets", ticketId, "actions", act.id), {
                                    status: newStatus
                                  });
                                  toast.success(`Action status updated to ${newStatus}`);
                                } catch (err) {
                                  toast.error("Failed to update status");
                                }
                              }}
                              className={`text-[9px] font-bold rounded-full border-0 p-1 cursor-pointer outline-none focus:ring-1 focus:ring-[#095c7b] ${act.status === "Complete" ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100" : "text-amber-700 bg-amber-50 hover:bg-amber-100"}`}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Complete">Complete</option>
                            </select>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed font-medium mt-1">
                            {act.notes}
                          </p>
                          <div className="flex justify-between text-[10px] text-slate-400 pt-1.5 font-medium">
                            <span>By: {act.user}</span>
                            <span>{act.date ? new Date(act.date).toLocaleDateString("en-AU", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Sydney' }) : ""}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400 italic">No investigation tasks have been logged.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Staff-Only Internal Notes */}
            <Card className="border border-amber-250 bg-amber-50/20 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-amber-200/50 bg-amber-50/40 py-3.5 px-6 flex justify-between items-center">
                <CardTitle className="text-sm font-bold text-amber-900">Internal Staff Notes</CardTitle>
                <Badge className="bg-amber-100 text-amber-850 border border-amber-200 text-[9px] font-bold tracking-wider hover:bg-amber-100 uppercase rounded-full">
                  Private Log
                </Badge>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                  {staffNotes.map((note) => (
                    <div key={note.id} className="p-3 bg-white border border-amber-150 rounded-xl shadow-sm">
                      <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold mb-1">
                        <span>{note.author}</span>
                        <span>{note.timestamp ? new Date(note.timestamp).toLocaleString("en-AU", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Sydney' }) : ""}</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">{note.content}</p>
                    </div>
                  ))}
                  {staffNotes.length === 0 && (
                    <span className="text-xs text-slate-400 italic block py-4 text-center">No team notes logged.</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input 
                    id="staff-note-input"
                    placeholder="Append staff details..." 
                    value={newStaffNote}
                    onChange={(e) => setNewStaffNote(e.target.value)}
                    className="text-xs h-9 bg-white border-slate-200 rounded-lg shadow-sm"
                  />
                  <Button onClick={handleAddStaffNote} className="bg-[#095c7b] hover:bg-[#053647] text-white text-xs h-9 rounded-lg px-3 shrink-0">
                    Post
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Attachments Card (Linked Documentation) */}
            <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="border-b border-slate-50 bg-slate-50/50 py-3.5 px-6 flex justify-between items-center">
                <CardTitle className="text-sm font-bold text-slate-800">Linked Documentation</CardTitle>
                <div className="relative">
                  <input 
                    type="file" 
                    id="attachment-upload" 
                    className="hidden" 
                    accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                    onChange={handleAttachmentUpload}
                    disabled={isUploadingAttachment}
                  />
                  <label 
                    htmlFor="attachment-upload" 
                    className="inline-flex items-center justify-center bg-[#095c7b] hover:bg-[#053647] text-white text-xs h-7 px-3 rounded-lg font-semibold cursor-pointer shadow-sm gap-1 transition-all"
                  >
                    {isUploadingAttachment ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin" /> Uploading...
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" /> Upload File
                      </>
                    )}
                  </label>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                {ticket.attachments && ticket.attachments.length > 0 ? (
                  ticket.attachments.map((file: any, i: number) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip className="h-4 w-4 text-slate-400 shrink-0" />
                        <div className="flex flex-col truncate">
                          <span className="text-xs text-slate-700 font-semibold truncate" title={file.name}>
                            {file.name}
                          </span>
                          {file.uploadedBy && (
                            <span className="text-[9px] text-slate-400">
                              By {file.uploadedBy}
                            </span>
                          )}
                        </div>
                      </div>
                      <a 
                        href={file.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs text-[#095c7b] font-bold hover:underline ml-2 flex items-center gap-1 shrink-0"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> View
                      </a>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic block py-4 text-center">No images or PDF files uploaded.</span>
                )}
              </CardContent>
            </Card>

            {/* StarTrack Enquiry Numbers */}
            <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="border-b border-slate-50 bg-slate-50/50 py-3.5 px-6">
                <CardTitle className="text-sm font-bold text-slate-800">StarTrack Enquiry Log</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <span className="text-xs text-slate-400 leading-normal block">
                  Add third-party carrier reference inquiry identifiers.
                </span>
                <div className="flex gap-2">
                  <Input 
                    placeholder="e.g. ST-ENQ-44821" 
                    value={newEnquiryNumber}
                    onChange={(e) => setNewEnquiryNumber(e.target.value)}
                    className="text-xs h-9 bg-slate-50 border-slate-200 rounded-lg"
                  />
                  <Button onClick={handleAddEnquiry} className="bg-[#095c7b] hover:bg-[#053647] text-white text-xs h-9 rounded-lg">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {ticket.starTrackEnquiries?.map((enq: string, i: number) => (
                    <Badge key={i} className="bg-slate-100 text-slate-700 text-xs border border-slate-200 py-0.5 px-2 hover:bg-slate-100 rounded-lg">
                      {enq}
                    </Badge>
                  ))}
                  {(!ticket.starTrackEnquiries || ticket.starTrackEnquiries.length === 0) && (
                    <span className="text-xs text-slate-400 italic block py-1">No reference codes logged yet.</span>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>

        </div>

      </div>

      {/* MODAL: Log Action */}
      <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#095c7b]">Log Investigation Action</DialogTitle>
            <DialogDescription className="text-xs text-slate-400 mt-1">
              Add details of depot updates, POD requests, or check results to the public log.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Action Type</label>
              <select 
                value={newActionType} 
                onChange={(e) => setNewActionType(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-[#095c7b] outline-none rounded-xl p-2.5 transition-all text-slate-700 font-medium"
              >
                <option value="Contact depot">Contact depot</option>
                <option value="Request POD">Request POD</option>
                <option value="Request ATL image">Request ATL image</option>
                <option value="Request GPS">Request GPS</option>
                <option value="General Check">General Check</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</label>
              <select 
                value={newActionStatus} 
                onChange={(e) => setNewActionStatus(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-[#095c7b] outline-none rounded-xl p-2.5 transition-all text-slate-700 font-medium"
              >
                <option value="Pending">Pending</option>
                <option value="Complete">Complete</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Notes / Summary</label>
              <Textarea 
                placeholder="Write specific outcomes or details here..." 
                value={newActionNotes}
                onChange={(e) => setNewActionNotes(e.target.value)}
                className="text-xs bg-slate-50 border-slate-200 focus:border-[#095c7b] outline-none rounded-xl min-h-[100px] leading-relaxed"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsActionModalOpen(false)} className="text-xs font-semibold rounded-lg">Cancel</Button>
            <Button onClick={handleAddAction} className="bg-[#095c7b] hover:bg-[#053647] text-white text-xs font-bold rounded-lg px-4 shadow-sm">Save Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Escalate Ticket (Operations / IT) */}
      <Dialog open={isEscalateModalOpen} onOpenChange={setIsEscalateModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#095c7b]">Assign {escalateType} Escalation</DialogTitle>
            <DialogDescription className="text-xs text-slate-400 mt-1">
              Escalate this case to support or depot staff with an automatically generated ticket.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Department Assignee</label>
              <select 
                value={escalateAssignee} 
                onChange={(e) => setEscalateAssignee(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-[#095c7b] outline-none rounded-xl p-2.5 transition-all text-slate-700 font-medium"
              >
                <option value="">-- Select Member --</option>
                {csUsers.map((u: any) => (
                  <option key={u.uid} value={u.uid}>
                    {u.displayName || u.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsEscalateModalOpen(false)} className="text-xs font-semibold rounded-lg">Cancel</Button>
            <Button onClick={handleEscalate} className="bg-[#095c7b] hover:bg-[#053647] text-white text-xs font-bold rounded-lg px-4 shadow-sm">
              Escalate & Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Assign Staff */}
      <Dialog open={isAssignStaffModalOpen} onOpenChange={setIsAssignStaffModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#095c7b]">Assign Staff Member</DialogTitle>
            <DialogDescription className="text-xs text-slate-400 mt-1">
              Select a team member to assign this ticket, with an optional department escalation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Staff Member</label>
              <select 
                value={assignStaffSelectedUser} 
                onChange={(e) => setAssignStaffSelectedUser(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-[#095c7b] outline-none rounded-xl p-2.5 transition-all text-slate-700 font-medium"
              >
                <option value="">-- Select Member --</option>
                {csUsers.filter((u: any) => {
                  if (u.disabled) return false;
                  const name = (u.displayName || u.email || "").toLowerCase();
                  const excludedNames = ["lee simpson", "claude busse", "luke forbes", "chris burgess"];
                  if (excludedNames.some(ex => name.includes(ex))) return false;

                  const rolesToCheck = ["customer service", "customer success", "admin", "operations"];
                  const hasRoleInAssigned = u.assignedRoles?.some(
                    (r: string) => rolesToCheck.includes(r.toLowerCase())
                  );
                  const isDefaultRole = rolesToCheck.includes(u.defaultRole?.toLowerCase() || "");
                  const isRole = rolesToCheck.includes(u.role?.toLowerCase() || "");
                  return hasRoleInAssigned || isDefaultRole || isRole;
                }).map((u: any) => (
                  <option key={u.uid} value={u.uid}>
                    {u.displayName || u.email}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Escalate Ticket? (Optional)</label>
              <select 
                value={assignStaffEscalationOption} 
                onChange={(e: any) => setAssignStaffEscalationOption(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-[#095c7b] outline-none rounded-xl p-2.5 transition-all text-slate-700 font-medium"
              >
                <option value="None">None (Assign Only)</option>
                <option value="Operations">Operations</option>
                <option value="IT">IT Support</option>
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsAssignStaffModalOpen(false)} className="text-xs font-semibold rounded-lg">Cancel</Button>
            <Button onClick={handleAssignStaff} className="bg-[#095c7b] hover:bg-[#053647] text-white text-xs font-bold rounded-lg px-4 shadow-sm">
              Assign Staff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Send Email to Customer */}
      <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
        <DialogContent className="max-w-4xl bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#095c7b] flex items-center gap-2">
              <Mail className="h-5 w-5" /> Send Customer Email
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 mt-1">
              Draft messages to send to customer contact emails. Sent history is logged under communication hub.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 overflow-y-auto max-h-[70vh]">
            {/* LEFT COLUMN: Composer Form */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Template</label>
                <select 
                  value={selectedTemplate} 
                  onChange={(e) => applyTemplate(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 focus:border-[#095c7b] outline-none rounded-xl p-2.5 transition-all text-slate-700 font-medium"
                >
                  <option value="custom">Custom Email</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">From Address</label>
                <select 
                  value={emailFrom} 
                  onChange={(e) => setEmailFrom(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 focus:border-[#095c7b] outline-none rounded-xl p-2.5 transition-all text-slate-700 font-medium"
                >
                  <option value="tracking@mailplus.com.au">tracking@mailplus.com.au (Default)</option>
                  {Object.entries(activeUsersGroupedByRole).map(([role, users]) => (
                    <optgroup key={role} label={role}>
                      {users.map((u: any) => (
                        <option key={u.uid} value={u.email}>
                          {u.displayName || u.email} ({u.email})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">CC Address (comma-separated)</label>
                <Input 
                  value={emailCc} 
                  onChange={(e) => setEmailCc(e.target.value)}
                  placeholder="manager@domain.com, assistant@domain.com"
                  className="text-xs bg-slate-50 border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">BCC Address (comma-separated)</label>
                <Input 
                  value={emailBcc} 
                  onChange={(e) => setEmailBcc(e.target.value)}
                  placeholder="bcc@domain.com"
                  className="text-xs bg-slate-50 border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Recipient Address</label>
                <Input 
                  value={emailRecipient} 
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  placeholder="customer@domain.com"
                  className="text-xs bg-slate-50 border-slate-200 rounded-xl"
                />
              </div>

              {(() => {
                const ticketContactEmail = ticket.customerEmail || packageDetails?.customerDetails?.email;
                const ticketContactName = ticket.customerContactName || "Ticket Primary Contact";
                
                const mergedContacts = [
                  ...(ticketContactEmail ? [{
                    id: 'ticket-primary',
                    name: ticketContactName,
                    email: ticketContactEmail,
                    isPrimary: true,
                    isTicketContact: true
                  }] : []),
                  ...companyContacts.filter(c => c.email && c.email !== ticketContactEmail)
                ];

                return (
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex border-b border-slate-100">
                      <button
                        type="button"
                        onClick={() => setQuickAddTab("contacts")}
                        className={`pb-1.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 mr-4 ${
                          quickAddTab === "contacts"
                            ? "border-[#095c7b] text-[#095c7b]"
                            : "border-transparent text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        Company Contacts
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickAddTab("users")}
                        className={`pb-1.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                          quickAddTab === "users"
                            ? "border-[#095c7b] text-[#095c7b]"
                            : "border-transparent text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        Active Users
                      </button>
                    </div>

                    {quickAddTab === "users" && (
                      <div className="my-1.5">
                        <Input
                          type="text"
                          placeholder="Search users by name or email..."
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          className="text-xs bg-white border-slate-200 rounded-lg p-1.5 h-8"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      {quickAddTab === "contacts" ? (
                        mergedContacts.length > 0 ? (
                          mergedContacts.map((contact) => (
                            <div key={contact.id} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white border border-slate-100 text-xs shadow-sm hover:border-[#095c7b]/30 transition-colors">
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-slate-700 truncate flex items-center gap-1">
                                  {contact.name}
                                  {contact.isPrimary && (
                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-1 py-0 rounded text-[9px] scale-90 uppercase tracking-wider font-bold">
                                      {contact.isTicketContact ? 'Primary Ticket' : 'Primary'}
                                    </span>
                                  )}
                                </div>
                                <div className="text-slate-400 text-[10px] truncate">{contact.email}</div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => addContactToField(contact.email, 'to')}
                                  className="text-[10px] font-bold bg-[#095c7b]/10 text-[#095c7b] hover:bg-[#095c7b] hover:text-white px-2 py-1 rounded transition-colors"
                                >
                                  + To
                                </button>
                                <button
                                  type="button"
                                  onClick={() => addContactToField(contact.email, 'cc')}
                                  className="text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 px-2 py-1 rounded transition-colors"
                                >
                                  + CC
                                </button>
                                <button
                                  type="button"
                                  onClick={() => addContactToField(contact.email, 'bcc')}
                                  className="text-[10px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 px-2 py-1 rounded transition-colors"
                                >
                                  + BCC
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-slate-400 text-xs italic text-center py-2">No company contacts linked.</div>
                        )
                      ) : (
                        Object.keys(activeUsersGroupedByRole).length > 0 ? (
                          Object.entries(activeUsersGroupedByRole).map(([role, users]) => (
                            <div key={role} className="space-y-1">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 pt-1.5">{role}</div>
                              {users.map((u: any) => (
                                <div key={u.uid} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white border border-slate-100 text-xs shadow-sm hover:border-[#095c7b]/30 transition-colors">
                                  <div className="min-w-0 flex-1">
                                    <div className="font-semibold text-slate-700 truncate">{u.displayName || u.email}</div>
                                    <div className="text-slate-400 text-[10px] truncate">{u.email}</div>
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => addContactToField(u.email, 'to')}
                                      className="text-[10px] font-bold bg-[#095c7b]/10 text-[#095c7b] hover:bg-[#095c7b] hover:text-white px-2 py-1 rounded transition-colors"
                                    >
                                      + To
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => addContactToField(u.email, 'cc')}
                                      className="text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 px-2 py-1 rounded transition-colors"
                                    >
                                      + CC
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => addContactToField(u.email, 'bcc')}
                                      className="text-[10px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 px-2 py-1 rounded transition-colors"
                                    >
                                      + BCC
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))
                        ) : (
                          <div className="text-slate-400 text-xs italic text-center py-2">No active users.</div>
                        )
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Subject Line</label>
                <Input 
                  value={emailSubject} 
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="MailPlus Delivery Investigation Update"
                  className="text-xs bg-slate-50 border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Dynamic Placeholders</span>
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {[
                    { label: 'Receiver Name', placeholder: '{{Receiver.Name}}' },
                    { label: 'Receiver Full Address', placeholder: '{{Receiver.FullAddress}}' },
                    { label: 'Ticket Number', placeholder: '{{Ticket.Number}}' },
                    { label: 'Tracking ID', placeholder: '{{Tracking.ID}}' },
                    { label: 'Contact Name', placeholder: '{{Contact.Name}}' },
                    { label: 'Company Name', placeholder: '{{Company.Name}}' },
                    { label: 'Prospect+ ID', placeholder: '{{Prospect.ProspectPlusID}}' },
                    { label: 'Sales Rep', placeholder: '{{SalesRep.Name}}' },
                    { label: 'Ticket ID', placeholder: '{{Ticket.Id}}' },
                    { label: 'Franchisee Contact Name', placeholder: '{{Franchisee.MainContact}}' },
                    { label: 'Franchisee Email', placeholder: '{{Franchisee.Email}}' },
                    { label: 'Franchisee Mobile', placeholder: '{{Franchisee.Mobile}}' },
                    { label: 'Scheduled Service Date', placeholder: '{{Schedule.ServiceDate}}' },
                  ].map((ph) => (
                    <button
                      key={ph.placeholder}
                      type="button"
                      onClick={() => insertPlaceholder(ph.placeholder)}
                      className="text-[10px] font-semibold bg-white text-[#095c7b] px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors shadow-sm"
                    >
                      + {ph.label}
                    </button>
                  ))}
                </div>
              </div>



              {/* Attachments Section */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Include Attachments</label>
                  <label className="text-[11px] font-bold text-[#095c7b] hover:text-[#053647] cursor-pointer flex items-center gap-1">
                    <Paperclip className="h-3.5 w-3.5" />
                    <span>Upload New</span>
                    <input 
                      type="file" 
                      onChange={async (e) => {
                        const newAtt = await handleAttachmentUpload(e);
                        if (newAtt) {
                          setSelectedAttachments(prev => [...prev, newAtt]);
                        }
                      }} 
                      className="hidden" 
                      disabled={isUploadingAttachment}
                    />
                  </label>
                </div>
                {ticket.attachments && ticket.attachments.length > 0 ? (
                  <div className="space-y-1.5 max-h-[120px] overflow-y-auto bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    {ticket.attachments.map((file: any, idx: number) => {
                      const isChecked = selectedAttachments.some(a => a.url === file.url);
                      return (
                        <label key={idx} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer hover:text-[#095c7b] transition-colors">
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAttachments(prev => [...prev, file]);
                              } else {
                                setSelectedAttachments(prev => prev.filter(a => a.url !== file.url));
                              }
                            }}
                            className="rounded border-slate-350 text-[#095c7b] focus:ring-[#095c7b] h-3.5 w-3.5"
                          />
                          <span className="truncate">{file.name}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No attachments uploaded yet. Click "Upload New" to attach files.</p>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Live Template/Body Editor */}
            <div className="flex flex-col h-full min-h-[300px]">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Email Editor (Edit directly below)</label>
              <div className="border border-slate-200 rounded-xl bg-white flex-1 flex flex-col relative overflow-hidden min-h-[350px]">
                <VisualIframeEditor 
                  body={emailBody || ""}
                  setBody={setEmailBody}
                  primaryColor={brandProfile?.designTokens?.primaryColor || "#095c7b"}
                  fontFamily={brandProfile?.designTokens?.fontFamily || "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"}
                  readOnly={false}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t pt-4">
            <Button variant="ghost" onClick={() => setIsEmailModalOpen(false)} className="text-xs font-semibold rounded-lg">Cancel</Button>
            <Button 
              onClick={handleSendEmail} 
              disabled={isSendingEmail}
              className="bg-[#095c7b] hover:bg-[#053647] text-white text-xs font-bold rounded-lg px-4 shadow-sm min-w-[100px]"
            >
              {isSendingEmail ? (
                <div className="flex items-center gap-1.5 justify-center">
                  <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending...</span>
                </div>
              ) : (
                "Send Email"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: View Sent Email Preview */}
      <Dialog open={isCommPreviewOpen} onOpenChange={setIsCommPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#095c7b]">Sent Email Preview</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Viewing historical communication record.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden my-4 border rounded-xl bg-slate-50 flex flex-col min-h-[400px]">
            {selectedCommToPreview ? (
              <VisualIframeEditor 
                body={parseCommContent(selectedCommToPreview.content).body}
                setBody={() => {}}
                primaryColor="#095c7b"
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                readOnly={true}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center p-4">
                <span className="text-xs text-muted-foreground">No content to preview</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCommPreviewOpen(false)}
              className="text-xs border-slate-200 text-slate-700 hover:bg-slate-50 h-9 px-4 rounded-lg font-semibold"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Missed Sweep Confirmation */}
      <Dialog open={isMissedSweepModalOpen} onOpenChange={setIsMissedSweepModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#095c7b]">Missed Sweep Alert</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-[#f0f9ff] border border-[#bee3f8] text-[#2b6cb0] rounded-xl p-4 text-xs font-medium leading-relaxed">
              This action dispatches an instant missed-sweep alert notification to the <strong>Operations Desk</strong> and to <strong>Fiona</strong>. It also updates the status to 'Awaiting Operations'.
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsMissedSweepModalOpen(false)} 
              className="text-xs border-slate-200 text-slate-700 hover:bg-slate-50 h-9 px-4 rounded-lg font-semibold"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSendMissedSweep} 
              disabled={isSendingMissedSweep}
              className="bg-[#eaf143] hover:bg-[#d8e03e] text-[#095c7b] text-xs h-9 px-5 rounded-lg font-bold transition-all border border-[#d8e03e]"
            >
              {isSendingMissedSweep ? "Sending Alert..." : "Send to Ops & Fiona"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Status Change Confirmation */}
      <Dialog open={isStatusConfirmOpen} onOpenChange={setIsStatusConfirmOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#095c7b]">Confirm Ticket Status Change</DialogTitle>
            <DialogDescription className="text-xs text-slate-400 mt-1">
              You are updating the status of this ticket to <span className="font-semibold text-slate-700">{pendingStatus}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Notes / Reason (Optional)</label>
              <Textarea 
                value={statusConfirmNotes} 
                onChange={(e) => setStatusConfirmNotes(e.target.value)}
                placeholder="Enter any notes or context for this status change..."
                className="text-xs bg-slate-50 border-slate-200 focus:border-[#095c7b] outline-none rounded-xl min-h-[100px] leading-relaxed"
              />
            </div>
            {(pendingStatus === "Closed" || pendingStatus === "Lost in Transit" || pendingStatus === "Damaged") && (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Freight Safe Eligible</label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="freightSafe" 
                      checked={isFreightSafeEligible === true} 
                      onChange={() => setIsFreightSafeEligible(true)}
                      className="text-[#095c7b] focus:ring-[#095c7b]"
                    />
                    Yes
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input 
                      type="radio" 
                      name="freightSafe" 
                      checked={isFreightSafeEligible === false} 
                      onChange={() => setIsFreightSafeEligible(false)}
                      className="text-[#095c7b] focus:ring-[#095c7b]"
                    />
                    No
                  </label>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsStatusConfirmOpen(false)} 
              className="text-xs border-slate-200 text-slate-700 hover:bg-slate-50 h-9 px-4 rounded-lg font-semibold"
            >
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                await updateTicketStatus(pendingStatus, statusConfirmNotes);
                setIsStatusConfirmOpen(false);
              }} 
              disabled={isSubmittingStatus}
              className="bg-[#095c7b] hover:bg-[#053647] text-white text-xs h-9 px-5 rounded-lg font-bold shadow-sm"
            >
              {isSubmittingStatus ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Correct Receiver Details */}
      <Dialog open={isReceiverModalOpen} onOpenChange={setIsReceiverModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#095c7b]">Correct / Flag Receiver Details</DialogTitle>
            <DialogDescription className="text-xs text-slate-400 mt-1">
              Correct receiver details if package barcodes or scans contain incorrect information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-100 bg-slate-50/50 cursor-pointer">
              <input 
                type="checkbox"
                checked={editHasNewReceiverDetails}
                onChange={(e) => setEditHasNewReceiverDetails(e.target.checked)}
                className="mt-0.5 rounded text-[#095c7b] focus:ring-[#095c7b]"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-700 block">Flag package details as incorrect</span>
                <span className="text-[10px] text-slate-450">Stores these corrected receiver details separately for reporting.</span>
              </div>
            </label>

            {editHasNewReceiverDetails && (
              <div className="space-y-3 bg-amber-50/20 p-4 rounded-xl border border-amber-100/50">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Corrected Receiver Name</label>
                  <Input 
                    value={editNewReceiverName} 
                    onChange={(e) => setEditNewReceiverName(e.target.value)}
                    placeholder="Receiver name"
                    className="text-xs bg-white border-slate-200 focus:border-[#095c7b] h-8 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Corrected Delivery Address</label>
                  <Input 
                    value={editNewReceiverAddress} 
                    onChange={(e) => setEditNewReceiverAddress(e.target.value)}
                    placeholder="Delivery address"
                    className="text-xs bg-white border-slate-200 focus:border-[#095c7b] h-8 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Corrected Email</label>
                  <Input 
                    value={editNewReceiverEmail} 
                    onChange={(e) => setEditNewReceiverEmail(e.target.value)}
                    placeholder="Email address"
                    className="text-xs bg-white border-slate-200 focus:border-[#095c7b] h-8 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Corrected Phone</label>
                  <Input 
                    value={editNewReceiverPhone} 
                    onChange={(e) => setEditNewReceiverPhone(e.target.value)}
                    placeholder="Phone number"
                    className="text-xs bg-white border-slate-200 focus:border-[#095c7b] h-8 rounded-lg"
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsReceiverModalOpen(false)} 
              className="text-xs border-slate-200 text-slate-700 hover:bg-slate-50 h-9 px-4 rounded-lg font-semibold"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveReceiverDetails} 
              disabled={isSavingReceiverDetails}
              className="bg-[#095c7b] hover:bg-[#053647] text-white text-xs h-9 px-5 rounded-lg font-bold shadow-sm"
            >
              {isSavingReceiverDetails ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
 
      {/* Enquiry Types Editing Modal */}
      <Dialog open={isEditingEnquiryTypes} onOpenChange={setIsEditingEnquiryTypes}>
        <DialogContent className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#095c7b]">Edit Enquiry Types</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select one or more enquiry types that apply to this ticket.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto my-4 p-2 bg-slate-50 border border-slate-100 rounded-xl">
            {ENQUIRY_TYPE_OPTIONS.map((opt) => {
              const selectedTypes = Array.isArray(ticket?.enquiryType) ? ticket.enquiryType : [ticket?.enquiryType || 'Dispute of Delivery'];
              const isChecked = selectedTypes.includes(opt);
              return (
                <label key={opt} className="flex items-center space-x-2 text-xs text-slate-700 font-semibold cursor-pointer hover:bg-slate-200/50 p-2 rounded-lg transition-colors">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      const newTypes = isChecked
                        ? selectedTypes.filter((v: string) => v !== opt)
                        : [...selectedTypes, opt];
                      handleUpdateEnquiryTypes(newTypes.length > 0 ? newTypes : ['Dispute of Delivery']);
                    }}
                    className="rounded border-slate-300 text-[#095c7b] focus:ring-[#eaf143] h-4 w-4"
                  />
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsEditingEnquiryTypes(false)} className="bg-[#095c7b] text-white hover:bg-[#074b63] text-xs font-semibold px-4 py-2 rounded-xl">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
 
    </div>
  );
}
