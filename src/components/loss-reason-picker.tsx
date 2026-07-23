"use client";

import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search, Sparkles, X, Check, SlidersHorizontal, CornerDownRight } from 'lucide-react';

export interface LossReasonPickerProps {
  cancellationThemes: any[];
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

// Preset Quick Pills for common Lead Non-Engagement reasons
const QUICK_PILLS = [
  { label: "Price too high", matchReason: "Price too high" },
  { label: "Over 20kg items", matchReason: "Ships items over 20kg" },
  { label: "Needs IT integration", matchReason: "Needs IT integration that is not available" },
  { label: "Needs standard shipping", matchReason: "Needs standard shipping" },
  { label: "Dangerous / prohibited goods", matchReason: "Dangerous/prohibited goods" },
  { label: "No response to follow-ups", matchReason: "No response to multiple phone/email follow-up attempts" }
];

export function LossReasonPicker({
  cancellationThemes,
  selectedThemeId,
  selectedWhyId,
  selectedReasonId,
  onSelect,
  disabled = false
}: LossReasonPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showManualDropdowns, setShowManualDropdowns] = useState(false);

  // Flatten hierarchy into a searchable single-level list
  const allReasons: FlattenedReason[] = useMemo(() => {
    const list: FlattenedReason[] = [];
    if (!cancellationThemes || !Array.isArray(cancellationThemes)) return list;

    for (const theme of cancellationThemes) {
      if (!theme.whys || !Array.isArray(theme.whys)) continue;
      for (const why of theme.whys) {
        if (!why.reasons || !Array.isArray(why.reasons)) continue;
        for (const reason of why.reasons) {
          list.push({
            themeId: theme.id,
            themeName: theme.name,
            whyId: why.id,
            whyName: why.name,
            reasonId: reason.id,
            reasonName: reason.name
          });
        }
      }
    }
    return list;
  }, [cancellationThemes]);

  // Active selection object
  const activeSelection = useMemo(() => {
    if (!selectedReasonId) return null;
    return allReasons.find(r => r.reasonId === selectedReasonId) || null;
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
  const handleQuickPillClick = (matchReasonName: string) => {
    const found = allReasons.find(r => r.reasonName.toLowerCase() === matchReasonName.toLowerCase());
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

      {/* Idea 2: Quick Pill Badges */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-medium text-slate-500 block">Frequent Reasons (1-Click):</span>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PILLS.map((pill, idx) => {
            const matchedObj = allReasons.find(r => r.reasonName.toLowerCase() === pill.matchReason.toLowerCase());
            const isSelected = selectedReasonId && matchedObj && selectedReasonId === matchedObj.reasonId;

            return (
              <button
                key={idx}
                type="button"
                disabled={disabled || !matchedObj}
                onClick={() => handleQuickPillClick(pill.matchReason)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-all flex items-center gap-1 font-semibold ${
                  isSelected
                    ? 'bg-[#095c7b] text-white border-[#095c7b] shadow-md scale-[1.02]'
                    : 'bg-sky-50 text-sky-950 border-sky-300 hover:border-[#095c7b] hover:bg-[#095c7b] hover:text-white hover:scale-[1.02] shadow-xs'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 text-emerald-300" />}
                ⚡ {pill.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Idea 1: Search Combobox */}
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
                const isSelected = selectedReasonId === item.reasonId;
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
                {cancellationThemes.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
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
                  {cancellationThemes.find(t => t.id === selectedThemeId)?.whys?.map((w: any) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
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
                  {cancellationThemes
                    .find(t => t.id === selectedThemeId)?.whys
                    ?.find((w: any) => w.id === selectedWhyId)?.reasons
                    ?.map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
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
