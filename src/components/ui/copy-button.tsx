"use client";

import React, { useState } from "react";
import { Clipboard, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  textToCopy: string;
  className?: string;
  label?: string;
  variant?: "ghost" | "outline" | "default" | "secondary";
  size?: "default" | "sm" | "xs" | "icon";
  onCopy?: () => void;
  iconClassName?: string;
  toastTitle?: string;
  toastDescription?: string;
}

export function CopyButton({
  textToCopy,
  className = "",
  label,
  variant = "ghost",
  size = "icon",
  onCopy,
  iconClassName = "h-3.5 w-3.5",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!textToCopy) return;

    // 1. Immediately activate copied state for 2 seconds
    setCopied(true);

    // 2. Perform copy
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        throw new Error("Clipboard API unavailable");
      }
    } catch (err) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = textToCopy;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch (fallbackErr) {
        console.error("Fallback copy failed:", fallbackErr);
      }
    }

    if (onCopy) {
      try {
        onCopy();
      } catch (err) {
        console.error("onCopy error:", err);
      }
    }

    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied!" : "Copy to clipboard"}
      className={cn(
        "inline-flex items-center justify-center rounded-md p-1 transition-all duration-300 active:scale-75 cursor-pointer shrink-0 select-none",
        copied
          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/40 scale-110"
          : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800",
        className
      )}
    >
      {copied ? (
        <Check
          className={cn(
            "text-emerald-600 dark:text-emerald-400 animate-in zoom-in-75 duration-200 shrink-0 stroke-[2.5]",
            iconClassName
          )}
        />
      ) : (
        <Clipboard
          className={cn(
            "transition-transform duration-200 hover:scale-110 shrink-0",
            iconClassName
          )}
        />
      )}
      {label && (
        <span className={cn("ml-1.5 text-xs font-semibold", copied ? "text-emerald-600" : "")}>
          {copied ? "Copied!" : label}
        </span>
      )}
    </button>
  );
}
