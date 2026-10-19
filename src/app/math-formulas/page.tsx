"use client";

import { useState } from "react";
import { StudyPageHeader } from "@/components/StudyPageHeader";
import Link from "next/link";
import { FormulaCards } from "@/components/FormulaCards";
import cards from "@/content/math-formula-cards.json";

export default function MathFormulasPage() {
  const [category, setCategory] = useState("All formulas");
  const selected = cards.filter(
    (card) => category === "All formulas" || card.category === category,
  );
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <StudyPageHeader
        title="Formula recall"
        subject="math"
        description={`${cards.length} cards. Recall a formula before revealing it, then review its conditions and a worked example.`}
        back={{ href: "/study/math", label: "Math study" }}
      />
      <label className="flex flex-wrap items-center gap-3 text-sm font-medium">
        Practice topic
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="min-h-11 max-w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-ink"
        >
          {["All formulas", ...new Set(cards.map((card) => card.category))].map(
            (name) => (
              <option key={name}>{name}</option>
            ),
          )}
        </select>
      </label>
      <FormulaCards key={category} ids={selected.map((card) => card.id)} />
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
        <a
          href="https://openstax.org/books/algebra-and-trigonometry-2e/pages/9-3-double-angle-half-angle-and-reduction-formulas"
          target="_blank"
          rel="noreferrer"
          className="text-ink-soft underline"
        >
          Trig identities
        </a>
        <a
          href="https://openstax.org/books/prealgebra-2e/pages/c-geometric-formulas"
          target="_blank"
          rel="noreferrer"
          className="text-ink-soft underline"
        >
          Geometry formulas
        </a>
      </footer>
    </div>
  );
}
