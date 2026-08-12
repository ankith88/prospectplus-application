'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from '@/components/ui/loader';
import { CheckCircle2, ShieldCheck, FileText, Lock, PenTool, RefreshCw } from 'lucide-react';

export default function PublicConfidentialityDeedPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prospectData, setProspectData] = useState<any>(null);

  // Form State
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signerAddress, setSignerAddress] = useState('');

  // Canvas Signature
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    async function loadDeed() {
      if (!token) return;
      try {
        const res = await fetch(`/api/confidentiality-deed/sign?token=${token}`);
        const json = await res.json();
        if (json.success && json.prospect) {
          setProspectData(json.prospect);
          setSignerName(json.prospect.fullName || '');
          setSignerEmail(json.prospect.email || '');

          if (json.prospect.confidentialityDeed?.status === 'signed_online') {
            setIsSuccess(true);
          }
        } else {
          setError(json.message || 'Confidentiality Deed token invalid or expired.');
        }
      } catch (err: any) {
        console.error('Failed to load deed:', err);
        setError('Could not load Confidentiality Deed. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadDeed();
  }, [token]);

  // Canvas drawing helpers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#095c7b';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName.trim()) {
      alert('Please enter your full legal name.');
      return;
    }
    if (!hasSignature || !canvasRef.current) {
      alert('Please provide your digital signature in the drawing box.');
      return;
    }

    const signatureDataUrl = canvasRef.current.toDataURL('image/png');
    setSubmitting(true);

    try {
      const res = await fetch('/api/confidentiality-deed/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          signerName: signerName.trim(),
          signerEmail: signerEmail.trim(),
          signerAddress: signerAddress.trim(),
          signatureDataUrl,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to submit signature.');
      }

      setIsSuccess(true);
    } catch (err: any) {
      console.error('Error submitting signature:', err);
      alert(err.message || 'Could not submit signature.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#d0dfcd] flex flex-col items-center justify-center p-4">
        <Loader className="h-8 w-8 text-[#095c7b] animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading Confidentiality Deed...</p>
      </div>
    );
  }

  if (error || !prospectData) {
    return (
      <div className="min-h-screen bg-[#d0dfcd] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200 shadow-sm">
          <CardHeader className="text-center pb-2">
            <ShieldCheck className="h-10 w-10 text-red-500 mx-auto mb-2" />
            <CardTitle className="text-xl text-red-700">Link Expired or Invalid</CardTitle>
            <CardDescription className="text-sm text-slate-600">{error || 'Invalid deed token.'}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#d0dfcd] flex items-center justify-center p-4">
        <Card className="max-w-lg w-full border-emerald-300 shadow-md">
          <CardHeader className="text-center pb-3 bg-emerald-50 border-b rounded-t-xl">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-2" />
            <CardTitle className="text-2xl text-emerald-900 font-bold">Confidentiality Deed Signed</CardTitle>
            <CardDescription className="text-xs text-emerald-700">
              Thank you, {signerName || prospectData.fullName}. Your deed has been successfully recorded.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 text-center text-xs text-slate-600 space-y-4">
            <p>
              Your digital signature and timestamp have been registered with MailPlus Head Office. You are now cleared to participate in a franchise run-along / site observation.
            </p>
            <div className="p-3 bg-slate-100 rounded text-[11px] font-mono text-slate-700">
              Signer: {signerName || prospectData.fullName} ({signerEmail || prospectData.email})
            </div>
            <p className="text-slate-400 text-[11px]">You can close this window now.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const deed = prospectData?.confidentialityDeed || {};
  const agreementDate = deed.agreementDate || new Date().toLocaleDateString('en-AU');
  const providerName = deed.providerName || 'Mail Plus Pty Ltd';
  const providerAcn = deed.providerAcn || '119 635 158';
  const providerAddress = deed.providerAddress || 'Suite 3, Level 1, 2-4 Ross St, Parramatta NSW 2150';
  const providerEmail = deed.providerEmail || 'greg.hart@mailplus.com.au';
  const providerContact = deed.providerContact || 'Greg Hart';

  const displayRecipientName = signerName || deed.recipientName || prospectData?.fullName || 'Candidate';
  const displayRecipientAcn = deed.recipientAcn || '-';
  const displayRecipientAbn = deed.recipientAbn || '-';
  const displayRecipientShortName = deed.recipientShortName || prospectData?.firstName || displayRecipientName;
  const displayRecipientAddress = signerAddress || deed.recipientAddress || prospectData?.address || '-';
  const displayRecipientEmail = signerEmail || deed.recipientEmail || prospectData?.email || '-';
  const displayRecipientContact = deed.recipientContact || prospectData?.fullName || displayRecipientName;

  const purposeText = deed.purpose || 'Each party possesses Confidential Information and wishes to review Confidential Information provided by the other party for the Purpose of evaluating a MailPlus Franchise opportunity and participating in an operational run-along / site evaluation.';

  return (
    <div className="min-h-screen bg-[#d0dfcd] py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="bg-[#095c7b] text-white rounded-xl p-6 shadow-md text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold text-sky-200 mb-2">
              <Lock className="h-3.5 w-3.5" /> Confidentiality Agreement
            </div>
            <h1 className="text-2xl font-bold">Confidentiality Deed (Mutual)</h1>
            <p className="text-xs text-sky-100 mt-1">
              {providerName} & {displayRecipientName}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className="bg-amber-400 text-slate-900 font-bold px-3 py-1 text-xs">
              COMMERCIAL IN CONFIDENCE
            </Badge>
            <span className="text-[10px] text-sky-200 font-mono">VERSION 1.0</span>
          </div>
        </div>

        {/* Deed Document Card */}
        <Card className="shadow-md border">
          <CardHeader className="bg-slate-50 border-b pb-4">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#095c7b]" /> Confidentiality Deed & Terms
            </CardTitle>
            <CardDescription className="text-xs text-slate-600">
              This Deed governs the mutual disclosure of confidential business operational route details, financial metrics, and customer information.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 text-xs text-slate-800 space-y-6 leading-relaxed bg-white">
            {/* SCHEDULE SECTION */}
            <div className="space-y-4 border-b pb-6">
              <h2 className="text-sm font-bold text-[#095c7b] uppercase tracking-wider border-b pb-1">
                Schedule
              </h2>
              
              <div className="bg-slate-50 p-3 rounded-lg border text-xs">
                <span className="font-semibold text-slate-900">PARTIES:</span>
                <p className="mt-1 text-slate-700">
                  This Agreement is made on <strong className="text-slate-900 font-mono">{agreementDate}</strong> between the following parties:
                </p>
              </div>

              {/* Parties Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Party 1: Provider */}
                <div className="p-4 border rounded-xl bg-slate-50/50 space-y-2">
                  <div className="font-bold text-[#095c7b] border-b pb-1 flex items-center justify-between">
                    <span>PARTY 1 (Discloser / Provider)</span>
                    <Badge variant="outline" className="text-[10px] bg-sky-50 text-[#095c7b] border-sky-200">Discloser</Badge>
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-700">
                    <p><strong className="text-slate-900">Name:</strong> {providerName}</p>
                    <p><strong className="text-slate-900">ACN:</strong> {providerAcn}</p>
                    <p><strong className="text-slate-900">Short form name:</strong> MailPlus</p>
                    <p><strong className="text-slate-900">Address:</strong> {providerAddress}</p>
                    <p><strong className="text-slate-900">Email:</strong> {providerEmail}</p>
                    <p><strong className="text-slate-900">Contact:</strong> {providerContact}</p>
                  </div>
                </div>

                {/* Party 2: Recipient */}
                <div className="p-4 border rounded-xl bg-slate-50/50 space-y-2">
                  <div className="font-bold text-[#095c7b] border-b pb-1 flex items-center justify-between">
                    <span>PARTY 2 (Recipient / Candidate)</span>
                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200">Recipient</Badge>
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-700">
                    <p><strong className="text-slate-900">Name:</strong> {displayRecipientName}</p>
                    <p><strong className="text-slate-900">ACN:</strong> {displayRecipientAcn}</p>
                    <p><strong className="text-slate-900">ABN:</strong> {displayRecipientAbn}</p>
                    <p><strong className="text-slate-900">Short form name:</strong> {displayRecipientShortName}</p>
                    <p><strong className="text-slate-900">Address:</strong> {displayRecipientAddress}</p>
                    <p><strong className="text-slate-900">Email:</strong> {displayRecipientEmail}</p>
                    <p><strong className="text-slate-900">Contact:</strong> {displayRecipientContact}</p>
                  </div>
                </div>
              </div>

              {/* MEANING OF PURPOSE */}
              <div className="p-4 border rounded-xl bg-sky-50/40 space-y-2">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                  Meaning of Purpose
                </h3>
                <p className="text-slate-700 leading-relaxed">
                  {purposeText}
                </p>
                <p className="text-slate-700 leading-relaxed pt-1">
                  Each party possesses Confidential Information and wishes to review Confidential Information provided by the other party for the Purpose.
                </p>
                <p className="text-slate-700 leading-relaxed">
                  In consideration of, amongst other things, each party agreeing to keep the Confidential Information of the other confidential, the parties have agreed to comply with the attached terms and conditions.
                </p>
                <p className="text-slate-700 leading-relaxed">
                  Each party has agreed to enter into this Deed so that it is assured that the other Party will not divulge or disclose without authorisation to any Person any matter or thing in respect to or arising out of the Permitted Purpose or the confidential information acquired or obtained from each other.
                </p>
              </div>
            </div>

            {/* FULL TERMS AND CONDITIONS */}
            <div className="space-y-6">
              <h2 className="text-sm font-bold text-[#095c7b] uppercase tracking-wider border-b pb-1">
                Terms and Conditions
              </h2>

              {/* CLAUSE 1 */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900">1. DEFINITIONS AND INTERPRETATION</h3>
                
                <h4 className="font-semibold text-slate-800 pl-2">1.1 Definitions</h4>
                <p className="pl-4">In this Agreement, unless the context otherwise requires:</p>
                <div className="pl-6 space-y-1.5">
                  <p>
                    <strong className="text-slate-900">"Confidential Information"</strong> means all information disclosed by one party to the other, whether before or after the date of this Agreement, relating to:
                  </p>
                  <ul className="list-disc pl-6 space-y-0.5 text-slate-700">
                    <li>the Purpose;</li>
                    <li>a party's business, operations or affairs;</li>
                    <li>a party's customers or suppliers and the names of those entities;</li>
                    <li>a party's products or services;</li>
                    <li>a party's sales or marketing information;</li>
                    <li>any business plans, strategies or forecasts; or</li>
                    <li>the development, marketing or promotion of any product or service (including software and internet services);</li>
                  </ul>
                  <p className="text-slate-700 pt-1">
                    whether disclosed verbally, in writing, in electronic form or by any other means and includes information disclosed by, to or between the Related Body Corporates of the parties;
                  </p>
                  <p><strong className="text-slate-900">"Provider"</strong> means a party who discloses Confidential Information to the other party pursuant to this Agreement;</p>
                  <p><strong className="text-slate-900">"Purpose"</strong> means the purpose described in the Schedule;</p>
                  <p><strong className="text-slate-900">"Recipient"</strong> means a party who receives Confidential Information from the other party pursuant to this Agreement;</p>
                  <p><strong className="text-slate-900">"Related Body Corporate"</strong> means a related body corporate as defined in the Corporations Law;</p>
                  <p><strong className="text-slate-900">"Use"</strong> means use, copy or reproduce or disclose to any person (directly or indirectly) at any time.</p>
                </div>

                <h4 className="font-semibold text-slate-800 pl-2 pt-2">1.2 Interpretation</h4>
                <p className="pl-4">
                  In this Agreement unless the context requires otherwise: the headings are used for convenience only and do not affect the interpretation of this Agreement; and the word "person" includes a natural person and any body or entity whether incorporated or not.
                </p>
              </div>

              {/* CLAUSE 2 */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900">2. MAINTENANCE OF CONFIDENTIALITY BY RECIPIENT</h3>
                
                <h4 className="font-semibold text-slate-800 pl-2">2.1 Acknowledgment of Confidentiality</h4>
                <p className="pl-4">Each Recipient acknowledges that:</p>
                <div className="pl-6 space-y-1 text-slate-700">
                  <p>(a) the Confidential Information is secret and confidential to the Provider;</p>
                  <p>(b) any unauthorised Use of all or any part of the Provider’s Confidential Information by the Recipient may cause loss, damage or expense to the Provider;</p>
                  <p>(c) this Agreement applies to the parties on a worldwide basis; and</p>
                  <p>(d) this Agreement also applies to Confidential Information disclosed prior to the date of this Agreement.</p>
                </div>

                <h4 className="font-semibold text-slate-800 pl-2 pt-2">2.2 Confidentiality Obligation</h4>
                <p className="pl-4">
                  Each Recipient must keep the other party’s Confidential Information secret and confidential. In particular, the Recipient must not Use it other than as expressly permitted by this Agreement.
                </p>

                <h4 className="font-semibold text-slate-800 pl-2 pt-2">2.3 Uncertainty</h4>
                <p className="pl-4">If there is any uncertainty as to whether:</p>
                <div className="pl-6 space-y-1 text-slate-700">
                  <p>(a) any information is Confidential Information; or</p>
                  <p>(b) any Confidential Information is freely available to the public,</p>
                </div>
                <p className="pl-4 pt-1">
                  that information will be deemed to be Confidential Information and deemed not to be generally available to the public unless the Provider advises the Recipient in writing to the contrary.
                </p>
              </div>

              {/* CLAUSE 3 */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900">3. RECIPIENT’S RIGHT TO USE CONFIDENTIAL INFORMATION</h3>
                
                <h4 className="font-semibold text-slate-800 pl-2">3.1 Recipient’s Right to Use</h4>
                <p className="pl-4">
                  Each Recipient may only Use the other party’s Confidential Information for the Purpose and must not Use it for any other purpose.
                </p>

                <h4 className="font-semibold text-slate-800 pl-2 pt-2">3.2 Recipient’s Right to Disclose</h4>
                <p className="pl-4">Each Recipient may only disclose the other party’s Confidential Information:</p>
                <div className="pl-6 space-y-1 text-slate-700">
                  <p>(a) to those of its officers, employees and professional advisers who:</p>
                  <div className="pl-6 space-y-0.5">
                    <p>(i) have a specific need to have access to the Confidential Information for the Purpose;</p>
                    <p>(ii) have been notified in writing of the terms on which the Provider made its Confidential Information available to the Recipient and have been directed to comply with those terms; and</p>
                    <p>(iii) have agreed to comply with the terms of this Agreement.</p>
                  </div>
                  <p className="pt-1">(b) if it is required to do so by law, the Recipient must disclose only that part of the Confidential Information as is necessary in order to satisfy such a requirement.</p>
                </div>

                <h4 className="font-semibold text-slate-800 pl-2 pt-2">3.3 Recipient Must Ensure Compliance</h4>
                <p className="pl-4">Each Recipient must, at its own expense:</p>
                <div className="pl-6 space-y-1 text-slate-700">
                  <p>(a) ensure that each person to whom the Confidential Information is disclosed pursuant to Clause 3.2(a) complies with this Agreement;</p>
                  <p>(b) immediately notify the Provider of any actual or suspected breach of the terms of this Agreement by any of the persons to whom the Confidential Information is disclosed pursuant to Clause 3.2(a); and</p>
                  <p>(c) immediately take all reasonable steps to avoid or stop a breach of this Agreement, and comply with any reasonable directions issued by the Provider regarding a suspected or actual breach.</p>
                </div>

                <h4 className="font-semibold text-slate-800 pl-2 pt-2">3.4 Security Procedures</h4>
                <p className="pl-4">Each Recipient must:</p>
                <div className="pl-6 space-y-1 text-slate-700">
                  <p>(a) establish and maintain effective security measures to safeguard the Confidential Information from unauthorised Use; and</p>
                  <p>(b) immediately notify the Provider of any actual or suspected unauthorised Use of the Provider’s Confidential Information.</p>
                </div>
              </div>

              {/* CLAUSE 4 */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900">4. CONFIDENTIAL INFORMATION WHICH CEASES TO BE CONFIDENTIAL</h3>
                <p className="pl-2">This Agreement does not apply to any Confidential Information which:</p>
                <div className="pl-6 space-y-1 text-slate-700">
                  <p>(a) is or becomes freely available to the public unless as a result of a breach of this Agreement;</p>
                  <p>(b) is disclosed to the Recipient by a third person, whom the Recipient knows has a legal entitlement to possess and disclose the Confidential Information; or</p>
                  <p>(c) the Recipient proves it knew before the Provider disclosed the Confidential Information to the Recipient.</p>
                </div>
              </div>

              {/* CLAUSE 5 */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900">5. RETURN OF CONFIDENTIAL INFORMATION</h3>
                
                <h4 className="font-semibold text-slate-800 pl-2">5.1 Right to Demand Return</h4>
                <p className="pl-4">
                  The Provider may request the Recipient to return or destroy the Confidential Information at any time without giving reasons.
                </p>

                <h4 className="font-semibold text-slate-800 pl-2 pt-2">5.2 Recipient Must Comply</h4>
                <p className="pl-4">
                  The Recipient must immediately comply with any request under Clause 5.1. The Recipient must certify in writing to the Provider that it has fully complied with the request.
                </p>

                <h4 className="font-semibold text-slate-800 pl-2 pt-2">5.3 Return or Destruction of Copies</h4>
                <p className="pl-4">
                  The Recipient's obligations under this Clause extend to all copies summaries, notes or reproductions of the Confidential Information which are in its possession or control or in the possession or control of any person to whom disclosure has been made under Clause 3.2(a).
                </p>
              </div>

              {/* CLAUSE 6 */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900">6. OWNERSHIP OF THE CONFIDENTIAL INFORMATION</h3>
                
                <h4 className="font-semibold text-slate-800 pl-2">6.1 Acknowledgment of Ownership</h4>
                <p className="pl-4">Each Recipient acknowledges and agrees that:</p>
                <div className="pl-6 space-y-1 text-slate-700">
                  <p>(a) this Agreement does not give the Recipient any right, title, licence or interest in the Provider’s Confidential Information;</p>
                  <p>(b) all right, title and interest in any copies, summaries or notes (including those prepared by a party to this Agreement other than the Provider) or reproductions of the Provider’s Confidential Information created by the Recipient or by any of the persons to whom the Confidential Information is disclosed pursuant to Clause 3.2(a) vest exclusively in the Provider on and from the date of their creation; and</p>
                  <p>(c) this Agreement does not assign to the Recipient any intellectual property rights, and the Recipient agrees not to claim that it has any intellectual property rights, in or arising from the Confidential Information or in connection with the Purpose.</p>
                </div>
              </div>

              {/* CLAUSE 7 */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900">7. EXCLUSION OF WARRANTIES</h3>
                
                <h4 className="font-semibold text-slate-800 pl-2">7.1 No Warranty as to Accuracy or Completeness</h4>
                <p className="pl-4">
                  The Provider does not represent or warrant that the Confidential Information is complete or accurate.
                </p>
              </div>

              {/* CLAUSE 8 */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900">8. LIABILITY</h3>
                
                <h4 className="font-semibold text-slate-800 pl-2">8.1 Recipient’s Liability</h4>
                <p className="pl-4">
                  Each Recipient, in addition to all the Provider’s other legal rights, is liable for and indemnifies the Provider against all loss, damage or expense (including legal costs on a solicitor/client basis) suffered or incurred by the Provider which arises from any breach of this Agreement by the Recipient or which arises from any unauthorised Use of the Provider’s Confidential Information by a person to whom the Confidential Information is disclosed pursuant to Clause 3.2(a).
                </p>

                <h4 className="font-semibold text-slate-800 pl-2 pt-2">8.2 Acknowledgment of Recipient</h4>
                <p className="pl-4">
                  Each Recipient acknowledges that breach of this Agreement may cause the Provider to suffer loss, damage and expense for which damages may not be adequate compensation and difficult to ascertain. Accordingly each Recipient agrees that the Provider is entitled to immediately seek to restrain, by injunction or any similar remedy, any conduct, actual or threatened, which is in breach of this Agreement.
                </p>
              </div>

              {/* CLAUSE 9 */}
              <div className="space-y-2">
                <h3 className="font-bold text-slate-900">9. GENERAL</h3>
                <div className="pl-4 space-y-1.5 text-slate-700">
                  <p>9.1 This Agreement contains the entire understanding between the parties concerning the subject matter of the Agreement and supersedes all prior communications between the parties.</p>
                  <p>9.2 A failure, delay, relaxation or indulgence by a party in exercising any power or right conferred on the party by this Agreement does not operate as a waiver of the power or right. A waiver of a breach does not operate as a waiver of any other breach.</p>
                  <p>9.3 This Agreement cannot be amended or varied except in writing signed by the parties.</p>
                  <p>9.4 If this Agreement consists of a number of counterparts, each is an original and all of the counterparts together constitute the same document.</p>
                  <p>9.5 Any notice or other communication to or by a party to this Agreement:</p>
                  <div className="pl-6 space-y-0.5">
                    <p>(a) may be given by personal service, post or facsimile;</p>
                    <p>(b) must be in writing, legible and in English addressed as shown at the commencement or to any other address last notified by the party to the sender by notice given in accordance with this clause;</p>
                  </div>
                  <p>9.6 This Agreement, and any rights or obligations hereunder, shall not be assigned or otherwise transferred by either party without the prior written approval of the other (which may be withheld in the others absolute discretion).</p>
                  <p>9.7 This Agreement is governed by and must be construed in accordance with the laws of the State of New South Wales. The parties submit to the non-exclusive jurisdiction of the Courts of that State and the Commonwealth of Australia in respect of all matters or things arising out of this Agreement.</p>
                </div>
              </div>

              {/* EXECUTION SECTION */}
              <div className="pt-6 border-t space-y-4">
                <h3 className="font-bold text-[#095c7b] uppercase tracking-wider text-xs">
                  Executed by the Parties as an Agreement
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Party 1 Signer */}
                  <div className="p-4 border rounded-xl bg-slate-50 space-y-2">
                    <p className="font-bold text-slate-900 text-[11px]">SIGNED for and on behalf of {providerName}</p>
                    <p className="text-[11px] text-slate-600">in the presence of:</p>
                    <div className="pt-3 space-y-2">
                      <div className="border-b border-slate-300 pb-1 font-mono text-[11px] text-slate-800">
                        {providerContact}
                      </div>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase">Signature of Authorised Person / Discloser</p>
                    </div>
                  </div>

                  {/* Party 2 Candidate Signer Preview */}
                  <div className="p-4 border rounded-xl bg-slate-50 space-y-2">
                    <p className="font-bold text-slate-900 text-[11px]">SIGNED for and on behalf of {displayRecipientName}</p>
                    <p className="text-[11px] text-slate-600">in the presence of:</p>
                    <div className="pt-3 space-y-2">
                      <div className="border-b border-slate-300 pb-1 font-mono text-[11px] text-slate-800">
                        {signerName || displayRecipientName}
                      </div>
                      <p className="text-[10px] text-slate-500 font-semibold uppercase">Signature of Authorised Person / Candidate</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Digital Signature Execution Form */}
        <Card className="shadow-md border">
          <CardHeader className="bg-slate-50 border-b pb-3">
            <CardTitle className="text-sm font-bold text-[#095c7b] flex items-center gap-2">
              <PenTool className="h-4 w-4" /> Candidate Digital Signature & Execution
            </CardTitle>
            <CardDescription className="text-xs">
              Complete your legal details and draw your signature below to execute the Confidentiality Deed online.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Full Legal Name <span className="text-red-500">*</span></Label>
                  <Input
                    required
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="e.g. John Smith"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Email Address <span className="text-red-500">*</span></Label>
                  <Input
                    required
                    type="email"
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                    placeholder="john.smith@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Residential / Business Address</Label>
                <Input
                  value={signerAddress}
                  onChange={(e) => setSignerAddress(e.target.value)}
                  placeholder="Street address, suburb, state, postcode"
                />
              </div>

              {/* Signature Canvas Box */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    Draw Digital Signature Below <span className="text-red-500">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearCanvas}
                    className="h-6 text-[11px] text-slate-500 hover:text-red-600 gap-1"
                  >
                    <RefreshCw className="h-3 w-3" /> Clear Signature
                  </Button>
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-lg p-1 bg-slate-50 touch-none">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={150}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full bg-white rounded cursor-crosshair"
                  />
                </div>
                <p className="text-[10px] text-slate-400">Use mouse, touch screen, or stylus to draw signature inside the box.</p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-[11px] text-slate-700 leading-relaxed">
                By clicking "Sign & Execute Deed", I confirm that the information provided above is accurate, and that I agree to execute and be legally bound by all terms, conditions, and obligations set out in this Confidentiality Deed.
              </div>

              <Button
                type="submit"
                disabled={submitting || !hasSignature}
                className="w-full bg-[#095c7b] hover:bg-[#074760] text-white py-2.5 font-bold shadow text-sm"
              >
                {submitting ? <Loader className="h-4 w-4 mr-2 animate-spin" /> : null}
                Sign & Execute Deed
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}
