'use client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = false,
  onConfirm,
  onCancel,
  isPending,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-text2 mt-1">{description}</p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isPending}>Cancel</Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isPending}
            className={destructive ? 'bg-red hover:bg-red/90 text-white' : ''}
          >
            {isPending ? 'Processing…' : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
