'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase';
import { getAllUsers, logActivity } from '@/services/firebase';
import { writeBatch, doc } from 'firebase/firestore';
import { Loader2, Users } from 'lucide-react';
import type { Lead, UserProfile } from '@/lib/types';

interface AllocateBucketDialogProps {
  leads: Lead[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onLeadsMoved: () => void;
}

export function AllocateBucketDialog({ leads, isOpen, onOpenChange, onLeadsMoved }: AllocateBucketDialogProps) {
  const [targetType, setTargetType] = useState<'field_sales' | 'account_manager'>('field_sales');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedUserNames, setSelectedUserNames] = useState<string[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isAllocating, setIsAllocating] = useState(false);
  
  const { toast } = useToast();
  const { user, userProfile } = useAuth();

  useEffect(() => {
    const fetchUsers = async () => {
      if (!isOpen) return;
      setIsLoadingUsers(true);
      try {
        const usersList = await getAllUsers();
        setAllUsers(usersList.filter(u => !u.disabled));
      } catch (error) {
        console.error('Failed to fetch users:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load users.' });
      } finally {
        setIsLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [isOpen, toast]);

  // Clear selections when target type changes
  useEffect(() => {
    setSelectedUserNames([]);
  }, [targetType]);

  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      const roles = u.assignedRoles || [];
      const roleStr = u.role || '';
      
      if (targetType === 'field_sales') {
        return roles.includes('Field Sales') || roles.includes('Dashback') || roles.includes('Field Sales Admin') || roleStr === 'Field Sales';
      } else {
        return roles.includes('Account Manager') || roles.includes('Account Managers') || roles.includes('account managers') || roleStr === 'Account Manager' || roleStr === 'Account Managers';
      }
    });
  }, [allUsers, targetType]);

  const handleToggleUser = (checked: boolean, userName: string) => {
    if (checked) {
      setSelectedUserNames(prev => [...prev, userName]);
    } else {
      setSelectedUserNames(prev => prev.filter(name => name !== userName));
    }
  };

  const handleAllocate = async () => {
    if (leads.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'No leads to allocate.' });
      return;
    }
    if (selectedUserNames.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select at least one user to assign leads to.' });
      return;
    }

    setIsAllocating(true);
    try {
      const batch = writeBatch(firestore);
      const author = user?.displayName || user?.email || 'System';
      
      // Shuffle user list to distribute randomly
      const shuffledUsers = [...selectedUserNames].sort(() => Math.random() - 0.5);

      leads.forEach((lead, index) => {
        const assignedUser = shuffledUsers[index % shuffledUsers.length];
        const leadRef = doc(firestore, 'leads', lead.id);

        const oldBucket = lead.bucket || (lead.fieldSales ? 'field_sales' : 'outbound');
        const newBucket = targetType;

        if (targetType === 'field_sales') {
          batch.update(leadRef, {
            bucket: 'field_sales',
            fieldSales: true,
            dialerAssigned: assignedUser
          });
        } else {
          batch.update(leadRef, {
            bucket: 'account_manager',
            fieldSales: false,
            accountManagerAssigned: assignedUser
          });
        }

        // Log activity
        const activityRef = doc(firestore, 'leads', lead.id, 'activity', `alloc-${Date.now()}-${index}`);
        batch.set(activityRef, {
          type: 'Update',
          date: new Date().toISOString(),
          notes: targetType === 'field_sales' 
            ? `Lead allocated to Field Sales and assigned to ${assignedUser}.`
            : `Lead allocated to Account Manager and assigned to ${assignedUser}.`,
          author
        });

        // Log bucket history
        const historyRef = doc(firestore, 'leads', lead.id, 'bucket_history', `bh-${Date.now()}-${index}`);
        batch.set(historyRef, {
          oldBucket,
          newBucket,
          date: new Date().toISOString(),
          author
        });
      });

      await batch.commit();
      toast({ 
        title: 'Allocation Successful', 
        description: `Successfully allocated ${leads.length} lead(s) to ${selectedUserNames.length} selected user(s).` 
      });
      onLeadsMoved();
      onOpenChange(false);
    } catch (error) {
      console.error('Allocation failed:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to allocate leads.' });
    } finally {
      setIsAllocating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white border border-slate-100 rounded-2xl shadow-xl p-6">
        <DialogHeader className="space-y-2.5">
          <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span>Allocate {leads.length} Lead(s)</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Choose the target bucket and select one or more users. Leads will be distributed randomly among the checked users.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Bucket</span>
            <Select 
              value={targetType} 
              onValueChange={(val: any) => setTargetType(val)}
            >
              <SelectTrigger className="w-full bg-slate-50 border-slate-200 text-xs h-10 rounded-lg">
                <SelectValue placeholder="Select target bucket" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="field_sales" className="text-xs">Field Sales</SelectItem>
                <SelectItem value="account_manager" className="text-xs">Account Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Assign to ({filteredUsers.length} available)
            </span>
            <ScrollArea className="h-44 border border-slate-100 rounded-lg bg-slate-50/50 p-2">
              {isLoadingUsers ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 italic">
                  No active users found for this role.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredUsers.map(u => {
                    const name = u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
                    return (
                      <div key={u.uid} className="flex items-center space-x-2.5 pl-1.5">
                        <Checkbox
                          id={`alloc-${u.uid}`}
                          checked={selectedUserNames.includes(name)}
                          onCheckedChange={(checked) => handleToggleUser(!!checked, name)}
                        />
                        <Label 
                          htmlFor={`alloc-${u.uid}`} 
                          className="text-xs font-medium text-slate-700 cursor-pointer select-none"
                        >
                          {name}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9 text-xs rounded-lg border-slate-200 text-slate-600">
            Cancel
          </Button>
          <Button 
            onClick={handleAllocate} 
            disabled={selectedUserNames.length === 0 || isAllocating || isLoadingUsers}
            className="h-9 text-xs rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4"
          >
            {isAllocating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Allocating...
              </>
            ) : (
              'Confirm Allocation'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
