'use client';

import { Search } from 'lucide-react';

export function UniversalSearch() {
  const triggerPalette = () => {
    // Dispatch Cmd+K event to open CommandPalette modal
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
  };

  return (
    <button
      type="button"
      onClick={triggerPalette}
      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-55 hover:bg-accent hover:text-accent-foreground h-9 w-9 text-sidebar-accent hover:text-sidebar-hover-foreground relative group"
      title="Universal Lookup (Cmd + K)"
    >
      <Search className="h-5 w-5" strokeWidth={2.5} />
      <span className="sr-only">Universal Lookup</span>
    </button>
  );
}
