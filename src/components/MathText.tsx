import { memo } from "react";
import { renderMathText } from "@/lib/math-text";

export const MathText = memo(function MathText({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <span
      className={className ? `math-text ${className}` : "math-text"}
      dangerouslySetInnerHTML={{ __html: renderMathText(children) }}
    />
  );
});
