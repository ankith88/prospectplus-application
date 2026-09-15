"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { BarChart3, PieChart as PieIcon, LineChart as LineIcon, Table as TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AskChartViewProps {
  data: { group: string; count: number }[];
  title?: string;
  defaultChartType?: "bar" | "pie" | "line" | "table";
  onCategoryClick?: (category: string) => void;
}

const COLORS = [
  "#095c7b",
  "#0ea5e9",
  "#14b8a6",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#10b981",
  "#6366f1",
  "#f97316",
  "#64748b",
];

export function AskChartView({
  data,
  title,
  defaultChartType = "bar",
  onCategoryClick,
}: AskChartViewProps) {
  const [chartType, setChartType] = useState<"bar" | "pie" | "line">(
    defaultChartType === "pie" || defaultChartType === "line" ? defaultChartType : "bar"
  );

  if (!data || data.length === 0) return null;

  const chartData = data.map((d) => ({
    name: String(d.group || "Unknown"),
    value: Number(d.count || 0),
  }));

  const handleBarClick = (entry: any) => {
    if (onCategoryClick && entry && entry.name) {
      onCategoryClick(entry.name);
    }
  };

  return (
    <div className="bg-white border border-border/80 rounded-xl p-4 shadow-xs flex flex-col gap-3">
      {/* Header & Chart Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2.5">
        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <span>📊</span> {title || "Visual Data Breakdown"}
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg self-start">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setChartType("bar")}
            className={`h-7 px-2.5 text-xs rounded-md font-medium transition ${
              chartType === "bar"
                ? "bg-white text-[#095c7b] shadow-2xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5 mr-1" />
            Bar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setChartType("pie")}
            className={`h-7 px-2.5 text-xs rounded-md font-medium transition ${
              chartType === "pie"
                ? "bg-white text-[#095c7b] shadow-2xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <PieIcon className="h-3.5 w-3.5 mr-1" />
            Donut
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setChartType("line")}
            className={`h-7 px-2.5 text-xs rounded-md font-medium transition ${
              chartType === "line"
                ? "bg-white text-[#095c7b] shadow-2xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LineIcon className="h-3.5 w-3.5 mr-1" />
            Trend
          </Button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" ? (
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#64748b" }}
                interval={0}
                angle={-20}
                textAnchor="end"
              />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "12px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
              <Bar
                dataKey="value"
                fill="#095c7b"
                radius={[4, 4, 0, 0]}
                onClick={handleBarClick}
                cursor="pointer"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          ) : chartType === "pie" ? (
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                onClick={handleBarClick}
                cursor="pointer"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "12px",
                }}
              />
              <Legend
                formatter={(value) => <span className="text-xs text-slate-700">{value}</span>}
                wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
              />
            </PieChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#64748b" }}
                interval={0}
                angle={-20}
                textAnchor="end"
              />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#095c7b"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#095c7b" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
      {onCategoryClick && (
        <div className="text-[11px] text-slate-400 italic text-center">
          💡 Click any bar or segment to filter and explore those records
        </div>
      )}
    </div>
  );
}
