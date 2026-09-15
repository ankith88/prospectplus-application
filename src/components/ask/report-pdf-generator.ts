import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ReportPdfOptions {
  title: string;
  humanSummary: string;
  insights?: string;
  spec?: any;
  elementIdToCapture?: string;
  rows?: any[];
  columns?: string[];
  userName?: string;
}

export async function generateExecutiveReportPdf({
  title,
  humanSummary,
  insights,
  spec,
  elementIdToCapture,
  rows = [],
  columns = [],
  userName = "Prospect+ User",
}: ReportPdfOptions) {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;

    // 1. Header Banner
    doc.setFillColor(9, 92, 123); // #095c7b
    doc.rect(0, 0, pageWidth, 28, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("MailPlus | Prospect+ Executive Briefing", margin, 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(224, 242, 254);
    const dateStr = new Date().toLocaleDateString("en-AU", {
      timeZone: "Australia/Sydney",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    doc.text(`Generated on ${dateStr} (AEST) • User: ${userName}`, margin, 21);

    let currentY = 38;

    // 2. Query Title & Summary Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, currentY, contentWidth, 22, 2, 2, "FD");

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(title || "CRM Analytics Report", margin + 4, currentY + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    const splitSummary = doc.splitTextToSize(humanSummary || "", contentWidth - 8);
    doc.text(splitSummary, margin + 4, currentY + 14);

    currentY += 28;

    // 3. AI Executive Insights
    if (insights) {
      doc.setFillColor(240, 253, 250); // teal tint
      doc.setDrawColor(153, 246, 228);
      doc.roundedRect(margin, currentY, contentWidth, 18, 2, 2, "FD");

      doc.setTextColor(19, 78, 74);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text("💡 AI Executive Takeaway:", margin + 4, currentY + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(17, 94, 89);
      const splitInsights = doc.splitTextToSize(insights, contentWidth - 8);
      doc.text(splitInsights, margin + 4, currentY + 12);

      currentY += 24;
    }

    // 4. Capture Embedded Visual / Chart if elementId provided
    if (elementIdToCapture) {
      const el = document.getElementById(elementIdToCapture);
      if (el) {
        try {
          const canvas = await html2canvas(el, {
            scale: 2,
            useCORS: true,
            logging: false,
          });
          const imgData = canvas.toDataURL("image/png");
          const imgHeight = (canvas.height * contentWidth) / canvas.width;
          const clampedHeight = Math.min(imgHeight, 80);

          if (currentY + clampedHeight > pageHeight - 30) {
            doc.addPage();
            currentY = 20;
          }

          doc.addImage(imgData, "PNG", margin, currentY, contentWidth, clampedHeight);
          currentY += clampedHeight + 8;
        } catch (canvasErr) {
          console.warn("Could not capture chart to canvas:", canvasErr);
        }
      }
    }

    // 5. Data Summary Table
    if (rows && rows.length > 0 && columns && columns.length > 0) {
      if (currentY > pageHeight - 45) {
        doc.addPage();
        currentY = 20;
      }

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Summary Data Snapshot", margin, currentY);
      currentY += 5;

      const colsToPrint = columns.slice(0, 5);
      const colWidth = contentWidth / colsToPrint.length;

      // Table Header
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, currentY, contentWidth, 7, "F");
      doc.setTextColor(51, 65, 85);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);

      colsToPrint.forEach((col, idx) => {
        doc.text(String(col).toUpperCase(), margin + idx * colWidth + 2, currentY + 4.8);
      });
      currentY += 7;

      // Table Rows (up to 15 rows)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);

      const rowsToPrint = rows.slice(0, 15);
      rowsToPrint.forEach((row, rIdx) => {
        if (currentY > pageHeight - 20) {
          doc.addPage();
          currentY = 20;
        }
        if (rIdx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, currentY, contentWidth, 6, "F");
        }

        colsToPrint.forEach((col, cIdx) => {
          let cellVal = String(row[col] ?? "-");
          if (cellVal.length > 22) cellVal = cellVal.slice(0, 20) + "...";
          doc.text(cellVal, margin + cIdx * colWidth + 2, currentY + 4.2);
        });
        currentY += 6;
      });

      if (rows.length > 15) {
        currentY += 4;
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`... and ${rows.length - 15} additional records (see CSV export for full dataset).`, margin, currentY);
      }
    }

    // 6. Footer on all pages
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Prospect+ Confidential • Powered by MailPlus Australia • Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: "center" }
      );
    }

    doc.save(`ProspectPlus_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    return true;
  } catch (err) {
    console.error("Failed to generate PDF report:", err);
    throw err;
  }
}
