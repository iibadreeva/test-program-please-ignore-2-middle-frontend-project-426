import { HeaderNav } from "@/components/header-nav";
import { LogoLink } from "@/components/nav-link";

export function Header() {
  return (
    <header className="sticky top-0 z-40 overflow-x-clip border-b border-border/80 bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2">
        <LogoLink className="shrink-0 font-display text-xl font-semibold tracking-tight" />
        <HeaderNav />
      </div>
    </header>
  );
}
