'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Loader2, Plus, Trash2, Play, Pause, AlertCircle, Copy, ArrowRight, HelpCircle, Settings, Mail, FileText, CheckCircle, Pencil, Users } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface Template {
  id: string;
  name: string;
  subject: string;
}

interface JourneyNode {
  id: string;
  type: 'trigger' | 'action' | 'wait' | 'condition' | 'action_button' | 'end_action';
  config: Record<string, any>;
}

interface JourneyEdge {
  id: string;
  source: string;
  target: string;
  condition?: string; // 'true' | 'false' | 'match' | 'no-match'
}

interface Journey {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'paused';
  nodes: JourneyNode[];
  edges: JourneyEdge[];
  createdAt?: string;
}

const AVAILABLE_STATUSES = [
  'New',
  'Priority Lead',
  'Contacted',
  'In Progress',
  'Connected',
  'High Touch',
  'Trialing ShipMate',
  'Reschedule',
  'Qualified',
  'Pre Qualified',
  'Won',
  'Lost',
  'Lost Customer',
  'LPO Review',
  'Unqualified',
  'LocalMile Pending',
  'LocalMile Opportunity',
  'Trialing LocalMile',
  'Free Trial',
  'Prospect Opportunity',
  'Customer Opportunity',
  'Priority Field Lead',
  'Email Brush Off',
  'In Qualification',
  'Quote Sent',
  'Out of Territory'
];

const AVAILABLE_BUCKETS = [
  { value: 'outbound', label: 'Outbound' },
  { value: 'field_sales', label: 'Field Sales' },
  { value: 'inbound', label: 'Inbound' },
  { value: 'account_manager', label: 'Account Manager' },
  { value: 'customer_success', label: 'Customer Success' },
  { value: 'nurture', label: 'Nurture' },
  { value: 'marketing', label: 'Marketing' }
];

const AVAILABLE_LEAD_SOURCES = [
  { value: "491777", label: "LocalMile.Plus" },
  { value: "487126", label: "WooCommerce" },
  { value: "437098", label: "ProspectPlus Lead Generation" },
  { value: "246306", label: "Shopify" },
  { value: "207048", label: "NeoPost" },
  { value: "97943", label: "Head Office Generated" },
  { value: "17", label: "Inbound - Call" },
  { value: "11", label: "Referral" },
  { value: "-4", label: "Franchisee Generated" },
  { value: "492239", label: "Account Manager Generated" }
];

const AVAILABLE_CAMPAIGNS = [
  "Outbound",
  "Door-to-Door",
  "MultiSite",
  "Account Manager Generated"
];

