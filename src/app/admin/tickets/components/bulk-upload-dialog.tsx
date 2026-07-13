"use client";

import { useState } from "react";
import Papa from "papaparse";
import { 
  Upload, FileSpreadsheet, HelpCircle, Download, CheckCircle2, AlertTriangle, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { firestore } from "@/lib/firebase";
import { collection, writeBatch, doc } from "firebase/firestore";
import { toast } from "sonner";
import { TicketFormSchema } from "@/lib/ticket-schema";

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  csUsers: any[];
}

const mandatoryColumns = [
  { key: "barcode", label: "Barcode", desc: "Consignment number (e.g. 2QQ4827193AU or MPX010156975)", req: true },
  { key: "enquiryType", label: "Enquiry Type", desc: "e.g. Dispute of Delivery, Delayed Item, ETA Requested, POD Request", req: true },
  { key: "priority", label: "Priority", desc: "Standard, High, or Urgent", req: true },
  { key: "enquirerName", label: "Enquirer Name", desc: "Full name of the person raising the ticket", req: true },
  { key: "customerCompany", label: "Customer Company", desc: "Company name of the customer", req: true },
  { key: "customerAccountNumber", label: "Account Number", desc: "Customer's account number", req: true },
  { key: "customerEmail", label: "Customer Email", desc: "Contact email of the customer", req: true },
  { key: "customerPhone", label: "Customer Phone", desc: "Contact phone of the customer", req: true },
  { key: "customerContactName", label: "Customer Contact Name", desc: "Contact name at customer company", req: true },
  { key: "receiverName", label: "Receiver Name", desc: "Name of the package recipient", req: true },
  { key: "receiverAddress", label: "Receiver Address", desc: "Delivery address of the recipient", req: true },
  { key: "description", label: "Description", desc: "Details of the issue (min 10 characters)", req: true }
];

