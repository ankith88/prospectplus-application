'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Loader2, ShieldCheck, Mail, ShieldAlert, Key, Globe, HelpCircle, HardDrive, Image as ImageIcon } from 'lucide-react';

interface IntegrationConfig {
  type: 'graph' | 'smtp';
  senderEmail: string;
  // Graph settings
  clientId?: string;
  tenantId?: string;
  clientSecret?: string;
  // SMTP settings
  host?: string;
  port?: string;
  secure?: 'ssl' | 'tls' | 'none';
  username?: string;
  password?: string;
}

export function OutlookSettings() {
  const [type, setType] = useState<'graph' | 'smtp'>('graph');
  const [senderEmail, setSenderEmail] = useState('campaigns@mailplus.com.au');
  
  // Graph States
  const [clientId, setClientId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  // SMTP States
  const [host, setHost] = useState('smtp.office365.com');
  const [port, setPort] = useState('587');
  const [secure, setSecure] = useState<'ssl' | 'tls' | 'none'>('tls');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Brand Settings
  const [logoUrl, setLogoUrl] = useState('');

  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    fetchActiveConfig();
  }, []);

  const fetchActiveConfig = async () => {
    setLoading(true);
    try {
      const docSnap = await getDoc(doc(firestore, 'outlook_integrations', 'active_config'));
      if (docSnap.exists()) {
        const data = docSnap.data() as IntegrationConfig;
        setType(data.type);
        setSenderEmail(data.senderEmail || '');
        if (data.type === 'graph') {
          setClientId(data.clientId || '');
          setTenantId(data.tenantId || '');
          setClientSecret(data.clientSecret || '');
        } else {
          setHost(data.host || '');
          setPort(data.port || '');
          setSecure(data.secure || 'tls');
          setUsername(data.username || '');
          setPassword(data.password || '');
        }
      }

      const brandSnap = await getDoc(doc(firestore, 'brandProfiles', 'default_company'));
      if (brandSnap.exists()) {
        const brandData = brandSnap.data();
        setLogoUrl(brandData?.designTokens?.logoUrl || '');
      }
    } catch (error) {
      console.error('Error fetching Outlook config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const payload: any = { type, senderEmail };
      if (type === 'graph') {
        payload.clientId = clientId;
        payload.tenantId = tenantId;
        payload.clientSecret = clientSecret;
      } else {
        payload.host = host;
        payload.port = port;
        payload.secure = secure;
        payload.username = username;
        payload.password = password;
      }

      const res = await fetch('/api/campaigns/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      setTestResult({
        success: data.success,
        message: data.message
      });

      if (data.success) {
        toast({
          title: 'Connection Successful',
          description: data.message
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Connection Failure',
          description: 'Security or authentication block encountered.'
        });
      }

    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'System was unable to establish connection with routing server.'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const data: IntegrationConfig = {
        type,
        senderEmail
      };

      if (type === 'graph') {
        data.clientId = clientId;
        data.tenantId = tenantId;
        data.clientSecret = clientSecret;
      } else {
        data.host = host;
        data.port = port;
        data.secure = secure;
        data.username = username;
        data.password = password;
      }

      await setDoc(doc(firestore, 'outlook_integrations', 'active_config'), data);
      
      // Save Brand Settings
      await setDoc(doc(firestore, 'brandProfiles', 'default_company'), {
        designTokens: { logoUrl }
      }, { merge: true });

      toast({
        title: 'Configuration Saved',
        description: 'Outlook transmission settings updated successfully.'
      });
    } catch (error) {
      console.error('Save settings failed:', error);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Failed to write config settings to Firestore.'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Settings Form Left */}
      <Card className="lg:col-span-2 bg-card">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="text-sm font-semibold text-slate-800">Integration & Brand Settings</CardTitle>
          <CardDescription className="text-xs">
            Authenticate the MailPlus domain and manage global brand assets used in emails.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Sender Domain Address</label>
                  <Input
                    placeholder="e.g. campaigns@mailplus.com.au"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    className={!senderEmail.endsWith('@mailplus.com.au') ? 'border-destructive text-destructive' : ''}
                  />
                  {!senderEmail.endsWith('@mailplus.com.au') && (
                    <span className="text-[10px] text-destructive font-semibold">Strict Domain Check: Must end with @mailplus.com.au</span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Authentication Protocol</label>
                  <Select value={type} onValueChange={(val: any) => setType(val)}>
                    <SelectTrigger className="bg-slate-50">
                      <SelectValue placeholder="Protocol..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="graph">Microsoft Graph API (Modern Auth / OAuth 2.0)</SelectItem>
                      <SelectItem value="smtp">Office 365 Authenticated SMTP Server</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {type === 'graph' ? (
                <div className="space-y-4 border-t pt-4 animate-in fade-in duration-200">
                  <span className="text-xs font-bold text-slate-800 uppercase block flex items-center gap-1.5">
                    <Key className="h-4 w-4 text-blue-500" /> Microsoft Entra / Azure AD App Details
                  </span>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Application (Client) ID</label>
                    <Input
                      placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Directory (Tenant) ID</label>
                    <Input
                      placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                      value={tenantId}
                      onChange={(e) => setTenantId(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Client Secret Value</label>
                    <Input
                      type="password"
                      placeholder="Input Azure client secret value..."
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4 border-t pt-4 animate-in fade-in duration-200">
                  <span className="text-xs font-bold text-slate-800 uppercase block flex items-center gap-1.5">
                    <HardDrive className="h-4 w-4 text-blue-500" /> SMTP Mail Server Credentials
                  </span>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-1">
                      <label className="text-xs font-medium text-slate-600">SMTP Host</label>
                      <Input
                        placeholder="smtp.office365.com"
                        value={host}
                        onChange={(e) => setHost(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">SMTP Port</label>
                      <Input
                        placeholder="587"
                        value={port}
                        onChange={(e) => setPort(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-1">
                      <label className="text-xs font-medium text-slate-600">SMTP Username</label>
                      <Input
                        placeholder="user@mailplus.com.au"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-600">Transport Security</label>
                      <Select value={secure} onValueChange={(val: any) => setSecure(val)}>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Protocol..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tls">STARTTLS</SelectItem>
                          <SelectItem value="ssl">SSL / TLS</SelectItem>
                          <SelectItem value="none">None (Plaintext)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">SMTP Password</label>
                    <Input
                      type="password"
                      placeholder="Input SMTP password..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-4 border-t pt-4 animate-in fade-in duration-200">
                <span className="text-xs font-bold text-slate-800 uppercase block flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-blue-500" /> Global Brand Assets
                </span>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">MailPlus Logo Image URL</label>
                  <Input
                    placeholder="https://example.com/logo.png"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">This logo is automatically injected into all templates and service quotes.</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="border-t px-6 py-4 flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={testing || loading || !senderEmail.endsWith('@mailplus.com.au')}
            className="border-primary text-primary hover:bg-primary/5 h-9"
          >
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Testing Connection...
              </>
            ) : (
              'Test Connection'
            )}
          </Button>

          <Button
            type="button"
            onClick={handleSaveConfig}
            disabled={saving || loading || !senderEmail.endsWith('@mailplus.com.au')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-9"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Integration'}
          </Button>
        </CardFooter>
      </Card>

      {/* Diagnostics Panel Right */}
      <Card className="lg:col-span-1 bg-card flex flex-col justify-between">
        <CardHeader className="border-b px-6 py-4">
          <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4 text-slate-500" /> Integration Diagnostics
          </CardTitle>
          <CardDescription className="text-xs">Connection status & permission escalations</CardDescription>
        </CardHeader>
        <CardContent className="p-6 flex-1 flex flex-col justify-center items-center">
          {testResult ? (
            <div className="w-full text-center space-y-4 animate-in zoom-in-95 duration-200">
              {testResult.success ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
                    <ShieldCheck className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-800">Connection Verified</h4>
                    <p className="text-xs text-emerald-700 leading-normal mt-1">{testResult.message}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto animate-bounce">
                    <ShieldAlert className="h-6 w-6 text-destructive" />
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-destructive">Integration Rejected / Blocked</h4>
                    
                    <div className="bg-slate-50 border rounded-lg p-3 text-left">
                      <p className="text-[11px] text-slate-700 leading-relaxed">{testResult.message}</p>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-left mt-2">
                      <span className="text-[10px] font-bold uppercase text-amber-700 block mb-1">Administrative Support:</span>
                      <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
                        If you encounter permission issues or require Azure credentials, please contact **Ankith Ravindran** for administrative support, system access, and tenant-wide application approval.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground p-4 max-w-[240px]">
              <Mail className="h-10 w-10 opacity-30 mx-auto mb-3 text-slate-400" />
              <p className="text-xs">No active connection tests run. Click 'Test Connection' to verify Outlook credential mapping.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t px-6 py-4 bg-slate-50 text-[10px] text-muted-foreground justify-center">
          MailPlus Domain Authority System &copy; 2026
        </CardFooter>
      </Card>
    </div>
  );
}
