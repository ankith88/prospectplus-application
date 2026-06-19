"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Address, Contact, Lead } from "@/lib/types";
import { createChildSiteLead, updateLeadDetails } from "@/services/firebase";
import { PlusCircle, MapPin, Building, Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MultiSiteManagerProps {
    lead: Lead;
    contacts: Contact[];
    onLocationsUpdated: () => void;
}

export function MultiSiteManager({ lead, contacts, onLocationsUpdated }: MultiSiteManagerProps) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Form state for new location
    const [street, setStreet] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [zip, setZip] = useState("");
    
    // Form state for local manager
    const [managerName, setManagerName] = useState("");
    const [managerEmail, setManagerEmail] = useState("");
    const [managerPhone, setManagerPhone] = useState("");

    const handleAddLocation = async () => {
        if (!street || !city || !state || !zip) {
            toast({ title: "Validation Error", description: "Please fill in all address fields.", variant: "destructive" });
            return;
        }

        if (!managerName) {
            toast({ title: "Validation Error", description: "Local site manager name is required.", variant: "destructive" });
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

            // Create child lead with franchisee mapping
            const childLeadId = await createChildSiteLead(
                lead.id,
                `${lead.companyName} - ${city}`,
                newAddress,
                localManager,
                contacts // pass all parent contacts so they are copied to child
            );

            // Update parent lead with the new location
            const currentLocations = lead.multiSiteLocations || [];
            await updateLeadDetails(lead.id, lead, {
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
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Location
                        </Button>
                    </DialogTrigger>
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
            </CardHeader>
            <CardContent>
                {(!lead.multiSiteLocations || lead.multiSiteLocations.length === 0) ? (
                    <p className="text-sm text-muted-foreground italic">No multi-site locations added yet.</p>
                ) : (
                    <div className="space-y-3">
                        {lead.multiSiteLocations.map((loc, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 border rounded-md bg-muted/30">
                                <MapPin className="w-4 h-4 text-primary" />
                                <div>
                                    <p className="text-sm font-medium">{loc.street}</p>
                                    <p className="text-xs text-muted-foreground">{loc.city}, {loc.state} {loc.zip}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
