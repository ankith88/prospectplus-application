"use client"

import React, { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, HelpCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export const GLOSSARY = [
  {
    category: "Records",
    items: [
      { term: "Lead", definition: "The central record tracking prospects from initial contact to won customers. (collection: leads)", field: "leads" },
      { term: "Company", definition: "Organisations linked to one or more leads. (collection: companies)", field: "companies" },
      { term: "User", definition: "A registered representative or staff member account. (collection: users)", field: "users" },
      { term: "Franchisee", definition: "MailPlus franchise operator with a designated territory. (collection: franchisees)", field: "franchisees" }
    ]
  },
  {
    category: "Pipeline",
    items: [
      { term: "Bucket", definition: "Top-level grouping: outbound, inbound, field_sales, account_manager, customer_success, nurture, marketing.", field: "bucket" },
      { term: "Status", definition: "The exact pipeline stage. (e.g. New, Hot Lead, Qualified, Pre Qualified, Quote Sent, Won, Lost, etc.)", field: "status" }
    ]
  },
  {
    category: "Assignments",
    items: [
      { term: "Dialer", definition: "The outbound agent working to set appointments.", field: "dialerAssigned" },
      { term: "Account Manager (AM)", definition: "The manager owning client retention and satisfaction.", field: "accountManagerAssigned" },
      { term: "Sales Rep / Field Rep", definition: "Rep driving the pipeline forward in territories.", field: "salesRepAssigned / fieldRepAssigned" }
    ]
  },
  {
    category: "Concepts",
    items: [
      { term: "Discovery", definition: "Qualifying a prospect's delivery profile, generating a discovery score.", field: "totalScore" },
      { term: "SCF", definition: "Service Confirmation Form; the digital quote sent to secure a signed customer.", field: "quoteSentAt" },
      { term: "Territory check", definition: "Validating a postcode/address to align with the correct franchisee.", field: "franchisee" },
      { term: "MRR", definition: "Monthly Recurring Revenue; tracks lead's value.", field: "rate" }
    ]
  }
];

export const EXAMPLES = [
  {
    title: "Leads & pipeline",
    questions: [
      "Show my hot leads",
      "Leads in the outbound bucket with no answer, sorted by date entered",
      "Count leads by status",
      "Leads with a follow-up due this week",
      "Quotes sent this week that aren't won yet"
    ]
  },
  {
    title: "Sales & Performance",
    questions: [
      "How many leads did we win last month?",
      "Show all dialers",
      "Out of territory leads",
      "Companies in the Sydney franchisee territory"
    ]
  }
];

interface TerminologyPanelProps {
  onSelectExample: (q: string) => void;
}

export function TerminologyPanel({ onSelectExample }: TerminologyPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="w-full lg:w-80 bg-white border-l border-border text-slate-700 p-4 overflow-y-auto flex flex-col gap-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg flex items-center gap-2 text-[#1A3D33] font-serif">
          <BookOpen className="h-5 w-5 text-[#095c7b]" />
          Terminology Helper
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="text-slate-500 hover:text-slate-800"
        >
          {isOpen ? "Collapse" : "Expand"}
        </Button>
      </div>

      {isOpen && (
        <>
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Glossary & Fields</h4>
            <Accordion type="single" collapsible className="w-full">
              {GLOSSARY.map((group, idx) => (
                <AccordionItem key={idx} value={`item-${idx}`} className="border-border">
                  <AccordionTrigger className="text-sm font-medium py-2 hover:text-[#095c7b] text-slate-700">
                    {group.category}
                  </AccordionTrigger>
                  <AccordionContent className="flex flex-col gap-3 pt-1 text-xs text-slate-500">
                    {group.items.map((it, i) => (
                      <div key={i} className="border-b border-border/40 pb-2">
                        <div className="flex items-center justify-between text-slate-700 font-semibold">
                          <span>{it.term}</span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1 rounded">{it.field}</span>
                        </div>
                        <p className="mt-1 leading-relaxed">{it.definition}</p>
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Example Queries</h4>
            <div className="flex flex-col gap-4">
              {EXAMPLES.map((group, idx) => (
                <div key={idx} className="flex flex-col gap-2">
                  <h5 className="text-xs font-medium text-slate-400">{group.title}</h5>
                  <div className="flex flex-col gap-1.5">
                    {group.questions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => onSelectExample(q)}
                        className="text-left text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 border border-border p-2 rounded-md transition duration-150 flex items-start gap-2 group shadow-sm"
                      >
                        <Play className="h-3 w-3 mt-0.5 text-[#095c7b] shrink-0" />
                        <span>{q}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
