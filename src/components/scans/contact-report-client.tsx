'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader } from '@/components/ui/loader'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, Phone, CheckCircle, XCircle, FileText, ExternalLink, Calendar, Users, Percent, Download } from 'lucide-react'
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getQuickDateRange } from '@/lib/utils'
import Link from 'next/link'
import { LogNoteDialog } from '@/components/log-note-dialog'

interface CustomerStats {
  id: string;
  companyId?: string;
  type?: 'companies' | 'leads';
  name: string;
  franchisee: string;
  allTimeBarcodes: number;
  currentWeekScans: number;
  currentMonthScans: number;
  weeklyAverage: number;
  monthlyAverage: number;
  deliverySpeeds: Record<string, number>;
  lastScanDate: string | Date | null;
  lastContact?: {
    date: string | null;
    type: string | null;
    author: string | null;
    notes: string | null;
  } | null;
}

const getFormattedDateDDMMYYYY = (date: Date | null) => {
  if (!date || isNaN(date.getTime())) return 'N/A';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function ContactReportClient() {
  const [loading, setLoading] = useState(true)
  const [topUsers, setTopUsers] = useState<CustomerStats[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFranchise, setSelectedFranchise] = useState<string[]>([])
  const [filterDateRange, setFilterDateRange] = useState('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [contactStatusFilter, setContactStatusFilter] = useState('all') // 'all', 'contacted', 'not_contacted'
  const [contactedByFilter, setContactedByFilter] = useState('all')
  const [selectedCustomerForNote, setSelectedCustomerForNote] = useState<{ id: string; companyName: string; type: 'companies' | 'leads' } | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      let startStr = ''
      let endStr = ''
      
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      
      let startDate = new Date(0)
      let endDate = new Date(today)

      if (filterDateRange && filterDateRange !== 'all' && filterDateRange !== 'custom') {
        const range = getQuickDateRange(filterDateRange === 'last_7' ? 'last7' : (filterDateRange === 'last_30' ? 'last30' : filterDateRange))
        startDate = range.from
        endDate = range.to
      } else if (filterDateRange === 'custom') {
        if (customStartDate) {
          startDate = new Date(customStartDate)
          startDate.setHours(0, 0, 0, 0)
        }
        if (customEndDate) {
          endDate = new Date(customEndDate)
          endDate.setHours(23, 59, 59, 999)
        }
      }

      if (startDate.getTime() !== new Date(0).getTime()) {
        startStr = startDate.toISOString()
      }
      endStr = endDate.toISOString()

      const url = `/api/scans/top-users?startDate=${encodeURIComponent(startStr)}&endDate=${encodeURIComponent(endStr)}&range=${encodeURIComponent(filterDateRange)}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('API request failed')
      const data = await res.json()
      
      setTopUsers(data.customers || [])
    } catch (error) {
      console.error("Error fetching top users report data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [filterDateRange, customStartDate, customEndDate])

  const uniqueFranchisees = useMemo(() => {
    const franchisees = Array.from(new Set(topUsers.map(c => c.franchisee).filter(Boolean)))
    return franchisees.map(f => ({ label: f as string, value: f as string })).sort((a, b) => a.label.localeCompare(b.label))
  }, [topUsers])

  const uniqueContactAuthors = useMemo(() => {
    const authors = Array.from(new Set(topUsers.map(c => c.lastContact?.author).filter(Boolean)))
    return authors.sort((a, b) => a!.localeCompare(b!))
  }, [topUsers])

  const contactedStats = useMemo(() => {
    const contacted = topUsers.filter(u => !!u.lastContact).length
    const notContacted = topUsers.length - contacted
    const contactRate = topUsers.length > 0 ? Math.round((contacted / topUsers.length) * 100) : 0
    return { contacted, notContacted, contactRate, total: topUsers.length }
  }, [topUsers])

  const filteredStats = useMemo(() => {
    return topUsers.filter(stat => {
      // Search term
      if (searchTerm && !stat.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !stat.franchisee.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !stat.id.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }

      // Franchisee
      if (selectedFranchise.length > 0 && !selectedFranchise.includes(stat.franchisee)) {
        return false
      }

      // Contact Status Filter
      if (contactStatusFilter === 'contacted' && !stat.lastContact) {
        return false
      }
      if (contactStatusFilter === 'not_contacted' && stat.lastContact) {
        return false
      }

      // Contacted By Filter
      if (contactedByFilter !== 'all' && stat.lastContact?.author !== contactedByFilter) {
        return false
      }

      return true
    })
  }, [topUsers, searchTerm, selectedFranchise, contactStatusFilter, contactedByFilter])

  const handleExportCSV = () => {
    const headers = [
      'Rank', 'Customer Name', 'Customer NS ID', 'Franchise', 'Total Barcodes',
      'Last Contacted Date', 'Last Contacted By', 'Last Contact Notes'
    ]

    const rows = filteredStats.map((stat, idx) => {
      const contactDate = stat.lastContact?.date ? getFormattedDateDDMMYYYY(new Date(stat.lastContact.date)) : 'Never'
      const contactAuthor = stat.lastContact?.author || 'N/A'
      const contactNotes = stat.lastContact?.notes ? stat.lastContact.notes.replace(/"/g, '""') : 'N/A'

      return [
        idx + 1,
        `"${stat.name.replace(/"/g, '""')}"`,
        `"${stat.id}"`,
        `"${stat.franchisee.replace(/"/g, '""')}"`,
        stat.allTimeBarcodes,
        `"${contactDate}"`,
        `"${contactAuthor}"`,
        `"${contactNotes}"`
      ].join(',')
    })

    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `top_users_contact_report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading && topUsers.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-4">
        <Loader />
        <p className="text-muted-foreground text-sm">Loading Top Users Contact Report...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Phone className="h-8 w-8 text-indigo-600" />
            Top 100 Contact Report
          </h1>
          <p className="text-muted-foreground mt-1">Audit and reporting on outreach activities for your top 100 customers.</p>
        </div>
        <Button onClick={handleExportCSV} variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-indigo-50/50 border-indigo-100">
          <CardHeader className="py-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
              <Star className="h-4 w-4" /> Total Top Customers
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-3xl font-bold text-slate-900">{contactedStats.total}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-50/50 border-green-100">
          <CardHeader className="py-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-green-600 flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4" /> Contacted
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-3xl font-bold text-slate-900">{contactedStats.contacted}</div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50/50 border-amber-100">
          <CardHeader className="py-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
              <XCircle className="h-4 w-4" /> Not Contacted
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-3xl font-bold text-slate-900">{contactedStats.notContacted}</div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50/50 border-blue-100">
          <CardHeader className="py-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
              <Percent className="h-4 w-4" /> Contact Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-3xl font-bold text-slate-900">{contactedStats.contactRate}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader id="step-report-filters" className="pb-3 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">Filters & Audit</CardTitle>
            <CardDescription>
              Filter top barcode users based on their latest contact status, date, and user details.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <div className="w-44">
              <Select value={contactStatusFilter} onValueChange={setContactStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Contact Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Status: All</SelectItem>
                  <SelectItem value="contacted">Contacted Only</SelectItem>
                  <SelectItem value="not_contacted">Not Contacted Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-44">
              <Select value={contactedByFilter} onValueChange={setContactedByFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Contacted By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Contacted By: All</SelectItem>
                  {uniqueContactAuthors.map(author => (
                    <SelectItem key={author} value={author!}>{author}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <MultiSelectCombobox 
                options={uniqueFranchisees} 
                selected={selectedFranchise} 
                onSelectedChange={setSelectedFranchise} 
                placeholder="Filter Franchise..." 
              />
            </div>
            <div className="w-40">
              <Select value={filterDateRange} onValueChange={setFilterDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Scan Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time Scans</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="last_7">Last 7 Days</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="last_30">Last 30 Days</SelectItem>
                  <SelectItem value="custom">Custom Date Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {filterDateRange === 'custom' && (
              <>
                <div className="w-40">
                  <Input 
                    type="date" 
                    value={customStartDate} 
                    onChange={e => setCustomStartDate(e.target.value)} 
                    title="Start Date"
                  />
                </div>
                <div className="w-40">
                  <Input 
                    type="date" 
                    value={customEndDate} 
                    onChange={e => setCustomEndDate(e.target.value)} 
                    title="End Date"
                  />
                </div>
              </>
            )}
            <div className="w-48">
              <Input 
                placeholder="Search..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && <div className="text-xs text-muted-foreground mb-2 animate-pulse">Updating...</div>}
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-16 text-center">Rank</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Customer NS ID</TableHead>
                  <TableHead>Franchise</TableHead>
                  <TableHead className="text-right">Scans (In Period)</TableHead>
                  <TableHead>Last Contact Date</TableHead>
                  <TableHead>Contacted By</TableHead>
                  <TableHead className="max-w-xs">Last Activity Notes</TableHead>
                  <TableHead className="w-20 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStats.map((stat, idx) => {
                  const contactDate = stat.lastContact?.date ? getFormattedDateDDMMYYYY(new Date(stat.lastContact.date)) : 'Never'
                  const contactAuthor = stat.lastContact?.author || '-'
                  const contactNotes = stat.lastContact?.notes || '-'

                  return (
                    <TableRow key={stat.id} className={stat.lastContact ? "hover:bg-slate-50/50" : "bg-amber-50/10 hover:bg-amber-50/20"}>
                      <TableCell className="text-center font-medium text-slate-500">#{idx + 1}</TableCell>
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-1.5">
                          {stat.companyId ? (
                            <Link 
                              href={`/${stat.type}/${stat.companyId}`} 
                              target="_blank" 
                              className="text-indigo-600 hover:underline flex items-center gap-1 group"
                            >
                              {stat.name}
                              <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                            </Link>
                          ) : (
                            <span className="text-slate-700">{stat.name}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500">{stat.id}</TableCell>
                      <TableCell className="text-slate-500">{stat.franchisee}</TableCell>
                      <TableCell className="text-right font-bold">{stat.allTimeBarcodes.toLocaleString()}</TableCell>
                      
                      <TableCell className="text-slate-500 whitespace-nowrap text-[13px]">{contactDate}</TableCell>
                      <TableCell className="text-slate-700 font-medium">{contactAuthor}</TableCell>
                      <TableCell className="text-slate-500 text-xs truncate max-w-xs" title={contactNotes}>{contactNotes}</TableCell>
                      
                      <TableCell className="text-center">
                        {stat.companyId ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-slate-100"
                            onClick={() => setSelectedCustomerForNote({ id: stat.companyId!, companyName: stat.name, type: stat.type! })}
                            title="Add Note"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Unlinked</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filteredStats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      No matching records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {selectedCustomerForNote && (
        <LogNoteDialog
          lead={{ id: selectedCustomerForNote.id, companyName: selectedCustomerForNote.companyName, type: selectedCustomerForNote.type } as any}
          isOpen={!!selectedCustomerForNote}
          onOpenChange={(open) => {
            if (!open) setSelectedCustomerForNote(null)
          }}
          onNoteLogged={(newNote) => {
            setSelectedCustomerForNote(null)
            fetchData()
          }}
        />
      )}
    </div>
  )
}
