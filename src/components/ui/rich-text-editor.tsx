'use client';

import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Link } from '@tiptap/extension-link';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Link as LinkIcon,
  Table as TableIcon,
  TableRowsSplit,
  Heading1,
  Heading2,
  Trash2,
  Heading3
} from 'lucide-react';
import { useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  onFocus?: () => void;
}

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null;
  }

  const addLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-slate-50 rounded-t-md">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-slate-200' : ''}`}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-slate-200' : ''}`}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={`h-8 w-8 p-0 ${editor.isActive('strike') ? 'bg-slate-200' : ''}`}
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-4 bg-slate-300 mx-1" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`h-8 w-8 p-0 ${editor.isActive('heading', { level: 1 }) ? 'bg-slate-200' : ''}`}
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`h-8 w-8 p-0 ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-200' : ''}`}
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`h-8 w-8 p-0 ${editor.isActive('heading', { level: 3 }) ? 'bg-slate-200' : ''}`}
      >
        <Heading3 className="h-4 w-4" />
      </Button>

      <div className="w-px h-4 bg-slate-300 mx-1" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-slate-200' : ''}`}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`h-8 w-8 p-0 ${editor.isActive('orderedList') ? 'bg-slate-200' : ''}`}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      <div className="w-px h-4 bg-slate-300 mx-1" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={addLink}
        className={`h-8 w-8 p-0 ${editor.isActive('link') ? 'bg-slate-200' : ''}`}
      >
        <LinkIcon className="h-4 w-4" />
      </Button>

      <div className="w-px h-4 bg-slate-300 mx-1" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        title="Insert Table"
        className="h-8 w-8 p-0"
      >
        <TableIcon className="h-4 w-4" />
      </Button>

      {editor.isActive('table') && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().addRowAfter().run()}
            title="Add Row Below"
            className="h-8 w-8 p-0"
          >
            <TableRowsSplit className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().deleteTable().run()}
            title="Delete Table"
            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
};

export function RichTextEditor({ value, onChange, className, onFocus }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onFocus: () => {
      if (onFocus) onFocus();
    }
  });

  // Expose the editor instance to window so the parent can interact with it (e.g. inserting variables)
  useEffect(() => {
    if (editor) {
      (window as any).__tiptapEditor = editor;
    }
  }, [editor]);

  // Update content if value changes externally (e.g., loading a saved template)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  return (
    <div className={`border rounded-md bg-white flex flex-col ${className}`}>
      <MenuBar editor={editor} />
      <style>{`
        /* Tiptap Table Styles */
        .tiptap table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 0;
          overflow: hidden;
        }

        .tiptap table td,
        .tiptap table th {
          min-width: 1em;
          border: 2px solid #ced4da;
          padding: 3px 5px;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
        }

        .tiptap table th {
          font-weight: bold;
          text-align: left;
          background-color: #f1f3f5;
        }
      `}</style>
      <div className="flex-1 overflow-y-auto cursor-text" onClick={() => editor?.commands.focus()}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
