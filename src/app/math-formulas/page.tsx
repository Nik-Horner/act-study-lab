import Link from "next/link";
import { FormulaCards } from "@/components/FormulaCards";

export default function MathFormulasPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Math Formulas
        </h1>
        <p className="text-ink-soft">
          Say or write the formula from memory. Then reveal it.
        </p>
      </header>
      <FormulaCards />
      <footer className="flex flex-wrap justify-between gap-x-6 gap-y-3 border-t border-border pt-5 text-sm">
        <Link href="/learn/math-formulas" className="text-brand underline">
          Full formula reference
        </Link>
        <a
          href="https://blog.prepscholar.com/the-31-critical-act-math-formulas-you-must-know"
          target="_blank"
          rel="noreferrer"
          className="text-ink-soft underline"
        >
          PrepScholar formula guide
        </a>
      </footer>
    </div>
  );
}
