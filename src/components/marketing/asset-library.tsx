'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { firestore, storage } from '@/lib/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { Loader2, UploadCloud, Copy, Trash2, Image as ImageIcon, Link2 } from 'lucide-react';

interface Asset {
  id: string;
  name: string;
  url: string;
  path: string;
  size: number;
  type: string;
  createdAt: string;
}

export function AssetLibrary() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const q = query(collection(firestore, 'marketing_assets'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Asset[];
      setAssets(list);
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load assets.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Invalid File',
        description: 'Only image files are supported.'
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Image must be less than 5MB.'
      });
      return;
    }

    uploadAsset(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadAsset = (file: File) => {
    setUploading(true);
    setUploadProgress(0);

    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const storagePath = `marketing_assets/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error('Upload error:', error);
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: error.message
        });
        setUploading(false);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          const assetData = {
            name: file.name,
            url: downloadURL,
            path: storagePath,
            size: file.size,
            type: file.type,
            createdAt: new Date().toISOString()
          };

          const docRef = await addDoc(collection(firestore, 'marketing_assets'), assetData);
          
          setAssets([{ id: docRef.id, ...assetData }, ...assets]);
          
          toast({
            title: 'Upload Successful',
            description: 'Image has been added to the library.'
          });
        } catch (error: any) {
          console.error('Error saving asset metadata:', error);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Image uploaded but failed to save to database.'
          });
        } finally {
          setUploading(false);
        }
      }
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Link Copied',
      description: 'Image URL copied to clipboard.'
    });
  };

  const handleDelete = async (asset: Asset) => {
    if (!confirm('Are you sure you want to delete this asset? It will break any emails currently using it.')) {
      return;
    }

    try {
      // 1. Delete from Storage
      const storageRef = ref(storage, asset.path);
      await deleteObject(storageRef).catch((e) => {
        console.warn('Storage object might already be deleted:', e);
      });

      // 2. Delete from Firestore
      await deleteDoc(doc(firestore, 'marketing_assets', asset.id));

      setAssets(assets.filter(a => a.id !== asset.id));
      
      toast({
        title: 'Asset Deleted'
      });
    } catch (error: any) {
      console.error('Delete failed:', error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: error.message
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <Card className="bg-card min-h-[600px] flex flex-col">
      <CardHeader className="border-b px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-blue-500" /> Image Asset Library
          </CardTitle>
          <CardDescription className="text-xs">
            Upload logos, banners, and graphics to use across your email templates and settings.
          </CardDescription>
        </div>
        
        <div className="flex items-center gap-3">
          <Input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={uploading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {uploading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {Math.round(uploadProgress)}%</>
            ) : (
              <><UploadCloud className="mr-2 h-4 w-4" /> Upload Image</>
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 flex-1 bg-slate-50">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed rounded-lg bg-white">
            <UploadCloud className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
            <h3 className="font-medium text-slate-700">No assets uploaded yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Click the upload button above to add images to your library.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {assets.map((asset) => (
              <div key={asset.id} className="group relative bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="aspect-video bg-slate-100 flex items-center justify-center p-2 relative overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={asset.url} 
                    alt={asset.name} 
                    className="max-w-full max-h-full object-contain"
                  />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="h-8 w-8 p-0"
                      onClick={() => copyToClipboard(asset.url)}
                      title="Copy URL"
                    >
                      <Link2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      className="h-8 w-8 p-0"
                      onClick={() => handleDelete(asset)}
                      title="Delete Asset"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-3 border-t">
                  <p className="text-xs font-medium text-slate-800 truncate" title={asset.name}>
                    {asset.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1 flex justify-between">
                    <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
                    <span>{formatBytes(asset.size)}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
