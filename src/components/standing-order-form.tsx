'use client'

import { useRef, useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { updateLeadDetails } from "@/services/firebase"
import type { Lead } from "@/lib/types"
import { Loader } from "./ui/loader"
import { FileDown, Edit, Check, Trash2, CalendarIcon } from "lucide-react"

interface SofDialogProps {
  lead: Lead
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onLeadUpdated: (updatedLead: Partial<Lead>, oldLead: Lead) => void
}

export function SofDialog({ lead, isOpen, onOpenChange, onLeadUpdated }: SofDialogProps) {
  const { toast } = useToast()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const printAreaRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [position, setPosition] = useState(lead.sofDetails?.position ?? "")
  const [date, setDate] = useState(lead.sofDetails?.date ?? new Date().toLocaleDateString("en-AU"))
  const [hasSigned, setHasSigned] = useState(!!lead.sofDetails?.signatureDataUrl)
  const [signatureUrl, setSignatureUrl] = useState(lead.sofDetails?.signatureDataUrl ?? "")
  const [isSaving, setIsSaving] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  // Initialize canvas drawing contexts and default line properties
  useEffect(() => {
    if (isOpen && !hasSigned && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.strokeStyle = "#000000"
        ctx.lineWidth = 2
        ctx.lineCap = "round"
      }
    }
  }, [isOpen, hasSigned])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    let x, y
    if ("touches" in e) {
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
    } else {
      x = e.nativeEvent.clientX - rect.left;
      y = e.nativeEvent.clientY - rect.top;
    }

    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    let x, y
    if ("touches" in e) {
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
    } else {
      x = e.nativeEvent.clientX - rect.left;
      y = e.nativeEvent.clientY - rect.top;
    }

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSignatureUrl("")
    setHasSigned(false)
  }

  const saveSignatureDetails = async () => {
    let currentSignature = signatureUrl
    
    if (!hasSigned) {
      const canvas = canvasRef.current
      if (!canvas) return
      
      // Check if canvas is blank
      const blank = document.createElement("canvas")
      blank.width = canvas.width
      blank.height = canvas.height
      if (canvas.toDataURL() === blank.toDataURL()) {
        toast({
          variant: "destructive",
          title: "Signature Required",
          description: "Please sign the form before saving.",
        })
        return
      }

      currentSignature = canvas.toDataURL()
    }

    if (!position.trim()) {
      toast({
        variant: "destructive",
        title: "Position Required",
        description: "Please enter your position (e.g. Manager, Director).",
      })
      return
    }

    setIsSaving(true)
    try {
      const sofDetails = {
        signatureDataUrl: currentSignature,
        position: position,
        date: date,
        signedAt: new Date().toISOString()
      }

      await updateLeadDetails(lead.id, lead, { sofDetails })
      setSignatureUrl(currentSignature)
      setHasSigned(true)
      onLeadUpdated({ sofDetails }, lead)

      toast({
        title: "Form Signed",
        description: "Standing Order Form has been signed and authorized successfully.",
      })
    } catch (e) {
      console.error(e)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save signature details.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const downloadPdf = async () => {
    if (!hasSigned) {
      toast({
        variant: "destructive",
        title: "Signature Required",
        description: "Please sign and save the form before exporting to PDF.",
      })
      return
    }

    setIsDownloading(true)
    try {
      const { jsPDF } = await import("jspdf")
      const html2canvas = (await import("html2canvas")).default
      
      const element = printAreaRef.current
      if (!element) return

      // Use html2canvas to capture the form exactly as displayed
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff"
      })

      const imgData = canvas.toDataURL("image/png")
      
      // Create PDF in A4 proportions
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      })

      const imgWidth = 210 // A4 width in mm
      const pageHeight = 295 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let positionY = 0

      pdf.addImage(imgData, "PNG", 0, positionY, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        positionY = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, "PNG", 0, positionY, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`Standing_Order_Form_${lead.companyName.replace(/\s+/g, "_")}.pdf`)
      
      toast({
        title: "PDF Downloaded",
        description: "Standing Order Form has been saved to your downloads.",
      })
    } catch (e) {
      console.error(e)
      toast({
        variant: "destructive",
        title: "PDF Generation Failed",
        description: "An error occurred while generating the PDF.",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  // Format Address strings for Premises and Postal addresses
  const formattedSiteAddress = lead.address 
    ? `${lead.address.street || ""}, ${lead.address.city || ""} ${lead.address.state || ""}`.trim()
    : "N/A"
  const postcodeSite = lead.address?.zip ?? ""

  const postalBoxText = lead.postalAddress?.street ?? "N/A"

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col bg-slate-50 border p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-primary">
            Australia Post Standing Order Form
          </DialogTitle>
          <DialogDescription className="text-xs">
            Review, sign, and download the Standing Order Form (R9B) for delivering Signature on Delivery mail.
          </DialogDescription>
        </DialogHeader>

        {/* Outer scroll area around the form */}
        <div className="flex-1 overflow-y-auto pr-2 my-2 space-y-4">
          
          {/* Action Buttons Header */}
          <div className="flex justify-end items-center gap-3">
            {hasSigned ? (
              <Button 
                variant="outline" 
                onClick={() => setHasSigned(false)} 
                className="bg-white hover:bg-slate-100 text-slate-700"
              >
                <Edit className="w-4 h-4 mr-2" /> Re-sign Form
              </Button>
            ) : null}
            <Button 
              onClick={downloadPdf} 
              disabled={isDownloading || !hasSigned} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
            >
              {isDownloading ? (
                <Loader className="w-4 h-4 mr-2" />
              ) : (
                <FileDown className="w-4 h-4 mr-2" />
              )}
              Download PDF
            </Button>
          </div>

          {/* Authentic Form layout to capture as PDF */}
          <div 
            ref={printAreaRef}
            className="w-full bg-white text-black p-8 border border-gray-300 font-sans shadow-md"
            style={{ width: "100%", maxWidth: "800px", margin: "0 auto", fontSize: "12px", lineHeight: "1.4" }}
          >
            {/* Logo and Form Name Header */}
            <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
              <div>
                <h1 className="text-xl font-black tracking-tight" style={{ fontSize: "20px" }}>
                  Standing Order to deliver
                </h1>
                <h1 className="text-xl font-black tracking-tight flex items-baseline gap-2" style={{ fontSize: "20px" }}>
                  Signature on Delivery Mail <span className="text-xs font-normal" style={{ fontSize: "11px" }}>- R9B</span>
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-wider text-right text-xs" style={{ fontSize: "10px", lineHeight: "1" }}>
                  AUSTRALIA
                  <span className="block font-black text-sm" style={{ fontSize: "14px" }}>POST</span>
                </span>
                <svg width="30" height="30" viewBox="0 0 100 100" className="fill-red-600 text-red-600">
                  <circle cx="50" cy="50" r="45" />
                  <circle cx="50" cy="50" r="28" fill="white" />
                  <rect x="44" y="22" width="12" height="20" fill="white" />
                  <path d="M 44,22 C 34,22 28,30 28,40 L 44,40 Z" fill="white" />
                </svg>
              </div>
            </div>

            {/* Note text */}
            <p className="italic text-xs mb-4 text-gray-700" style={{ fontSize: "10px" }}>
              Note: This form does not apply to Registered Post - Person to Person Items posted within Australia
            </p>

            {/* To Box */}
            <div className="bg-[#eef5fc] p-3 rounded mb-4 border border-dashed border-sky-300">
              <span className="font-bold">To: Postal Manager</span>
              <span className="border-b border-dotted border-black ml-2 inline-block w-64 h-4"></span>
            </div>

            {/* Authority Statement */}
            <div className="space-y-2 mb-4">
              <p>
                Until further advised you are hereby authorised to deliver to the agents nominated, all Signature on Delivery mail addressed to the person, firm, organisation, etc., as shown below.
              </p>
              <p className="font-bold text-gray-800">
                This order cancels any orders previously issued.
              </p>
            </div>

            {/* Main Information Grid/Table */}
            <table className="w-full border-collapse border-2 border-black mb-4">
              <tbody>
                <tr className="border-b border-black">
                  <td className="w-3/4 p-2 border-r border-black valign-top" style={{ height: "65px" }}>
                    <div className="text-[10px] uppercase font-bold text-gray-600" style={{ fontSize: "9px" }}>
                      Name of Person, Firm, Company, etc. (BLOCK LETTERS)
                    </div>
                    <div className="text-sm font-bold mt-1" style={{ fontSize: "13px" }}>
                      {lead.companyName.toUpperCase()}
                    </div>
                  </td>
                  <td className="w-1/4 p-2 valign-top">
                    <div className="text-[10px] uppercase font-bold text-gray-600" style={{ fontSize: "9px" }}>
                      Telephone Number
                    </div>
                    <div className="text-sm font-bold mt-1" style={{ fontSize: "13px" }}>
                      {lead.customerPhone || "N/A"}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="w-3/4 p-2 border-r border-black valign-top" style={{ height: "65px" }}>
                    <div className="text-[10px] uppercase font-bold text-gray-600" style={{ fontSize: "9px" }}>
                      Address of Premises
                    </div>
                    <div className="flex justify-between items-baseline mt-1">
                      <span className="text-sm font-bold" style={{ fontSize: "13px" }}>{formattedSiteAddress.toUpperCase()}</span>
                      <span className="text-[10px] font-bold text-gray-700" style={{ fontSize: "10px" }}>
                        Postcode <span className="border-b border-black font-bold px-1 ml-1 text-sm">{postcodeSite}</span>
                      </span>
                    </div>
                  </td>
                  <td className="w-1/4 p-2 valign-top">
                    <div className="text-[10px] uppercase font-bold text-gray-600" style={{ fontSize: "9px" }}>
                      Private Box Number
                    </div>
                    <div className="text-sm font-bold mt-1 text-red-600" style={{ fontSize: "13px" }}>
                      {postalBoxText.toUpperCase()}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Authorised Agents Heading */}
            <div className="text-center font-bold text-sm border-b-2 border-black pb-1 mb-2" style={{ fontSize: "12px" }}>
              Details of Authorised Agents
            </div>

            {/* Agents Table */}
            <table className="w-full border-collapse border-b-2 border-black mb-6">
              <thead>
                <tr className="border-b-2 border-black text-center text-[10px] font-bold text-gray-700" style={{ fontSize: "10px" }}>
                  <th className="w-[45%] py-1 border-r border-black">Surname (BLOCK LETTERS)</th>
                  <th className="w-[10%] py-1 border-r border-black">Initials</th>
                  <th className="w-[45%] py-1">Specimen Signature</th>
                </tr>
              </thead>
              <tbody>
                {/* MailPlus Default Agent Row */}
                <tr className="border-b border-black text-center font-bold" style={{ height: "30px", fontSize: "11px" }}>
                  <td className="border-r border-black py-1">MAILPLUS</td>
                  <td className="border-r border-black py-1">ANY</td>
                  <td className="py-1 text-gray-600 text-xs italic" style={{ fontSize: "10px" }}>
                    Company uniform & identification
                  </td>
                </tr>
                {/* Empty dotted agent rows as shown in the screenshot */}
                {Array.from({ length: 9 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-300 text-center" style={{ height: "24px" }}>
                    <td className="border-r border-black border-dashed py-1"></td>
                    <td className="border-r border-black border-dashed py-1"></td>
                    <td className="py-1"></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Authorization Signatures Grid */}
            <div className="grid grid-cols-3 gap-6 items-end mb-6 pt-4">
              <div className="text-center">
                <div className="h-16 flex items-center justify-center border-b border-dotted border-black relative">
                  {signatureUrl ? (
                    <img src={signatureUrl} alt="Signature" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-gray-400 italic">Unsigned</span>
                  )}
                </div>
                <div className="text-[10px] font-bold text-gray-600 mt-1" style={{ fontSize: "9px" }}>
                  Signature of Authorising Person
                </div>
              </div>
              <div className="text-center">
                <div className="h-16 flex items-end justify-center border-b border-dotted border-black">
                  <span className="font-bold pb-1 text-xs" style={{ fontSize: "11px" }}>{position.toUpperCase()}</span>
                </div>
                <div className="text-[10px] font-bold text-gray-600 mt-1" style={{ fontSize: "9px" }}>
                  Position held with Firm, Company, etc..
                </div>
              </div>
              <div className="text-center">
                <div className="h-16 flex items-end justify-center border-b border-dotted border-black">
                  <span className="font-bold pb-1 text-xs" style={{ fontSize: "11px" }}>{date}</span>
                </div>
                <div className="text-[10px] font-bold text-gray-600 mt-1" style={{ fontSize: "9px" }}>
                  Date
                </div>
              </div>
            </div>

            {/* Australia Post Use Only Section */}
            <div className="border border-black p-3" style={{ fontSize: "10px" }}>
              <div className="text-center font-bold mb-2 uppercase tracking-wide" style={{ fontSize: "10px" }}>
                Australia Post Use Only
              </div>
              <div className="flex justify-between items-start gap-4">
                {/* Noted table */}
                <div className="w-2/3">
                  <span className="font-bold text-[9px]">Noted</span>
                  <table className="w-full border-collapse border border-black text-center text-[9px] mt-1">
                    <tbody>
                      <tr className="border-b border-black" style={{ height: "20px" }}>
                        <td className="border-r border-black p-0.5 font-bold w-12 bg-gray-50">Initials</td>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <td key={i} className="border-r border-black w-12"></td>
                        ))}
                      </tr>
                      <tr style={{ height: "20px" }}>
                        <td className="border-r border-black p-0.5 font-bold bg-gray-50">Date</td>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <td key={i} className="border-r border-black text-center text-[8px] text-gray-400">
                            / &nbsp; /
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Order Number Box */}
                <div className="w-1/3 flex flex-col justify-end items-end h-full">
                  <div className="border border-black w-full h-12 p-1 text-left relative bg-gray-50">
                    <span className="text-[8px] text-gray-500 font-bold block">Order Number</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Form code footnote */}
            <div className="text-right mt-2 text-[9px] text-gray-500" style={{ fontSize: "8px" }}>
              8836930 • Oct'98
            </div>
          </div>

          {/* Interactive Signature Input Section (Only visible when form needs signing) */}
          {!hasSigned ? (
            <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <Edit className="w-4 h-4 text-primary" /> Sign the Form digitally
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Signature canvas */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">Draw Signature</Label>
                  <div className="border border-slate-300 rounded-lg overflow-hidden bg-slate-50 relative h-36">
                    <canvas
                      ref={canvasRef}
                      width={380}
                      height={140}
                      className="w-full h-full cursor-crosshair touch-none"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearSignature}
                      className="absolute top-2 right-2 h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
                    </Button>
                  </div>
                </div>

                {/* Signatory metadata fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="position" className="text-xs font-semibold text-slate-700">
                      Position held with Firm, Company, etc.
                    </Label>
                    <Input 
                      id="position"
                      placeholder="e.g. Director, Operations Manager"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-xs font-semibold text-slate-700">
                      Date
                    </Label>
                    <div className="relative">
                      <Input 
                        id="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="text-sm pl-9"
                      />
                      <CalendarIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Authorize action */}
              <div className="flex justify-end pt-2">
                <Button 
                  onClick={saveSignatureDetails} 
                  disabled={isSaving}
                  className="bg-primary hover:bg-primary/95 text-white font-semibold flex items-center gap-1.5 shadow"
                >
                  {isSaving ? <Loader className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  Save & Record Signature
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-emerald-800 text-sm">Form Digitally Authorized</h4>
                  <p className="text-xs text-emerald-700">
                    Signed by {position || "Authorised Person"} on {date}. Ready to export.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
