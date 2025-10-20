"use client";

import type React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

type ImageModalProps = {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageName?: string;
};

export function ImageModal({
  isOpen,
  onClose,
  imageUrl,
  imageName,
}: ImageModalProps) {
  return (
    <Dialog onOpenChange={onClose} open={isOpen}>
      <DialogContent>
        {/* biome-ignore lint/performance/noImgElement: Next/Image not desired for modal preview */}
        <img
          alt={imageName ?? "Expanded image"}
          className="max-h-[90vh] max-w-full rounded-lg object-contain"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          src={imageUrl || undefined}
        />
      </DialogContent>
    </Dialog>
  );
}
