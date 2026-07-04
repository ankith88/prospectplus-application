"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Address, Contact, Lead } from "@/lib/types";
import { createChildSiteLead, updateLeadDetails, getSiblingLeads, getLeadFromFirebase, getCompanyFromFirebase } from "@/services/firebase";
import { PlusCircle, MapPin, Building, Loader2, Users, ArrowRight, Link2, Link2Off, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LeadStatusBadge } from "@/components/lead-status-badge";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface MultiSiteManagerProps {
    lead: Lead;
    contacts: Contact[];
    onLocationsUpdated: () => void;
}

export function MultiSiteManager({ lead, contacts, onLocationsUpdated }: MultiSiteManagerProps) {
    const { toast } = useToast();
    const { userProfile, isSuperAdmin } = useAuth();
    const isAdminOrSuperAdmin = isSuperAdmin || userProfile?.activeRole === 'admin';

    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    
    const [childLeads, setChildLeads] = useState<Lead[]>([]);
    const [parentLead, setParentLead] = useState<Lead | null>(null);
    const [loadingRelated, setLoadingRelated] = useState(false);

    // Form state for new location
    const [street, setStreet] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [zip, setZip] = useState("");
    
    // Form state for local manager
    const [managerName, setManagerName] = useState("");
    const [managerEmail, setManagerEmail] = useState("");
    const [managerPhone, setManagerPhone] = useState("");

    // Linking parent state
    const [isLinkParentOpen, setIsLinkParentOpen] = useState(false);
    const [parentSearchQuery, setParentSearchQuery] = useState("");
    const [parentSearchResults, setParentSearchResults] = useState<any[]>([]);
    const [isSearchingParent, setIsSearchingParent] = useState(false);
    const [isSavingParent, setIsSavingParent] = useState(false);

    useEffect(() => {
        const loadRelatedLeads = async () => {
            if (!lead.id) return;
            setLoadingRelated(true);
            try {
                if (lead.parentLeadId) {
                    // This is a child lead. Fetch the parent lead first.
                    let parent = await getLeadFromFirebase(lead.parentLeadId);
                    if (!parent) {
                        parent = await getCompanyFromFirebase(lead.parentLeadId);
                    }
                    setParentLead(parent);

                    // Fetch sibling leads (other children of the parent)
                    const siblings = await getSiblingLeads(lead.parentLeadId);
                    // Filter out this child lead
                    setChildLeads(siblings.filter(s => s.id !== lead.id));
                } else {
                    // This is a parent lead. Fetch child leads.
                    setParentLead(null);
                    const children = await getSiblingLeads(lead.id);
                    setChildLeads(children);
                }
            } catch (err) {
                console.error("Failed to load multi-site related leads:", err);
            } finally {
                setLoadingRelated(false);
            }
        };

        loadRelatedLeads();
    }, [lead.id, lead.parentLeadId]);

    // Parent search effect with debouncing
    useEffect(() => {
        if (parentSearchQuery.trim().length < 2) {
            setParentSearchResults([]);
            return;
        }

        setIsSearchingParent(true);
        const controller = new AbortController();

        const delayDebounce = setTimeout(() => {
            fetch(`/api/search?q=${encodeURIComponent(parentSearchQuery)}`, {
                signal: controller.signal
            })
                .then(res => res.json())
                .then(data => {
                    // Filter out current lead to prevent self-linking
                    const results = (data.results || []).filter((item: any) => item.id !== lead.id);
                    setParentSearchResults(results);
                })
                .catch(err => {
                    if (err.name !== 'AbortError') {
                        console.error('Parent search failed:', err);
                    }
                })
                .finally(() => {
                    setIsSearchingParent(false);
                });
        }, 300);

        return () => {
            clearTimeout(delayDebounce);
            controller.abort();
        };
    }, [parentSearchQuery, lead.id]);

    const handleLinkParent = async (parentId: string, parentName: string) => {
        setIsSavingParent(true);
        try {
            await updateLeadDetails(lead.id, lead, { parentLeadId: parentId });
            toast({
                title: "Parent Customer Connected",
                description: `Successfully connected ${lead.companyName} as a child of ${parentName}.`,
            });
            setIsLinkParentOpen(false);
            setParentSearchQuery("");
            setParentSearchResults([]);
            onLocationsUpdated();
        } catch (error: any) {
            toast({
                title: "Error Linking Parent",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsSavingParent(false);
        }
    };

    // Linking child state
    const [isLinkChildOpen, setIsLinkChildOpen] = useState(false);
    const [childSearchQuery, setChildSearchQuery] = useState("");
    const [childSearchResults, setChildSearchResults] = useState<any[]>([]);
    const [isSearchingChild, setIsSearchingChild] = useState(false);
    const [isSavingChild, setIsSavingChild] = useState(false);
    const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);

    useEffect(() => {
        setSelectedChildIds([]);
    }, [childSearchQuery, isLinkChildOpen]);

    // Child search effect with debouncing
    useEffect(() => {
        if (childSearchQuery.trim().length < 2) {
            setChildSearchResults([]);
            return;
        }

        setIsSearchingChild(true);
        const controller = new AbortController();

        const delayDebounce = setTimeout(() => {
            fetch(`/api/search?q=${encodeURIComponent(childSearchQuery)}`, {
                signal: controller.signal
            })
                .then(res => res.json())
                .then(data => {
                    // Filter out current lead to prevent self-linking
                    const results = (data.results || []).filter((item: any) => item.id !== lead.id);
                    setChildSearchResults(results);
                })
                .catch(err => {
                    if (err.name !== 'AbortError') {
                        console.error('Child search failed:', err);
                    }
                })
                .finally(() => {
                    setIsSearchingChild(false);
                });
        }, 300);

        return () => {
            clearTimeout(delayDebounce);
            controller.abort();
        };
    }, [childSearchQuery, lead.id]);

    const handleLinkChild = async (childId: string, childName: string) => {
        setIsSavingChild(true);
        try {
            // Fetch child details
            let childObj = await getLeadFromFirebase(childId);
            if (!childObj) {
                childObj = await getCompanyFromFirebase(childId);
            }
            if (!childObj) {
                throw new Error("Child customer not found in database.");
            }

            // Link the child to the parent (which is the current lead)
            await updateLeadDetails(childId, childObj, { parentLeadId: lead.id });

            // Also update parent lead's multiSiteLocations
            const newAddress: Address = childObj.address || {
                street: "",
                city: "",
                state: "",
                zip: "",
                country: "Australia"
            };
            const currentLocations = lead.multiSiteLocations || [];
            await updateLeadDetails(lead.id, lead, {
                multiSiteLocations: [...currentLocations, newAddress]
            });

            toast({
                title: "Child Customer Connected",
                description: `Successfully connected ${childName} as a child of ${lead.companyName}.`,
            });
            setIsLinkChildOpen(false);
            setChildSearchQuery("");
            setChildSearchResults([]);
            onLocationsUpdated();
        } catch (error: any) {
            toast({
                title: "Error Linking Child",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsSavingChild(false);
        }
    };

    const handleLinkMultipleChildren = async () => {
        if (selectedChildIds.length === 0) return;
        setIsSavingChild(true);
        try {
            const currentLocations = [...(lead.multiSiteLocations || [])];
            let connectedCount = 0;

            for (const childId of selectedChildIds) {
                let childObj = await getLeadFromFirebase(childId);
                if (!childObj) {
                    childObj = await getCompanyFromFirebase(childId);
                }
                if (childObj) {
                    // Link the child to the parent
                    await updateLeadDetails(childId, childObj, { parentLeadId: lead.id });
                    
                    // Collect address
                    const newAddress: Address = childObj.address || {
                        street: "",
                        city: "",
                        state: "",
                        zip: "",
                        country: "Australia"
                    };
                    currentLocations.push(newAddress);
                    connectedCount++;
                }
            }

            // Update parent lead with all new locations
            await updateLeadDetails(lead.id, lead, {
                multiSiteLocations: currentLocations
            });

            toast({
                title: "Child Customers Connected",
                description: `Successfully connected ${connectedCount} child customer(s) to ${lead.companyName}.`,
            });
            setIsLinkChildOpen(false);
            setChildSearchQuery("");
            setChildSearchResults([]);
            setSelectedChildIds([]);
            onLocationsUpdated();
        } catch (error: any) {
            toast({
                title: "Error Linking Children",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsSavingChild(false);
        }
    };

    const handleUnlinkParent = async () => {
        if (!confirm(`Are you sure you want to disconnect ${lead.companyName} from its parent customer?`)) {
            return;
        }
        setIsSavingParent(true);
        try {
            await updateLeadDetails(lead.id, lead, { parentLeadId: "" });
            toast({
                title: "Parent Customer Disconnected",
                description: `Successfully removed parent relationship.`,
            });
            onLocationsUpdated();
        } catch (error: any) {
            toast({
                title: "Error Unlinking Parent",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsSavingParent(false);
        }
    };

    const handleAddLocation = async () => {
        if (!street || !city || !state || !zip) {
            toast({ title: "Validation Error", description: "Please fill in all address fields.", variant: "destructive" });
            return;
        }

        if (!managerName) {
            toast({ title: "Validation Error", description: "Local site manager name is required.", variant: "destructive" });
            return;
        }

        const targetParentId = lead.parentLeadId || lead.id;
        const targetParentLead = parentLead || lead;

        if (!targetParentId) {
            toast({ title: "Error", description: "No parent customer found to link child lead.", variant: "destructive" });
            return;
        }

        setIsCreating(true);
        try {
            const newAddress: Address = {
                street,
                city,
                state,
                zip,
                country: "Australia"
            };

            const localManager: Contact = {
                id: crypto.randomUUID(),
                name: managerName,
                email: managerEmail,
                phone: managerPhone,
                title: "Local Site Manager"
            };

            // Create child lead with franchisee mapping under the resolved parent lead ID
            const childLeadId = await createChildSiteLead(
                targetParentId,
                `${targetParentLead.companyName} - ${city}`,
                newAddress,
                localManager,
                contacts // pass all parent contacts so they are copied to child
            );

            // Update parent lead with the new location
            const currentLocations = targetParentLead.multiSiteLocations || [];
            await updateLeadDetails(targetParentId, targetParentLead, {
                multiSiteLocations: [...currentLocations, newAddress]
            });

            toast({
                title: "Child Lead Created",
                description: `Successfully created child lead for ${city} and assigned to respective franchisee.`,
            });

            // Reset form
            setStreet("");
            setCity("");
            setState("");
            setZip("");
            setManagerName("");
            setManagerEmail("");
            setManagerPhone("");
            
            setIsOpen(false);
            onLocationsUpdated();

        } catch (error: any) {
            toast({
                title: "Error",
                description: "Failed to create child lead: " + error.message,
                variant: "destructive"
            });
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-wrap items-center justify-between pb-3 gap-4">
                <div>
                    <CardTitle className="flex items-center gap-2 text-xl font-bold">
                        <Building className="w-6 h-6 text-muted-foreground" />
                        Multi-Site Locations
                    </CardTitle>
                    <CardDescription>Manage child sites and generate local leads.</CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {!lead.parentLeadId && isAdminOrSuperAdmin && (
                        <>
                            <Dialog open={isLinkParentOpen} onOpenChange={setIsLinkParentOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Link2 className="mr-2 h-4 w-4" /> Link Parent
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Link Parent Customer</DialogTitle>
                                        <DialogDescription>
                                            Connect {lead.companyName} as a child location of an existing customer/lead.
                                        </DialogDescription>
                                    </DialogHeader>
                                    
                                    <div className="space-y-4 py-4">
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="search"
                                                placeholder="Search by company name..."
                                                className="pl-9"
                                                value={parentSearchQuery}
                                                onChange={e => setParentSearchQuery(e.target.value)}
                                            />
                                        </div>
                                        
                                        <div className="max-h-60 overflow-y-auto space-y-2">
                                            {isSearchingParent && (
                                                <div className="flex justify-center py-4">
                                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                                </div>
                                            )}
                                            {!isSearchingParent && parentSearchQuery.trim().length >= 2 && parentSearchResults.length === 0 && (
                                                <p className="text-sm text-center text-muted-foreground py-4">No customers found.</p>
                                            )}
                                            {!isSearchingParent && parentSearchQuery.trim().length < 2 && (
                                                <p className="text-xs text-center text-muted-foreground py-4">Type at least 2 characters to search...</p>
                                            )}
                                            {!isSearchingParent && parentSearchResults.map(result => (
                                                <div
                                                    key={result.id}
                                                    className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors"
                                                >
                                                    <div className="flex-1 min-w-0 mr-2">
                                                        <p className="text-sm font-semibold truncate">{result.title}</p>
                                                        <p className="text-xs text-muted-foreground truncate">{result.description}</p>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        disabled={isSavingParent}
                                                        onClick={() => handleLinkParent(result.id, result.title)}
                                                    >
                                                        Connect
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            <Dialog open={isLinkChildOpen} onOpenChange={setIsLinkChildOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Link2 className="mr-2 h-4 w-4" /> Link Child
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Link Child Customer</DialogTitle>
                                        <DialogDescription>
                                            Connect an existing customer/lead as a child location of {lead.companyName}.
                                        </DialogDescription>
                                    </DialogHeader>
                                    
                                    <div className="space-y-4 py-4">
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="search"
                                                placeholder="Search by company name..."
                                                className="pl-9"
                                                value={childSearchQuery}
                                                onChange={e => setChildSearchQuery(e.target.value)}
                                            />
                                        </div>
                                        
                                        <div className="max-h-60 overflow-y-auto space-y-2">
                                            {isSearchingChild && (
                                                <div className="flex justify-center py-4">
                                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                                </div>
                                            )}
                                            {!isSearchingChild && childSearchQuery.trim().length >= 2 && childSearchResults.length === 0 && (
                                                <p className="text-sm text-center text-muted-foreground py-4">No customers found.</p>
                                            )}
                                            {!isSearchingChild && childSearchQuery.trim().length < 2 && (
                                                <p className="text-xs text-center text-muted-foreground py-4">Type at least 2 characters to search...</p>
                                            )}
                                            {!isSearchingChild && childSearchResults.map(result => {
                                                const isSelected = selectedChildIds.includes(result.id);
                                                return (
                                                    <div
                                                        key={result.id}
                                                        className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                setSelectedChildIds(prev => prev.filter(id => id !== result.id));
                                                            } else {
                                                                setSelectedChildIds(prev => [...prev, result.id]);
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                                                            <Checkbox
                                                                checked={isSelected}
                                                                onCheckedChange={() => {
                                                                    // Handled by row onClick
                                                                }}
                                                            />
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-semibold truncate">{result.title}</p>
                                                                <p className="text-xs text-muted-foreground truncate">{result.description}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-4 border-t">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setIsLinkChildOpen(false);
                                                setSelectedChildIds([]);
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            disabled={selectedChildIds.length === 0 || isSavingChild}
                                            onClick={handleLinkMultipleChildren}
                                        >
                                            {isSavingChild && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Link Selected ({selectedChildIds.length})
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </>
                    )}
                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        {!lead.parentLeadId && (
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Location
                                </Button>
                            </DialogTrigger>
                        )}
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Add Multi-Site Location</DialogTitle>
                                <DialogDescription>
                                    This will automatically generate a child lead for this location, assign it to the correct local franchisee, and copy over the parent contacts.
                                </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <h4 className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4" /> Site Address</h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        <Input placeholder="Street Address" value={street} onChange={e => setStreet(e.target.value)} />
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input placeholder="Suburb / City" value={city} onChange={e => setCity(e.target.value)} />
                                            <Input placeholder="State" value={state} onChange={e => setState(e.target.value)} />
                                        </div>
                                        <Input placeholder="Postcode" value={zip} onChange={e => setZip(e.target.value)} />
                                    </div>
                                </div>
                                
                                <div className="space-y-2 pt-4 border-t">
                                    <h4 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4" /> Local Site Manager</h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        <Input placeholder="Manager Name" value={managerName} onChange={e => setManagerName(e.target.value)} />
                                        <Input placeholder="Email (optional)" type="email" value={managerEmail} onChange={e => setManagerEmail(e.target.value)} />
                                        <Input placeholder="Phone (optional)" value={managerPhone} onChange={e => setManagerPhone(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                                <Button onClick={handleAddLocation} disabled={isCreating}>
                                    {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Create Child Lead
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                {loadingRelated ? (
                    <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Parent Lead Link */}
                        {lead.parentLeadId && parentLead && (
                            <div className="flex flex-col gap-3 p-4 border border-amber-200 dark:border-amber-900/50 rounded-md bg-amber-50/30 dark:bg-amber-950/10">
                                <div className="flex items-start gap-3">
                                    <Building className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-semibold text-foreground leading-tight">{parentLead.companyName}</p>
                                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 shrink-0">
                                                Parent Lead
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {parentLead.address?.street ? `${parentLead.address.street}, ` : ""}
                                            {parentLead.address?.city || ""}, {parentLead.address?.state || ""} {parentLead.address?.zip || ""}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground mt-1">
                                            Franchisee: <span className="font-medium text-foreground">{parentLead.franchisee || "Unassigned"}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-100 dark:border-amber-900/20">
                                    <Button variant="outline" size="sm" className="h-8 text-xs bg-white text-amber-800 border-amber-200 hover:bg-amber-50" onClick={() => setIsOpen(true)}>
                                        <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                                        Add Child Location
                                    </Button>
                                    <Button variant="outline" size="sm" className="h-8 text-xs bg-white" asChild>
                                        <a href={`/leads/${parentLead.id}`}>
                                            View Parent
                                            <ArrowRight className="ml-1 h-3.5 w-3.5" />
                                        </a>
                                    </Button>
                                    {isAdminOrSuperAdmin && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            onClick={handleUnlinkParent}
                                            disabled={isSavingParent}
                                            title="Disconnect Parent Customer"
                                        >
                                            {isSavingParent ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <Link2Off className="h-4 w-4" />
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* List of child/sibling locations */}
                        {childLeads.length === 0 && !lead.parentLeadId ? (
                            <p className="text-sm text-muted-foreground italic">No multi-site locations added yet.</p>
                        ) : (
                            <div className="space-y-3">
                                <div className="overflow-x-auto rounded-lg border bg-card">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                <TableHead className="font-semibold text-foreground">Site Name</TableHead>
                                                <TableHead className="font-semibold text-foreground">Address</TableHead>
                                                <TableHead className="font-semibold text-foreground">Franchisee</TableHead>
                                                <TableHead className="font-semibold text-foreground w-[120px]">Status</TableHead>
                                                <TableHead className="w-[80px] text-right font-semibold text-foreground">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {/* If we are on a child lead, display its own current status in the list too */}
                                            {lead.parentLeadId && (
                                                <TableRow className="bg-primary/5 hover:bg-primary/10">
                                                    <TableCell className="font-semibold flex items-center gap-2">
                                                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                                                        <span>{lead.companyName}</span>
                                                        <Badge className="text-[10px] py-0 px-1.5 h-4 shrink-0 bg-primary text-primary-foreground">
                                                            Current Site
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {lead.address?.street ? `${lead.address.street}, ` : ""}
                                                        {lead.address?.city || ""}, {lead.address?.state || ""} {lead.address?.zip || ""}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-medium">
                                                        {lead.franchisee || "Unassigned"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <LeadStatusBadge status={lead.customerStatus?.toLowerCase().includes('hot') ? 'Hot Lead' : (lead.status as any)} />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" disabled>
                                                            <ArrowRight className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )}

                                            {childLeads.map((child) => (
                                                <TableRow key={child.id} className="hover:bg-muted/40 transition-colors">
                                                    <TableCell className="font-semibold text-sm">
                                                        {child.companyName}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {child.address?.street ? `${child.address.street}, ` : ""}
                                                        {child.address?.city || ""}, {child.address?.state || ""} {child.address?.zip || ""}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {child.franchisee || "Unassigned"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <LeadStatusBadge status={child.customerStatus?.toLowerCase().includes('hot') ? 'Hot Lead' : (child.status as any)} />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" asChild>
                                                            <a href={`/leads/${child.id}`}>
                                                                <ArrowRight className="h-4 w-4" />
                                                            </a>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
