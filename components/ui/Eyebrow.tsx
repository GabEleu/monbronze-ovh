import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Sur-titre technique en monospace : « 01 / 08 — Le concept ». */
export function Eyebrow({
  index,
  total,
  children,
  className,
}: {
  index?: number;
  total?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("label-mono flex items-center gap-3 text-ink-muted", className)}>
      {index !== undefined && (
        <span className="text-ink">
          {pad(index)}
          {total !== undefined && <span className="text-ink-muted"> / {pad(total)}</span>}
        </span>
      )}
      {index !== undefined && <span aria-hidden="true" className="h-px w-8 bg-line-strong" />}
      <span>{children}</span>
    </p>
  );
}

export function pad(n: number) {
  return String(n).padStart(2, "0");
}
