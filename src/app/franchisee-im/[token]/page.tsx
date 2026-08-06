'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/ui/loader';
import {
  FileText,
  CheckCircle2,
  Eraser,
  Send,
  ShieldCheck,
  Building2,
  Calendar,
  DollarSign,
  Clock,
  MapPin,
  PenTool,
  AlertCircle
} from 'lucide-react';
import { PresaleRecord } from '@/lib/presale-types';

export default function PublicFranchiseeIMPage() {
  const params = useParams();
  const rawToken = (params?.token as string) || '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [presale, setPresale] = useState<PresaleRecord | null>(null);

  // Signer inputs
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!rawToken) return;

    async function loadPresaleData() {
      setLoading(true);
      setErrorMsg('');
      try {
        const res = await fetch(`/api/franchisees/presales?franchiseeId=${rawToken}`);
        const json = await res.json();

        if (json.success && json.data) {
          const d: PresaleRecord = json.data;
          setPresale(d);

          const mainC = d.mainDetails?.mainContact || d.franchiseeName || '';
          const email = d.mainDetails?.email || '';

          setSignerName(d.presalesDetails?.signerName || mainC);
          setSignerEmail(d.presalesDetails?.signerEmail || email);

          if (d.presalesDetails?.signatureDataUrl) {
            setSignatureDataUrl(d.presalesDetails.signatureDataUrl);
          }

          if (d.presalesDetails?.imStatus === 'signed_online' || d.status === 'Active Presale') {
            setSubmitted(true);
          }
        } else {
          setErrorMsg(json.message || 'Presale record not found.');
        }
      } catch (err) {
        console.error('Error loading presale for IM:', err);
        setErrorMsg('Failed to load presale details.');
      } finally {
        setLoading(false);
      }
    }
    loadPresaleData();
  }, [rawToken]);

  // Canvas drawing handlers
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

    ctx.beginPath();
    ctx.moveTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
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

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#095c7b';
    ctx.lineTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureDataUrl(canvas.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signerName.trim()) {
      alert('Please enter your full legal name.');
      return;
    }

    if (!signatureDataUrl) {
      alert('Please draw your signature in the signature box before confirming.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/franchisee-im/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: rawToken,
          presaleId: presale?.franchiseeId || rawToken,
          signerName,
          signerEmail,
          signatureDataUrl,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSubmitted(true);
      } else {
        alert(json.message || 'Failed to submit e-signature.');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <Loader className="mx-auto text-[#095c7b] h-10 w-10" />
          <p className="text-slate-600 text-sm font-medium">Loading territory profile & schedule...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !presale) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-red-200 shadow-md">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="text-lg font-bold text-slate-900">Record Not Found</h2>
            <p className="text-sm text-slate-600">{errorMsg || 'Unable to load territory profile.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pd = presale.presalesDetails || ({} as any);
  const md = presale.mainDetails || ({} as any);

  const territoryName = pd.territoryName || md.tradingEntity || presale.franchiseeName || 'MailPlus Territory';
  const dateStarted = pd.dateBusinessStarted || md.dateBusinessStarted || 'N/A';
  const numOwners = pd.numberOfOwners || '1';
  const reasonSale = pd.reasonForSale || 'Moving';
  const serviceRev = pd.serviceRevenue ? `$${Number(pd.serviceRevenue).toLocaleString('en-AU')} (+gst)` : '$300,437.26 (+gst)';
  const feePercent = pd.franchiseFeesOnServiceRevenue || '25%';
  const mktgLevy = pd.marketingLevy || '5%';
  const expressRev = pd.expressRevenue || `Product Commission $${Number(pd.mpexCommission || 856.60).toLocaleString('en-AU')}`;
  const salePriceFormatted = pd.salePrice ? `$${Number(pd.salePrice).toLocaleString('en-AU')} NEG` : '$335,000.00 NEG';
  const dailyRunTime = pd.totalDailyRunTime || 'Between 8.5 to 9.5 hours per day';
  const morningShift = pd.currentMorningShift || '6:00am to 11:00am';
  const afternoonShift = pd.currentAfternoonShift || '1:00pm to 4:00pm';
  const franchiseTermText = pd.franchiseTerm || pd.termOnFranchiseeIM || 'Unlimited';
  const mapUrl = pd.territoryMapUrl;

  return (
    <div className="min-h-screen bg-[#f4f7f8] py-10 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* BRAND HEADER BANNER */}
        <div className="bg-[#095c7b] text-white p-6 rounded-2xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src="https://lh3.googleusercontent.com/d/1hhLMkl8NmyhkhDT9jDg9AYIhbIRsjQQD"
              alt="MailPlus Logo"
              className="h-10 w-auto bg-white/10 p-1.5 rounded-lg border border-white/20"
            />
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                Franchisee Information Memorandum
              </h1>
              <p className="text-xs text-slate-200 mt-0.5">
                Territory Profile & Operational Schedule Confirmation
              </p>
            </div>
          </div>
          <Badge className="bg-[#eaf143] text-[#095c7b] hover:bg-[#eaf143] font-bold text-xs px-3 py-1">
            {submitted ? 'Signed & Confirmed' : 'Confirmation Required'}
          </Badge>
        </div>

        {submitted ? (
          /* SUBMITTED SUCCESS VIEW */
          <Card className="border-emerald-200 shadow-md bg-white">
            <CardContent className="p-8 text-center space-y-6">
              <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-200">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">Territory Profile E-Signed & Confirmed</h2>
                <p className="text-sm text-slate-600 max-w-lg mx-auto">
                  Thank you, <strong className="text-slate-800">{signerName || pd.signerName}</strong>. You have successfully reviewed and e-signed the Franchisee Information Memorandum schedule for <strong>{territoryName}</strong>.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md mx-auto text-left space-y-2.5 text-xs text-slate-700">
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-slate-500">Territory Name:</span>
                  <strong className="text-slate-900">{territoryName}</strong>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-slate-500">Signer Name:</span>
                  <strong className="text-slate-900">{signerName || pd.signerName}</strong>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-slate-500">Signer Email:</span>
                  <strong className="text-slate-900">{signerEmail || pd.signerEmail}</strong>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-slate-500">Confirmation Date:</span>
                  <strong className="text-slate-900">
                    {pd.signedAt ? new Date(pd.signedAt).toLocaleString('en-AU') : new Date().toLocaleString('en-AU')}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <strong className="text-emerald-700 font-bold uppercase">Active Presale</strong>
                </div>
              </div>

              {(pd.signatureDataUrl || signatureDataUrl) && (
                <div className="pt-2">
                  <p className="text-xs text-slate-500 mb-2 font-medium">Digital Signature Stamp:</p>
                  <div className="inline-block p-3 bg-white border border-slate-200 rounded-lg shadow-inner">
                    <img
                      src={pd.signatureDataUrl || signatureDataUrl}
                      alt="Digital Signature"
                      className="max-h-16 w-auto mx-auto object-contain"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* FORM REVIEW AND E-SIGN VIEW */
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* DOCUMENT TITLE CARD */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-900 text-white p-5">
                <CardTitle className="text-lg font-bold text-center tracking-wide text-white uppercase flex items-center justify-center gap-2">
                  <FileText className="h-5 w-5 text-[#eaf143]" />
                  Your Proposed Territory Profile and Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                
                {/* 13 FIELDS GRID MATCHING WORD DOCX LAYOUT */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  
                  {/* Territory Name */}
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col justify-between">
                    <span className="text-slate-500 uppercase font-bold text-[10px] tracking-wider">Territory Name</span>
                    <span className="text-slate-900 font-bold text-sm mt-1">{territoryName}</span>
                  </div>

                  {/* Date business started */}
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col justify-between">
                    <span className="text-slate-500 uppercase font-bold text-[10px] tracking-wider">Date Business Started</span>
                    <span className="text-slate-900 font-bold text-sm mt-1">{dateStarted}</span>
                  </div>

                  {/* Number of owners */}
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col justify-between">
                    <span className="text-slate-500 uppercase font-bold text-[10px] tracking-wider">Number of Owners</span>
                    <span className="text-slate-900 font-bold text-sm mt-1">{numOwners}</span>
                  </div>

                  {/* Reason for sale */}
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col justify-between">
                    <span className="text-slate-500 uppercase font-bold text-[10px] tracking-wider">Reason for Sale</span>
                    <span className="text-slate-900 font-bold text-sm mt-1">{reasonSale}</span>
                  </div>

                  {/* Last 12 months service revenue (Ex GST) */}
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col justify-between">
                    <span className="text-slate-500 uppercase font-bold text-[10px] tracking-wider">Last 12 Months Service Revenue (Ex GST)</span>
                    <span className="text-[#095c7b] font-extrabold text-sm mt-1">{serviceRev}</span>
                  </div>

                  {/* Franchise fees on service revenue */}
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col justify-between">
                    <span className="text-slate-500 uppercase font-bold text-[10px] tracking-wider">Franchise Fees on Service Revenue</span>
                    <span className="text-slate-900 font-bold text-sm mt-1">{feePercent}</span>
                  </div>

                  {/* Marketing Levy */}
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col justify-between">
                    <span className="text-slate-500 uppercase font-bold text-[10px] tracking-wider">Marketing Levy</span>
                    <span className="text-slate-900 font-bold text-sm mt-1">{mktgLevy}</span>
                  </div>

                  {/* Last 12 months MailPlus Express revenue (Ex GST) */}
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col justify-between">
                    <span className="text-slate-500 uppercase font-bold text-[10px] tracking-wider">Last 12 Months MailPlus Express Revenue (Ex GST)</span>
                    <span className="text-slate-900 font-bold text-sm mt-1">{expressRev}</span>
                  </div>

                  {/* Sale Price */}
                  <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-lg flex flex-col justify-between md:col-span-2">
                    <span className="text-emerald-800 uppercase font-extrabold text-[11px] tracking-wider">Sale Price</span>
                    <span className="text-emerald-900 font-black text-lg mt-1">{salePriceFormatted}</span>
                  </div>

                  {/* Total Average daily run time (current) */}
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col justify-between md:col-span-2">
                    <span className="text-slate-500 uppercase font-bold text-[10px] tracking-wider">Total Average Daily Run Time (Current)</span>
                    <span className="text-slate-900 font-bold text-sm mt-1">{dailyRunTime}</span>
                  </div>

                  {/* Current morning shift */}
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col justify-between">
                    <span className="text-slate-500 uppercase font-bold text-[10px] tracking-wider">Current Morning Shift</span>
                    <span className="text-slate-900 font-bold text-sm mt-1">{morningShift}</span>
                  </div>

                  {/* Current afternoon shift */}
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col justify-between">
                    <span className="text-slate-500 uppercase font-bold text-[10px] tracking-wider">Current Afternoon Shift</span>
                    <span className="text-slate-900 font-bold text-sm mt-1">{afternoonShift}</span>
                  </div>

                  {/* Franchise Term */}
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col justify-between md:col-span-2">
                    <span className="text-slate-500 uppercase font-bold text-[10px] tracking-wider">Franchise Term</span>
                    <span className="text-slate-900 font-bold text-sm mt-1">{franchiseTermText}</span>
                  </div>

                </div>

                {/* TERRITORY MAP DISPLAY */}
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#095c7b]" /> Territory Map
                  </h3>
                  {mapUrl ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-100 p-2 text-center shadow-inner">
                      <img
                        src={mapUrl}
                        alt="Territory Map"
                        className="max-h-96 w-full object-contain mx-auto rounded-lg"
                      />
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 text-center space-y-2">
                      <MapPin className="h-8 w-8 text-slate-400 mx-auto" />
                      <p className="text-xs text-slate-500">Territory map attached with schedule</p>
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>

            {/* DIGITAL SIGNATURE CONFIRMATION CARD */}
            <Card className="border-[#095c7b]/30 shadow-md bg-white">
              <CardHeader className="bg-[#095c7b] text-white p-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-white">
                  <PenTool className="h-4 w-4 text-[#eaf143]" /> Digital Confirmation & E-Signature
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <p className="text-xs text-slate-600 leading-relaxed">
                  By signing below, you confirm that you have reviewed the territory profile, schedule values, operational shift times, and territory map for <strong>{territoryName}</strong>, and confirm that all details are accurate.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Full Legal Signer Name *</Label>
                    <Input
                      required
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="text-xs font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Signer Email Address *</Label>
                    <Input
                      required
                      type="email"
                      value={signerEmail}
                      onChange={(e) => setSignerEmail(e.target.value)}
                      placeholder="e.g. john@example.com"
                      className="text-xs font-medium"
                    />
                  </div>
                </div>

                {/* SIGNATURE CANVAS */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700">Draw Digital Signature *</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearCanvas}
                      className="text-xs text-slate-500 hover:text-slate-800 gap-1 h-7 px-2"
                    >
                      <Eraser className="h-3.5 w-3.5" /> Clear Signature
                    </Button>
                  </div>

                  <div className="border-2 border-dashed border-[#095c7b]/40 rounded-xl bg-slate-50/80 overflow-hidden relative">
                    <canvas
                      ref={canvasRef}
                      width={700}
                      height={180}
                      className="w-full h-44 cursor-crosshair touch-none"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                    {!signatureDataUrl && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs gap-1.5">
                        <PenTool className="h-4 w-4" /> Draw signature here using mouse or touch
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#095c7b] hover:bg-[#07465e] text-white font-bold text-sm py-6 rounded-xl shadow-md gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader className="h-4 w-4 text-white" /> Submitting E-Signature...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-5 w-5 text-[#eaf143]" /> Confirm & E-Sign Franchisee IM
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

          </form>
        )}

      </div>
    </div>
  );
}
