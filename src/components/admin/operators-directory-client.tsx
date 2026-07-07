'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Operator, Franchisee } from '@/lib/types';
import { getAllFranchisees } from '@/services/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { app, firestore } from '@/lib/firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/ui/loader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download, Users } from 'lucide-react';
import { SmsDialog } from '@/components/sms-dialog';
import { EmailDialog } from '@/components/email-dialog';
import { useAuth } from '@/hooks/use-auth';
import { BulkImportOperators } from '@/components/admin/bulk-import-operators';

export default function OperatorsDirectoryClient() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [franchisees, setFranchisees] = useState<Franchisee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [emailDialogTarget, setEmailDialogTarget] = useState<{ email: string, name: string } | null>(null);
  const [smsDialogTarget, setSmsDialogTarget] = useState<{ phone: string, name: string } | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    async function loadData() {
      try {
        const [opsSnap, frs] = await Promise.all([
          getDocs(collection(firestore, 'operators')),
          getAllFranchisees()
        ]);
        
        const ops = opsSnap.docs.map(doc => ({ internalId: doc.id, ...doc.data() } as Operator));
        setOperators(ops);
        setFranchisees(frs);
      } catch (error) {
        console.error('Failed to load operators:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const getFranchiseeName = (id: string) => {
    return franchisees.find(f => f.internalId === id)?.name || id;
  };

  const filteredOperators = useMemo(() => {
    return operators.filter((op) => {
      const q = searchQuery.toLowerCase();
      const name = `${op.givenNames} ${op.surname}`.toLowerCase();
      return !q || 
        name.includes(q) ||
        op.contactEmail?.toLowerCase().includes(q) ||
        op.contactPhone?.toLowerCase().includes(q);
    });
  }, [operators, searchQuery]);

  const downloadCSV = () => {
    const header = [
      "Internal ID", "Title", "Given Names", "Surname", "Phone", "Email", 
      "Status", "Employment", "Main Franchisee", "Linked Franchisees"
    ];
    
    const rows = filteredOperators.map(op => [
      op.internalId,
      op.title,
      op.givenNames,
      op.surname,
      op.contactPhone,
      op.contactEmail,
      op.operatorStatus,
      op.employment,
      getFranchiseeName(op.mainFranchiseeId),
      (op.linkedFranchiseeIds || []).map(getFranchiseeName).join(', ')
    ]);

    const csvContent = [
      header.join(","),
      ...rows.map(row => row.map(v => `"${String(v || "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "operators_directory.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or email..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <BulkImportOperators />
          <Button variant="outline" onClick={downloadCSV} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Main Franchisee</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Employment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOperators.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No operators found.
                </TableCell>
              </TableRow>
            ) : (
              filteredOperators.map((op) => (
                <TableRow key={op.internalId} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">{`${op.givenNames} ${op.surname}`.trim() || 'N/A'}</TableCell>
                  <TableCell>{getFranchiseeName(op.mainFranchiseeId)}</TableCell>
                  <TableCell>
                    {op.contactPhone ? (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSmsDialogTarget({ phone: op.contactPhone!, name: `${op.givenNames} ${op.surname}`.trim() || 'Operator' });
                        }}
                        className="text-primary hover:underline text-left bg-transparent border-none p-0 cursor-pointer"
                        title="Send SMS via App"
                      >
                        {op.contactPhone}
                      </button>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {op.contactEmail ? (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEmailDialogTarget({ email: op.contactEmail!, name: `${op.givenNames} ${op.surname}`.trim() || 'Operator' });
                        }}
                        className="text-primary hover:underline text-left bg-transparent border-none p-0 cursor-pointer"
                        title="Send Email via App"
                      >
                        {op.contactEmail}
                      </button>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{op.operatorStatus || 'Unknown'}</Badge>
                  </TableCell>
                  <TableCell>{op.employment || 'Unknown'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {emailDialogTarget && (
        <EmailDialog
          isOpen={!!emailDialogTarget}
          onClose={() => setEmailDialogTarget(null)}
          toEmail={emailDialogTarget.email}
          recipientName={emailDialogTarget.name}
          senderEmail={user?.email || undefined}
        />
      )}

      {smsDialogTarget && (
        <SmsDialog
          isOpen={!!smsDialogTarget}
          onClose={() => setSmsDialogTarget(null)}
          phoneNumber={smsDialogTarget.phone}
          recipientName={smsDialogTarget.name}
        />
      )}
    </div>
  );
}
