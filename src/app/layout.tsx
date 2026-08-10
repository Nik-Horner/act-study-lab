import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TopNav } from "@/components/TopNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ACT English Lab",
  description: "Master every ACT English topic, drill to mastery, and take a full timed exam.",
};

// Applies a saved theme choice before first paint, so there's no flash of the
// wrong theme. Runs on every page load, before React hydrates.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // data-theme is set by the inline script below, outside of React's
      // render — suppress the (expected, harmless) attribute mismatch warning.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <TopNav />
        <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">{children}</main>
        <footer className="border-t border-border py-6 text-center text-xs text-ink-faint">
          Built by{" "}
          <a
            href="https://github.com/Nik-Horner"
            target="_blank"
            rel="noreferrer"
            className="hover:text-ink-soft"
          >
            Nik Horner
          </a>
        </footer>
      </body>
    </html>
  );
}
