'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Megaphone, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Loader2, 
  Tag, 
  ShieldCheck, 
  FolderPlus,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { 
  getLeadCampaigns, 
  createLeadCampaign, 
  toggleLeadCampaignStatus, 
  deleteLeadCampaign, 
  LeadCampaign 
} from '@/services/lead-campaigns';

export function LeadCampaignsClient() {
  const { userProfile, user } = useAuth();
  const { toast } = useToast();

  const [campaigns, setCampaigns] = useState<LeadCampaign[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Create Modal State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [newCampaignName, setNewCampaignName] = useState<string>('');
  const [newCampaignDescription, setNewCampaignDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const data = await getLeadCampaigns();
      setCampaigns(data);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      toast({
        variant: 'destructive',
        title: 'Error Loading Campaigns',
        description: 'Failed to fetch campaigns list.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const filteredCampaigns = useMemo(() => {
    if (!searchQuery.trim()) return campaigns;
    const q = searchQuery.toLowerCase();
    return campaigns.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.description && c.description.toLowerCase().includes(q))
    );
  }, [campaigns, searchQuery]);

  const activeCount = useMemo(() => campaigns.filter(c => c.isActive).length, [campaigns]);
  const customCount = useMemo(() => campaigns.filter(c => !c.isBuiltIn).length, [campaigns]);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Campaign name is required.'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const createdBy = userProfile?.displayName || userProfile?.email || user?.email || 'Admin';
      await createLeadCampaign({
        name: newCampaignName,
        description: newCampaignDescription,
        createdBy
      });

      toast({
        title: 'Campaign Created',
        description: `Successfully created campaign "${newCampaignName}".`
      });

      setNewCampaignName('');
      setNewCampaignDescription('');
      setIsDialogOpen(false);
      await fetchCampaigns();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Create Campaign',
        description: err?.message || 'An error occurred while creating the campaign.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (campaign: LeadCampaign) => {
    setActionLoadingId(campaign.id);
    try {
      await toggleLeadCampaignStatus(campaign.id, campaign.isActive);
      toast({
        title: 'Campaign Updated',
        description: `"${campaign.name}" is now ${!campaign.isActive ? 'Active' : 'Inactive'}.`
      });
      await fetchCampaigns();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: err?.message || 'Could not update campaign status.'
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteCampaign = async (campaign: LeadCampaign) => {
    if (campaign.isBuiltIn) {
      toast({
        variant: 'destructive',
        title: 'Action Prohibited',
        description: 'System built-in campaigns cannot be deleted.'
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete the custom campaign "${campaign.name}"?`)) {
      return;
    }

    setActionLoadingId(campaign.id);
    try {
      await deleteLeadCampaign(campaign.id);
      toast({
        title: 'Campaign Deleted',
        description: `Successfully deleted campaign "${campaign.name}".`
      });
      await fetchCampaigns();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: err?.message || 'Could not delete campaign.'
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto p-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Lead Campaigns</h1>
            <Badge variant="outline" className="border-[#095c7b] text-[#095c7b] bg-[#095c7b]/10">
              Marketing Management
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage lead source campaigns available for Lead Creation and CSV Lead Imports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchCampaigns} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#095c7b] hover:bg-[#074760] text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <form onSubmit={handleCreateCampaign}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-slate-900">
                    <FolderPlus className="h-5 w-5 text-[#095c7b]" />
                    Create New Lead Campaign
                  </DialogTitle>
                  <DialogDescription>
                    New campaigns will immediately be available in the Lead Creation form dropdown and CSV Import tool.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="campaign-name" className="font-semibold text-slate-700">
                      Campaign Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="campaign-name"
                      placeholder="e.g. Q3 Healthcare Outreach 2026"
                      value={newCampaignName}
                      onChange={(e) => setNewCampaignName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="campaign-desc" className="font-semibold text-slate-700">
                      Description <span className="text-xs text-muted-foreground">(Optional)</span>
                    </Label>
                    <Textarea
                      id="campaign-desc"
                      placeholder="Brief details about the target audience, objective, or lead source."
                      value={newCampaignDescription}
                      onChange={(e) => setNewCampaignDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-[#095c7b] hover:bg-[#074760] text-white" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Campaign'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-white to-slate-50/50">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Campaigns
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900 flex items-center justify-between">
              {campaigns.length}
              <Tag className="h-5 w-5 text-slate-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">System built-in & custom campaigns</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 shadow-sm bg-gradient-to-br from-emerald-50/30 to-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Active Campaigns
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-700 flex items-center justify-between">
              {activeCount}
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-emerald-600">Available for selection in forms & CSV import</p>
          </CardContent>
        </Card>

        <Card className="border-blue-100 shadow-sm bg-gradient-to-br from-blue-50/30 to-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-[#095c7b] uppercase tracking-wider">
              Custom Campaigns
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-[#095c7b] flex items-center justify-between">
              {customCount}
              <Sparkles className="h-5 w-5 text-[#095c7b]" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500">Created by Marketing Managers & Admins</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b bg-slate-50/50 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-[#095c7b]" />
                Campaign Directory
              </CardTitle>
              <CardDescription>
                System built-in defaults are automatically preserved. Custom campaigns can be created or removed.
              </CardDescription>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 gap-3 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-[#095c7b]" />
              <p className="text-sm font-medium">Loading campaign repository...</p>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Megaphone className="h-10 w-10 text-slate-300 mb-2" />
              <h3 className="text-base font-semibold text-slate-800">No campaigns found</h3>
              <p className="text-sm text-slate-500 max-w-sm mt-1">
                {searchQuery ? `No campaigns match "${searchQuery}".` : 'Click "Create Campaign" above to add your first custom campaign.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="font-semibold text-slate-700">Campaign Name</TableHead>
                  <TableHead className="font-semibold text-slate-700">Type</TableHead>
                  <TableHead className="font-semibold text-slate-700">Description</TableHead>
                  <TableHead className="font-semibold text-slate-700">Status</TableHead>
                  <TableHead className="font-semibold text-slate-700">Created By</TableHead>
                  <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((campaign) => {
                  const isLoadingAction = actionLoadingId === campaign.id;
                  return (
                    <TableRow key={campaign.id} className="hover:bg-slate-50/60 transition-colors">
                      <TableCell className="font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{campaign.name}</span>
                          {campaign.isBuiltIn && (
                            <span title="System Built-In Campaign">
                              <ShieldCheck className="h-4 w-4 text-[#095c7b]" />
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        {campaign.isBuiltIn ? (
                          <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 font-medium">
                            Built-In
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-50 text-[#095c7b] border-blue-200 font-medium">
                            Custom
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-sm text-slate-600 max-w-xs truncate">
                        {campaign.description || <span className="text-slate-400 italic">No description</span>}
                      </TableCell>

                      <TableCell>
                        {campaign.isActive ? (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 font-semibold gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200 font-medium gap-1">
                            <XCircle className="h-3.5 w-3.5 text-slate-400" />
                            Inactive
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-xs text-slate-500">
                        {campaign.isBuiltIn ? 'System Default' : (campaign.createdBy || 'Admin')}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(campaign)}
                            disabled={isLoadingAction}
                            className="h-8 text-xs font-medium"
                          >
                            {isLoadingAction ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : campaign.isActive ? (
                              'Deactivate'
                            ) : (
                              'Activate'
                            )}
                          </Button>

                          {!campaign.isBuiltIn && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCampaign(campaign)}
                              disabled={isLoadingAction}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                              title="Delete Campaign"
                            >
                              {isLoadingAction ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
