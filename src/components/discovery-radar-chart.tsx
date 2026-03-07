'use client'

import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from 'recharts'
import type { DiscoveryData } from '@/lib/types'

interface DiscoveryRadarChartProps {
  discoveryData: DiscoveryData
}

function transformDiscoveryDataForChart(data: DiscoveryData) {
  const chartData = [
    { name: 'Service Fit', score: 0 },
    { name: 'Product Fit', score: 0 },
    { name: 'Inconvenience', score: 0 },
    { name: 'Occurrence', score: 0 },
    { name: 'Task Ownership', score: 0 },
  ]

  const signals = data.discoverySignals || [];

  // Service Fit
  if (signals.includes('Pays for Australia Post')) chartData[0].score += 40;
  if (signals.includes('Staff Handle Post')) chartData[0].score += 30;
  if (signals.includes('Drop-off is a hassle')) chartData[0].score += 30;
  if (signals.includes('Banking Runs')) chartData[0].score += 20;
  if (signals.includes('Inter-office Deliveries')) chartData[0].score += 20;

  // Product Fit
  if (signals.includes('Uses other couriers (<5kg)')) chartData[1].score += 40;
  if (signals.includes('Uses other couriers (100+ per week)')) chartData[1].score += 40;
  if (signals.includes('Uses Australia Post')) chartData[1].score += 30;
  if (signals.includes('Shopify / WooCommerce')) chartData[1].score += 20;

  // Inconvenience
  if (data.inconvenience === 'Very inconvenient') chartData[2].score = 100;
  else if (data.inconvenience === 'Somewhat inconvenient') chartData[2].score = 60;
  else if (data.inconvenience === 'Not a big issue') chartData[2].score = 20;

  // Occurrence
  if (data.occurrence === 'Daily') chartData[3].score = 100;
  else if (data.occurrence === 'Weekly') chartData[3].score = 60;
  else if (data.occurrence === 'Ad-hoc') chartData[3].score = 30;

  // Task Ownership
  if (data.taskOwner === 'Dedicated staff role') chartData[4].score = 100;
  else if (data.taskOwner === 'Shared admin responsibility') chartData[4].score = 60;
  else if (data.taskOwner === 'Ad-hoc / whoever is free') chartData[4].score = 30;

  // Normalize scores to be out of 100
  chartData.forEach(item => {
    item.score = Math.min(item.score, 100);
  });
  
  return chartData
}

export function DiscoveryRadarChart({ discoveryData }: DiscoveryRadarChartProps) {
  const chartData = transformDiscoveryDataForChart(discoveryData)

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} />
          <Radar
            name="Score"
            dataKey="score"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.6}
          />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
