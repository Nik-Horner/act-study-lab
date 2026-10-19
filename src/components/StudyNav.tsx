"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { StudyIcon, type StudyIconName } from "./StudyIcon";
import { ThemeToggle } from "./ThemeToggle";
import { LogoutButton } from "./LogoutButton";

const destinations: {
  href: string;
  label: string;
  icon: StudyIconName;
  match: string[];
}[] = [
  {
    href: "/dashboard",
    label: "Today",
    icon: "home",
    match: ["/dashboard", "/daily"],
  },
  { href: "/learn", label: "Course", icon: "book", match: ["/learn"] },
  {
    href: "/play",
    label: "Play",
    icon: "practice",
    match: ["/play", "/practice", "/study", "/drill", "/exam"],
  },
  {
    href: "/progress",
    label: "Progress",
    icon: "progress",
    match: ["/progress"],
  },
];

export function Brand() {
  return (
    <>
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span>ACT Study Lab</span>
    </>
  );
}

export function StudyNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  if (!signedIn)
    return (
      <header className="public-header">
        <Link href="/" className="study-brand">
          <Brand />
        </Link>
        <nav aria-label="Account">
          <ThemeToggle />
          <Link href="/login">Log in</Link>
          <Link href="/signup" className="study-signup">
            Get started
          </Link>
        </nav>
      </header>
    );
  return (
    <>
      <header className="mobile-study-header">
        <Link href="/dashboard" className="study-brand">
          <Brand />
        </Link>
        <div>
          <ThemeToggle />
          <Link href="/account" aria-label="Account settings">
            <StudyIcon name="settings" />
          </Link>
        </div>
      </header>
      <aside className="study-sidebar">
        <Link href="/dashboard" className="study-brand">
          <Brand />
        </Link>
        <nav aria-label="Main navigation" className="study-navigation">
          {destinations.map(({ href, label, icon, match }) => (
            <Link
              key={href}
              href={href}
              aria-current={
                match.some(
                  (route) =>
                    pathname === route || pathname.startsWith(`${route}/`),
                )
                  ? "page"
                  : undefined
              }
            >
              <StudyIcon name={icon} />
              <span>{label}</span>
            </Link>
          ))}
          <Link
            href="/math-formulas"
            className="formula-nav"
            aria-current={pathname === "/math-formulas" ? "page" : undefined}
          >
            <StudyIcon name="formula" />
            <span>Formulas</span>
          </Link>
        </nav>
        <div className="study-sidebar-bottom">
          <Link
            href="/account"
            aria-current={pathname === "/account" ? "page" : undefined}
          >
            <StudyIcon name="settings" />
            Settings
          </Link>
          <div className="study-account-actions">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </aside>
      <nav className="mobile-study-tabs" aria-label="Main navigation">
        {destinations.map(({ href, label, icon, match }) => (
          <Link
            key={href}
            href={href}
            aria-current={
              match.some(
                (route) =>
                  pathname === route || pathname.startsWith(`${route}/`),
              )
                ? "page"
                : undefined
            }
          >
            <StudyIcon name={icon} size={22} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
