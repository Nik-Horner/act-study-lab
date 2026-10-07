"use client";

import { useEffect, useRef } from "react";
import type { Question } from "@/lib/act/types";

export function useQuestionNavigation(question?: Question, enabled = true) {
  const evidenceRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLElement>(null);
  const previousPassage = useRef<string | undefined>(undefined);
  const previousQuestion = useRef<string | undefined>(undefined);
  const questionId = question?.id;
  const passageId = question?.passage?.id;

  useEffect(() => {
    if (!enabled || !questionId) {
      previousPassage.current = undefined;
      previousQuestion.current = undefined;
      return;
    }
    // Mounting a lesson must keep the reader at the lesson introduction;
    // scrolling starts only after the user moves to another question.
    if (!previousQuestion.current) {
      previousQuestion.current = questionId;
      previousPassage.current = passageId;
      return;
    }
    // A new passage starts with its evidence; subsequent questions in that
    // passage return directly to the question, beneath the sticky timer.
    const target =
      passageId && passageId !== previousPassage.current
        ? evidenceRef.current
        : questionRef.current;
    previousPassage.current = passageId;
    previousQuestion.current = questionId;
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [enabled, questionId, passageId]);

  return { evidenceRef, questionRef };
}
