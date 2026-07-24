'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { Loader2, Plus, Save, Trash2, FileText, Code, Type, Copy, ChevronDown, AlignLeft, HelpCircle, Image as ImageIcon, Sparkles, ChevronRight } from 'lucide-react';
import { BrandProfile } from '@/lib/types';
import { Snippet } from '@/components/marketing/snippet-builder';
import { VisualIframeEditor } from '@/components/ui/visual-iframe-editor';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import { generateMarketingAsset } from '@/ai/flows/generate-marketing-asset';
import { useAuth } from '@/hooks/use-auth';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface Template {
  id?: string;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  createdByRole?: string;
  allowedEditRoles?: string[];
}

export function TemplateBuilder() {
  const { user, userProfile } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [journeys, setJourneys] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // Permissions states
  const [allowedEditRoles, setAllowedEditRoles] = useState<string[]>([]);
  const [permissionType, setPermissionType] = useState<'everyone' | 'restricted' | 'custom'>('everyone');

  const canEditTemplate = (template: Template | null) => {
    if (!userProfile || !user) return false;
    if (!template || !template.id) return true; // New templates are editable

    const role = userProfile.activeRole || '';
    const isOwner = template.createdBy === user.uid;
    const isFullAdmin = ['admin', 'Marketing Admin', 'Marketing Manager'].includes(role) || user.uid === 'ncyhwLtOG1W7TZ43PkYCcObeCAf2';
    
    // Admins and template owner can always edit
    if (isFullAdmin || isOwner) return true;

    // Check custom permissions first if they exist
    if (template.allowedEditRoles && Array.isArray(template.allowedEditRoles)) {
      if (template.allowedEditRoles.includes('everyone')) {
        return true;
      }
      
      const userRoleLower = role.toLowerCase();
      const hasRolePermission = template.allowedEditRoles.some(r => {
        const rLower = r.toLowerCase();
        if (rLower === 'account manager' && userRoleLower.includes('account manager')) return true;
        return rLower === userRoleLower;
      });
      
      if (hasRolePermission) return true;
    } else {
      // Legacy fallback: restricted to creator & admins
      if (role === 'Sales Manager') {
        const createdByAm = ['Account Managers', 'Account Manager', 'account managers'].includes(template.createdByRole || '');
        return createdByAm;
      }
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
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual');
  const [previewSize, setPreviewSize] = useState<'desktop' | 'mobile'>('desktop');
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // AI generation states
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiTargetICP, setAiTargetICP] = useState('');
  const [aiAdditionalContext, setAiAdditionalContext] = useState('');

  const handleGenerateAI = async () => {
    if (!aiTargetICP) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please specify a target audience / ICP.'
      });
      return;
    }

    setIsGenerating(true);
    try {
      const performanceHistory = brandProfile?.marketingBrainContext?.learnedBehaviorModifiers || 'Use B2B best practices.';

      const result = await generateMarketingAsset({
        assetType: 'email',
        targetICP: aiTargetICP,
        performanceHistory,
        additionalContext: aiAdditionalContext
      });

      if (result) {
        setSelectedTemplate(null);
        setName(`AI: ${aiTargetICP} Outreach`);
        setSubject(result.subject || 'Generated Outbound Campaign');
        setBody(result.body);
        setAiDialogOpen(false);
        setAiTargetICP('');
        setAiAdditionalContext('');
        toast({
          title: 'Template Generated',
          description: 'AI has generated a brand-aligned email draft.'
        });
      }
    } catch (error: any) {
      console.error('AI generation error:', error);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: error.message || 'AI engine was unable to draft the email.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchBrandProfile(), fetchTemplates(), fetchSnippets(), fetchJourneys(), fetchCampaigns()]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const fetchJourneys = async () => {
    try {
      const snap = await getDocs(collection(firestore, 'Journeys'));
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setJourneys(list);
    } catch (error) {
      console.error('Error fetching journeys:', error);
    }
  };

  const fetchBrandProfile = async () => {
    try {
      const docRef = doc(firestore, 'brandProfiles', 'default_company');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setBrandProfile(docSnap.data() as BrandProfile);
      }
    } catch (error) {
      console.error('Error fetching brand profile:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const snap = await getDocs(collection(firestore, 'marketing_templates'));
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Template[];
      setTemplates(list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch templates.'
      });
    }
  };

  const fetchSnippets = async () => {
    try {
      const snap = await getDocs(collection(firestore, 'marketing_snippets'));
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Snippet[];
      setSnippets(list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    } catch (error) {
      console.error('Error fetching snippets:', error);
    }
  };

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setName(template.name);
    setSubject(template.subject);
    setBody(template.body);
    
    const roles = template.allowedEditRoles || [];
    setAllowedEditRoles(roles);
    if (roles.includes('everyone')) {
      setPermissionType('everyone');
    } else if (roles.length > 0) {
      setPermissionType('custom');
    } else {
      setPermissionType('restricted');
    }
  };

  const handleNewTemplate = () => {
    setSelectedTemplate(null);
    setName('');
    setSubject('');
    setBody(`<h2>Hello {{Contact.Name}}!</h2>\n\n<p>We noticed that <strong>{{Company.Name}}</strong> has been growing rapidly, and we would love to partner with you to streamline your shipping needs.</p>\n\n<p>Let's schedule a call this week. I will be your dedicated contact.</p>\n\n<p>Best regards,<br>{{SalesRep.Name}}</p>`);
    setAllowedEditRoles(['everyone']);
    setPermissionType('everyone');
  };

  const insertContent = (htmlContent: string) => {
    if (editorMode === 'visual') {
      if ((window as any).__iframeEditorInsert) {
        (window as any).__iframeEditorInsert(htmlContent);
      }
      return;
    }

    const textarea = bodyTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    const newValue = value.substring(0, start) + htmlContent + value.substring(end);
    setBody(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + htmlContent.length, start + htmlContent.length);
    }, 0);
  };

  const insertSubjectPlaceholder = (placeholder: string) => {
    const input = subjectInputRef.current;
    if (!input) return;

    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const value = input.value;

    const newValue = value.substring(0, start) + placeholder + value.substring(end);
    setSubject(newValue);

    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 0);
  };

  const handleSave = async () => {
    if (!name || !subject || !body) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Template name, subject, and body content are required.'
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
      let rolesToSave: string[] = [];
      if (permissionType === 'everyone') {
        rolesToSave = ['everyone'];
      } else if (permissionType === 'custom') {
        rolesToSave = allowedEditRoles.filter(r => r !== 'everyone');
      }

      const data: any = {
        name,
        subject,
        body,
        updatedAt: now,
        allowedEditRoles: rolesToSave
      };

      if (selectedTemplate?.id) {
        const ref = doc(firestore, 'marketing_templates', selectedTemplate.id);
        await updateDoc(ref, data);
        toast({ title: 'Success', description: 'Template updated successfully.' });
      } else {
        data.createdBy = user?.uid || '';
        data.createdByRole = userProfile?.activeRole || '';
        const docRef = await addDoc(collection(firestore, 'marketing_templates'), {
          ...data,
          createdAt: now
        });
        setSelectedTemplate({ id: docRef.id, ...data, createdAt: now });
        toast({ title: 'Success', description: 'Template created successfully.' });
      }
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
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

    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await deleteDoc(doc(firestore, 'marketing_templates', id));
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

  const handleDuplicate = async (template: Template, e: React.MouseEvent) => {
    e.stopPropagation();
    
    setSaving(true);
    const now = new Date().toISOString();
    try {
      const data = {
        name: `${template.name} (Copy)`,
        subject: template.subject,
        body: template.body,
        updatedAt: now,
        createdBy: user?.uid || '',
        createdByRole: userProfile?.activeRole || '',
        allowedEditRoles: template.allowedEditRoles || []
      };

      await addDoc(collection(firestore, 'marketing_templates'), {
        ...data,
        createdAt: now
      });
      toast({ title: 'Success', description: 'Template duplicated successfully.' });
      fetchTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast({
        variant: 'destructive',
        title: 'Duplicate Failed'
      });
    } finally {
      setSaving(false);
    }
  };

  // Styling properties derived from brand Profile
  const primaryColor = brandProfile?.designTokens?.primaryColor || '#095C7B';
  const fontFamily = brandProfile?.designTokens?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const logoUrl = brandProfile?.designTokens?.logoUrl;

  const banners = snippets.filter(s => s.type === 'banner');
  const footers = snippets.filter(s => s.type === 'footer');

  // Filter templates
  const filteredTemplates = templates.filter(t => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = t.name?.toLowerCase().includes(q);
      const subjectMatch = t.subject?.toLowerCase().includes(q);
      const bodyMatch = t.body?.toLowerCase().includes(q);
      if (!nameMatch && !subjectMatch && !bodyMatch) return false;
    }

    if (selectedCampaignId && selectedCampaignId !== 'all') {
      const camp = campaigns.find(c => c.id === selectedCampaignId);
      if (camp) {
        const isDirect = camp.templateId === t.id;
        const isLinked = camp.emailTemplateIds?.includes(t.id);
        if (!isDirect && !isLinked) return false;
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
            <CardTitle className="text-lg">Email Templates</CardTitle>
            <CardDescription className="text-xs">Select or create layout drafts</CardDescription>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 border-primary text-primary hover:bg-primary/5 gap-1 px-2.5">
                  <Sparkles className="h-3.5 w-3.5" /> AI
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-500" /> Generate Brand-Aligned Email
                  </DialogTitle>
                  <DialogDescription>
                    Provide target audience segment and context. The AI will generate a custom email layout matching your Brand Bot rules.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Target Audience / ICP</label>
                    <Input 
                      placeholder="e.g. Small business logistics managers" 
                      value={aiTargetICP}
                      onChange={(e) => setAiTargetICP(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Additional Context / CTA / Objective</label>
                    <Textarea 
                      placeholder="e.g. Focus on offering our 14-day free trial. Encourage booking a quick call."
                      value={aiAdditionalContext}
                      onChange={(e) => setAiAdditionalContext(e.target.value)}
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter className="flex gap-2">
                  <Button variant="outline" onClick={() => setAiDialogOpen(false)} disabled={isGenerating}>Cancel</Button>
                  <Button onClick={handleGenerateAI} disabled={isGenerating} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" /> Generate Copy
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

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
              <FileText className="h-8 w-8 opacity-40 text-blue-500" />
              <span className="text-sm font-medium">No templates match criteria.</span>
              {templates.length === 0 && (
                <Button 
                  onClick={() => setAiDialogOpen(true)} 
                  variant="outline" 
                  size="sm" 
                  className="mt-1 gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Let AI write your first email using your Brand Bot guidelines
                </Button>
              )}
            </div>
          ) : (
            (() => {
              const groupedData: { campaignId: string; campaignName: string; templates: Template[] }[] = [];
              
              campaigns.forEach(camp => {
                const campaignTemplates = filteredTemplates.filter(t => camp.templateId === t.id || camp.emailTemplateIds?.includes(t.id));
                if (campaignTemplates.length > 0) {
                  groupedData.push({
                    campaignId: camp.id,
                    campaignName: camp.name || 'Unnamed Campaign',
                    templates: campaignTemplates
                  });
                }
              });
              
              const linkedTemplateIds = new Set([
                ...campaigns.map(c => c.templateId),
                ...campaigns.flatMap(c => c.emailTemplateIds || [])
              ]);
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
                                  <span className="text-xs text-muted-foreground break-words whitespace-normal line-clamp-2">{t.subject}</span>
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

        <CardHeader className="border-t border-b px-4 py-2.5 bg-slate-50 shrink-0">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5 text-blue-500" /> Action Button Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 text-[11px] space-y-2 overflow-y-auto max-h-[220px] shrink-0 border-t bg-slate-50/50">
          <p className="text-slate-500 leading-normal">
            To stop nurture sequences upon click, insert these dynamic action links into your email templates:
          </p>
          {journeys.length === 0 ? (
            <span className="text-muted-foreground italic block">No nurture campaigns built yet.</span>
          ) : (
            <div className="space-y-2">
              {journeys.map(j => {
                const actionNodes = j.nodes?.filter((n: any) => n.type === 'action_button') || [];
                if (actionNodes.length === 0) return null;
                return (
                  <div key={j.id} className="border-b pb-1.5 last:border-0 last:pb-0">
                    <span className="font-semibold text-slate-700 block truncate" title={j.name}>{j.name}</span>
                    {actionNodes.map((node: any) => {
                      const tag = `{{Journey.${node.id}}}`;
                      const rules: string[] = [];
                      if (node.config?.targetBucket) rules.push(`Move to ${node.config.targetBucket}`);
                      if (node.config?.targetUser) rules.push(`Assign to ${node.config.targetUser}`);
                      return (
                        <div key={node.id} className="mt-1 flex items-center justify-between gap-1.5 bg-white p-1.5 rounded border shadow-sm">
                          <div className="min-w-0 flex-1">
                            <span className="font-mono text-[9px] text-slate-700 font-bold block truncate" title={tag}>{tag}</span>
                            <span className="text-[9px] text-slate-500 block truncate" title={rules.join(', ')}>{rules.join(', ') || 'Stop Campaign'}</span>
                          </div>
                          <Button 
                            type="button" 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6 shrink-0 text-slate-400 hover:text-blue-500" 
                            onClick={() => {
                              insertContent(tag);
                              toast({ title: 'Tag inserted into editor.' });
                            }}
                            title="Insert tag"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor & Previewer Combined */}
      <Card className="lg:col-span-3 flex flex-col h-full bg-card overflow-hidden">
        <CardHeader className="border-b px-6 py-4 flex flex-row items-center justify-between shrink-0">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {selectedTemplate?.id ? `Edit Template: ${name}` : 'New Custom Template'}
              {!isEditable && (
                <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  Read-Only
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-xs">Design your email using the WYSIWYG editor</CardDescription>
          </div>
          <div className="flex gap-2 items-center">
             <div className="flex border rounded-md overflow-hidden bg-slate-100 mr-2 p-1 gap-1">
              <Button
                size="sm"
                variant={previewSize === 'desktop' ? 'default' : 'ghost'}
                onClick={() => setPreviewSize('desktop')}
                className="h-7 text-xs px-3"
              >
                Desktop
              </Button>
              <Button
                size="sm"
                variant={previewSize === 'mobile' ? 'default' : 'ghost'}
                onClick={() => setPreviewSize('mobile')}
                className="h-7 text-xs px-3"
              >
                Mobile
              </Button>
            </div>
            <Button onClick={handleSave} disabled={saving || !isEditable} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-9">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </CardHeader>

        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          {/* Metadata Section */}
          <div className="p-4 border-b bg-white shrink-0 shadow-sm z-10 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Template Name</label>
              <Input
                placeholder="e.g. Outbound Lead Warm Blast"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-50 focus-visible:bg-white transition-colors"
                disabled={!isEditable}
              />
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subject Line</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="text-[10px] font-semibold text-[#095c7b] hover:underline" disabled={!isEditable}>
                      + Add Placeholder
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => insertSubjectPlaceholder('{{Contact.Name}}')}>Contact Name</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => insertSubjectPlaceholder('{{Company.Name}}')}>Company Name</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => insertSubjectPlaceholder('{{Prospect.ProspectPlusID}}')}>Prospect+ ID</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => insertSubjectPlaceholder('{{SalesRep.Name}}')}>Sales Rep Name</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => insertSubjectPlaceholder('{{Franchisee.Name}}')}>Franchisee Name</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => insertSubjectPlaceholder('{{AccountManager.Name}}')}>AM Name</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => insertSubjectPlaceholder('{{Lead.City}}')}>Lead City</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => insertSubjectPlaceholder('{{Schedule.ServiceDate}}')}>Scheduled Service Date</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => insertSubjectPlaceholder('{{Franchisee.MainContact}}')}>Franchisee Contact Name</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => insertSubjectPlaceholder('{{Franchisee.Email}}')}>Franchisee Email</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => insertSubjectPlaceholder('{{Franchisee.Mobile}}')}>Franchisee Mobile</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => insertSubjectPlaceholder('{{Contact.LocalMilePlusAuthLink}}')}>LocalMile Plus Link</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => insertSubjectPlaceholder('{{Lead.LocalMileActivationLink}}')}>LocalMile Activation Link</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => insertSubjectPlaceholder('{{Lead.LocalMileSecurityCode}}')}>LocalMile Security Code</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => insertSubjectPlaceholder('{{Receiver.Name}}')}>Receiver Name</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => insertSubjectPlaceholder('{{Ticket.Number}}')}>Ticket Number</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => insertSubjectPlaceholder('{{Tracking.ID}}')}>Tracking ID</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Input
                ref={subjectInputRef}
                placeholder="e.g. Streamline Your Shipping Logistics | MailPlus"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-slate-50 focus-visible:bg-white transition-colors"
                disabled={!isEditable}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Who Can Edit</label>
              <div className="flex gap-2">
                <Select
                  value={permissionType}
                  onValueChange={(val: 'everyone' | 'restricted' | 'custom') => {
                    setPermissionType(val);
                    if (val === 'everyone') {
                      setAllowedEditRoles(['everyone']);
                    } else if (val === 'restricted') {
                      setAllowedEditRoles([]);
                    }
                  }}
                  disabled={!isEditable}
                >
                  <SelectTrigger className="bg-slate-50 focus-visible:bg-white transition-colors h-9">
                    <SelectValue placeholder="Permissions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="everyone">Anyone with access</SelectItem>
                    <SelectItem value="restricted">Creator & Admins only</SelectItem>
                    <SelectItem value="custom">Specific Roles...</SelectItem>
                  </SelectContent>
                </Select>

                {permissionType === 'custom' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 px-3 shrink-0" disabled={!isEditable}>
                        Roles ({allowedEditRoles.length}) <ChevronDown className="ml-1 h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 p-2">
                      <div className="space-y-2">
                        {[
                          { label: 'Sales Managers', value: 'Sales Manager' },
                          { label: 'Account Managers', value: 'Account Manager' },
                          { label: 'Customer Service', value: 'Customer Service' }
                        ].map((roleOption) => {
                          const isChecked = allowedEditRoles.includes(roleOption.value);
                          return (
                            <div key={roleOption.value} className="flex items-center space-x-2 p-1 hover:bg-slate-50 rounded cursor-pointer" onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (isChecked) {
                                setAllowedEditRoles(allowedEditRoles.filter(r => r !== roleOption.value));
                              } else {
                                setAllowedEditRoles([...allowedEditRoles, roleOption.value]);
                              }
                            }}>
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setAllowedEditRoles([...allowedEditRoles, roleOption.value]);
                                  } else {
                                    setAllowedEditRoles(allowedEditRoles.filter(r => r !== roleOption.value));
                                  }
                                }}
                                disabled={!isEditable}
                              />
                              <Label className="text-xs font-medium cursor-pointer">{roleOption.label}</Label>
                            </div>
                          );
                        })}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>

          {/* Editor Toolbar */}
          <div className="px-4 py-2 border-b bg-white shrink-0 flex justify-between items-center gap-2 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="flex border rounded-md overflow-hidden bg-slate-100">
                <Button
                  size="sm"
                  variant={editorMode === 'visual' ? 'default' : 'ghost'}
                  onClick={() => setEditorMode('visual')}
                  className="h-8 text-xs px-3 rounded-none gap-1"
                >
                  <Type className="h-3 w-3" /> Visual
                </Button>
                <Button
                  size="sm"
                  variant={editorMode === 'code' ? 'default' : 'ghost'}
                  onClick={() => setEditorMode('code')}
                  className="h-8 text-xs px-3 rounded-none gap-1"
                >
                  <Code className="h-3 w-3" /> HTML Code
                </Button>
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {/* Placeholders */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 text-xs px-3" disabled={!isEditable}>
                    Placeholders <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => insertContent('{{Contact.Name}}')}>+ Contact Name</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Company.Name}}')}>+ Company Name</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Prospect.ProspectPlusID}}')}>+ Prospect+ ID</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{SalesRep.Name}}')}>+ Sales Rep Name</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Franchisee.Name}}')}>+ Franchisee Name</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{AccountManager.Name}}')}>+ AM Name</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{AccountManager.Mobile}}')}>+ AM Mobile</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{AccountManager.Calendly}}')}>+ AM Calendly</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Lead.ContactBookingLink}}')}>+ Contact Booking Link</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Lead.GeneralBookingLink}}')}>+ General Booking Link</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Lead.City}}')}>+ Lead City</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Trials.Remaining}}')}>+ Trials Remaining</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Lead.SCFLink}}')}>+ Public SCF Link</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Lead.StandingOrderFormLink}}')}>+ Standing Order Form Link</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Lead.LocalMileRegistrationLink}}')}>+ LocalMile Registration Link</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Lead.LocalMileActivationLink}}')}>+ LocalMile Activation Link</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Contact.LocalMilePlusAuthLink}}')}>+ LocalMile Plus Link</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Lead.LocalMileSecurityCode}}')}>+ LocalMile Security Code</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{acceptUrl}}')}>+ Accept URL (SCF Link)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Schedule.ServiceDate}}')}>+ Scheduled Service Date</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Franchisee.MainContact}}')}>+ Franchisee Contact Name</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Franchisee.Email}}')}>+ Franchisee Email</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Franchisee.Mobile}}')}>+ Franchisee Mobile</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => insertContent('{{Receiver.Name}}')}>+ Receiver Name</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Receiver.FullAddress}}')}>+ Receiver Full Address</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Ticket.Number}}')}>+ Ticket Number</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Tracking.ID}}')}>+ Tracking ID</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => insertContent('{{unsubscribe_link}}')}>+ Unsubscribe Link URL</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Snippets / Banners & Footers */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 text-xs px-3" disabled={!isEditable}>
                    Insert Snippet <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {banners.length > 0 && (
                    <>
                      <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground"><ImageIcon className="h-3 w-3"/> Banners</DropdownMenuLabel>
                      {banners.map(b => (
                        <DropdownMenuItem key={b.id} onClick={() => insertContent(b.content)}>
                          {b.name}
                        </DropdownMenuItem>
                      ))}
                      {footers.length > 0 && <DropdownMenuSeparator />}
                    </>
                  )}
                  {footers.length > 0 && (
                    <>
                      <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground"><AlignLeft className="h-3 w-3"/> Footers</DropdownMenuLabel>
                      {footers.map(f => (
                        <DropdownMenuItem key={f.id} onClick={() => insertContent(f.content)}>
                          {f.name}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                  {banners.length === 0 && footers.length === 0 && (
                    <div className="p-2 text-xs text-muted-foreground text-center">No snippets available</div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* WYSIWYG Editor Canvas */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center items-start bg-slate-200/50">
            <div 
              className={`bg-white rounded-lg shadow-xl border overflow-hidden flex flex-col transition-all duration-300 ${previewSize === 'desktop' ? 'w-full max-w-4xl' : 'w-[375px]'}`}
              style={{ minHeight: '600px' }}
            >
               {/* Simulated Email Header */}
               <div className="border-b bg-slate-50 px-6 py-4 text-sm text-muted-foreground shrink-0 space-y-1">
                  <div><span className="font-semibold text-slate-700 w-16 inline-block">From:</span> outbound@mailplus.com.au</div>
                  <div><span className="font-semibold text-slate-700 w-16 inline-block">To:</span> preview@example.com</div>
                  <div className="truncate"><span className="font-semibold text-slate-700 w-16 inline-block">Subject:</span> {subject || '(No Subject)'}</div>
                </div>

                {/* Email Body Wrapper */}
                <div className="flex-1 flex flex-col bg-slate-50 relative group w-full">
                    {editorMode === 'visual' ? (
                      <VisualIframeEditor 
                        body={body}
                        setBody={setBody}
                        primaryColor={primaryColor}
                        fontFamily={fontFamily}
                        logoUrl={logoUrl}
                        readOnly={!isEditable}
                      />
                    ) : (
                      <div className="p-6 md:p-10 flex-1 flex flex-col">
                        <Textarea
                          ref={bodyTextareaRef}
                          placeholder="HTML campaign content..."
                          value={body}
                          onChange={(e) => setBody(e.target.value)}
                          className="min-h-[400px] flex-1 font-mono text-sm bg-slate-50 focus-visible:bg-white transition-colors p-4 resize-y border-slate-300 shadow-sm w-full"
                          disabled={!isEditable}
                        />
                      </div>
                    )}
                </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
