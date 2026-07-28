"use client";

import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search, Sparkles, X, Check, SlidersHorizontal, CornerDownRight } from 'lucide-react';
import { getMergedCancellationHierarchy } from '@/lib/cancellation-reasons-mapper';

export interface LossReasonPickerProps {
  cancellationThemes?: any[];
  selectedThemeId: string;
  selectedWhyId: string;
  selectedReasonId: string;
  onSelect: (themeId: string, whyId: string, reasonId: string) => void;
  disabled?: boolean;
}

interface FlattenedReason {
  themeId: string;
  themeName: string;
  whyId: string;
  whyName: string;
  reasonId: string;
  reasonName: string;
}

// Fallback hierarchy data if Firestore collection is loading or incomplete
const DEFAULT_CANCELLATION_HIERARCHY = [
  {
    id: "5",
    name: "Business Changes",
    whys: [
      {
        id: "3",
        name: "Closing the business",
        reasons: [
          { id: "7", name: "Non-voluntary administration" },
          { id: "6", name: "Voluntary administration" },
          { id: "209", name: "Re-evaluation of business" }
        ]
      },
      {
        id: "4",
        name: "Relocating the business",
        reasons: [
          { id: "9", name: "Moving locations to a non-serviceable area" },
          { id: "8", name: "Moving locations, service no longer required" }
        ]
      },
      {
        id: "10",
        name: "Change of entity",
        reasons: [
          { id: "17", name: "New owners signed new SCF" },
          { id: "16", name: "New owners are not interested in services" }
        ]
      },
      {
        id: "11",
        name: "Going electronic/Cashless",
        reasons: [
          { id: "18", name: "No longer carrying cash/cheques" }
        ]
      },
      {
        id: "12",
        name: "Closure of PO Box",
        reasons: [
          { id: "21", name: "Low mail volumes / going paperless" },
          { id: "19", name: "Moving to a non-serviceable area" },
          { id: "20", name: "Unpaid PO Box - closed by Aus Post" }
        ]
      },
      {
        id: "13",
        name: "Merging of offices",
        reasons: [
          { id: "22", name: "Service in one location no longer required" }
        ]
      },
      {
        id: "14",
        name: "Relocating - Aus Post Redirected",
        reasons: [
          { id: "23", name: "Aus Post redirecting PO Box mail to new location" }
        ]
      },
      {
        id: "15",
        name: "Relocation - New Franchisee",
        reasons: [
          { id: "24", name: "Moving locations, signed new SCF" }
        ]
      }
    ]
  },
  {
    id: "25",
    name: "Service & Quality Issues",
    whys: [
      {
        id: "31",
        name: "Shipping Quality Issues",
        reasons: [
          { id: "34", name: "Damaged items" },
          { id: "33", name: "Delayed deliveries" }
        ]
      },
      {
        id: "32",
        name: "Issues with Operations",
        reasons: [
          { id: "35", name: "Collection times" },
          { id: "130", name: "Other feedback (i.e. Operator Issue)" },
          { id: "36", name: "Conflicting views between franchisee and customer" },
          { id: "37", name: "Sweep issues cannot resolve" }
        ]
      },
      {
        id: "300",
        name: "Freight & Product Restrictions",
        reasons: [
          { id: "301", name: "Dangerous/prohibited goods" },
          { id: "302", name: "Ships items over 20kg" },
          { id: "303", name: "Needs standard shipping" },
          { id: "304", name: "Ships items internationally only" },
          { id: "305", name: "Requires pallet freight / heavy cargo" }
        ]
      }
    ]
  },
  {
    id: "26",
    name: "Cost & Financial",
    whys: [
      {
        id: "38",
        name: "Taking the service in-house",
        reasons: [
          { id: "42", name: "Cutting costs" },
          { id: "44", name: "Cost cutting and dissatisfied with MailPlus" },
          { id: "43", name: "Volume of mail decreased" }
        ]
      },
      {
        id: "39",
        name: "Payment issues",
        reasons: [
          { id: "46", name: "Can no longer afford services" },
          { id: "45", name: "Debt with MailPlus" }
        ]
      },
      {
        id: "40",
        name: "Fuel Surcharge",
        reasons: [
          { id: "48", name: "Product - Cannot be waived" },
          { id: "47", name: "Service - Franchisee chose not to waive" }
        ]
      },
      {
        id: "41",
        name: "Collection Fee",
        reasons: [
          { id: "49", name: "Volume cannot justify free shipping" }
        ]
      },
      {
        id: "310",
        name: "Pricing & Rates",
        reasons: [
          { id: "311", name: "Price too high" },
          { id: "312", name: "Rates not competitive vs current courier" }
        ]
      }
    ]
  },
  {
    id: "27",
    name: "Competitive & Strategic",
    whys: [
      {
        id: "51",
        name: "Going to a competitor",
        reasons: [
          { id: "58", name: "Cost savings" },
          { id: "57", name: "Dissatisfied with service" },
          { id: "56", name: "Value proposition" },
          { id: "55", name: "Technology advantage" }
        ]
      },
      {
        id: "50",
        name: "ShipMate Limitations",
        reasons: [
          { id: "54", name: "Customer going to another platform" },
          { id: "53", name: "Critical feature missing" },
          { id: "52", name: "Other feedback (i.e. Integration)" }
        ]
      },
      {
        id: "320",
        name: "IT & Systems Integration",
        reasons: [
          { id: "321", name: "Needs IT integration that is not available" },
          { id: "322", name: "Incompatible e-commerce / ERP platform" }
        ]
      }
    ]
  },
  {
    id: "28",
    name: "Volume & Demand",
    whys: [
      {
        id: "59",
        name: "Shipping Volume Decreased",
        reasons: [
          { id: "60", name: "Supply chain issues/disruptions" },
          { id: "61", name: "Low consumer demand/business turnover" },
          { id: "62", name: "Prefer standard low cost shipping" }
        ]
      },
      {
        id: "330",
        name: "Lead Volume Constraints",
        reasons: [
          { id: "331", name: "Volume too low / Under minimum requirement" }
        ]
      }
    ]
  },
  {
    id: "29",
    name: "HO Administrative",
    whys: [
      {
        id: "65",
        name: "Head Office Cancelled",
        reasons: [
          { id: "67", name: "Customer uncontactable for onboarding" },
          { id: "210", name: "Duplicate Accounts" },
          { id: "131", name: "Secure Cash / Neopost / Sendle / Dashback / RSEA" },
          { id: "66", name: "Data Wash" }
        ]
      },
      {
        id: "64",
        name: "Franchisee Reasons",
        reasons: [
          { id: "68", name: "Customer behavioral issues" },
          { id: "69", name: "Customer revenue not worth the travel" },
          { id: "70", name: "Unable to do the banking" }
        ]
      },
      {
        id: "63",
        name: "Merge Accounts",
        reasons: [
          { id: "71", name: "There are 2 separate customers for departments" }
        ]
      }
    ]
  },
  {
    id: "30",
    name: "Poor Engagement / Follow Up",
    whys: [
      {
        id: "76",
        name: "No Service",
        reasons: [
          { id: "77", name: "Service did not start after signing SCF" }
        ]
      },
      {
        id: "72",
        name: "Not responsive",
        reasons: [
          { id: "73", name: "Customer is not engaging with HO after cancellation received" },
          { id: "81", name: "No response to multiple phone/email follow-up attempts" },
          { id: "82", name: "Unable to establish contact / gatekeeper blocking" }
        ]
      },
      {
        id: "78",
        name: "Invalid Contact Information",
        reasons: [
          { id: "79", name: "Phone number disconnected / invalid line" },
          { id: "80", name: "Incorrect phone number provided / wrong contact" }
        ]
      },
      {
        id: "83",
        name: "Customer Request / Preference",
        reasons: [
          { id: "84", name: "Customer requested Do Not Call / Do Not Contact" }
        ]
      },
      {
        id: "74",
        name: "Onboarding cancelled",
        reasons: [
          { id: "75", name: "Customer went cold after signing SCF and/or cancelled onboarding" }
        ]
      }
    ]
  }
];

