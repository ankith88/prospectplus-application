
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
}

export function MapModal({ isOpen, onClose, address }: MapModalProps) {
  if (!isOpen) return null;

  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(
    address
  )}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[80vw] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Lead Location</DialogTitle>
          <DialogDescription>{address}</DialogDescription>
        </DialogHeader>
        <div className="flex-grow">
          <iframe
            width="100%"
            height="100%"
            frameBorder="0"
            style={{ border: 0 }}
            src={mapSrc}
            allowFullScreen
            aria-hidden="false"
            tabIndex={0}
          ></iframe>
        </div>
      </DialogContent>
    </Dialog>
  );
}
