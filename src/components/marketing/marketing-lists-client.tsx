"use client"

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { getLeadsFromFirebase } from '@/services/firebase'
import type { Lead } from '@/lib/types'
import { ArrowLeft, Download, ListFilter, Users } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function MarketingListsClient() {
  const [loading, setLoading] = useState(true)
  const [allLeads, setAllLeads] = useState<Lead[]>([])
  const [selectedList, setSelectedList] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const leads = await getLeadsFromFirebase({ summary: false })
        setAllLeads(leads)
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch leads.' })
      } finally {
        setLoading(false)
      }
    }
    fetchLeads()
  }, [])

  const listsSummary = useMemo(() => {
    const listMap = new Map<string, Lead[]>()
    allLeads.forEach(lead => {
      if (lead.marketingLists && Array.isArray(lead.marketingLists)) {
        lead.marketingLists.forEach(listName => {
          if (!listMap.has(listName)) {
            listMap.set(listName, [])
          }
          listMap.get(listName)!.push(lead)
        })
      }
    })
    
    return Array.from(listMap.entries())
      .map(([name, leads]) => ({ name, leads }))
      .sort((a, b) => b.leads.length - a.leads.length)
  }, [allLeads])

  const handleExport = (listName: string, leads: Lead[]) => {
    const headers = [
      'Company Name', 
      'Street', 'City', 'State', 'Zip', 'Country', 
      'Franchisee', 
      'Bucket', 
      'Lead Email', 'Lead Phone', 
      'Contact Name', 'Contact Email', 'Contact Phone', 
      'Account Manager Assigned', 'Dialer Assigned'
    ]

    const escapeCsvCell = (cellData: any) => {
        if (cellData === null || cellData === undefined) return '';
        const stringData = String(cellData);
        if (stringData.includes('"') || stringData.includes(',') || stringData.includes('\n')) {
            return `"${stringData.replace(/"/g, '""')}"`;
        }
        return stringData;
    };

    const rows: string[][] = []

    leads.forEach(lead => {
      const baseRow = [
        lead.companyName,
        lead.address?.street || '',
        lead.address?.city || '',
        lead.address?.state || '',
        lead.address?.zip || '',
        lead.address?.country || '',
        lead.franchisee || '',
        lead.bucket || (lead.fieldSales ? 'field_sales' : 'outbound'),
        lead.customerServiceEmail || '',
        lead.customerPhone || '',
        // 3 contact cols will be inserted here
        lead.accountManagerAssigned || '',
        lead.dialerAssigned || ''
      ]

      const contacts = lead.contacts && lead.contacts.length > 0 ? lead.contacts : []
      if (contacts.length === 0) {
        const row = [...baseRow]
        row.splice(10, 0, '', '', '')
        rows.push(row.map(escapeCsvCell))
      } else {
        contacts.forEach(contact => {
          const row = [...baseRow]
          row.splice(10, 0, contact.name || '', contact.email || '', contact.phone || '')
          rows.push(row.map(escapeCsvCell))
        })
      }
    })

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.href = url
    link.setAttribute('download', `marketing_list_${listName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div className="flex h-[400px] items-center justify-center"><Loader /></div>
  }

  if (selectedList) {
    const selectedListData = listsSummary.find(l => l.name === selectedList)
    if (!selectedListData) return null

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setSelectedList(null)} className="pl-0 hover:bg-transparent">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Lists
          </Button>
          <Button onClick={() => handleExport(selectedListData.name, selectedListData.leads)}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{selectedListData.name}</CardTitle>
            <CardDescription>{selectedListData.leads.length} lead(s) in this list</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Franchisee</TableHead>
                    <TableHead>Bucket</TableHead>
                    <TableHead>Contacts</TableHead>
                    <TableHead>AM Assigned</TableHead>
                    <TableHead>Dialer Assigned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedListData.leads.map(lead => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.companyName}</TableCell>
                      <TableCell>{lead.customerServiceEmail || '-'}</TableCell>
                      <TableCell>{lead.customerPhone || '-'}</TableCell>
                      <TableCell>{lead.franchisee || '-'}</TableCell>
                      <TableCell className="capitalize">{lead.bucket?.replace('_', ' ') || (lead.fieldSales ? 'Field Sales' : 'Outbound')}</TableCell>
                      <TableCell>{lead.contacts?.length || 0}</TableCell>
                      <TableCell>{lead.accountManagerAssigned || '-'}</TableCell>
                      <TableCell>{lead.dialerAssigned || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {selectedListData.leads.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">No leads found in this list.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {listsSummary.map(list => (
        <Card key={list.name} className="hover:border-primary/50 cursor-pointer transition-colors" onClick={() => setSelectedList(list.name)}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <ListFilter className="h-5 w-5 text-primary" />
                  {list.name}
                </h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Users className="h-4 w-4" /> {list.leads.length} Leads
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      {listsSummary.length === 0 && (
        <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          No marketing lists found. Add leads to marketing lists from the Outbound Leads page.
        </div>
      )}
    </div>
  )
}
