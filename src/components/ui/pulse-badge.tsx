"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PulseBadgeProps {
  variant?: "emerald" | "amber" | "rose" | "navy" | "teal" | "purple" | "blue";
  children: React.ReactNode;
  pulse?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

const variantStyles = {
  emerald: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400",
  rose: "bg-rose-500/10 text-rose-700 border-rose-500/30 dark:text-rose-400",
  navy: "bg-sky-500/10 text-[#095c7b] border-sky-500/30 dark:text-sky-400",
  teal: "bg-teal-500/10 text-teal-700 border-teal-500/30 dark:text-teal-400",
  purple: "bg-purple-500/10 text-purple-700 border-purple-500/30 dark:text-purple-400",
  blue: "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400",
};

const dotStyles = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  navy: "bg-[#095c7b]",
  teal: "bg-teal-500",
  purple: "bg-purple-500",
  blue: "bg-blue-500",
};

export function PulseBadge({
  variant = "emerald",
  children,
  pulse = true,
  className = "",
  icon,
}: PulseBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border backdrop-blur-sm transition-all duration-300 shadow-xs hover:shadow",
        variantStyles[variant],
        className
      )}
    >
      {pulse ? (
        <span className="relative flex h-2 w-2">
          <span
            className={cn(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
              dotStyles[variant]
            )}
          />
          <span
            className={cn(
              "relative inline-flex rounded-full h-2 w-2",
              dotStyles[variant]
            )}
          />
        </span>
      ) : icon ? (
        icon
      ) : null}
      <span>{children}</span>
    </span>
  );
}
