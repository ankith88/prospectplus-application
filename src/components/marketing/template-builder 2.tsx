'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Loader2, Plus, Save, Trash2, Edit3, Eye, FileText, Code } from 'lucide-react';

interface Template {
  id?: string;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export function TemplateBuilder() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // Editor states
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setName(template.name);
    setSubject(template.subject);
    setBody(template.body);
  };

  const handleNewTemplate = () => {
    setSelectedTemplate(null);
    setName('');
    setSubject('');
    setBody(`<h2>Hello {{Contact.Name}}!</h2>\n\n<p>We noticed that <strong>{{Company.Name}}</strong> has been growing rapidly, and we would love to partner with you to streamline your shipping needs.</p>\n\n<p>Let's schedule a call this week. I will be your dedicated contact.</p>\n\n<p>Best regards,<br>{{SalesRep.Name}}</p>`);
  };

  const insertPlaceholder = (placeholder: string) => {
    const textarea = bodyTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    const newValue = value.substring(0, start) + placeholder + value.substring(end);
    setBody(newValue);

    // Reset cursor focus
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
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

    setSaving(true);
    const now = new Date().toISOString();
    try {
      const data = {
        name,
        subject,
        body,
        updatedAt: now
      };

      if (selectedTemplate?.id) {
        // Update
        const ref = doc(firestore, 'marketing_templates', selectedTemplate.id);
        await updateDoc(ref, data);
        toast({ title: 'Success', description: 'Template updated successfully.' });
      } else {
        // Create
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

  // Compile placeholders for Preview
  const compilePreview = () => {
    let preview = body;
    preview = preview.replace(/\{\{Contact\.Name\}\}/g, '<span style="color:#095c7b; font-weight:600;">Sarah Jenkins</span>');
    preview = preview.replace(/\{\{Company\.Name\}\}/g, '<span style="color:#a8763a; font-weight:600;">Apex Logistics Ltd</span>');
    preview = preview.replace(/\{\{SalesRep\.Name\}\}/g, '<span style="color:#1A3D33; font-weight:600;">Michael Cooper</span>');
    
    // Default simple styling wrapper inside iframe
    return `
      <html>
        <head>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
              color: #2e2e2e; 
              line-height: 1.6; 
              padding: 20px; 
              margin: 0;
            }
            h1, h2, h3 { color: #1A3D33; font-weight: normal; margin-top: 0; }
            p { margin-bottom: 16px; }
            a { color: #095C7B; text-decoration: underline; }
            .preview-footer {
              margin-top: 24px;
              padding-top: 12px;
              border-top: 1px solid #eaeaea;
              font-size: 11px;
              color: #888;
            }
          </style>
        </head>
        <body>
          ${preview || '<p style="color:#888; font-style:italic;">Begin typing content to see a live compiled preview...</p>'}
          <div class="preview-footer">
            This email was sent by MailPlus Outbound System.
            <br>
            If you no longer wish to receive marketing communications, you can <a href="#">unsubscribe here</a>.
          </div>
        </body>
      </html>
    `;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-180px)]">
      {/* Templates Sidebar */}
      <Card className="lg:col-span-1 flex flex-col h-full bg-card overflow-hidden">
        <CardHeader className="border-b px-4 py-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Email Templates</CardTitle>
            <CardDescription className="text-xs">Select or create layout drafts</CardDescription>
          </div>
          <Button size="sm" onClick={handleNewTemplate} className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground gap-1">
            <Plus className="h-4 w-4" /> New
          </Button>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-y-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col h-60 items-center justify-center p-6 text-center text-muted-foreground gap-2">
              <FileText className="h-8 w-8 opacity-40" />
              <span className="text-sm">No custom templates built yet. Click 'New' to start.</span>
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
                    <span className="text-xs text-muted-foreground truncate">{t.subject}</span>
                    <span className="text-[10px] text-muted-foreground">
                      Updated {new Date(t.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={(e) => handleDelete(t.id!, e)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Editor & Previewer */}
      <Card className="lg:col-span-2 flex flex-col h-full bg-card overflow-hidden">
        <CardHeader className="border-b px-6 py-4 flex flex-row items-center justify-between shrink-0">
          <div>
            <CardTitle className="text-lg">
              {selectedTemplate?.id ? `Edit Template: ${name}` : 'New Custom Template'}
            </CardTitle>
            <CardDescription className="text-xs">Design beautiful marketing campaigns using HTML and variables</CardDescription>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-9">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Layout
          </Button>
        </CardHeader>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Editor Left */}
          <div className="flex-1 p-6 flex flex-col gap-4 border-r overflow-y-auto">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Template Name</label>
              <Input
                placeholder="e.g. Outbound Lead Warm Blast"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-50 focus-visible:bg-white transition-colors"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subject Line</label>
              <Input
                placeholder="e.g. Streamline Your Shipping Logistics | MailPlus"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-slate-50 focus-visible:bg-white transition-colors"
              />
            </div>

            <div className="space-y-1 flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-1 shrink-0">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email HTML Body</label>
                <div className="flex gap-1">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-6 text-[10px] px-2"
                    onClick={() => insertPlaceholder('{{Contact.Name}}')}
                  >
                    + Contact Name
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-6 text-[10px] px-2"
                    onClick={() => insertPlaceholder('{{Company.Name}}')}
                  >
                    + Company Name
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-6 text-[10px] px-2"
                    onClick={() => insertPlaceholder('{{SalesRep.Name}}')}
                  >
                    + Sales Rep
                  </Button>
                </div>
              </div>
              <Textarea
                ref={bodyTextareaRef}
                placeholder="HTML campaign content..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="flex-1 min-h-[250px] font-mono text-xs bg-slate-50 focus-visible:bg-white transition-colors p-4 resize-none"
              />
            </div>
          </div>

          {/* Interactive Live Preview Right */}
          <div className="flex-1 p-6 flex flex-col gap-4 bg-slate-50 overflow-hidden">
            <div className="flex justify-between items-center shrink-0">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-blue-500" /> Interactive Compiler Preview
              </span>
              <div className="flex border rounded-md overflow-hidden bg-white">
                <Button
                  size="sm"
                  variant={previewMode === 'desktop' ? 'default' : 'ghost'}
                  onClick={() => setPreviewMode('desktop')}
                  className="h-7 text-[10px] px-3 rounded-none"
                >
                  Desktop
                </Button>
                <Button
                  size="sm"
                  variant={previewMode === 'mobile' ? 'default' : 'ghost'}
                  onClick={() => setPreviewMode('mobile')}
                  className="h-7 text-[10px] px-3 rounded-none"
                >
                  Mobile
                </Button>
              </div>
            </div>

            <div className="flex-1 flex justify-center items-center bg-slate-200 border rounded-lg p-4 overflow-hidden relative">
              <div
                className={`bg-white rounded-lg shadow-lg border transition-all duration-300 overflow-hidden flex flex-col ${
                  previewMode === 'desktop' ? 'w-full h-full' : 'w-[360px] h-[480px]'
                }`}
              >
                {/* Simulated Email Header */}
                <div className="border-b bg-slate-100 px-4 py-2 text-xs text-muted-foreground shrink-0 space-y-1">
                  <div><span className="font-semibold text-slate-600">From:</span> outbound@mailplus.com.au (Outlook Transport)</div>
                  <div><span className="font-semibold text-slate-600">To:</span> sarah.jenkins@apexlogistics.com.au</div>
                  <div className="truncate"><span className="font-semibold text-slate-600">Subject:</span> {subject || '(No Subject)'}</div>
                </div>

                {/* Preview Frame */}
                <iframe
                  title="Compiled live preview"
                  srcDoc={compilePreview()}
                  className="flex-1 w-full border-none"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
