'use client';

import { useEffect, useRef } from 'react';

interface VisualIframeEditorProps {
  body: string;
  setBody: (body: string) => void;
  primaryColor: string;
  fontFamily: string;
  logoUrl?: string;
  readOnly?: boolean;
}

export function VisualIframeEditor({ body, setBody, primaryColor, fontFamily, logoUrl, readOnly }: VisualIframeEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isInternalChange = useRef(false);

  useEffect(() => {
    function setupIframe() {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <base href="${window.location.origin}" />
            <style>
              body { 
                font-family: ${fontFamily}; 
                color: #2e2e2e; 
                line-height: 1.6; 
                padding: 20px; 
                margin: 0;
                background-color: #f8fafc;
              }
              h1, h2, h3 { color: ${primaryColor}; font-weight: normal; margin-top: 0; }
              p { margin-bottom: 16px; }
              a { color: ${primaryColor}; text-decoration: underline; }
              .preview-footer {
                margin-top: 24px;
                padding-top: 12px;
                border-top: 1px solid #eaeaea;
                font-size: 11px;
                color: #888;
                user-select: none;
              }
              .brand-logo {
                max-height: 48px;
                max-width: 150px;
                margin-bottom: 24px;
                user-select: none;
              }
              table {
                border-collapse: collapse;
                width: 100%;
                margin: 16px 0;
              }
              table td, table th {
                border: 1px solid #ced4da;
                padding: 8px;
                text-align: left;
              }
              table th {
                font-weight: bold;
                background-color: #f1f3f5;
              }
              #editable-content {
                min-height: 400px;
                outline: none;
                background-color: #ffffff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              }
              #editable-content:empty:before {
                content: "Begin typing content here...";
                color: #888;
                font-style: italic;
              }
            </style>
          </head>
          <body>
            <div id="editable-content" contenteditable="${readOnly ? 'false' : 'true'}">${body}</div>
          </body>
        </html>
      `);
      doc.close();

      const editable = doc.getElementById('editable-content');
      if (editable && !readOnly) {
        editable.addEventListener('input', () => {
          isInternalChange.current = true;
          setBody(editable.innerHTML);
        });
      }
    }

    // Small delay to ensure iframe is ready
    setTimeout(setupIframe, 50);
  }, [primaryColor, fontFamily, logoUrl, readOnly]);

  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    const doc = iframeRef.current?.contentDocument;
    const editable = doc?.getElementById('editable-content');
    if (editable && editable.innerHTML !== body) {
      editable.innerHTML = body;
    }
  }, [body]);

  useEffect(() => {
    (window as any).__iframeEditorInsert = (html: string) => {
      if (readOnly) return;
      const doc = iframeRef.current?.contentDocument;
      const editable = doc?.getElementById('editable-content');
      if (editable && doc) {
        editable.focus();
        doc.execCommand('insertHTML', false, html);
      }
    };
    return () => {
      delete (window as any).__iframeEditorInsert;
    };
  }, [readOnly]);

  return <iframe ref={iframeRef} className="w-full min-h-[500px] border-none bg-slate-50 rounded-lg shadow-sm" />;
}
