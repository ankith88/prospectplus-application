"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { AnimatedNumber } from "./animated-number";
import { PulseBadge } from "./pulse-badge";

export interface AnimatedStatCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  icon?: React.ReactNode;
  description?: string;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  accentColor?: "navy" | "emerald" | "amber" | "rose" | "purple" | "teal" | "blue";
  badgeText?: string;
  badgePulse?: boolean;
  className?: string;
  onClick?: () => void;
  formatter?: (val: number) => string;
}

const accentBarColors = {
  navy: "from-[#095c7b] via-sky-500 to-[#103d39]",
  emerald: "from-emerald-500 via-teal-400 to-green-600",
  amber: "from-amber-500 via-orange-400 to-yellow-500",
  rose: "from-rose-500 via-red-400 to-pink-600",
  purple: "from-purple-500 via-indigo-400 to-violet-600",
  teal: "from-teal-500 via-[#103d39] to-emerald-600",
  blue: "from-blue-500 via-sky-400 to-cyan-600",
};

const iconBgColors = {
  navy: "bg-[#095c7b]/10 text-[#095c7b] group-hover:bg-[#095c7b] group-hover:text-white",
  emerald: "bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
  amber: "bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white",
  rose: "bg-rose-500/10 text-rose-600 group-hover:bg-rose-600 group-hover:text-white",
  purple: "bg-purple-500/10 text-purple-600 group-hover:bg-purple-600 group-hover:text-white",
  teal: "bg-teal-500/10 text-teal-600 group-hover:bg-teal-600 group-hover:text-white",
  blue: "bg-blue-500/10 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
};

export function AnimatedStatCard({
  title,
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  icon,
  description,
  trend,
  accentColor = "navy",
  badgeText,
  badgePulse = true,
  className,
  onClick,
  formatter,
}: AnimatedStatCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border-slate-200/80 hover:border-slate-300 dark:border-slate-800 bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/80 cursor-pointer",
        onClick && "active:scale-[0.99]",
        className
      )}
    >
      {/* Top Gradient Sheen Accent Line */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r transition-all duration-500 group-hover:h-1.5 opacity-90 group-hover:opacity-100",
          accentBarColors[accentColor]
        )}
      />

      {/* Subtle Background Glow on Hover */}
      <div className="absolute -right-12 -bottom-12 w-32 h-32 rounded-full bg-slate-100/50 dark:bg-slate-800/30 group-hover:scale-150 transition-transform duration-500 blur-2xl pointer-events-none" />

      <div className="p-5 relative z-10">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </span>
          <div className="flex items-center gap-2">
            {badgeText && (
              <PulseBadge variant={accentColor} pulse={badgePulse}>
                {badgeText}
              </PulseBadge>
            )}
            {icon && (
              <div
                className={cn(
                  "p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-xs",
                  iconBgColors[accentColor]
                )}
              >
                {icon}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            <AnimatedNumber
              value={value}
              prefix={prefix}
              suffix={suffix}
              decimals={decimals}
              formatter={formatter}
            />
          </div>

          {trend && (
            <div
              className={cn(
                "inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-md",
                trend.isPositive !== false
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              )}
            >
              {trend.isPositive !== false ? "↑" : "↓"} {trend.value}%
            </div>
          )}
        </div>

        {(description || trend?.label) && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            {trend?.label || description}
          </p>
        )}
      </div>
    </Card>
  );
}

export { AnimatedNumber } from "./animated-number";
export { PulseBadge } from "./pulse-badge";

