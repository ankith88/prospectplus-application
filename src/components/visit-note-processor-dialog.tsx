'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader } from './ui/loader';
import type { VisitNote, VisitNoteAnalysis, Address, Lead } from '@/lib/types';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { createNewLead, updateVisitNote, getLeadsFromFirebase, getCompaniesFromFirebase } from '@/services/firebase';
import { useAuth } from '@/hooks/use-auth';
import Image from 'next/image';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from './ui/input';
import { Search, Star } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Badge } from './ui/badge';

interface VisitNoteProcessorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  note: VisitNote;
  onProcessed: (noteId: string, status: 'Converted' | 'Rejected', leadId?: string) => void;
}

const formatAddressDisplay = (address: Address | undefined) => {
    if (!address) return 'No address captured.';
    return [address.street, address.city, address.state, address.zip].filter(Boolean).join(', ');
};

export function VisitNoteProcessorDialog({ isOpen, onOpenChange, note, onProcessed }: VisitNoteProcessorDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<(Lead & { isCompanyResult?: boolean })[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedItem, setSelectedItem] = useState<(Lead & { isCompanyResult?: boolean }) | null>(null);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
        setSearchQuery('');
        setSearchResults([]);
        setSelectedItem(null);
    }
  }, [isOpen]);

  const handleSearch = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const [allLeads, allCompanies] = await Promise.all([
        getLeadsFromFirebase({ summary: true }),
        getCompaniesFromFirebase()
      ]);

      const normalizedQuery = query.toLowerCase();
      
      const filteredLeads = allLeads
        .filter(l => l.companyName.toLowerCase().includes(normalizedQuery))
        .map(l => ({ ...l, isCompanyResult: false }));

      const filteredCompanies = allCompanies
        .filter(c => c.companyName.toLowerCase().includes(normalizedQuery))
        .map(c => ({ ...c, isCompanyResult: true }));

      setSearchResults([...filteredLeads, ...filteredCompanies].slice(0, 15));
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not search for existing records.' });
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
        if (searchQuery && !selectedItem) {
            handleSearch(searchQuery);
        }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedItem]);


  const handleCreateLead = () => {
    if (!note) return;
    setIsCreating(true);
    const params = new URLSearchParams();
    params.set('fromVisitNote', note.id);
    router.push(`/leads/new?${params.toString()}`);
    onOpenChange(false);
  };
  
  const handleReject = async () => {
    setIsRejecting(true);
    try {
        await updateVisitNote(note.id, { status: 'Rejected' });
        onProcessed(note.id, 'Rejected');
        toast({ title: 'Note Rejected', description: 'The visit note has been marked as rejected.' });
        onOpenChange(false);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not reject the note.' });
    } finally {
        setIsRejecting(false);
    }
  }

  const handleLinkToItem = async () => {
    if (!selectedItem || !note) return;

    setIsLinking(true);
    try {
      const collectionName = selectedItem.isCompanyResult ? 'companies' : 'leads';
      
      // 1. Update the visit note with the link
      await updateVisitNote(note.id, { status: 'Converted', leadId: selectedItem.id });
      
      // 2. Update the target lead/company with the visitNoteID
      const docRef = doc(firestore, collectionName, selectedItem.id);
      await updateDoc(docRef, { visitNoteID: note.id });

      onProcessed(note.id, 'Converted', selectedItem.id);
      toast({
        title: 'Note Linked Successfully',
        description: `The visit note has been linked to ${selectedItem.companyName}.`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to link visit note:', error);
      toast({
        variant: 'destructive',
        title: 'Linking Failed',
        description: 'Could not link the visit note. Please try again.',
      });
    } finally {
      setIsLinking(false);
    }
  };


  return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Process Visit Note</DialogTitle>
            <DialogDescription>
              For: <span className="font-semibold">{note.companyName || 'Unknown Company'}</span> at <span className="text-muted-foreground">{formatAddressDisplay(note.address)}</span>
              <br />
              Captured by {note.capturedBy} on {format(new Date(note.createdAt), 'PPpp')}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
               <div>
                  <h4 className="font-semibold mb-2">Original Note</h4>
                  <ScrollArea className="h-48 rounded-md border p-4 bg-secondary/50">
                  <p className="whitespace-pre-wrap text-sm">{note.content}</p>
                  </ScrollArea>
               </div>
               {note.imageUrls && note.imageUrls.length > 0 && (
                    <div>
                        <h4 className="font-semibold mb-2">Attached Images</h4>
                        <ScrollArea className="h-40">
                            <div className="flex gap-4 flex-wrap p-1">
                                {note.imageUrls.map((url, index) => (
                                    <div 
                                      key={index} 
                                      className="relative w-[200px] h-[120px] rounded-md overflow-hidden border bg-background group cursor-pointer"
                                      onClick={() => window.open(url, '_blank')}
                                    >
                                      <Image src={url} alt={`Visit image ${index + 1}`} fill className="object-cover transition-transform group-hover:scale-105"/>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                )}
                {note.discoveryData && Object.keys(note.discoveryData).length > 0 && (
                    <div>
                        <h4 className="font-semibold mb-2">Field Discovery Data</h4>
                        <ScrollArea className="h-32 rounded-md border p-4 text-sm">
                            <ul className="list-disc pl-5 space-y-1">
                            {Object.entries(note.discoveryData).map(([key, value]) => {
                                if (!value || (Array.isArray(value) && value.length === 0)) return null;
                                const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
                                const formattedValue = Array.isArray(value) ? value.join(', ') : String(value);
                                return (
                                <li key={key}>
                                    <span className="font-semibold">{formattedKey}:</span>{' '}
                                    <span className="text-muted-foreground">{formattedValue}</span>
                                </li>
                                )
                            })}
                            </ul>
                        </ScrollArea>
                    </div>
                )}
            </div>
            
             <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Create New Lead</CardTitle>
                        <CardDescription>
                        Create a new lead in the system based on this visit note.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button onClick={handleCreateLead} disabled={isCreating || isRejecting} className="w-full">
                        {isCreating ? <Loader /> : 'Create Lead'}
                        </Button>
                    </CardFooter>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Link to Existing Lead or Customer</CardTitle>
                        <CardDescription>
                        Search for a Lead or Signed Customer to link this note.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by company name..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        </div>
                        {isSearching && <div className="flex justify-center"><Loader /></div>}
                        {searchResults.length > 0 && !selectedItem && (
                        <ScrollArea className="h-48 rounded-md border">
                            <div className="p-2">
                            {searchResults.map(item => (
                                <div key={item.id} className="p-2 hover:bg-accent rounded cursor-pointer flex items-center justify-between gap-2" onClick={() => {
                                    setSelectedItem(item);
                                    setSearchQuery(item.companyName);
                                    setSearchResults([]);
                                }}>
                                    <div>
                                        <p className="font-semibold">{item.companyName}</p>
                                        <p className="text-sm text-muted-foreground">{item.address?.city}, {item.address?.state}</p>
                                    </div>
                                    {item.isCompanyResult && (
                                        <Badge variant="secondary" className="flex items-center gap-1 shrink-0">
                                            <Star className="h-3 w-3" /> Signed Customer
                                        </Badge>
                                    )}
                                </div>
                            ))}
                            </div>
                        </ScrollArea>
                        )}
                        {selectedItem && (
                        <div className="p-3 border rounded-md bg-secondary/50 text-sm">
                            <div className="flex items-center justify-between">
                                <p className="font-semibold">{selectedItem.companyName}</p>
                                {selectedItem.isCompanyResult && <Badge variant="secondary">Signed Customer</Badge>}
                            </div>
                            <p className="text-muted-foreground">{selectedItem.address?.street}, {selectedItem.address?.city}</p>
                            <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => {
                                setSelectedItem(null);
                                setSearchQuery('');
                            }}>Clear selection</Button>
                        </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleLinkToItem} disabled={isLinking || !selectedItem} className="w-full">
                            {isLinking ? <Loader /> : 'Link to this Record'}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
          </div>

          <DialogFooter>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isRejecting || isCreating}>
                      {isRejecting ? <Loader /> : 'Reject Note'}
                  </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                          This will mark the note as rejected and remove it from the active queue.
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleReject}>Confirm Rejection</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