export function BulkUploadDialog({ open, onOpenChange, onImportComplete, csUsers }: BulkUploadDialogProps) {
  const [step, setStep] = useState<number>(1);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [importStats, setImportStats] = useState({ success: 0, failed: 0, total: 0 });

  // Download Sample CSV
  const handleDownloadSample = () => {
    const headers = [
      "barcode",
      "enquiryType",
      "priority",
      "raisedBy",
      "assignedUser",
      "enquirerName",
      "enquirerEmail",
      "enquirerPhone",
      "source",
      "customerContactName",
      "customerCompany",
      "customerAccountNumber",
      "customerEmail",
      "customerPhone",
      "receiverName",
      "receiverAddress",
      "description"
    ].join(",");

    const sampleRow = [
      "2QQ4827193AU",
      "Dispute of Delivery",
      "Urgent",
      "Receiver",
      csUsers[0]?.displayName || csUsers[0]?.email || "unassigned",
      "A. Singh",
      "singh@northside.com",
      "0412345678",
      "Email",
      "A. Singh",
      "Northside Trading",
      "AC-98765",
      "singh@northside.com",
      "0412345678",
      "J. Nguyen",
      "123 Main St, Surry Hills NSW 2010",
      "Customer advises consignment marked In Transit for four days with no movement."
    ].map(val => (val.includes(",") || val.includes("\n") ? `"${val}"` : val)).join(",");

    const csvContent = `${headers}\n${sampleRow}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "bulk_tickets_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // PapaParse CSV Upload Handling
  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setCsvFile(file);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          toast.error("The uploaded CSV file has no records.");
          return;
        }

        // Validate headers roughly
        const headers = results.meta.fields || [];
        const requiredHeaders = ["barcode", "enquiryType", "priority", "description", "customerCompany", "customerEmail"];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
          toast.error(`Missing required columns: ${missingHeaders.join(", ")}`);
          return;
        }

        // Process and validate each row
        const validated = results.data.map((row: any, index) => {
          const barcode = row.barcode?.trim() || "";
          const enquiryType = row.enquiryType?.trim() || "Dispute of Delivery";
          const priority = row.priority?.trim() || "Standard";
          const raisedBy = row.raisedBy?.trim() || "Receiver";
          const assignedUser = row.assignedUser?.trim() || "unassigned";
          const enquirerName = row.enquirerName?.trim() || row.customerContactName?.trim() || "Unknown Enquirer";
          const enquirerEmail = row.enquirerEmail?.trim() || row.customerEmail?.trim() || "";
          const enquirerPhone = row.enquirerPhone?.trim() || row.customerPhone?.trim() || "";
          const source = row.source?.trim() || "Email";
          const customerContactName = row.customerContactName?.trim() || enquirerName;
          const customerCompany = row.customerCompany?.trim() || "";
          const customerAccountNumber = row.customerAccountNumber?.trim() || "N/A";
          const customerEmail = row.customerEmail?.trim() || "";
          const customerPhone = row.customerPhone?.trim() || "";
          const receiverName = row.receiverName?.trim() || "Receiver";
          const receiverAddress = row.receiverAddress?.trim() || "No address provided";
          const description = row.description?.trim() || "";

          // Prepare payload for Zod validation
          const payload = {
            trackingIdentifier: barcode,
            issueCategory: [enquiryType],
            enquirySource: source,
            enquirerName,
            notes: description,
            customerName: customerCompany,
            receiverDetails: {
              name: receiverName,
              address: receiverAddress
            },
            senderDetails: {
              name: customerCompany,
              address: ""
            },
            attachments: [],
            enquiryType,
            raisedBy,
            priority,
            assignedUser: csUsers.find(u => u.email === assignedUser || u.displayName === assignedUser)?.displayName || "unassigned",
            description,
            customerContactName,
            customerCompany,
            customerAccountNumber,
            customerEmail,
            customerPhone,
            source,
            enquirerEmail,
            enquirerPhone
          };

          // Safe Zod parse
          const parseResult = TicketFormSchema.safeParse(payload);
          return {
            rowNumber: index + 2,
            barcode,
            customerCompany,
            enquiryType,
            priority,
            isValid: parseResult.success,
            errors: parseResult.success ? [] : parseResult.error.errors.map(err => `${err.path.join(".")}: ${err.message}`),
            payload: parseResult.success ? parseResult.data : payload
          };
        });

        setParsedRows(validated);
        setStep(2);
        toast.success(`Parsed ${results.data.length} records. Proceed to validation review.`);
      },
      error: (err) => {
        console.error("PapaParse error:", err);
        toast.error("Failed to read the CSV file.");
      }
    });
  };

  // Execute Batch Firestore Import
  const executeImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      toast.error("No valid records to import. Please check your CSV data.");
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setImportStats({ success: 0, failed: parsedRows.length - validRows.length, total: parsedRows.length });

    const total = validRows.length;
    const chunkSize = 400;
    let imported = 0;

    try {
      // 1. Create a Master Case ticket reference
      const masterDocRef = doc(collection(firestore, "tickets"));
      const masterCaseId = masterDocRef.id;
      
      // Use the first row's payload as a baseline for the master case
      const firstRowPayload = validRows[0].payload;
      
      const masterCasePayload = {
        ...firstRowPayload,
        isMasterCase: true,
        parentTicketId: "",
        trackingIdentifier: "Multi-Consignment",
        description: `Multi-consignment master case containing ${total} consignments. Uploaded via bulk CSV.`,
        notes: `Master case created for bulk upload of ${total} barcodes.`,
        createdAt: new Date(),
        status: "Open",
        source: "Bulk Upload"
      };

      // 2. We'll write the master case in the very first batch
      let isMasterWritten = false;

      for (let i = 0; i < total; i += chunkSize) {
        const chunk = validRows.slice(i, i + chunkSize);
        const batch = writeBatch(firestore);

        if (!isMasterWritten) {
          batch.set(masterDocRef, masterCasePayload);
          isMasterWritten = true;
        }

        chunk.forEach(row => {
          const docRef = doc(collection(firestore, "tickets"));
          batch.set(docRef, {
            ...row.payload,
            isMasterCase: false,
            parentTicketId: masterCaseId,
            createdAt: new Date(),
            status: "Open",
            source: "Bulk Upload"
          });
        });

        await batch.commit();
        imported += chunk.length;
        setImportProgress(Math.round((imported / total) * 100));
        setImportStats(prev => ({ ...prev, success: imported }));
      }

      toast.success(`Successfully imported ${imported} tickets under Master Case #${masterCaseId.slice(0, 8).toUpperCase()}!`);
      setStep(3);
    } catch (err) {
      console.error("Firestore batch commit failed:", err);
      toast.error("An error occurred during database import.");
    } finally {
      setIsImporting(false);
    }
  };

  const resetState = () => {
    setStep(1);
    setCsvFile(null);
    setParsedRows([]);
    setIsImporting(false);
    setImportProgress(0);
    setImportStats({ success: 0, failed: 0, total: 0 });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) resetState(); }}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-[#EAF1E7] border border-[#C3D2C2] rounded-2xl shadow-xl text-[#0E3D3B]">
        <DialogHeader className="border-b border-[#C3D2C2] pb-4 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-[#0E3D3B]">
              <FileSpreadsheet className="h-6 w-6 text-[#1A5A55]" /> Bulk Upload Tickets
            </DialogTitle>
            <DialogDescription className="text-[#5E706A]">
              Upload multiple tickets at once via CSV. Follow instructions below for columns & format.
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* STEP 1: Instructions & File Input */}
        {step === 1 && (
          <div className="space-y-6 py-4">
            {/* Alert / Tips */}
            <div className="bg-white/80 backdrop-blur-sm border border-[#C3D2C2] p-4 rounded-xl space-y-2">
              <h4 className="font-bold text-[#0E3D3B] flex items-center gap-1.5 text-sm">
                <HelpCircle className="h-4 w-4 text-[#1A5A55]" /> Bulk Upload Checklist
              </h4>
              <ul className="list-disc pl-5 text-xs text-[#5E706A] space-y-1">
                <li>Make sure all mandatory fields are present and properly filled.</li>
                <li><strong>Barcode</strong> must be valid (typically starting with 2QQ or MPX).</li>
                <li><strong>Description</strong> must be at least 10 characters long.</li>
                <li>Make sure priority is one of: <code>Standard</code>, <code>High</code>, or <code>Urgent</code>.</li>
              </ul>
            </div>

            {/* Mandatory Columns Table */}
            <div className="bg-white rounded-xl border border-[#C3D2C2] overflow-hidden">
              <div className="px-4 py-3 bg-[#EAF1E7]/50 border-b border-[#C3D2C2] font-semibold text-xs uppercase tracking-wider text-[#5E706A]">
                Required CSV Headers
              </div>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-[#EAF1E7] border-b border-[#C3D2C2] text-[#0E3D3B] font-bold">
                      <th className="px-4 py-2">Column Header</th>
                      <th className="px-4 py-2">Type / Constraint</th>
                      <th className="px-4 py-2">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mandatoryColumns.map((col) => (
                      <tr key={col.key} className="border-b border-[#EAF1E7] hover:bg-slate-50/50">
                        <td className="px-4 py-2 font-mono font-bold text-[#1A5A55]">{col.key}</td>
                        <td className="px-4 py-2 text-red-600 font-semibold">Mandatory</td>
                        <td className="px-4 py-2 text-[#5E706A]">{col.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions: Download & Upload */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Button 
                variant="outline" 
                className="w-full sm:w-auto border-[#C3D2C2] bg-white text-[#0E3D3B] hover:bg-[#EAF1E7] font-semibold flex items-center justify-center gap-2"
                onClick={handleDownloadSample}
              >
                <Download className="h-4 w-4" /> Download Sample CSV
              </Button>

              <div className="relative w-full flex-1">
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleCsvUpload}
                  className="hidden" 
                  id="csv-file-input" 
                />
                <label 
                  htmlFor="csv-file-input"
                  className="w-full border-2 border-dashed border-[#1A5A55] hover:border-[#0E3D3B] rounded-xl p-6 flex flex-col items-center justify-center bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <Upload className="h-8 w-8 text-[#1A5A55] mb-2" />
                  <span className="font-semibold text-sm text-[#0E3D3B]">Select CSV file to Upload</span>
                  <span className="text-xs text-[#5E706A] mt-1">Supports standard CSV files</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Preview & Validation */}
        {step === 2 && (
          <div className="space-y-6 py-4">
            <div className="bg-white/80 backdrop-blur-sm border border-[#C3D2C2] p-4 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">Validation Preview</h4>
                <p className="text-xs text-[#5E706A]">
                  Review the records below. Valid records will be imported. Please fix invalid records in your CSV.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs bg-[#E4F3E5] text-[#2F7A3C] px-3 py-1 rounded-full font-bold">
                  {parsedRows.filter(r => r.isValid).length} Valid
                </span>
                {parsedRows.some(r => !r.isValid) && (
                  <span className="text-xs bg-[#FCEAEA] text-[#B23B3B] px-3 py-1 rounded-full font-bold">
                    {parsedRows.filter(r => !r.isValid).length} Invalid
                  </span>
                )}
              </div>
            </div>

            {/* Preview Table */}
            <div className="bg-white rounded-xl border border-[#C3D2C2] overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#EAF1E7] border-b border-[#C3D2C2] font-bold">
                  <tr>
                    <th className="px-4 py-2">Row</th>
                    <th className="px-4 py-2">Barcode</th>
                    <th className="px-4 py-2">Company</th>
                    <th className="px-4 py-2">Enquiry</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Errors / Details</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, index) => (
                    <tr key={index} className="border-b border-[#EAF1E7] hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-mono">{row.rowNumber}</td>
                      <td className="px-4 py-2 font-mono font-semibold">{row.barcode}</td>
                      <td className="px-4 py-2 font-semibold">{row.customerCompany}</td>
                      <td className="px-4 py-2">{row.enquiryType}</td>
                      <td className="px-4 py-2">
                        {row.isValid ? (
                          <span className="text-green-600 font-bold flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                          </span>
                        ) : (
                          <span className="text-red-600 font-bold flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" /> Error
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-red-500 max-w-[280px] truncate" title={row.errors.join(", ")}>
                        {row.isValid ? "—" : row.errors.join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Dialog Footer Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[#C3D2C2]">
              <Button 
                variant="ghost" 
                className="border-[#C3D2C2] hover:bg-[#EAF1E7]"
                onClick={resetState}
                disabled={isImporting}
              >
                Clear / Upload New
              </Button>
              <Button 
                className="bg-[#0E3D3B] text-white hover:bg-[#1A5A55]"
                onClick={executeImport}
                disabled={isImporting || parsedRows.filter(r => r.isValid).length === 0}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Importing ({importProgress}%)
                  </>
                ) : (
                  `Import ${parsedRows.filter(r => r.isValid).length} Valid Tickets`
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Complete */}
        {step === 3 && (
          <div className="space-y-6 py-8 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-[#E4F3E5] rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 className="h-10 w-10 text-[#2F7A3C]" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">Import Completed!</h3>
              <p className="text-sm text-[#5E706A] mt-1 max-w-md">
                Successfully processed and imported valid tickets to the CRM database.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-6 bg-white p-4 rounded-xl border border-[#C3D2C2] w-full max-w-md mt-4">
              <div>
                <div className="text-2xl font-extrabold text-[#2F7A3C]">{importStats.success}</div>
                <div className="text-[10px] uppercase font-bold text-[#5E706A]">Imported</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-red-600">{importStats.failed}</div>
                <div className="text-[10px] uppercase font-bold text-[#5E706A]">Failed / Skipped</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-[#0E3D3B]">{importStats.total}</div>
                <div className="text-[10px] uppercase font-bold text-[#5E706A]">Total Rows</div>
              </div>
            </div>

            <div className="pt-6">
              <Button 
                className="bg-[#0E3D3B] hover:bg-[#1A5A55] text-white font-semibold px-8"
                onClick={() => {
                  onImportComplete();
                  onOpenChange(false);
                  resetState();
                }}
              >
                Close & Return
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
