import type { Metadata } from "next";
import { Mona_Sans, Geist_Mono } from "next/font/google";
import { TopNav } from "@/components/TopNav";
import "katex/dist/katex.min.css";
import "./globals.css";
import "./workspaces.css";
import "./campaign.css";

const geistSans = Mona_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ACT Study Lab",
  description:
    "Digital ACT English, Math, Reading, and Science lessons, drills, timed sections, and account-saved progress.",
};

// Applies a saved theme choice before first paint, so there's no flash of the
// wrong theme. Runs on every page load, before React hydrates.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    document.documentElement.setAttribute("data-theme", stored === "dark" ? "dark" : "light");
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="light"
      // data-theme is set by the inline script below, outside of React's
      // render — suppress the (expected, harmless) attribute mismatch warning.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <TopNav />
        <main id="main-content" className="site-main" tabIndex={-1}>
          {children}
        </main>
        <footer className="site-footer">
          <span>ACT Study Lab</span>
          <span>Lessons · Practice · Review</span>
        </footer>
      </body>
    </html>
  );
}
