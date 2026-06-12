'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Loader2, Plus, Save, Trash2, FileText, Copy, ChevronDown, MessageSquare } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SmsTemplate {
  id?: string;
  name: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export function SmsTemplateBuilder() {
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SmsTemplate | null>(null);

  // Editor states
  const [name, setName] = useState('');
  const [body, setBody] = useState('');

  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
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

    setSaving(true);
    const now = new Date().toISOString();
    try {
      const data = {
        name,
        body,
        updatedAt: now
      };

      if (selectedTemplate?.id) {
        const ref = doc(firestore, 'marketing_sms_templates', selectedTemplate.id);
        await updateDoc(ref, data);
        toast({ title: 'Success', description: 'SMS Template updated successfully.' });
      } else {
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
        updatedAt: now
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
        <CardContent className="flex-1 p-0 overflow-y-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col h-60 items-center justify-center p-6 text-center text-muted-foreground gap-3">
              <MessageSquare className="h-8 w-8 opacity-40 text-green-500" />
              <span className="text-sm font-medium">No SMS templates built yet.</span>
            </div>
          ) : (
            <div className="divide-y">
              {templates.map(t => (
                <div
                  key={t.id}
                  onClick={() => handleSelectTemplate(t)}
                  className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between ${
                    selectedTemplate?.id === t.id ? 'bg-slate-100 border-l-4 border-primary' : ''
                  }`}
                >
                  <div className="flex flex-col gap-1 min-w-0 pr-2">
                    <span className="font-medium text-sm truncate">{t.name}</span>
                    <span className="text-xs text-muted-foreground truncate">{t.body}</span>
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
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDelete(t.id!, e)}
                      title="Delete Template"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor Combined */}
      <Card className="lg:col-span-3 flex flex-col h-full bg-card overflow-hidden">
        <CardHeader className="border-b px-6 py-4 flex flex-row items-center justify-between shrink-0">
          <div>
            <CardTitle className="text-lg">
              {selectedTemplate?.id ? `Edit SMS Template: ${name}` : 'New SMS Template'}
            </CardTitle>
            <CardDescription className="text-xs">Draft your text message using placeholders</CardDescription>
          </div>
          <div className="flex gap-2 items-center">
            <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-9">
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
                  <Button size="sm" variant="outline" className="h-8 text-xs px-3">
                    Insert Placeholder <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => insertContent('{{Contact.Name}}')}>+ Contact Name</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Contact.FirstName}}')}>+ Contact First Name</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Company.Name}}')}>+ Company Name</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{SalesRep.Name}}')}>+ Sales Rep Name</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => insertContent('{{Contact.LocalMilePlusAuthLink}}')}>+ LocalMile Plus Link</DropdownMenuItem>
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
                  />
                </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
