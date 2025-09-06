
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
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import type { DiscoveryData } from '@/lib/types'

interface DiscoveryRadarChartProps {
  discoveryData: DiscoveryData
}

function transformDiscoveryDataForChart(data: DiscoveryData) {
  const chartData = [
    { name: 'Product Fit', score: 0 },
    { name: 'Service Fit', score: 0 },
    { name: 'Pain Points', score: 0 },
    { name: 'Decision Maker', score: 0 },
    { name: 'Shipping Volume', score: 0 },
  ]

  // Product Fit
  if (data.packageType?.some((p) => ['1-3kg', '5kg+', '10kg+'].includes(p)))
    chartData[0].score += 40
  if (data.expressVsStandard === 'Mostly Standard (>=80%)' || data.expressVsStandard === 'Balanced Mix (20-79% Express)')
    chartData[0].score += 30
  if (data.eCommerceTech?.some((t) => ['Shopify', 'Woo'].includes(t)))
    chartData[0].score += 30

  // Service Fit
  if (data.postOfficeRelationship === 'Yes-Post Office walk up') chartData[1].score += 50
  if (data.logisticsSetup === 'Drop-off') chartData[1].score += 50
  
  // Pain Points
  if(data.painPoints && data.painPoints.length > 10) chartData[2].score += 100

  // Decision Maker
  if (data.decisionMaker === 'Owner') chartData[3].score = 100
  if (data.decisionMaker === 'Influencer') chartData[3].score = 60

  // Shipping Volume
  if (data.shippingVolume === '<5') chartData[4].score = 20
  if (data.shippingVolume === '<20') chartData[4].score = 40
  if (data.shippingVolume === '20-100') chartData[4].score = 80
  if (data.shippingVolume === '100+') chartData[4].score = 100

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
