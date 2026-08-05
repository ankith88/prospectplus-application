'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { jsPDF } from 'jspdf';
import { FileText, Download, Upload, CheckCircle2, Eraser, PenTool, ExternalLink } from 'lucide-react';
import { PresaleDeedOfVariation, PresaleMainDetails } from '@/lib/presale-types';

interface DeedOfVariationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mainDetails: PresaleMainDetails;
  deedOfVariation: PresaleDeedOfVariation;
  onSaveDeed: (deed: PresaleDeedOfVariation) => void;
}

export function DeedOfVariationDialog({
  open,
  onOpenChange,
  mainDetails,
  deedOfVariation,
  onSaveDeed,
}: DeedOfVariationDialogProps) {
  const [activeTab, setActiveTab] = useState<'online' | 'upload'>('online');
  const [signerName, setSignerName] = useState(deedOfVariation.signerName || mainDetails.mainContact || '');
  const [signerEmail, setSignerEmail] = useState(deedOfVariation.signerEmail || mainDetails.email || '');
  const [signatureDataUrl, setSignatureDataUrl] = useState(deedOfVariation.signatureDataUrl || '');
  const [isDrawing, setIsDrawing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (deedOfVariation.signerName) setSignerName(deedOfVariation.signerName);
    if (deedOfVariation.signerEmail) setSignerEmail(deedOfVariation.signerEmail);
    if (deedOfVariation.signatureDataUrl) setSignatureDataUrl(deedOfVariation.signatureDataUrl);
  }, [deedOfVariation]);

  // Canvas drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
      setSignatureDataUrl(canvasRef.current.toDataURL());
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#095c7b';

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearCanvas = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setSignatureDataUrl('');
  };

  const handleSignOnline = () => {
    if (!signerName.trim()) {
      alert('Please enter the signer full legal name.');
      return;
    }
    const canvasUrl = canvasRef.current ? canvasRef.current.toDataURL() : signatureDataUrl;

    const updated: PresaleDeedOfVariation = {
      status: 'signed_online',
      signedAt: new Date().toISOString(),
      signerName,
      signerEmail,
      signatureDataUrl: canvasUrl,
      pdfFileName: `Deed_of_Variation_${mainDetails.tradingEntity.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
    };

    onSaveDeed(updated);
    onOpenChange(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a valid PDF document.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const updated: PresaleDeedOfVariation = {
        status: 'pdf_uploaded',
        signedAt: new Date().toISOString(),
        pdfFileName: file.name,
        pdfDataUrl: dataUrl,
      };

      onSaveDeed(updated);
      onOpenChange(false);
    };
    reader.readAsDataURL(file);
  };

  const generateAndDownloadPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryColor = [9, 92, 123]; // #095c7b
    const darkText = [30, 41, 59];

    // Header Banner
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('MAILPLUS AUSTRALIA', 15, 16);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('DEED OF VARIATION - EXIT PROGRAM', 140, 16);

    // Title
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DEED OF VARIATION', 15, 38);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`This Deed of Variation is made on ${new Date().toLocaleDateString('en-AU')} between:`, 15, 46);

    // Box 1: Party 1 (Franchisor)
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, 52, 180, 24, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.text('FRANCHISOR:', 20, 60);
    doc.setFont('helvetica', 'normal');
    doc.text('MailPlus Australia Pty Ltd (ABN 53 119 501 547)', 20, 67);

    // Box 2: Party 2 (Franchisee)
    doc.roundedRect(15, 80, 180, 48, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.text('FRANCHISEE DETAILS (MAIN DETAILS):', 20, 88);
    doc.setFont('helvetica', 'normal');
    doc.text(`Trading Entity: ${mainDetails.tradingEntity || 'N/A'}`, 20, 96);
    doc.text(`Main Contact: ${mainDetails.mainContact || 'N/A'}`, 20, 102);
    doc.text(`Mobile: ${mainDetails.mobileNumber || 'N/A'}    |    Email: ${mainDetails.email || 'N/A'}`, 20, 108);
    doc.text(`ABN: ${mainDetails.abn || 'N/A'}`, 20, 114);
    doc.text(`Date Listed for Sale: ${mainDetails.dateListedForSale || 'N/A'}`, 20, 120);

    // Recitals / Terms
    doc.setFont('helvetica', 'bold');
    doc.text('RECITALS & AGREEMENT:', 15, 138);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const recitalsText = [
      '1. The Franchisor and Franchisee entered into a Franchise Agreement for the territory specified herein.',
      '2. The Franchisee has requested to list the territory for sale under the MailPlus Exit Program.',
      '3. By executing this Deed of Variation, the parties agree that upon listing, the franchisee shall strictly comply with MailPlus presales protocols, confidentiality requirements, and transition terms.',
      '4. This Deed amends the original Franchise Agreement solely to incorporate the Exit Program variation provisions. All other terms of the Franchise Agreement remain in full force and effect.',
    ];
    let y = 146;
    recitalsText.forEach((line) => {
      doc.text(line, 15, y);
      y += 8;
    });

    // Signature Execution Boxes (Dual Signatures matching Deed spec)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('EXECUTED AS A DEED:', 15, 178);

    // Box 1: Mail Plus Pty Ltd / Chris Burgess Execution
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, 184, 88, 55, 2, 2, 'FD');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Executed by Mail Plus Pty Ltd ACN 609 801 195', 18, 192);
    doc.setFont('helvetica', 'normal');
    doc.text('in accordance with s 127(1) Corporations Act 2001 (Cth):', 18, 197);
    doc.text('...............................................................................', 18, 214);
    doc.setFontSize(8);
    doc.text('Signature of sole director & sole company secretary', 18, 219);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('Chris Burgess', 18, 228);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Name (please print)', 18, 233);

    // Box 2: Franchisee / Sole Trader Execution
    doc.roundedRect(107, 184, 88, 55, 2, 2, 'FD');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`Executed by ${mainDetails.tradingEntity || signerName || 'Franchisee'}`, 110, 192);
    doc.setFont('helvetica', 'normal');
    doc.text('in accordance with s 127(1) Corporations Act 2001 (Cth):', 110, 197);

    if (signatureDataUrl) {
      try {
        doc.addImage(signatureDataUrl, 'PNG', 112, 201, 45, 15);
      } catch (err) {
        console.error('Failed to embed signature image in PDF', err);
      }
    } else {
      doc.text('...............................................................................', 110, 214);
    }
    doc.setFontSize(8);
    doc.text('Signature of sole trader / franchisee', 110, 219);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(signerName || mainDetails.mainContact || 'Franchisee Signatory', 110, 228);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Name (please print)', 110, 233);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`MailPlus Outbound Presales CRM | Executed on ${deedOfVariation.signedAt ? new Date(deedOfVariation.signedAt).toLocaleDateString('en-AU') : new Date().toLocaleDateString('en-AU')}`, 15, 285);

    doc.save(`Deed_of_Variation_${(mainDetails.tradingEntity || 'Franchisee').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-[#095c7b]">
            <FileText className="h-6 w-6 text-[#095c7b]" />
            Deed of Variation - Exit Program
          </DialogTitle>
          <DialogDescription>
            Complete online digital signing or upload the executed PDF version for{' '}
            <strong className="text-slate-800">{mainDetails.tradingEntity || 'Franchisee'}</strong>.
          </DialogDescription>
        </DialogHeader>

        {deedOfVariation.status !== 'not_started' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 font-medium text-sm">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              {deedOfVariation.status === 'signed_online'
                ? `Signed Online on ${new Date(deedOfVariation.signedAt!).toLocaleDateString('en-AU')} by ${deedOfVariation.signerName}`
                : `Signed PDF Uploaded: ${deedOfVariation.pdfFileName || 'Executed_Deed.pdf'}`}
            </div>
            <Button variant="outline" size="sm" onClick={generateAndDownloadPDF} className="gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-100">
              <Download className="h-4 w-4" /> Download PDF
            </Button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full mt-2">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="online" className="gap-2">
              <PenTool className="h-4 w-4" /> Sign Online
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" /> Upload Signed PDF
            </TabsTrigger>
          </TabsList>

          <TabsContent value="online" className="mt-4 space-y-4">
            <Card className="border border-slate-200 bg-slate-50/50">
              <CardContent className="p-4 space-y-3 text-xs text-slate-700 leading-relaxed max-h-48 overflow-y-auto font-mono bg-white rounded border">
                <h4 className="font-bold text-slate-900 text-sm">DEED OF VARIATION - EXIT PROGRAM TERMS</h4>
                <p>
                  <strong>PARTIES:</strong> MailPlus Australia Pty Ltd ("Franchisor") and{' '}
                  <strong>{mainDetails.tradingEntity || '[Trading Entity]'}</strong> ("Franchisee").
                </p>
                <p>
                  <strong>BACKGROUND:</strong> The Franchisee has listed their territory for sale under the MailPlus Exit Program. This Deed varies the standard Franchise Agreement to incorporate the Exit Program requirements, presale confidentiality clauses, and transition procedures.
                </p>
                <p>
                  <strong>1. LISTING & PRESALES PROTOCOL:</strong> The Franchisee agrees to provide accurate financial disclosures, daily run time metrics, and presales details to MailPlus operations.
                </p>
                <p>
                  <strong>2. GOVERNING LAW:</strong> This Deed is governed by the laws of New South Wales, Australia.
                </p>
              </CardContent>
            </Card>

            {/* Execution Blocks Preview matching Screenshot */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="space-y-2 bg-white p-3.5 rounded-lg border border-slate-200 text-xs">
                <p className="font-bold text-slate-900 leading-tight">
                  Executed by Mail Plus Pty Ltd ACN 609 801 195 in accordance with section 127(1) of the Corporations Act 2001 (Cth):
                </p>
                <div className="border-b border-dashed border-slate-400 pt-6 pb-1 text-slate-500 italic text-[11px]">
                  Signature of sole director and sole company secretary
                </div>
                <div className="font-bold text-slate-900 pt-1">Chris Burgess</div>
                <div className="text-[10px] text-slate-400">Name (please print)</div>
              </div>

              <div className="space-y-2 bg-white p-3.5 rounded-lg border border-slate-200 text-xs">
                <p className="font-bold text-slate-900 leading-tight">
                  Executed by {mainDetails.tradingEntity || signerName || 'Franchisee'} in accordance with section 127(1) of the Corporations Act 2001 (Cth):
                </p>
                <div className="border-b border-dashed border-slate-400 pt-6 pb-1 text-slate-500 italic text-[11px]">
                  Signature of sole trader / franchisee
                </div>
                <div className="font-bold text-slate-900 pt-1">{signerName || mainDetails.mainContact || 'Franchisee Name'}</div>
                <div className="text-[10px] text-slate-400">Name (please print)</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="signerName" className="text-xs font-semibold text-slate-700">
                  Franchisee Signer Full Legal Name *
                </Label>
                <Input
                  id="signerName"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="e.g. Quan Trinh"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signerEmail" className="text-xs font-semibold text-slate-700">
                  Franchisee Signer Email *
                </Label>
                <Input
                  id="signerEmail"
                  type="email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  placeholder="e.g. quan.trinh@mailplus.com.au"
                />
              </div>
            </div>

            {/* Signature Canvas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700">
                  Franchisee Digital Signature (Draw below)
                </Label>
                <Button type="button" variant="ghost" size="sm" onClick={clearCanvas} className="h-7 text-xs gap-1 text-slate-600">
                  <Eraser className="h-3.5 w-3.5" /> Clear Signature
                </Button>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-lg bg-white overflow-hidden p-1 text-center">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={130}
                  className="w-full touch-none cursor-crosshair bg-white"
                  onMouseDown={startDrawing}
                  onMouseUp={stopDrawing}
                  onMouseOut={stopDrawing}
                  onMouseMove={draw}
                  onTouchStart={startDrawing}
                  onTouchEnd={stopDrawing}
                  onTouchMove={draw}
                />
                <span className="text-[10px] text-slate-400 block pb-1">
                  Draw your signature using mouse or touchscreen inside the box above
                </span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="mt-4 space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <Upload className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              <h4 className="font-semibold text-slate-800 text-sm">Upload Executed Deed of Variation (PDF)</h4>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                If the franchisee or lawyer signed a hardcopy PDF, upload the scanned document here.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 border-[#095c7b] text-[#095c7b] hover:bg-[#095c7b]/10"
              >
                <Upload className="h-4 w-4" /> Select PDF File
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex items-center justify-between gap-2 border-t pt-4">
          <Button variant="outline" onClick={generateAndDownloadPDF} className="gap-1.5 text-slate-700">
            <Download className="h-4 w-4" /> Download PDF Template
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {activeTab === 'online' && (
              <Button onClick={handleSignOnline} className="bg-[#095c7b] hover:bg-[#07465e] text-white gap-2">
                <CheckCircle2 className="h-4 w-4" /> Complete & Sign Online
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
