import { cn } from "@/shared/cn";

type Props = {
  count?: number;
  className?: string;
  /** test id на корневом ul */
  testId?: string;
};

/** Общая сетка pulse-карточек для loading/Suspense fallback. */
export function PulseCardGrid({ count = 6, className, testId }: Props) {
  return (
    <ul
      className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3", className)}
      data-testid={testId}
    >
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="border-border bg-surface border">
          <div className="bg-surface-2 aspect-[4/3] w-full" />
          <div className="space-y-2 p-4">
            <div className="bg-surface-2 h-3 w-24" />
            <div className="bg-surface-2 h-4 w-full" />
            <div className="bg-surface-2 h-4 w-2/3" />
            <div className="bg-surface-2 mt-2 h-5 w-20" />
          </div>
        </li>
      ))}
    </ul>
  );
}
