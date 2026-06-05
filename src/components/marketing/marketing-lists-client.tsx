"use client"

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { getLeadsFromFirebase, renameMarketingList, removeLeadsFromMarketingList, addLeadsToMarketingList, getAllUsers, logActivity } from '@/services/firebase'
import type { Lead, UserProfile } from '@/lib/types'
import { ArrowLeft, Download, ListFilter, Users, Edit, Trash2, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { firestore } from '@/lib/firebase'
import { writeBatch, doc } from 'firebase/firestore'
import { MoveToNurtureDialog } from './move-to-nurture-dialog'


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

  const [statusFilter, setStatusFilter] = useState('all')
  const [franchiseeFilter, setFranchiseeFilter] = useState('all')
  const [amFilter, setAmFilter] = useState('all')
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set())
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [allAMs, setAllAMs] = useState<UserProfile[]>([])
  const [selectedAMs, setSelectedAMs] = useState<string[]>([])
  const [isNurtureDialogOpen, setIsNurtureDialogOpen] = useState(false)

  const canEdit = ['admin', 'super_admin', 'marketing'].includes(userProfile?.activeRole || '')

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
    const fetchAMs = async () => {
      try {
        const users = await getAllUsers()
        const ams = users.filter(u => 
          u.role === 'Account Manager' || 
          u.role === 'Account Managers' || 
          u.role === 'account managers' || 
          u.assignedRoles?.includes('Account Manager') || 
          u.assignedRoles?.includes('Account Managers') || 
          u.assignedRoles?.includes('account managers')
        )
        setAllAMs(ams)
      } catch (error) {
        console.error('Failed to fetch account managers:', error)
      }
    }
    fetchLeads()
    fetchAMs()
  }, [])

  useEffect(() => {
    setStatusFilter('all')
    setFranchiseeFilter('all')
    setAmFilter('all')
    setSelectedLeadIds(new Set())
  }, [selectedList])

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

  const selectedListData = useMemo(() => {
    if (!selectedList) return null
    return listsSummary.find(l => l.name === selectedList)
  }, [listsSummary, selectedList])

  const uniqueFilterOptions = useMemo(() => {
    if (!selectedListData) return { statuses: [], franchisees: [], ams: [] }
    const statuses = new Set<string>()
    const franchisees = new Set<string>()
    const ams = new Set<string>()
    
    selectedListData.leads.forEach(lead => {
      if (lead.status) statuses.add(lead.status)
      if (lead.franchisee) franchisees.add(lead.franchisee)
      if (lead.accountManagerAssigned) ams.add(lead.accountManagerAssigned)
    })
    
    return {
      statuses: Array.from(statuses).sort(),
      franchisees: Array.from(franchisees).sort(),
      ams: Array.from(ams).sort()
    }
  }, [selectedListData])

  const filteredLeads = useMemo(() => {
    if (!selectedListData) return []
    return selectedListData.leads.filter(lead => {
      if (statusFilter !== 'all' && lead.status !== statusFilter) return false
      if (franchiseeFilter !== 'all' && lead.franchisee !== franchiseeFilter) return false
      if (amFilter !== 'all' && lead.accountManagerAssigned !== amFilter) return false
      return true
    })
  }, [selectedListData, statusFilter, franchiseeFilter, amFilter])

  const isAllSelected = useMemo(() => {
    if (filteredLeads.length === 0) return false
    return filteredLeads.every(lead => selectedLeadIds.has(lead.id))
  }, [filteredLeads, selectedLeadIds])

  const selectedLeadsForNurture = useMemo(() => {
    return allLeads.filter(lead => selectedLeadIds.has(lead.id))
  }, [allLeads, selectedLeadIds])

  const handleSelectAll = () => {
    if (isAllSelected) {
      const newSelected = new Set(selectedLeadIds)
      filteredLeads.forEach(lead => newSelected.delete(lead.id))
      setSelectedLeadIds(newSelected)
    } else {
      const newSelected = new Set(selectedLeadIds)
      filteredLeads.forEach(lead => newSelected.add(lead.id))
      setSelectedLeadIds(newSelected)
    }
  }

  const handleSelectLead = (leadId: string) => {
    const newSelected = new Set(selectedLeadIds)
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId)
    } else {
      newSelected.add(leadId)
    }
    setSelectedLeadIds(newSelected)
  }

  const handleAssignAMs = async () => {
    if (selectedLeadIds.size === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select at least one lead.' })
      return
    }
    if (selectedAMs.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select at least one Account Manager.' })
      return
    }

    toast({ title: 'Assigning', description: 'Updating lead assignments...' })
    try {
      const batch = writeBatch(firestore)
      const leadIdsArray = Array.from(selectedLeadIds)
      
      // Shuffle selected AMs to ensure random distribution or assign in round-robin fashion
      const shuffledAMs = [...selectedAMs].sort(() => Math.random() - 0.5)

      leadIdsArray.forEach((leadId, index) => {
        const assignedAM = shuffledAMs[index % shuffledAMs.length]
        const leadRef = doc(firestore, 'leads', leadId)
        
        batch.update(leadRef, {
          accountManagerAssigned: assignedAM,
          bucket: 'account_manager',
          fieldSales: false
        })
      })

      await batch.commit()

      // Also log activities for each assigned lead
      await Promise.all(leadIdsArray.map((leadId, index) => {
        const assignedAM = shuffledAMs[index % shuffledAMs.length]
        return logActivity(leadId, {
          type: 'Update',
          notes: `Account Manager assigned in bulk: ${assignedAM}`,
          author: userProfile?.displayName || 'System'
        }).catch(err => console.error(`Failed to log activity for lead ${leadId}:`, err))
      }))

      // Update local state
      setAllLeads(prev => prev.map(lead => {
        if (selectedLeadIds.has(lead.id)) {
          const index = leadIdsArray.indexOf(lead.id)
          const assignedAM = shuffledAMs[index % shuffledAMs.length]
          return {
            ...lead,
            accountManagerAssigned: assignedAM,
            bucket: 'account_manager',
            fieldSales: false
          }
        }
        return lead
      }))

      toast({ title: 'Success', description: `Successfully assigned ${selectedLeadIds.size} lead(s) to ${selectedAMs.length} AM(s).` })
      setSelectedLeadIds(new Set())
      setIsAssignDialogOpen(false)
      setSelectedAMs([])
    } catch (error) {
      console.error(error)
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to assign leads.' })
    }
  }

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
            <Button onClick={() => handleExport(selectedListData.name, filteredLeads)}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Filters and Bulk Actions */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-muted/40 p-4 rounded-lg border">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Filter:</span>
            </div>
            
            {/* Status Filter */}
            <div className="w-[150px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {uniqueFilterOptions.statuses.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Franchisee Filter */}
            <div className="w-[180px]">
              <Select value={franchiseeFilter} onValueChange={setFranchiseeFilter}>
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue placeholder="All Franchisees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Franchisees</SelectItem>
                  {uniqueFilterOptions.franchisees.map(fran => (
                    <SelectItem key={fran} value={fran}>{fran}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* AM Filter */}
            <div className="w-[180px]">
              <Select value={amFilter} onValueChange={setAmFilter}>
                <SelectTrigger className="h-9 bg-white">
                  <SelectValue placeholder="All AMs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All AMs</SelectItem>
                  {uniqueFilterOptions.ams.map(am => (
                    <SelectItem key={am} value={am}>{am}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(statusFilter !== 'all' || franchiseeFilter !== 'all' || amFilter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => {
                setStatusFilter('all')
                setFranchiseeFilter('all')
                setAmFilter('all')
              }} className="text-xs h-9">
                Clear Filters
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedLeadIds.size > 0 && (
              <>
                <Button 
                  onClick={() => {
                    setSelectedAMs([])
                    setIsAssignDialogOpen(true)
                  }}
                  className="bg-[#095c7b] hover:bg-[#084c66] text-white h-9"
                >
                  Assign {selectedLeadIds.size} Leads to AMs
                </Button>
                <Button 
                  onClick={() => {
                    setIsNurtureDialogOpen(true)
                  }}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white h-9"
                >
                  Move {selectedLeadIds.size} Leads to Nurture
                </Button>
              </>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{selectedListData.name}</CardTitle>
            <CardDescription>
              {filteredLeads.length} of {selectedListData.leads.length} lead(s) displayed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox 
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Franchisee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bucket</TableHead>
                    <TableHead>Contacts</TableHead>
                    <TableHead>AM Assigned</TableHead>
                    <TableHead>Dialer Assigned</TableHead>
                    {canEdit && <TableHead className="w-[80px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map(lead => (
                    <TableRow key={lead.id} className={selectedLeadIds.has(lead.id) ? 'bg-primary/5' : ''}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedLeadIds.has(lead.id)}
                          onCheckedChange={() => handleSelectLead(lead.id)}
                          aria-label={`Select ${lead.companyName}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/leads/${lead.id}`} target="_blank" className="hover:underline text-primary">
                          {lead.companyName}
                        </Link>
                      </TableCell>
                      <TableCell>{lead.customerServiceEmail || '-'}</TableCell>
                      <TableCell>{lead.customerPhone || '-'}</TableCell>
                      <TableCell>{lead.franchisee || '-'}</TableCell>
                      <TableCell>{lead.status || '-'}</TableCell>
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
                  {filteredLeads.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-4 text-muted-foreground">No leads found in this list.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Leads to Account Managers</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Select one or more Account Managers. The {selectedLeadIds.size} selected leads will be randomly/evenly distributed among them.
              </p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-md p-3">
                {allAMs.map(am => {
                  const name = am.displayName || `${am.firstName || ''} ${am.lastName || ''}`.trim() || am.email;
                  return (
                    <div key={am.uid} className="flex items-center space-x-2 py-1.5">
                      <Checkbox
                        id={`am-${am.uid}`}
                        checked={selectedAMs.includes(name)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedAMs([...selectedAMs, name])
                          } else {
                            setSelectedAMs(selectedAMs.filter(x => x !== name))
                          }
                        }}
                      />
                      <label htmlFor={`am-${am.uid}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                        {name}
                      </label>
                    </div>
                  )
                })}
                {allAMs.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No Account Managers found.</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleAssignAMs} 
                disabled={selectedAMs.length === 0}
                className="bg-[#095c7b] hover:bg-[#084c66] text-white"
              >
                Distribute Leads
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <MoveToNurtureDialog
          leads={selectedLeadsForNurture}
          isOpen={isNurtureDialogOpen}
          onOpenChange={setIsNurtureDialogOpen}
          onLeadsMoved={() => {
            setAllLeads(prev => prev.map(lead => {
              if (selectedLeadIds.has(lead.id)) {
                return {
                  ...lead,
                  bucket: 'nurture',
                  fieldSales: false
                }
              }
              return lead
            }))
            setSelectedLeadIds(new Set())
          }}
        />
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
