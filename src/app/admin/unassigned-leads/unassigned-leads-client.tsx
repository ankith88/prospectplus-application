"use client"

import { useEffect, useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox'
import { getLeadsFromFirebase, getAllUsers, bulkAssignUnassignedLeads } from '@/services/firebase'
import type { Lead, UserProfile, LeadBucket } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { Loader } from '@/components/ui/loader'
import { Search, Filter, Shuffle } from 'lucide-react'

export function UnassignedLeadsClient() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [searchCompanyName, setSearchCompanyName] = useState('')
  const [filterFranchisee, setFilterFranchisee] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [selectedBucket, setSelectedBucket] = useState<string>('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [isAssigning, setIsAssigning] = useState(false)
  const { toast } = useToast()

  const fetchData = async () => {
    setLoading(true)
    try {
      const [fetchedLeads, fetchedUsers] = await Promise.all([
        getLeadsFromFirebase({ summary: true }),
        getAllUsers()
      ])
      // Filter leads that don't have a bucket assigned
      const unassigned = fetchedLeads.filter(l => !l.bucket)
      setLeads(unassigned)
      setUsers(fetchedUsers)
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch unassigned leads.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchCompany = searchCompanyName ? lead.companyName?.toLowerCase().includes(searchCompanyName.toLowerCase()) : true
      const matchFranchisee = filterFranchisee ? lead.franchisee?.toLowerCase().includes(filterFranchisee.toLowerCase()) : true
      const matchSource = filterSource ? lead.customerSource?.toLowerCase().includes(filterSource.toLowerCase()) : true
      return matchCompany && matchFranchisee && matchSource
    })
  }, [leads, searchCompanyName, filterFranchisee, filterSource])

  const eligibleUsers = useMemo(() => {
    if (!selectedBucket) return []
    return users.filter(u => {
      if (u.disabled) return false
      const roles = u.assignedRoles || []
      switch (selectedBucket) {
        case 'outbound':
          return roles.some(r => ['user', 'Dialer', 'dialers', 'Lead Gen', 'Lead Gen Admin'].includes(r))
        case 'field_sales':
          return roles.some(r => ['Field Sales', 'Field Sales Admin'].includes(r))
        case 'inbound':
          return roles.some(r => ['Sales Manager', 'Account Managers', 'Account Manager'].includes(r))
        case 'account_manager':
          return roles.some(r => ['Sales Manager', 'Account Managers', 'Account Manager'].includes(r))
        case 'customer_success':
          return roles.some(r => ['Customer Success'].includes(r))
        case 'nurture':
        case 'marketing':
          return roles.some(r => ['admin', 'Marketing Admin', 'Marketing Manager'].includes(r))
        default:
          return true
      }
    })
  }, [users, selectedBucket])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(filteredLeads.map(l => l.id))
    } else {
      setSelectedLeads([])
    }
  }

  const handleSelectRow = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeads(prev => [...prev, leadId])
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId))
    }
  }

  const handleAssign = async (isRandom: boolean) => {
    if (selectedLeads.length === 0 || !selectedBucket) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select leads and a bucket.' })
      return
    }

    if (selectedUsers.length === 0 && !['nurture', 'marketing'].includes(selectedBucket)) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select at least one user to assign to.' })
      return
    }

    setIsAssigning(true)
    try {
      const assignmentMap: Record<string, string> = {}
      
      if (['nurture', 'marketing'].includes(selectedBucket)) {
        selectedLeads.forEach(leadId => {
          assignmentMap[leadId] = ''
        })
      } else if (isRandom && selectedUsers.length > 0) {
        // Round robin
        let userIndex = 0
        selectedLeads.forEach(leadId => {
          assignmentMap[leadId] = selectedUsers[userIndex]
          userIndex = (userIndex + 1) % selectedUsers.length
        })
      } else {
        // Just assign the first selected user if not random, or let the backend/bulk update handle it
        // Actually, if it's not random but multiple users are selected, maybe we just use the first one, or round robin anyway?
        // "assign it to specific users" implies they might select one user. If they select multiple and don't click random, 
        // we'll assign the first one, or we can round robin by default if multiple are selected.
        // Let's use the first user selected if they don't explicitly ask for random.
        selectedLeads.forEach(leadId => {
          assignmentMap[leadId] = selectedUsers[0]
        })
      }

      await bulkAssignUnassignedLeads(selectedLeads, selectedBucket, assignmentMap, 'Admin Assignment')
      
      toast({ title: 'Success', description: `Successfully assigned ${selectedLeads.length} leads to ${selectedBucket}.` })
      
      // Remove assigned leads from the local list
      setLeads(prev => prev.filter(l => !selectedLeads.includes(l.id)))
      setSelectedLeads([])
      setSelectedBucket('')
      setSelectedUsers([])
      
    } catch (error) {
      console.error('Assignment error:', error)
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to assign leads.' })
    } finally {
      setIsAssigning(false)
    }
  }

  if (loading) {
    return <div className="flex h-[400px] items-center justify-center"><Loader /></div>
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filters & Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 max-w-sm flex-1">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by Company Name..." 
                value={searchCompanyName} 
                onChange={e => setSearchCompanyName(e.target.value)} 
              />
            </div>
            <div className="flex items-center gap-2 max-w-sm flex-1">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Filter by Franchisee..." 
                value={filterFranchisee} 
                onChange={e => setFilterFranchisee(e.target.value)} 
              />
            </div>
            <div className="flex items-center gap-2 max-w-sm flex-1">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Filter by Lead Source..." 
                value={filterSource} 
                onChange={e => setFilterSource(e.target.value)} 
              />
            </div>
          </div>
          
          <div className="bg-muted/50 p-4 rounded-md border flex flex-wrap gap-4 items-end">
            <div className="space-y-2 flex-1 min-w-[200px]">
              <label className="text-sm font-medium">Select Target Bucket</label>
              <Select value={selectedBucket} onValueChange={(val) => { setSelectedBucket(val); setSelectedUsers([]); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bucket..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outbound">Outbound (Dialer)</SelectItem>
                  <SelectItem value="field_sales">Field Sales</SelectItem>
                  <SelectItem value="inbound">Inbound (Sales Rep)</SelectItem>
                  <SelectItem value="account_manager">Account Manager</SelectItem>
                  <SelectItem value="customer_success">Customer Success</SelectItem>
                  <SelectItem value="nurture">Nurture</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 flex-[2] min-w-[300px]">
              <label className="text-sm font-medium">Select Target User(s)</label>
              <MultiSelectCombobox
                options={eligibleUsers.map(u => ({ value: u.displayName || u.email, label: u.displayName || u.email }))}
                selected={selectedUsers}
                onSelectedChange={setSelectedUsers}
                placeholder={selectedBucket ? "Select user(s)..." : "Select a bucket first..."}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => handleAssign(false)} 
                disabled={selectedLeads.length === 0 || !selectedBucket || isAssigning || (selectedUsers.length === 0 && !['nurture', 'marketing'].includes(selectedBucket))}
              >
                {isAssigning ? <Loader className="mr-2 h-4 w-4" /> : null}
                Assign
              </Button>
              <Button 
                variant="secondary"
                onClick={() => handleAssign(true)} 
                disabled={selectedLeads.length === 0 || !selectedBucket || selectedUsers.length < 2 || isAssigning}
                title="Randomly and equally assign leads to selected users"
              >
                <Shuffle className="mr-2 h-4 w-4" />
                Random Assignment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox 
                    checked={filteredLeads.length > 0 && selectedLeads.length === filteredLeads.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>NetSuite ID</TableHead>
                <TableHead>Company Name</TableHead>
                <TableHead>Franchisee</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No unassigned leads found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => (
                  <TableRow key={lead.id} className={selectedLeads.includes(lead.id) ? 'bg-muted/50' : ''}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedLeads.includes(lead.id)}
                        onCheckedChange={(checked) => handleSelectRow(lead.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell>{lead.entityId || '-'}</TableCell>
                    <TableCell className="font-medium">{lead.companyName}</TableCell>
                    <TableCell>{lead.franchisee || '-'}</TableCell>
                    <TableCell>
                      {lead.address?.city ? `${lead.address.city}, ${lead.address.state || ''}` : '-'}
                    </TableCell>
                    <TableCell>{lead.status}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
