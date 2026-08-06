'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/ui/loader';
import { jsPDF } from 'jspdf';
import { FileText, CheckCircle2, Download, Eraser, Send, ShieldCheck, PenTool } from 'lucide-react';
import { PresaleRecord, DeedOption } from '@/lib/presale-types';

export default function PublicDeedOfVariationPage() {
  const params = useParams();
  const presaleId = params?.presaleId as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [presale, setPresale] = useState<PresaleRecord | null>(null);

  // Form states
  const [selectedOption, setSelectedOption] = useState<DeedOption>('option_2');
  const [party1Name, setParty1Name] = useState('');
  const [party1Address, setParty1Address] = useState('');
  const [party2Name, setParty2Name] = useState('');
  const [party2Address, setParty2Address] = useState('');
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!presaleId) return;

    async function loadData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/franchisees/presales?franchiseeId=${presaleId}`);
        const json = await res.json();
        if (json.success && json.data) {
          const d: PresaleRecord = json.data;
          setPresale(d);

          const mainC = d.mainDetails?.mainContact || d.franchiseeName || '';
          const addr = d.mainDetails?.address || '';
          const p1Name = d.deedOfVariation?.party1Name || mainC;
          const p1Addr = d.deedOfVariation?.party1Address || addr;

          setParty1Name(p1Name);
          setParty1Address(p1Addr);
          setParty2Name(d.deedOfVariation?.party2Name || p1Name);
          setParty2Address(d.deedOfVariation?.party2Address || p1Addr);
          setSignerName(d.deedOfVariation?.signerName || mainC);
          setSignerEmail(d.deedOfVariation?.signerEmail || d.mainDetails?.email || '');

          if (d.deedOfVariation?.selectedOption) {
            setSelectedOption(d.deedOfVariation.selectedOption);
          }
          if (d.deedOfVariation?.signatureDataUrl) {
            setSignatureDataUrl(d.deedOfVariation.signatureDataUrl);
          }
          if (d.deedOfVariation?.status === 'signed_online' || d.deedOfVariation?.status === 'pdf_uploaded') {
            setSubmitted(true);
          }
        }
      } catch (err) {
        console.error('Error loading presale for Deed', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [presaleId]);

  // Signature Canvas Controls
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;
    if ('touches' in e && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent<HTMLCanvasElement>).clientX;
      clientY = (e as React.MouseEvent<HTMLCanvasElement>).clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(x, y);
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
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;
    if ('touches' in e && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent<HTMLCanvasElement>).clientX;
      clientY = (e as React.MouseEvent<HTMLCanvasElement>).clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

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

  const handleSubmitDeed = async () => {
    if (!signerName.trim()) {
      alert('Please enter your full legal name.');
      return;
    }

    const canvasUrl = canvasRef.current ? canvasRef.current.toDataURL() : signatureDataUrl;
    if (!canvasUrl) {
      alert('Please provide your digital signature below.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/deed-of-variation/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presaleId,
          selectedOption,
          party1Name,
          party1Address,
          party2Name,
          party2Address,
          signerName,
          signerEmail,
          signatureDataUrl: canvasUrl,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSubmitted(true);
      } else {
        alert(json.message || 'Failed to submit Deed of Variation.');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred while submitting.');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadDeedPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryColor = [9, 92, 123];
    const darkText = [30, 41, 59];

    // Header Banner
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('MAILPLUS AUSTRALIA', 15, 15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('DEED OF VARIATION - EXIT PROGRAM ASSISTANCE OFFER', 110, 15);

    // Title
    doc.setTextColor(darkText[0], darkText[1], darkText[2]);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Deed of Variation - Exit Program Assistance Offer', 15, 34);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date().toLocaleDateString('en-AU')}`, 15, 41);

    // PARTIES SECTION
    doc.setFont('helvetica', 'bold');
    doc.text('PARTIES:', 15, 49);
    doc.setFont('helvetica', 'normal');
    doc.text(`Party 1 (Franchisee): ${party1Name || '__________'} of ${party1Address || '__________'} (Franchisee)`, 15, 55);
    doc.text(`Party 2 (Manager): ${party2Name || party1Name || '__________'} of ${party2Address || party1Address || '__________'} (Manager)`, 15, 61);
    doc.text('Party 3 (MailPlus): Mail Plus Pty Ltd ACN 609 801 195 of Level 14, Suite 11, 175 Pitt Street, Sydney, NSW, 2000 (MailPlus)', 15, 67);

    // SELECTED OPTION SECTION
    doc.setFont('helvetica', 'bold');
    doc.text('SELECTED OPTION:', 15, 77);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    const optionsText: Record<DeedOption, string[]> = {
      option_1: [
        'OPTION 1 - The Franchisee sells his/her own Franchise territory i.e does not engage MailPlus to facilitate/assist in that process.',
        'Under option 1 MailPlus will provide to the Franchisee (via its Manager) a copy of the MailPlus brochure, a blank expression of interest form',
        'and a pro-forma territory IM. The Franchisee will be responsible for all marketing endeavors including supporting collateral, candidate screening,',
        'interviews & Franchise sales negotiations. Once MailPlus has both vetted & approved a purchaser an instruction to MailPlus\'s lawyers will be sent',
        'to prepare and dispatch disclosure documentation and Franchise Agreements for execution.'
      ],
      option_2: [
        'OPTION 2 - The Franchisee engages MailPlus to provide administrative support and assistance with the Franchisees sale of its Franchise Business.',
        'In this instance MailPlus will assist the franchisee by providing all marketing endeavors, supporting collateral, candidate screening/interviews by MailPlus',
        'on the Franchisee\'s behalf. In the event that the Franchisee successfully sells its Franchise Business, MailPlus will charge a 10% administrative fee',
        'associated for the additional assistance it has provided to the Franchisee with that process. The administrative fee will be calculated based on the',
        'Franchise purchase price (business component only) i.e excluding any assets that may be part of the sale, Vehicles etc.'
      ],
      option_3: [
        'OPTION 3 - The Franchisee engages MailPlus to provide administrative support and assistance with the Franchisee\'s sale of its Franchise Business.',
        'Under this option, MailPlus will provide the support set out in Option 2, plus additional support. If MailPlus approves the purchaser, MailPlus can',
        'provide additional assistance by introducing the purchaser to MailPlus\'s NAB accreditation program. If the Franchisee sells its Franchise Business and',
        'its purchaser enters into a tripartite agreement (between purchaser, NAB and MailPlus), the Franchisee agrees to pay a sum equivalent to two twelfths',
        'of the Purchase Price (business component only). The Franchisee acknowledges it has taken into account this fee in determining its Purchase Price.'
      ]
    };

    let optionY = 83;
    optionsText[selectedOption].forEach(line => {
      doc.text(line, 15, optionY);
      optionY += 5;
    });

    // AGREED TERMS
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('AGREED TERMS:', 15, optionY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const terms = [
      '1. The parties wish to vary the franchise agreement by adding to the special conditions the offer selected above.',
      '2. This offer applies to sales which are finalised by 31 December 2026.',
      '3. The Franchisee agrees to pay to MailPlus the fee set out in the offer selected above before the settlement of the sale.',
      '4. The Manager guarantees the payment of the fee set out in the offer selected above.',
      '5. The parties agree that the terms of this Deed vary and amend the terms of the franchise agreement.',
      '6. A breach of this Deed will constitute a breach of the franchise agreement.'
    ];

    let termY = optionY + 10;
    terms.forEach(t => {
      doc.text(t, 15, termY);
      termY += 5;
    });

    // EXECUTED AS A DEED
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('EXECUTED AS A DEED:', 15, termY + 6);

    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(15, termY + 10, 85, 38, 2, 2, 'D');
    doc.text('Executed by Mail Plus Pty Ltd ACN 609 801 195:', 18, termY + 16);
    doc.setFont('helvetica', 'normal');
    doc.text('Chris Burgess', 18, termY + 30);
    doc.setFontSize(7.5);
    doc.text('Sole Director and Sole Company Secretary', 18, termY + 35);

    doc.roundedRect(108, termY + 10, 87, 38, 2, 2, 'D');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Executed by Franchisee / Manager:', 111, termY + 16);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${signerName || party1Name || '___________'}`, 111, termY + 23);
    doc.text(`Date: ${new Date().toLocaleDateString('en-AU')}`, 111, termY + 29);

    const canvasUrl = canvasRef.current ? canvasRef.current.toDataURL() : signatureDataUrl;
    if (canvasUrl) {
      try {
        doc.addImage(canvasUrl, 'PNG', 150, termY + 15, 40, 18);
      } catch (err) {
        console.error(err);
      }
    }

    doc.save(`Deed_of_Variation_${(party1Name || 'Franchisee').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3 bg-white p-8 rounded-2xl shadow border border-slate-200">
          <Loader className="mx-auto text-[#095c7b]" />
          <p className="text-sm font-medium text-slate-600">Loading Deed of Variation document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7f8] py-8 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Logo & Title */}
        <div className="bg-[#095c7b] text-white p-6 rounded-2xl shadow-md text-center space-y-2">
          <Badge className="bg-[#eaf143] text-slate-900 font-bold uppercase tracking-wider text-[10px] mx-auto px-3 py-1">
            Official Legal Document
          </Badge>
          <h1 className="text-2xl font-bold text-white">Deed of Variation - Exit Program Assistance Offer</h1>
          <p className="text-xs text-slate-200 max-w-xl mx-auto">
            MailPlus Australia Franchise Exit Program Agreement
          </p>
        </div>

        {submitted ? (
          <div className="bg-white p-10 rounded-2xl border border-emerald-200 shadow-md text-center space-y-6">
            <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-300">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Deed of Variation Executed & Submitted</h2>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Thank you. The Deed of Variation has been digitally signed and registered. An automated copy has been sent to <strong>greg.hart@mailplus.com.au</strong> and <strong>michael.mcdaid@mailplus.com.au</strong>.
              </p>
            </div>

            <Button
              onClick={downloadDeedPDF}
              className="bg-[#095c7b] hover:bg-[#07465e] text-white text-xs gap-2 font-bold px-6 h-11"
            >
              <Download className="h-4 w-4" /> Download Executed Deed PDF
            </Button>
          </div>
        ) : (
          <div className="space-y-6 bg-white p-6 md:p-10 rounded-2xl border border-[#e2e8f0] shadow-sm">
            {/* PARTIES SECTION */}
            <div className="space-y-3 border-b border-slate-200 pb-6">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#095c7b]" /> PARTIES TO THIS DEED
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 bg-[#f8fafb] p-4 rounded-xl border border-slate-200">
                  <Label className="text-xs font-bold text-slate-700">Party 1 (Franchisee) Contact Name & Address *</Label>
                  <Input
                    value={party1Name}
                    onChange={(e) => setParty1Name(e.target.value)}
                    placeholder="e.g. Quan Trinh"
                    className="text-xs bg-white border-slate-200"
                  />
                  <Input
                    value={party1Address}
                    onChange={(e) => setParty1Address(e.target.value)}
                    placeholder="e.g. 76 Riverhills Rd, Middle Park, QLD, 4074"
                    className="text-xs bg-white border-slate-200"
                  />
                </div>

                <div className="space-y-2 bg-[#f8fafb] p-4 rounded-xl border border-slate-200">
                  <Label className="text-xs font-bold text-slate-700">Party 2 (Manager) Contact Name & Address *</Label>
                  <Input
                    value={party2Name}
                    onChange={(e) => setParty2Name(e.target.value)}
                    placeholder="e.g. Quan Trinh"
                    className="text-xs bg-white border-slate-200"
                  />
                  <Input
                    value={party2Address}
                    onChange={(e) => setParty2Address(e.target.value)}
                    placeholder="e.g. 76 Riverhills Rd, Middle Park, QLD, 4074"
                    className="text-xs bg-white border-slate-200"
                  />
                </div>

                <div className="space-y-1 bg-[#f8fafb] p-4 rounded-xl border border-slate-200 md:col-span-2 text-xs">
                  <span className="font-bold text-slate-800 block">Party 3 (MailPlus):</span>
                  <p className="text-slate-600 font-mono">
                    Mail Plus Pty Ltd ACN 609 801 195 of Level 14, Suite 11, 175 Pitt Street, Sydney, NSW, 2000 (MailPlus)
                  </p>
                </div>
              </div>
            </div>

            {/* OPTIONS SECTION - SELECT FROM THE 3 OPTIONS */}
            <div className="space-y-4 border-b pb-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <PenTool className="h-4 w-4 text-[#095c7b]" /> OPTIONS - SELECT ONE OF THE FOLLOWING *
                </h3>
                <Badge variant="outline" className="text-[11px] border-[#095c7b] text-[#095c7b]">
                  Choice Required
                </Badge>
              </div>

              {/* Option 1 */}
              <div
                onClick={() => setSelectedOption('option_1')}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                  selectedOption === 'option_1'
                    ? 'border-[#095c7b] bg-[#095c7b]/5 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="deedOption"
                    checked={selectedOption === 'option_1'}
                    onChange={() => setSelectedOption('option_1')}
                    className="mt-1 h-4 w-4 text-[#095c7b] focus:ring-[#095c7b]"
                  />
                  <div className="space-y-1 text-xs">
                    <h4 className="font-bold text-slate-900 text-sm">
                      OPTION 1 - Franchisee Sells Independent Territory (No MailPlus Facilitation)
                    </h4>
                    <p className="text-slate-600 leading-relaxed">
                      The Franchisee sells his/her own Franchise territory i.e does not engage MailPlus to facilitate/assist in that process. Under option 1 MailPlus will provide to the Franchisee (via its Manager) a copy of the MailPlus brochure, a blank expression of interest form and a pro-forma territory IM. The Franchisee will be responsible for all marketing endeavors including supporting collateral, candidate screening, interviews & Franchise sales negotiations. Once MailPlus has both vetted & approved a purchaser an instruction to MailPlus's lawyers will be sent to prepare and dispatch disclosure documentation and Franchise Agreements for execution.
                    </p>
                  </div>
                </div>
              </div>

              {/* Option 2 */}
              <div
                onClick={() => setSelectedOption('option_2')}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                  selectedOption === 'option_2'
                    ? 'border-[#095c7b] bg-[#095c7b]/5 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="deedOption"
                    checked={selectedOption === 'option_2'}
                    onChange={() => setSelectedOption('option_2')}
                    className="mt-1 h-4 w-4 text-[#095c7b] focus:ring-[#095c7b]"
                  />
                  <div className="space-y-1 text-xs">
                    <h4 className="font-bold text-slate-900 text-sm">
                      OPTION 2 - MailPlus Administrative & Marketing Assistance (10% Admin Fee)
                    </h4>
                    <p className="text-slate-600 leading-relaxed">
                      The Franchisee engages MailPlus to provide administrative support and assistance with the Franchisees sale of its Franchise Business. In this instance MailPlus will assist the franchisee by providing all marketing endeavors, supporting collateral, candidate screening/interviews by MailPlus on the Franchisee's behalf. In the event that the Franchisee successfully sells its Franchise Business, MailPlus will charge a 10% administrative fee associated for the additional assistance it has provided to the Franchisee with that process. The administrative fee will be calculated based on the Franchise purchase price (business component only) i.e excluding any assets that may be part of the sale, Vehicles etc.
                    </p>
                  </div>
                </div>
              </div>

              {/* Option 3 */}
              <div
                onClick={() => setSelectedOption('option_3')}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                  selectedOption === 'option_3'
                    ? 'border-[#095c7b] bg-[#095c7b]/5 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="deedOption"
                    checked={selectedOption === 'option_3'}
                    onChange={() => setSelectedOption('option_3')}
                    className="mt-1 h-4 w-4 text-[#095c7b] focus:ring-[#095c7b]"
                  />
                  <div className="space-y-1 text-xs">
                    <h4 className="font-bold text-slate-900 text-sm">
                      OPTION 3 - MailPlus Full Support & NAB Accreditation Program (2/12ths Purchase Price Fee)
                    </h4>
                    <p className="text-slate-600 leading-relaxed">
                      The Franchisee engages MailPlus to provide administrative support and assistance with the Franchisee's sale of its Franchise Business. Under this option, MailPlus will provide the support set out in option 2 above, plus additional support and assistance. If MailPlus approves the Franchisee's purchaser, Mail Plus can provide additional assistance by introducing the purchaser to MailPlus's NAB accreditation program. Under this option, Mailplus will assist the Franchisee to manage the process of the Franchisee's initial marketing of the Franchisee's Franchise Business to the Franchisee's securing of a buyer. If the Franchisee sells it's Franchise Business and it's purchaser enters into a tripartite agreement (an agreement between the purchase, the NAB and MailPlus), the Franchisee agrees to pay a sum equivalent to two twelfths of the Purchase Price (business component only ie not including the genuine and reasonable cost of any vehicle purchased). If the Franchisee choose this option, the Franchisee acknowledges that it has taken into account this fee when it determined its Purchase Price with its purchaser.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* AGREED TERMS SECTION */}
            <div className="space-y-3 border-b pb-6 text-xs text-slate-700 leading-relaxed bg-slate-50 p-5 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-900 text-sm uppercase">AGREED TERMS</h4>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>The parties wish to vary the franchise agreement by adding to the special conditions the offer selected above.</li>
                <li>This offer applies to sales which are finalised by 31 December 2026.</li>
                <li>The Franchisee agrees to pay to MailPlus the fee set out in the offer selected above before the settlement of the sale or to irrevocably instruct the purchaser to redirect the Purchase Price payable at settlement directly to MailPlus in payment of the relevant fee.</li>
                <li>The Manager guarantees the payment of the fee set out in the offer selected above.</li>
                <li>The parties agree that the terms of this Deed vary and amend the terms of the franchise agreement.</li>
                <li>A breach of this Deed will constitute a breach of the franchise agreement.</li>
              </ul>
            </div>

            {/* EXECUTED AS A DEED & DIGITAL SIGNATURE */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#095c7b]" /> EXECUTED AS A DEED & DIGITAL SIGNATURE
                </h3>
                <Badge variant="outline" className="text-[11px] border-emerald-600 text-emerald-700 bg-emerald-50">
                  Dual Execution Required
                </Badge>
              </div>

              {/* Execution Blocks Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                {/* MailPlus Execution Block (Pre-signed by Franchisor) */}
                <div className="space-y-3 bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div className="space-y-2">
                    <p className="font-bold text-slate-900 text-xs leading-snug">
                      Executed by Mail Plus Pty Ltd ACN 609 801 195 in accordance with section 127(1) of the Corporations Act 2001 (Cth):
                    </p>

                    {/* Pre-signed Digital Signature Graphic for Chris Burgess */}
                    <div className="my-2 p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-center space-y-1">
                      <div className="font-serif italic text-2xl text-[#095c7b] tracking-wider select-none py-1">
                        Chris Burgess
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Digitally Signed & Authorized by Franchisor
                      </div>
                    </div>

                    <div className="border-t border-dashed border-slate-300 pt-2 text-[11px] text-slate-500 font-medium italic">
                      Signature of sole director and sole company secretary
                    </div>
                  </div>

                  <div className="pt-2 border-t text-xs space-y-0.5">
                    <div className="font-bold text-slate-900">Chris Burgess</div>
                    <div className="text-[10px] text-slate-500">Sole Director and Sole Company Secretary</div>
                    <div className="text-[10px] text-slate-400 font-mono pt-1">
                      Date: {new Date().toLocaleDateString('en-AU')}
                    </div>
                  </div>
                </div>

                {/* Franchisee Execution Block (Interactive Digital Signature Pad) */}
                <div className="space-y-3 bg-white p-5 rounded-xl border-2 border-[#095c7b]/30 shadow-xs flex flex-col justify-between">
                  <div className="space-y-3">
                    <p className="font-bold text-slate-900 text-xs leading-snug">
                      Executed by {party1Name || presale?.mainDetails?.tradingEntity || 'Franchisee'} in accordance with section 127(1) of the Corporations Act 2001 (Cth):
                    </p>

                    {/* Interactive Canvas Pad embedded directly inside Franchisee execution block */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-bold text-[#095c7b] uppercase tracking-wide flex items-center gap-1">
                          <PenTool className="h-3.5 w-3.5" /> Franchisee Signature *
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearCanvas}
                          className="h-6 text-[10px] gap-1 text-slate-500 hover:text-red-600 hover:bg-red-50 px-2"
                        >
                          <Eraser className="h-3 w-3" /> Clear Pad
                        </Button>
                      </div>

                      <div className="border-2 border-dashed border-[#095c7b]/40 rounded-lg bg-white overflow-hidden text-center relative group">
                        <canvas
                          ref={canvasRef}
                          width={500}
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
                        {!signatureDataUrl && (
                          <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-300 text-xs font-medium italic">
                            Draw signature here (mouse, stylus, or touchscreen)
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium italic border-t border-dashed border-slate-300 pt-1">
                        Signature of sole trader / franchisee
                      </div>
                    </div>

                    {/* Signer inputs embedded into franchisee block */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div>
                        <Label className="text-[10px] font-semibold text-slate-600">Full Legal Name *</Label>
                        <Input
                          value={signerName}
                          onChange={(e) => setSignerName(e.target.value)}
                          placeholder="Signer Full Legal Name"
                          className="text-xs h-8 bg-slate-50/50"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] font-semibold text-slate-600">Signer Email *</Label>
                        <Input
                          type="email"
                          value={signerEmail}
                          onChange={(e) => setSignerEmail(e.target.value)}
                          placeholder="signer@example.com"
                          className="text-xs h-8 bg-slate-50/50"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t text-xs space-y-0.5">
                    <div className="font-bold text-slate-900">{signerName || party1Name || 'Franchisee Signatory'}</div>
                    <div className="text-[10px] text-slate-500">Sole Trader / Franchisee</div>
                    <div className="text-[10px] text-slate-400 font-mono pt-0.5">
                      Date: {new Date().toLocaleDateString('en-AU')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={downloadDeedPDF}
                  className="w-full sm:w-auto text-xs gap-2 border-slate-300 text-slate-700"
                >
                  <Download className="h-4 w-4" /> Download PDF Version
                </Button>

                <Button
                  type="button"
                  onClick={handleSubmitDeed}
                  disabled={submitting}
                  className="w-full sm:w-auto bg-[#095c7b] hover:bg-[#07465e] text-white text-xs font-bold gap-2 px-8 h-11"
                >
                  {submitting ? <Loader className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                  Sign & Submit Deed of Variation
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
