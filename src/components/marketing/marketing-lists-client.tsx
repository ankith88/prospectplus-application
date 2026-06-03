"use client"

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { getLeadsFromFirebase, renameMarketingList, removeLeadsFromMarketingList, addLeadsToMarketingList } from '@/services/firebase'
import type { Lead } from '@/lib/types'
import { ArrowLeft, Download, ListFilter, Users, Edit, Trash2, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function MarketingListsClient() {
  const [loading, setLoading] = useState(true)
  const [allLeads, setAllLeads] = useState<Lead[]>([])
  const [selectedList, setSelectedList] = useState<string | null>(null)
  const { toast } = useToast()
  const { userProfile } = useAuth()
  
  const [renamingList, setRenamingList] = useState<string | null>(null)
  const [newListName, setNewListName] = useState('')
  const [addingLead, setAddingLead] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const canEdit = ['admin', 'super_admin', 'marketing'].includes(userProfile?.role || '')

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const leads = await getLeadsFromFirebase({ summary: true })
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

  const handleRename = async () => {
    if (!renamingList || !newListName.trim() || renamingList === newListName.trim()) return
    const newName = newListName.trim()
    try {
      await renameMarketingList(renamingList, newName)
      setAllLeads(prev => prev.map(lead => {
        if (lead.marketingLists?.includes(renamingList)) {
          return {
            ...lead,
            marketingLists: [...(lead.marketingLists.filter(l => l !== renamingList)), newName]
          }
        }
        return lead
      }))
      if (selectedList === renamingList) setSelectedList(newName)
      toast({ title: 'List renamed successfully' })
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error renaming list' })
    } finally {
      setRenamingList(null)
      setNewListName('')
    }
  }

  const handleRemoveLead = async (leadId: string, listName: string) => {
    if (!confirm('Are you sure you want to remove this lead from the list?')) return;
    try {
      await removeLeadsFromMarketingList([leadId], listName)
      setAllLeads(prev => prev.map(lead => {
        if (lead.id === leadId) {
          return { ...lead, marketingLists: lead.marketingLists?.filter(l => l !== listName) || [] }
        }
        return lead
      }))
      toast({ title: 'Lead removed' })
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error removing lead' })
    }
  }

  const handleAddLead = async (leadId: string, listName: string) => {
    try {
      await addLeadsToMarketingList([leadId], listName)
      setAllLeads(prev => prev.map(lead => {
        if (lead.id === leadId) {
          return { ...lead, marketingLists: [...(lead.marketingLists || []), listName] }
        }
        return lead
      }))
      toast({ title: 'Lead added' })
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error adding lead' })
    }
  }

  const availableLeadsToAdd = useMemo(() => {
    if (!addingLead || !searchQuery.trim()) return []
    const lowerQuery = searchQuery.toLowerCase()
    return allLeads.filter(l => 
      !l.marketingLists?.includes(addingLead) && 
      (l.companyName?.toLowerCase().includes(lowerQuery) || l.customerServiceEmail?.toLowerCase().includes(lowerQuery))
    ).slice(0, 10)
  }, [allLeads, addingLead, searchQuery])

  const handleExport = async (listName: string, baseLeads: Lead[]) => {
    toast({ title: 'Exporting', description: 'Fetching lead details...' })
    try {
      const leads = await getLeadsFromFirebase({ 
        leadIds: baseLeads.map(l => l.id), 
        summary: false 
      })

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
    } catch (error) {
      toast({ variant: 'destructive', title: 'Export failed', description: 'Could not fetch full lead details.' })
    }
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
          <div className="flex gap-2">
            {canEdit && (
              <>
                <Button variant="outline" onClick={() => {
                  setRenamingList(selectedListData.name)
                  setNewListName(selectedListData.name)
                }}>
                  <Edit className="mr-2 h-4 w-4" /> Rename
                </Button>
                <Button variant="outline" onClick={() => {
                  setAddingLead(selectedListData.name)
                  setSearchQuery('')
                }}>
                  <Plus className="mr-2 h-4 w-4" /> Add Leads
                </Button>
              </>
            )}
            <Button onClick={() => handleExport(selectedListData.name, selectedListData.leads)}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
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
                    {canEdit && <TableHead className="w-[80px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedListData.leads.map(lead => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">
                        <Link href={`/leads/${lead.id}`} target="_blank" className="hover:underline text-primary">
                          {lead.companyName}
                        </Link>
                      </TableCell>
                      <TableCell>{lead.customerServiceEmail || '-'}</TableCell>
                      <TableCell>{lead.customerPhone || '-'}</TableCell>
                      <TableCell>{lead.franchisee || '-'}</TableCell>
                      <TableCell className="capitalize">{lead.bucket?.replace('_', ' ') || (lead.fieldSales ? 'Field Sales' : 'Outbound')}</TableCell>
                      <TableCell>{lead.contactCount || 0}</TableCell>
                      <TableCell>{lead.accountManagerAssigned || '-'}</TableCell>
                      <TableCell>{lead.dialerAssigned || '-'}</TableCell>
                      {canEdit && (
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveLead(lead.id, selectedListData.name)} className="text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
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

      <Dialog open={!!renamingList} onOpenChange={(open) => !open && setRenamingList(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename List</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>New List Name</Label>
            <Input value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="e.g. November Campaign" className="mt-2" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingList(null)}>Cancel</Button>
            <Button onClick={handleRename}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!addingLead} onOpenChange={(open) => !open && setAddingLead(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Leads to {addingLead}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Input 
              placeholder="Search by company name or email..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
            />
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {searchQuery.trim() && availableLeadsToAdd.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No matching leads found.</p>
              )}
              {availableLeadsToAdd.map(lead => (
                <div key={lead.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium text-sm">{lead.companyName}</p>
                    <p className="text-xs text-muted-foreground">{lead.customerServiceEmail || lead.customerPhone || 'No contact info'}</p>
                  </div>
                  <Button size="sm" onClick={() => handleAddLead(lead.id, addingLead!)}>
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
