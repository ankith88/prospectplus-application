'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Loader2, Plus, Save, Trash2, FileText, Copy, ChevronDown, MessageSquare, ChevronRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

import { useAuth } from '@/hooks/use-auth';

interface SmsTemplate {
  id?: string;
  name: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  createdByRole?: string;
}

export function SmsTemplateBuilder() {
  const { user, userProfile } = useAuth();
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SmsTemplate | null>(null);

  const canEditTemplate = (template: SmsTemplate | null) => {
    if (!userProfile || !user) return false;
    if (!template || !template.id) return true; // New templates are editable

    const role = userProfile.activeRole || '';
    const isOwner = template.createdBy === user.uid;
    const isFullAdmin = ['admin', 'Marketing Admin', 'Marketing Manager'].includes(role) || user.uid === 'ncyhwLtOG1W7TZ43PkYCcObeCAf2';
    if (isFullAdmin) return true;

    if (['Account Managers', 'Account Manager', 'account managers', 'Customer Service'].includes(role)) {
      return isOwner;
    }

    if (role === 'Sales Manager') {
      if (isOwner) return true;
      const createdByAm = ['Account Managers', 'Account Manager', 'account managers'].includes(template.createdByRole || '');
      return createdByAm;
    }

    return false;
  };

  const isEditable = canEditTemplate(selectedTemplate);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState('all');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Editor states
  const [name, setName] = useState('');
  const [body, setBody] = useState('');

  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const snap = await getDocs(collection(firestore, 'marketing_campaigns'));
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCampaigns(list);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      await fetchCampaigns();
      const snap = await getDocs(collection(firestore, 'marketing_sms_templates'));
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SmsTemplate[];
      setTemplates(list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    } catch (error) {
      console.error('Error fetching SMS templates:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch SMS templates.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: SmsTemplate) => {
    setSelectedTemplate(template);
    setName(template.name);
    setBody(template.body);
  };

  const handleNewTemplate = () => {
    setSelectedTemplate(null);
    setName('');
    setBody(`Hi {{Contact.FirstName}}, this is {{SalesRep.Name}} from {{Company.Name}}...`);
  };

  const insertContent = (textContent: string) => {
    const textarea = bodyTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    const newValue = value.substring(0, start) + textContent + value.substring(end);
    setBody(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textContent.length, start + textContent.length);
    }, 0);
  };

  const handleSave = async () => {
    if (!name || !body) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Template name and body content are required.'
      });
      return;
    }

    if (!isEditable) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'You do not have permission to edit this template.'
      });
      return;
    }

    setSaving(true);
    const now = new Date().toISOString();
    try {
      const data: any = {
        name,
        body,
        updatedAt: now
      };

      if (selectedTemplate?.id) {
        const ref = doc(firestore, 'marketing_sms_templates', selectedTemplate.id);
        await updateDoc(ref, data);
        toast({ title: 'Success', description: 'SMS Template updated successfully.' });
      } else {
        data.createdBy = user?.uid || '';
        data.createdByRole = userProfile?.activeRole || '';
        const docRef = await addDoc(collection(firestore, 'marketing_sms_templates'), {
          ...data,
          createdAt: now
        });
        setSelectedTemplate({ id: docRef.id, ...data, createdAt: now });
        toast({ title: 'Success', description: 'SMS Template created successfully.' });
      }
      fetchTemplates();
    } catch (error) {
      console.error('Error saving SMS template:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save the template to database.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const templateToDelete = templates.find(t => t.id === id);
    if (!canEditTemplate(templateToDelete || null)) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'You do not have permission to delete this template.'
      });
      return;
    }

    if (!confirm('Are you sure you want to delete this SMS template?')) return;

    try {
      await deleteDoc(doc(firestore, 'marketing_sms_templates', id));
      toast({ title: 'Template Deleted' });
      if (selectedTemplate?.id === id) {
        handleNewTemplate();
      }
      fetchTemplates();
    } catch (error) {
      console.error('Delete failed:', error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed'
      });
    }
  };

  const handleDuplicate = async (template: SmsTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    
    setSaving(true);
    const now = new Date().toISOString();
    try {
      const data = {
        name: `${template.name} (Copy)`,
        body: template.body,
        updatedAt: now,
        createdBy: user?.uid || '',
        createdByRole: userProfile?.activeRole || ''
      };

      await addDoc(collection(firestore, 'marketing_sms_templates'), {
        ...data,
        createdAt: now
      });
      toast({ title: 'Success', description: 'SMS Template duplicated successfully.' });
      fetchTemplates();
    } catch (error) {
      console.error('Error duplicating SMS template:', error);
      toast({
        variant: 'destructive',
        title: 'Duplicate Failed'
      });
    } finally {
      setSaving(false);
    }
  };

  // Filter templates
  const filteredTemplates = templates.filter(t => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = t.name?.toLowerCase().includes(q);
      const bodyMatch = t.body?.toLowerCase().includes(q);
      if (!nameMatch && !bodyMatch) return false;
    }

    if (selectedCampaignId && selectedCampaignId !== 'all') {
      const camp = campaigns.find(c => c.id === selectedCampaignId);
      if (camp) {
        const isLinked = camp.smsTemplateIds?.includes(t.id);
        if (!isLinked) return false;
      } else {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-180px)]">
      {/* Templates Sidebar */}
      <Card className="lg:col-span-1 flex flex-col h-full bg-card overflow-hidden">
        <CardHeader className="border-b px-4 py-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">SMS Templates</CardTitle>
            <CardDescription className="text-xs">Manage your SMS campaigns</CardDescription>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Button size="sm" onClick={handleNewTemplate} className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground gap-1">
              <Plus className="h-4 w-4" /> New
            </Button>
          </div>
        </CardHeader>

        {/* Search & Filter bar */}
        <div className="p-3 border-b bg-slate-50/50 space-y-2 shrink-0">
          <Input 
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-xs bg-white"
          />
          <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
            <SelectTrigger className="h-8 text-xs bg-white">
              <SelectValue placeholder="Filter by Campaign..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <CardContent className="flex-1 p-0 overflow-y-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col h-60 items-center justify-center p-6 text-center text-muted-foreground gap-3">
              <MessageSquare className="h-8 w-8 opacity-40 text-green-500" />
              <span className="text-sm font-medium">No SMS templates match criteria.</span>
            </div>
          ) : (
            (() => {
              const groupedData: { campaignId: string; campaignName: string; templates: SmsTemplate[] }[] = [];
              
              campaigns.forEach(camp => {
                const campaignTemplates = filteredTemplates.filter(t => camp.smsTemplateIds?.includes(t.id));
                if (campaignTemplates.length > 0) {
                  groupedData.push({
                    campaignId: camp.id,
                    campaignName: camp.name || 'Unnamed Campaign',
                    templates: campaignTemplates
                  });
                }
              });
              
              const linkedTemplateIds = new Set(campaigns.flatMap(c => c.smsTemplateIds || []));
              const unlinkedTemplates = filteredTemplates.filter(t => !linkedTemplateIds.has(t.id));
              if (unlinkedTemplates.length > 0) {
                groupedData.push({
                  campaignId: 'unlinked',
                  campaignName: 'Unlinked Templates',
                  templates: unlinkedTemplates
                });
              }

              const toggleGroup = (groupId: string) => {
                setCollapsedGroups(prev => ({
                  ...prev,
                  [groupId]: prev[groupId] === false ? true : false
                }));
              };

              return (
                <div className="divide-y">
                  {groupedData.map(group => {
                    const isCollapsed = collapsedGroups[group.campaignId] !== false;
                    return (
                      <div key={group.campaignId} className="flex flex-col">
                        <div 
                          onClick={() => toggleGroup(group.campaignId)}
                          className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b cursor-pointer hover:bg-slate-100 transition-colors select-none"
                        >
                          <div className="flex items-center gap-2">
                            {isCollapsed ? (
                              <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                            )}
                            <span className="font-semibold text-xs text-slate-700">{group.campaignName}</span>
                            <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-bold">
                              {group.templates.length}
                            </span>
                          </div>
                        </div>

                        {!isCollapsed && (
                          <div className="divide-y pl-1">
                            {group.templates.map(t => (
                              <div
                                key={t.id}
                                onClick={() => handleSelectTemplate(t)}
                                className={`p-4 cursor-pointer hover:bg-slate-50/50 transition-colors flex items-center justify-between ${
                                  selectedTemplate?.id === t.id ? 'bg-slate-100 border-l-4 border-primary' : ''
                                }`}
                              >
                                <div className="flex flex-col gap-1 min-w-0 pr-2 flex-1">
                                  <span className="font-medium text-sm break-words whitespace-normal leading-snug">{t.name}</span>
                                  <span className="text-xs text-muted-foreground break-words whitespace-normal line-clamp-2">{t.body}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    Updated {new Date(t.updatedAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                    onClick={(e) => handleDuplicate(t, e)}
                                    title="Duplicate Template"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  {canEditTemplate(t) && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={(e) => handleDelete(t.id!, e)}
                                      title="Delete Template"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
        </CardContent>
      </Card>

      {/* Editor Combined */}
      <Card className="lg:col-span-3 flex flex-col h-full bg-card overflow-hidden">
        <CardHeader className="border-b px-6 py-4 flex flex-row items-center justify-between shrink-0">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {selectedTemplate?.id ? `Edit SMS Template: ${name}` : 'New SMS Template'}
              {!isEditable && (
                <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  Read-Only
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-xs">Draft your text message using placeholders</CardDescription>
          </div>
          <div className="flex gap-2 items-center">
            <Button onClick={handleSave} disabled={saving || !isEditable} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-9">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </CardHeader>

        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          {/* Metadata Section */}
          <div className="p-4 border-b bg-white shrink-0 shadow-sm z-10 grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Template Name</label>
              <Input
                placeholder="e.g. Appointment Reminder"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-50 focus-visible:bg-white transition-colors max-w-md"
                disabled={!isEditable}
              />
            </div>
          </div>

          {/* Editor Toolbar */}
          <div className="px-4 py-2 border-b bg-white shrink-0 flex justify-between items-center gap-2 flex-wrap">
            <div className="flex items-center gap-4 text-sm text-slate-500">
              Message Body ({body.length} characters)
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {/* Placeholders */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 text-xs px-3" disabled={!isEditable}>
                    Insert Placeholder <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => insertContent('{{Contact.Name}}')}>+ Contact Name</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Contact.FirstName}}')}>+ Contact First Name</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Company.Name}}')}>+ Company Name</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Prospect.ProspectPlusID}}')}>+ Prospect+ ID</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{SalesRep.Name}}')}>+ Sales Rep Name</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Contact.LocalMilePlusAuthLink}}')}>+ LocalMile Plus Link</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Lead.LocalMileActivationLink}}')}>+ LocalMile Activation Link</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Lead.LocalMileSecurityCode}}')}>+ LocalMile Security Code</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Schedule.ServiceDate}}')}>+ Scheduled Service Date</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Franchisee.MainContact}}')}>+ Franchisee Contact Name</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Franchisee.Email}}')}>+ Franchisee Email</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Franchisee.Mobile}}')}>+ Franchisee Mobile</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Editor Canvas */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center items-start bg-slate-200/50">
            <div className="bg-white rounded-lg shadow-xl border overflow-hidden flex flex-col w-full max-w-2xl min-h-[400px]">
                <div className="p-6 md:p-10 flex-1 flex flex-col">
                  <Textarea
                    ref={bodyTextareaRef}
                    placeholder="Enter your SMS message here..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="flex-1 min-h-[300px] text-sm bg-slate-50 focus-visible:bg-white transition-colors p-4 resize-y border-slate-300 shadow-sm w-full"
                    disabled={!isEditable}
                  />
                </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
