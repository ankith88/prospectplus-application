"use client"

import { useState, useEffect } from 'react'
import type { Lead, UserProfile } from '@/lib/types'
import { getAllUsers, bulkMoveLeadsToBucket } from '@/services/firebase'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'

export interface MoveLeadDialogProps {
  leads: Lead[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onLeadsMoved: () => void;
  targetBucket: 'field' | 'outbound' | 'account_manager' | 'customer_success' | string;
  currentBucket?: string;
}

export function MoveLeadDialog({ leads, isOpen, onOpenChange, onLeadsMoved, targetBucket, currentBucket }: MoveLeadDialogProps) {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const { toast } = useToast();
    
    useEffect(() => {
        const fetchUsers = async () => {
            if (!isOpen) return;

            setIsLoadingUsers(true);
            const allUsers = await getAllUsers();
            const filteredUsers = allUsers.filter(u => {
                if (targetBucket === 'field' || targetBucket === 'field_sales') {
                    return u.assignedRoles?.includes('Field Sales') || u.assignedRoles?.includes('Dashback') || u.assignedRoles?.includes('admin');
                }
                if (targetBucket === 'outbound') {
                    return u.assignedRoles?.some(r => ['user', 'Dialer', 'dialers'].includes(r)) &&
                           !u.assignedRoles?.includes('Field Sales') &&
                           !u.assignedRoles?.includes('Field Sales Admin') &&
                           !u.assignedRoles?.includes('Account Manager') &&
                           !u.assignedRoles?.includes('Account Managers') &&
                           !u.assignedRoles?.includes('account managers') &&
                           !u.assignedRoles?.includes('Lead Gen') &&
                           !u.assignedRoles?.includes('Lead Gen Admin') &&
                           !u.assignedRoles?.includes('Sales Manager');
                }
                if (targetBucket === 'account_manager') {
                    return u.assignedRoles?.includes('Account Manager') || u.assignedRoles?.includes('Account Managers') || u.assignedRoles?.includes('account managers');
                }
                if (targetBucket === 'customer_success') {
                    return u.assignedRoles?.includes('Customer Success') || u.assignedRoles?.includes('customer success');
                }
                return true; // If target bucket is something else, show all (or could restrict further)
            });
            setUsers(filteredUsers.filter(u => !u.disabled));
            setIsLoadingUsers(false);
        };
        fetchUsers();
    }, [isOpen, targetBucket]);

    const handleMoveLeads = async () => {
        if (leads.length === 0 || !selectedUser) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select leads and a user to assign them to.' });
            return;
        }
        setIsMoving(true);
        try {
            await bulkMoveLeadsToBucket({
                leadIds: leads.map(l => l.id),
                fieldSales: targetBucket === 'field' || targetBucket === 'field_sales',
                assigneeDisplayName: selectedUser,
            });
            toast({ title: 'Success', description: `${leads.length} lead(s) have been moved and reassigned.` });
            onLeadsMoved();
            onOpenChange(false);
        } catch (error) {
            console.error("Failed to move leads:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not move the selected leads.' });
        } finally {
            setIsMoving(false);
        }
    };
    
    useEffect(() => {
        if (!isOpen) {
            setSelectedUser('');
        }
    }, [isOpen]);

    const displayBucketName = targetBucket === 'field' || targetBucket === 'field_sales' ? 'Field Sales' : targetBucket === 'outbound' ? 'Outbound' : targetBucket === 'account_manager' ? 'Account Manager' : targetBucket === 'customer_success' ? 'Customer Success' : targetBucket;
    const repType = targetBucket === 'field' || targetBucket === 'field_sales' ? 'Field Sales Rep' : targetBucket === 'outbound' ? 'Dialer' : targetBucket === 'account_manager' ? 'Account Manager' : targetBucket === 'customer_success' ? 'CS Rep' : 'Representative';

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Move {leads.length} Lead(s)</DialogTitle>
                    <DialogDescription>Move selected leads to the {displayBucketName} bucket and reassign.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Assign To</Label>
                         <Select value={selectedUser} onValueChange={setSelectedUser}>
                            <SelectTrigger disabled={isLoadingUsers}>
                                <SelectValue placeholder={isLoadingUsers ? 'Loading users...' : `Select a ${repType}`} />
                            </SelectTrigger>
                            <SelectContent>
                                {users.map(user => (
                                    <SelectItem key={user.uid} value={user.displayName!}>
                                        {user.displayName} ({user.defaultRole})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                         </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleMoveLeads} disabled={!selectedUser || isMoving}>
                        {isMoving ? <Loader/> : 'Confirm Move'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
