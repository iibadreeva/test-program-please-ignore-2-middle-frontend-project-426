import { HeaderNav } from "@/components/header-nav";
import { LogoLink } from "@/components/nav-link";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <LogoLink className="font-display text-xl font-semibold tracking-tight" />
        <HeaderNav />
      </div>
    </header>
  );
}