export function NurtureJourneys() {
  const router = useRouter();
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingJourneyId, setEditingJourneyId] = useState<string | null>(null);
  
  // New Journey Form
  const [journeyName, setJourneyName] = useState('');
  const [nodes, setNodes] = useState<JourneyNode[]>([
    { id: 'trigger_1', type: 'trigger', config: { label: 'Lead enrolled in campaign' } }
  ]);
  const [edges, setEdges] = useState<JourneyEdge[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    fetchJourneysAndTemplates();
  }, []);

  const fetchJourneysAndTemplates = async () => {
    setLoading(true);
    try {
      const [journeysSnap, templatesSnap] = await Promise.all([
        getDocs(collection(firestore, 'Journeys')),
        getDocs(collection(firestore, 'marketing_templates'))
      ]);

      const jList = journeysSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Journey[];

      const tList = templatesSnap.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || 'No Name',
        subject: doc.data().subject || ''
      })) as Template[];

      setJourneys(jList);
      setTemplates(tList);
    } catch (error) {
      console.error('Error fetching nurture data:', error);
      toast({
        variant: 'destructive',
        title: 'Error loading data',
        description: 'Failed to fetch active journeys or templates.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddStep = (type: 'action' | 'wait' | 'condition' | 'action_button' | 'end_action') => {
    const nextId = `${type}_${Date.now()}`;
    const newConfig: Record<string, any> = {};

    if (type === 'action') {
      newConfig.actionType = 'email';
      newConfig.templateId = templates[0]?.id || '';
    } else if (type === 'wait') {
      newConfig.duration = '1';
      newConfig.unit = 'days';
    } else if (type === 'condition') {
      newConfig.field = 'bucket';
      newConfig.value = 'outbound';
    } else if (type === 'action_button') {
      newConfig.name = 'Book a Meeting';
      newConfig.redirectUrl = 'https://mailplus.com.au';
      newConfig.targetBucket = 'account_manager';
      newConfig.targetRole = 'Account Manager';
      newConfig.targetUser = 'Lee Russell';
    } else if (type === 'end_action') {
      newConfig.newStatus = 'In Qualification';
      newConfig.newBucket = 'outbound';
      newConfig.deactivateLocalMilePlus = false;
    }

    const newNode: JourneyNode = { id: nextId, type, config: newConfig };

    // Link previous last node to this new node
    const lastNode = nodes[nodes.length - 1];
    const newEdge: JourneyEdge = {
      id: `edge_${lastNode.id}_${nextId}`,
      source: lastNode.id,
      target: nextId
    };

    setNodes([...nodes, newNode]);
    setEdges([...edges, newEdge]);
  };

  const handleUpdateNodeConfig = (id: string, key: string, val: any) => {
    setNodes(nodes.map(node => {
      if (node.id === id) {
        return {
          ...node,
          config: {
            ...node.config,
            [key]: val
          }
        };
      }
      return node;
    }));
  };

  const handleRemoveNode = (id: string) => {
    if (id.startsWith('trigger')) return; // Trigger is mandatory
    
    // Remove node
    const filteredNodes = nodes.filter(n => n.id !== id);
    
    // Re-link remaining steps sequentially
    const updatedEdges: JourneyEdge[] = [];
    for (let i = 0; i < filteredNodes.length - 1; i++) {
      updatedEdges.push({
        id: `edge_${filteredNodes[i].id}_${filteredNodes[i+1].id}`,
        source: filteredNodes[i].id,
        target: filteredNodes[i+1].id
      });
    }

    setNodes(filteredNodes);
    setEdges(updatedEdges);
  };

  const handleEditJourney = (journey: Journey) => {
    setEditingJourneyId(journey.id);
    setJourneyName(journey.name);
    setNodes(journey.nodes as any[] || []);
    setEdges(journey.edges || []);
    setIsOpen(true);
  };

  const handleSaveJourney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journeyName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Failed',
        description: 'Please specify a name for this nurture journey.'
      });
      return;
    }

    setSubmitting(true);
    try {
      if (editingJourneyId) {
        await updateDoc(doc(firestore, 'Journeys', editingJourneyId), {
          name: journeyName,
          nodes,
          edges
        });
        toast({ title: 'Success', description: 'Nurture Journey updated successfully.' });
      } else {
        const journeyData = {
          name: journeyName,
          status: 'draft' as const,
          nodes,
          edges,
          createdAt: new Date().toISOString()
        };
        await addDoc(collection(firestore, 'Journeys'), journeyData);
        toast({ title: 'Success', description: 'Nurture Journey created successfully.' });
      }
      setIsOpen(false);
      resetForm();
      fetchJourneysAndTemplates();
    } catch (error) {
      console.error('Error saving journey:', error);
      toast({
        variant: 'destructive',
        title: 'Error saving',
        description: 'Could not write journey schema to database.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleJourneyStatus = async (id: string, currentStatus: Journey['status']) => {
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      await updateDoc(doc(firestore, 'Journeys', id), { status: nextStatus });
      toast({ title: `Journey ${nextStatus === 'active' ? 'activated' : 'paused'}` });
      fetchJourneysAndTemplates();
    } catch {
      toast({ variant: 'destructive', title: 'Action failed.' });
    }
  };

  const deleteJourney = async (id: string) => {
    if (!confirm('Are you sure you want to delete this nurture campaign?')) return;
    try {
      await deleteDoc(doc(firestore, 'Journeys', id));
      toast({ title: 'Journey deleted.' });
      fetchJourneysAndTemplates();
    } catch {
      toast({ variant: 'destructive', title: 'Deletion failed.' });
    }
  };

  const resetForm = () => {
    setEditingJourneyId(null);
    setJourneyName('');
    setNodes([{ id: 'trigger_1', type: 'trigger', config: { label: 'Lead enrolled in campaign' } }]);
    setEdges([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-medium tracking-tight">Nurture Journeys</h2>
          <p className="text-xs text-muted-foreground">Automate trigger-based lead sequences and reassignment logic</p>
        </div>

        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if(!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              <Plus className="h-4 w-4" /> Create Drip Journey
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl overflow-y-auto max-h-[90vh]">
            <form onSubmit={handleSaveJourney}>
              <DialogHeader>
                <DialogTitle>{editingJourneyId ? 'Edit Lead Nurture Journey' : 'Create Lead Nurture Journey'}</DialogTitle>
                <DialogDescription>
                  Configure automated drip schedules, criteria branches, and action reassignments.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Journey Name</label>
                  <Input 
                    placeholder="e.g. Inbound Marketing Drip v1"
                    value={journeyName}
                    onChange={(e) => setJourneyName(e.target.value)}
                  />
                </div>

                <div className="border rounded-xl p-4 bg-slate-50 space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 border-b pb-1.5 flex justify-between items-center">
                    <span>Journey Flow Sequence</span>
                    <span className="text-[10px] text-muted-foreground font-normal">Sequential Execution Flow</span>
                  </h3>

                  {/* Nodes list */}
                  <div className="space-y-4">
                    {nodes.map((node, index) => (
                      <div key={node.id} className="relative flex flex-col items-center">
                        {index > 0 && <ArrowRight className="h-5 w-5 text-slate-400 rotate-90 my-1 shrink-0" />}
                        
                        <Card className="w-full bg-white border border-slate-200 shadow-sm overflow-hidden">
                          <CardHeader className="py-2.5 px-4 bg-slate-50 border-b flex flex-row items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                              {node.type === 'trigger' && <Play className="h-3 w-3 text-emerald-500 fill-emerald-500" />}
                              {node.type === 'action' && <Mail className="h-3.5 w-3.5 text-blue-500" />}
                              {node.type === 'wait' && <FileText className="h-3.5 w-3.5 text-amber-500" />}
                              {node.type === 'condition' && <Settings className="h-3.5 w-3.5 text-indigo-500" />}
                              {node.type === 'action_button' && <CheckCircle className="h-3.5 w-3.5 text-rose-500" />}
                              {node.type === 'end_action' && <CheckCircle className="h-3.5 w-3.5 text-teal-500" />}
                              {node.type} step
                            </span>
                            {node.type !== 'trigger' && (
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 px-1.5 text-destructive hover:bg-destructive/10"
                                onClick={() => handleRemoveNode(node.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </CardHeader>
                          
                          <CardContent className="p-4 space-y-3">
                            {node.type === 'trigger' && (
                              <div className="space-y-4">
                                <p className="text-xs text-slate-600 font-medium border-b pb-2">
                                  Triggered when a lead is enrolled into this nurture campaign.
                                </p>
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Checkbox 
                                      id={`autoenroll_${node.id}`} 
                                      checked={!!node.config.autoEnroll} 
                                      onCheckedChange={(checked) => handleUpdateNodeConfig(node.id, 'autoEnroll', !!checked)}
                                    />
                                    <label htmlFor={`autoenroll_${node.id}`} className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                                      Enable Automatic Enrollment
                                    </label>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Checkbox 
                                      id={`cancelothers_${node.id}`} 
                                      checked={!!node.config.cancelOtherJourneys} 
                                      onCheckedChange={(checked) => handleUpdateNodeConfig(node.id, 'cancelOtherJourneys', !!checked)}
                                    />
                                    <label htmlFor={`cancelothers_${node.id}`} className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                                      Cancel all other active nurture journeys for lead upon enrollment
                                    </label>
                                  </div>
                                  
                                  {node.config.autoEnroll && (
                                    <div className="space-y-4 mt-4">
                                      {(node.config.enrollConditionGroups || [{ conditions: [{ field: 'customerStatus', value: '' }] }]).map((group: any, groupIndex: number) => (
                                        <div key={groupIndex} className="bg-slate-50 p-3 rounded-lg border space-y-3 relative">
                                          {groupIndex > 0 && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-[10px] font-bold text-slate-500 border rounded-full">OR</div>
                                          )}
                                          <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Condition Group {groupIndex + 1} (Match ALL)</span>
                                            {((node.config.enrollConditionGroups?.length || 1) > 1) && (
                                              <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-destructive hover:bg-destructive/10 text-xs" onClick={() => {
                                                const newGroups = [...(node.config.enrollConditionGroups || [])];
                                                newGroups.splice(groupIndex, 1);
                                                handleUpdateNodeConfig(node.id, 'enrollConditionGroups', newGroups);
                                              }}>
                                                <Trash2 className="h-3 w-3 mr-1" /> Remove Group
                                              </Button>
                                            )}
                                          </div>
                                          
                                          {group.conditions.map((cond: any, condIndex: number) => (
                                            <div key={condIndex} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                                              <div className="space-y-1">
                                                {condIndex === 0 ? <label className="text-[10px] font-bold text-slate-500 uppercase">Field</label> : <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">AND</div>}
                                                <Select 
                                                  value={cond.field || 'customerStatus'} 
                                                  onValueChange={(val) => {
                                                    const newGroups = [...(node.config.enrollConditionGroups || [{ conditions: [{ field: 'customerStatus', value: '' }] }])];
                                                    newGroups[groupIndex].conditions[condIndex] = { ...cond, field: val, value: '' };
                                                    handleUpdateNodeConfig(node.id, 'enrollConditionGroups', newGroups);
                                                  }}
                                                >
                                                  <SelectTrigger className="h-9 bg-white">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="customerStatus">Lead Status</SelectItem>
                                                    <SelectItem value="bucket">Lead Bucket</SelectItem>
                                                    <SelectItem value="leadSource">Lead Source</SelectItem>
                                                    <SelectItem value="campaign">Campaign</SelectItem>
                                                    <SelectItem value="localMileJobCount">LocalMile Job Count</SelectItem>
                                                    <SelectItem value="localMileTermsAccepted">LocalMile Terms Accepted</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                              <div className="space-y-1">
                                                {condIndex === 0 && <label className="text-[10px] font-bold text-slate-500 uppercase">Target Value</label>}
                                                <Select 
                                                  value={cond.value || ''} 
                                                  onValueChange={(val) => {
                                                    const newGroups = [...(node.config.enrollConditionGroups || [{ conditions: [{ field: 'customerStatus', value: '' }] }])];
                                                    newGroups[groupIndex].conditions[condIndex] = { ...cond, value: val };
                                                    handleUpdateNodeConfig(node.id, 'enrollConditionGroups', newGroups);
                                                  }}
                                                >
                                                  <SelectTrigger className="h-9 bg-white">
                                                    <SelectValue placeholder="Select target value..." />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {cond.field === 'bucket' ? AVAILABLE_BUCKETS.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>) :
                                                     cond.field === 'leadSource' ? AVAILABLE_LEAD_SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>) :
                                                     cond.field === 'campaign' ? AVAILABLE_CAMPAIGNS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>) :
                                                     cond.field === 'localMileJobCount' ? ['1', '2', '3', '4', '5'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>) :
                                                     cond.field === 'localMileTermsAccepted' ? [
                                                       <SelectItem key="true" value="true">True</SelectItem>,
                                                       <SelectItem key="false" value="false">False</SelectItem>
                                                     ] :
                                                     AVAILABLE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                              <Button type="button" variant="ghost" size="sm" className="h-9 px-2 text-destructive" disabled={group.conditions.length === 1} onClick={() => {
                                                const newGroups = [...(node.config.enrollConditionGroups || [])];
                                                newGroups[groupIndex].conditions.splice(condIndex, 1);
                                                handleUpdateNodeConfig(node.id, 'enrollConditionGroups', newGroups);
                                              }}>
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          ))}
                                          
                                          <Button type="button" variant="outline" size="sm" className="text-xs w-full mt-2" onClick={() => {
                                            const newGroups = [...(node.config.enrollConditionGroups || [{ conditions: [{ field: 'customerStatus', value: '' }] }])];
                                            newGroups[groupIndex].conditions.push({ field: 'customerStatus', value: '' });
                                            handleUpdateNodeConfig(node.id, 'enrollConditionGroups', newGroups);
                                          }}>
                                            + Add AND Condition
                                          </Button>
                                        </div>
                                      ))}

                                      <Button type="button" variant="secondary" size="sm" className="text-xs w-full" onClick={() => {
                                        const newGroups = [...(node.config.enrollConditionGroups || [{ conditions: [{ field: 'customerStatus', value: '' }] }])];
                                        newGroups.push({ conditions: [{ field: 'customerStatus', value: '' }] });
                                        handleUpdateNodeConfig(node.id, 'enrollConditionGroups', newGroups);
                                      }}>
                                        + Add OR Group
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {node.type === 'action' && (
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">Action Type</label>
                                  <Select 
                                    value={node.config.actionType || 'email'} 
                                    onValueChange={(val) => handleUpdateNodeConfig(node.id, 'actionType', val)}
                                  >
                                    <SelectTrigger className="h-9 bg-slate-50/50">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="email">Send Email</SelectItem>
                                      <SelectItem value="sms">Send SMS</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                 {node.config.actionType === 'email' ? (
                                  <>
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-slate-500 uppercase">Email Template</label>
                                      <Select 
                                        value={node.config.templateId || ''} 
                                        onValueChange={(val) => handleUpdateNodeConfig(node.id, 'templateId', val)}
                                      >
                                        <SelectTrigger className="h-9 bg-slate-50/50">
                                          <SelectValue placeholder="Select template..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {templates.map(t => (
                                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-slate-500 uppercase">From Email Address Mode</label>
                                      <Select 
                                        value={node.config.fromEmailMode || 'dynamic'} 
                                        onValueChange={(val) => handleUpdateNodeConfig(node.id, 'fromEmailMode', val)}
                                      >
                                        <SelectTrigger className="h-9 bg-slate-50/50">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="dynamic">Dynamic (AM / Sales Rep)</SelectItem>
                                          <SelectItem value="static">Static Custom Address</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {node.config.fromEmailMode === 'static' ? (
                                      <div className="col-span-2 space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Custom From Email</label>
                                        <Input 
                                          value={node.config.customFromEmail || ''} 
                                          onChange={(e) => handleUpdateNodeConfig(node.id, 'customFromEmail', e.target.value)}
                                          placeholder="e.g. sales@mailplus.com.au" 
                                        />
                                      </div>
                                    ) : (
                                      <div className="col-span-2 space-y-1">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Fallback Default From Email</label>
                                        <Input 
                                          value={node.config.fallbackFromEmail || 'info@mailplus.com.au'} 
                                          onChange={(e) => handleUpdateNodeConfig(node.id, 'fallbackFromEmail', e.target.value)}
                                          placeholder="e.g. info@mailplus.com.au" 
                                        />
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="col-span-2 space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">SMS Text Body</label>
                                    <Input 
                                      value={node.config.smsMessage || ''} 
                                      onChange={(e) => handleUpdateNodeConfig(node.id, 'smsMessage', e.target.value)}
                                      placeholder="SMS Content..." 
                                    />
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                      Placeholders: {`{{Contact.FirstName}}, {{Company.Name}}, {{SalesRep.Name}}, {{Contact.LocalMilePlusAuthLink}}`}
                                    </p>
                                  </div>
                                )}

                                <div className="col-span-2 flex items-center gap-2 mt-2 pt-2 border-t">
                                  <Checkbox 
                                    id={`weekdays_${node.id}`} 
                                    checked={!!node.config.weekdaysOnly} 
                                    onCheckedChange={(checked) => handleUpdateNodeConfig(node.id, 'weekdaysOnly', !!checked)}
                                  />
                                  <label htmlFor={`weekdays_${node.id}`} className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                                    Send only during weekdays (Mon - Fri)
                                  </label>
                                </div>

                                <div className="col-span-2 space-y-1 pt-1 border-t mt-2">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">Preferred Send Time (Sydney/Australia Time)</label>
                                  <Select 
                                    value={node.config.sendTime || 'any'} 
                                    onValueChange={(val) => handleUpdateNodeConfig(node.id, 'sendTime', val)}
                                  >
                                    <SelectTrigger className="h-9 bg-slate-50/50">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="any">Any Time (Send immediately when step is reached)</SelectItem>
                                      <SelectItem value="08:00">08:00 AM</SelectItem>
                                      <SelectItem value="09:00">09:00 AM</SelectItem>
                                      <SelectItem value="10:00">10:00 AM</SelectItem>
                                      <SelectItem value="11:00">11:00 AM</SelectItem>
                                      <SelectItem value="12:00">12:00 PM</SelectItem>
                                      <SelectItem value="13:00">01:00 PM</SelectItem>
                                      <SelectItem value="14:00">02:00 PM</SelectItem>
                                      <SelectItem value="15:00">03:00 PM</SelectItem>
                                      <SelectItem value="16:00">04:00 PM</SelectItem>
                                      <SelectItem value="17:00">05:00 PM</SelectItem>
                                      <SelectItem value="18:00">06:00 PM</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}

                            {node.type === 'wait' && (
                              <div className="flex gap-4">
                                <div className="space-y-1 flex-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">Delay duration</label>
                                  <Input 
                                    type="number"
                                    min="1"
                                    value={node.config.duration || '1'} 
                                    onChange={(e) => handleUpdateNodeConfig(node.id, 'duration', e.target.value)}
                                  />
                                </div>
                                <div className="space-y-1 flex-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">Unit</label>
                                  <Select 
                                    value={node.config.unit || 'days'} 
                                    onValueChange={(val) => handleUpdateNodeConfig(node.id, 'unit', val)}
                                  >
                                    <SelectTrigger className="h-9 bg-slate-50/50">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="hours">Hours</SelectItem>
                                      <SelectItem value="days">Days</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}

                            {node.type === 'condition' && (
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">Evaluation Field</label>
                                  <Select 
                                    value={node.config.field || 'bucket'} 
                                    onValueChange={(val) => handleUpdateNodeConfig(node.id, 'field', val)}
                                  >
                                    <SelectTrigger className="h-9 bg-slate-50/50">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="bucket">Lead Bucket</SelectItem>
                                      <SelectItem value="customerStatus">Lead Status</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">Field Value must equal</label>
                                  <Input 
                                    value={node.config.value || ''} 
                                    onChange={(e) => handleUpdateNodeConfig(node.id, 'value', e.target.value)}
                                    placeholder="e.g. outbound"
                                  />
                                </div>
                              </div>
                            )}

                            {node.type === 'action_button' && (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Button Label</label>
                                    <Input 
                                      value={node.config.name || ''} 
                                      onChange={(e) => handleUpdateNodeConfig(node.id, 'name', e.target.value)}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Redirect URL</label>
                                    <Input 
                                      value={node.config.redirectUrl || ''} 
                                      onChange={(e) => handleUpdateNodeConfig(node.id, 'redirectUrl', e.target.value)}
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border">
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-600 uppercase">New Bucket</label>
                                    <Select 
                                      value={node.config.targetBucket || ''} 
                                      onValueChange={(val) => handleUpdateNodeConfig(node.id, 'targetBucket', val)}
                                    >
                                      <SelectTrigger className="h-8 bg-white text-xs">
                                        <SelectValue placeholder="No bucket change" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="outbound">Outbound</SelectItem>
                                        <SelectItem value="field_sales">Field Sales</SelectItem>
                                        <SelectItem value="inbound">Inbound</SelectItem>
                                        <SelectItem value="account_manager">Account Manager</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-600 uppercase">Reassign Role</label>
                                    <Select 
                                      value={node.config.targetRole || 'Account Manager'} 
                                      onValueChange={(val) => handleUpdateNodeConfig(node.id, 'targetRole', val)}
                                    >
                                      <SelectTrigger className="h-8 bg-white text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Account Manager">Account Manager</SelectItem>
                                        <SelectItem value="Sales Rep">Sales Rep</SelectItem>
                                        <SelectItem value="Dialer">Dialer</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-slate-600 uppercase">Assigned Rep</label>
                                    <Input 
                                      className="h-8 bg-white text-xs"
                                      value={node.config.targetUser || ''} 
                                      onChange={(e) => handleUpdateNodeConfig(node.id, 'targetUser', e.target.value)}
                                      placeholder="Name..."
                                    />
                                  </div>
                                </div>

                                <div className="bg-blue-50/50 text-[11px] p-2 rounded border border-blue-100 flex items-center justify-between font-mono">
                                  <span>Tag to paste in template: <strong>{`{{Journey.${node.id}}}`}</strong></span>
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    className="h-6 p-1 text-[10px]"
                                    onClick={() => {
                                      navigator.clipboard.writeText(`{{Journey.${node.id}}}`);
                                      toast({ title: 'Tag copied to clipboard.' });
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            )}

                            {node.type === 'end_action' && (
                              <div className="space-y-3 bg-slate-50 p-3 rounded-lg border">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">New Status</label>
                                    <Select
                                      value={node.config.newStatus || ''}
                                      onValueChange={(val) => handleUpdateNodeConfig(node.id, 'newStatus', val)}
                                    >
                                      <SelectTrigger className="h-9 bg-white">
                                        <SelectValue placeholder="Select status..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {AVAILABLE_STATUSES.map(status => (
                                          <SelectItem key={status} value={status}>{status}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">New Bucket</label>
                                    <Select 
                                      value={node.config.newBucket || ''} 
                                      onValueChange={(val) => handleUpdateNodeConfig(node.id, 'newBucket', val)}
                                    >
                                      <SelectTrigger className="h-9 bg-white">
                                        <SelectValue placeholder="No change" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {AVAILABLE_BUCKETS.map(bucket => (
                                          <SelectItem key={bucket.value} value={bucket.value}>{bucket.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                                  <Checkbox 
                                    id={`deactivate_lm_${node.id}`} 
                                    checked={!!node.config.deactivateLocalMilePlus} 
                                    onCheckedChange={(checked) => handleUpdateNodeConfig(node.id, 'deactivateLocalMilePlus', !!checked)}
                                  />
                                  <label htmlFor={`deactivate_lm_${node.id}`} className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                                    Deactivate LocalMile Plus Contact Account
                                  </label>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>

                  {/* Add node buttons */}
                  <div className="pt-4 border-t flex flex-wrap gap-2 justify-center">
                    <Button type="button" size="sm" variant="outline" onClick={() => handleAddStep('action')} className="text-xs">
                      + Add Action (Email/SMS)
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => handleAddStep('wait')} className="text-xs">
                      + Add Wait
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => handleAddStep('condition')} className="text-xs">
                      + Add Condition
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => handleAddStep('action_button')} className="text-xs">
                      + Add Action Button Link
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => handleAddStep('end_action')} className="text-xs">
                      + Add End Action
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={submitting} className="w-full md:w-auto">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} {editingJourneyId ? 'Update Journey Schema' : 'Save Journey Schema'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex h-36 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      ) : journeys.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
          <h3 className="font-semibold text-slate-700">No Journeys Configured</h3>
          <p className="text-xs text-muted-foreground mt-1">Configure your first automated email drip sequence and conditional branch pathways.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {journeys.map(journey => (
            <Card key={journey.id} className="border hover:shadow-md transition">
              <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-800">{journey.name}</CardTitle>
                  <CardDescription className="text-[11px] mt-1">
                    Steps: {journey.nodes?.length || 0} | Status: <span className={`font-semibold ${journey.status === 'active' ? 'text-emerald-600' : 'text-slate-500'}`}>{journey.status}</span>
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleEditJourney(journey)}
                    className="h-8 px-2 text-slate-600 hover:text-slate-800"
                  >
                    <Pencil className="h-4 w-4 text-slate-500" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => toggleJourneyStatus(journey.id, journey.status)}
                    className="h-8 px-2 text-slate-600 hover:text-slate-800"
                  >
                    {journey.status === 'active' ? <Pause className="h-4 w-4 text-amber-500" /> : <Play className="h-4 w-4 text-emerald-500" />}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => deleteJourney(journey.id)}
                    className="h-8 px-2 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              {journey.status === 'active' && (
                <div className="px-6 pb-4 pt-2 border-t">
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => router.push(`/admin/marketing/nurture-journeys/${journey.id}/enroll`)}>
                    <Users className="h-4 w-4 mr-2" /> Enroll Existing Leads
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
