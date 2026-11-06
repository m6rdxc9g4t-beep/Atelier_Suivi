import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-sunken", className)} aria-hidden />;
}

/** Squelette générique pour les listes chargées en streaming : des lignes de liste */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Chargement">
      <div className="flex min-h-10 items-center border-b border-line bg-sidebar px-5 lg:min-h-9">
        <Skeleton className="h-3 w-24" />
      </div>
      {Array.from({ length: rows * 2 }, (_, i) => (
        <div key={i} className="flex min-h-13 items-center gap-3 border-b border-line px-5 lg:min-h-10">
          <Skeleton className="size-4.5 rounded-full" />
          <Skeleton className={cn("h-3", i % 3 === 0 ? "w-56" : i % 3 === 1 ? "w-40" : "w-48")} />
        </div>
      ))}
    </div>
  );
}

/** Page entière en chargement : barre haute vide, puis lignes */
export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <>
      <div className="min-h-13 border-b border-line lg:min-h-11" aria-hidden />
      <ListSkeleton rows={rows} />
    </>
  );
}
