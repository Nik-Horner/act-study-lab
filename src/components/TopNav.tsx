import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MobileMenu } from "@/components/MobileMenu";

export async function TopNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-border bg-bg-soft/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
        <Link
          href={user ? "/dashboard" : "/"}
          className="flex min-h-11 items-center gap-2 font-semibold"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
            36
          </span>
          ACT Study Lab
        </Link>
        {user ? (
          <nav className="flex items-center gap-2 text-sm sm:gap-5">
            <div className="flex items-center gap-5 max-sm:hidden">
              <Link href="/dashboard" className="text-ink-soft hover:text-ink">
                Daily study
              </Link>
              <Link href="/practice" className="text-ink-soft hover:text-ink">
                Extra practice
              </Link>
              <Link href="/account" className="text-ink-soft hover:text-ink">
                Account
              </Link>
            </div>
            <ThemeToggle />
            <div className="max-sm:hidden">
              <LogoutButton />
            </div>
            <MobileMenu />
          </nav>
        ) : (
          <nav className="flex items-center gap-3 text-sm">
            <ThemeToggle />
            <Link href="/login" className="text-ink-soft hover:text-ink">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-brand px-4 py-1.5 font-medium text-white hover:bg-brand-dark"
            >
              Sign up
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