// Preset Quick Pills with explicit reasonId, matchReason, and fallback keywords
const QUICK_PILLS = [
  {
    label: "Price too high",
    reasonId: "311",
    matchReason: "Price too high",
    keywords: ["price too high", "pricing", "price", "rates"]
  },
  {
    label: "Over 20kg items",
    reasonId: "302",
    matchReason: "Ships items over 20kg",
    keywords: ["20kg", "over 20kg", "ships items over 20kg"]
  },
  {
    label: "Needs IT integration",
    reasonId: "321",
    matchReason: "Needs IT integration that is not available",
    keywords: ["it integration", "needs it integration", "integration"]
  },
  {
    label: "Needs standard shipping",
    reasonId: "303",
    matchReason: "Needs standard shipping",
    keywords: ["needs standard shipping", "standard shipping"]
  },
  {
    label: "Dangerous / prohibited goods",
    reasonId: "301",
    matchReason: "Dangerous/prohibited goods",
    keywords: ["dangerous", "prohibited", "prohibited goods", "dangerous/prohibited goods"]
  },
  {
    label: "No response to follow-ups",
    reasonId: "81",
    matchReason: "No response to multiple phone/email follow-up attempts",
    keywords: ["no response", "follow-up attempts", "not responsive"]
  }
];

export function LossReasonPicker({
  cancellationThemes = [],
  selectedThemeId,
  selectedWhyId,
  selectedReasonId,
  onSelect,
  disabled = false
}: LossReasonPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showManualDropdowns, setShowManualDropdowns] = useState(false);

  // Flatten hierarchy into a searchable single-level list
  const activeThemes = useMemo(() => {
    return getMergedCancellationHierarchy(cancellationThemes);
  }, [cancellationThemes]);

  const allReasons: FlattenedReason[] = useMemo(() => {
    const list: FlattenedReason[] = [];
    if (!activeThemes || !Array.isArray(activeThemes)) return list;

    for (const theme of activeThemes) {
      if (!theme.whys || !Array.isArray(theme.whys)) continue;
      for (const why of theme.whys) {
        if (!why.reasons || !Array.isArray(why.reasons)) continue;
        for (const reason of why.reasons) {
          list.push({
            themeId: String(theme.id),
            themeName: theme.name,
            whyId: String(why.id),
            whyName: why.name,
            reasonId: String(reason.id),
            reasonName: reason.name
          });
        }
      }
    }
    return list;
  }, [activeThemes]);

  // Helper to resolve matching reason object for a quick pill
  const findPillMatch = (pill: typeof QUICK_PILLS[number], reasonsList: FlattenedReason[]) => {
    if (!reasonsList || reasonsList.length === 0) return null;

    // 1. Direct ID match
    let found = reasonsList.find(r => String(r.reasonId) === String(pill.reasonId));
    if (found) return found;

    // 2. Exact name match (case-insensitive)
    found = reasonsList.find(r => r.reasonName.toLowerCase().trim() === pill.matchReason.toLowerCase().trim());
    if (found) return found;

    // 3. Normalized slash/space match
    const normPill = pill.matchReason.toLowerCase().replace(/\s*\/\s*/g, '/').trim();
    found = reasonsList.find(r => r.reasonName.toLowerCase().replace(/\s*\/\s*/g, '/').trim() === normPill);
    if (found) return found;

    // 4. Keyword search
    if (pill.keywords) {
      for (const kw of pill.keywords) {
        found = reasonsList.find(r => r.reasonName.toLowerCase().includes(kw.toLowerCase()));
        if (found) return found;
      }
    }

    // 5. Pill label substring match
    found = reasonsList.find(r => r.reasonName.toLowerCase().includes(pill.label.toLowerCase()));
    if (found) return found;

    return null;
  };

  // Active selection object
  const activeSelection = useMemo(() => {
    if (!selectedReasonId) return null;
    return allReasons.find(r => String(r.reasonId) === String(selectedReasonId)) || null;
  }, [allReasons, selectedReasonId]);

  // Filtered reasons based on search input
  const filteredReasons = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return allReasons.filter(r => 
      r.reasonName.toLowerCase().includes(q) ||
      r.whyName.toLowerCase().includes(q) ||
      r.themeName.toLowerCase().includes(q)
    ).slice(0, 15); // Top 15 matches
  }, [allReasons, searchQuery]);

  // Quick pill selection handler
  const handleQuickPillClick = (pill: typeof QUICK_PILLS[number]) => {
    const found = findPillMatch(pill, allReasons);
    if (found) {
      onSelect(found.themeId, found.whyId, found.reasonId);
      setSearchQuery('');
    }
  };

  const handleSelectReason = (item: FlattenedReason) => {
    onSelect(item.themeId, item.whyId, item.reasonId);
    setSearchQuery('');
  };

  const handleClearSelection = () => {
    onSelect('', '', '');
    setSearchQuery('');
  };

  return (
    <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-bold text-[#095c7b] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          Lead Non-Engagement / Loss Reason *
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 text-[11px] text-slate-500 hover:text-slate-800 px-1.5"
          onClick={() => setShowManualDropdowns(!showManualDropdowns)}
        >
          <SlidersHorizontal className="w-3 h-3 mr-1" />
          {showManualDropdowns ? "Hide Manual Steps" : "Manual Steps"}
        </Button>
      </div>

      {/* Frequent Reasons Quick Pills */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-slate-500 block">Frequent Reasons (1-Click):</span>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PILLS.map((pill, idx) => {
            const matchedObj = findPillMatch(pill, allReasons);
            const isSelected = !!(selectedReasonId && matchedObj && String(selectedReasonId) === String(matchedObj.reasonId));

            return (
              <button
                key={idx}
                type="button"
                disabled={disabled || !matchedObj}
                onClick={() => handleQuickPillClick(pill)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 font-semibold ${
                  isSelected
                    ? 'bg-[#095c7b] text-white border-[#095c7b] shadow-md scale-[1.02]'
                    : 'bg-sky-50 text-sky-950 border-sky-300 hover:border-[#095c7b] hover:bg-[#095c7b] hover:text-white hover:scale-[1.02] shadow-xs cursor-pointer'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 text-emerald-300" />}
                ⚡ {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Combobox */}
      <div className="relative">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
          <Input
            type="text"
            placeholder="Search reasons (e.g. '20kg', 'price', 'integration', 'shipping')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={disabled}
            className="pl-9 pr-8 bg-white text-xs h-9 border-slate-300 focus-visible:ring-1 focus-visible:ring-[#095c7b]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown List */}
        {searchQuery.trim().length > 0 && (
          <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white rounded-lg border border-slate-200 shadow-lg py-1 text-xs divide-y divide-slate-100">
            {filteredReasons.length === 0 ? (
              <div className="p-3 text-slate-400 text-center italic">
                No matching reasons found for "{searchQuery}"
              </div>
            ) : (
              filteredReasons.map((item) => {
                const isSelected = String(selectedReasonId) === String(item.reasonId);
                return (
                  <button
                    key={`${item.themeId}-${item.whyId}-${item.reasonId}`}
                    type="button"
                    onClick={() => handleSelectReason(item)}
                    className={`w-full text-left p-2.5 hover:bg-slate-50 flex items-start justify-between gap-2 transition-colors ${
                      isSelected ? 'bg-sky-50/80 font-semibold' : ''
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-slate-800 text-xs flex items-center gap-1">
                        {item.reasonName}
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#095c7b]" />}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span>{item.themeName}</span>
                        <CornerDownRight className="w-2.5 h-2.5 text-slate-300" />
                        <span className="font-medium text-slate-500">{item.whyName}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[9px] bg-slate-50 text-slate-500 shrink-0">
                      Select
                    </Badge>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Selected Reason Badge Summary */}
      {activeSelection && (
        <div className="flex items-center justify-between p-2 bg-emerald-50/80 border border-emerald-200 rounded-lg text-xs">
          <div className="flex items-center gap-1.5 text-emerald-950 flex-wrap">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-bold">{activeSelection.reasonName}</span>
            <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-normal">
              {activeSelection.themeName} ➔ {activeSelection.whyName}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClearSelection}
            disabled={disabled}
            className="text-emerald-700 hover:text-rose-600 p-0.5 rounded"
            title="Clear Selection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Manual Step Dropdowns (Fallback) */}
      {showManualDropdowns && (
        <div className="pt-2 border-t border-slate-200 space-y-2 text-xs bg-white p-3 rounded-lg border">
          <span className="font-semibold text-slate-600 text-[11px] block">Manual 3-Step Picker:</span>
          
          <div className="space-y-1">
            <Label className="text-[11px] text-slate-600">1. Loss Theme</Label>
            <Select 
              value={selectedThemeId} 
              onValueChange={(val) => onSelect(val, '', '')}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-xs bg-white">
                <SelectValue placeholder="Select Theme" />
              </SelectTrigger>
              <SelectContent>
                {activeThemes.map(t => (
                  <SelectItem key={String(t.id)} value={String(t.id)}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedThemeId && (
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-600">2. Category / Why</Label>
              <Select 
                value={selectedWhyId} 
                onValueChange={(val) => onSelect(selectedThemeId, val, '')}
                disabled={disabled}
              >
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {activeThemes.find(t => String(t.id) === String(selectedThemeId))?.whys?.map((w: any) => (
                    <SelectItem key={String(w.id)} value={String(w.id)}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedWhyId && (
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-600">3. Specific Reason</Label>
              <Select 
                value={selectedReasonId} 
                onValueChange={(val) => onSelect(selectedThemeId, selectedWhyId, val)}
                disabled={disabled}
              >
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue placeholder="Select Specific Reason" />
                </SelectTrigger>
                <SelectContent>
                  {activeThemes
                    .find(t => String(t.id) === String(selectedThemeId))?.whys
                    ?.find((w: any) => String(w.id) === String(selectedWhyId))?.reasons
                    ?.map((r: any) => (
                      <SelectItem key={String(r.id)} value={String(r.id)}>{r.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

