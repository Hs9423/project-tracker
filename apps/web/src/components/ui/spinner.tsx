import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn('h-5 w-5 animate-spin rounded-full border-2 border-c-border border-t-accent', className)}
    />
  );
}

export function PageSpinner() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
