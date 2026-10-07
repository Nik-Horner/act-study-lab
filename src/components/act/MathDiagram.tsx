import type { ReactNode } from "react";
export function MathDiagram({ id }: { id: string }) {
  let content: ReactNode, description: string;
  const label = (x: number, y: number, text: string) => (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fill="currentColor"
      stroke="none"
      fontSize="15"
    >
      {text}
    </text>
  );
  switch (id) {
    case "math-geometry-d1":
      description =
        "Trapezoid with parallel bases 8 and 14 and perpendicular height 5.";
      content = (
        <>
          <path d="M90 90H186L222 150H54Z" />
          <path d="M90 90V150" strokeDasharray="5 4" />
          <path d="M90 140h10v10" />
          {label(138, 77, "8")}
          {label(138, 176, "14")}
          {label(78, 123, "5")}
        </>
      );
      break;
    case "math-geometry-d2":
      description =
        "Closed right circular cylinder with radius 3 and height 8.";
      content = (
        <>
          <ellipse cx="150" cy="70" rx="45" ry="17" />
          <path d="M105 70V190M195 70V190" />
          <ellipse cx="150" cy="190" rx="45" ry="17" />
          <path d="M150 70h45" />
          {label(172, 60, "3")}
          {label(215, 136, "8")}
        </>
      );
      break;
    case "math-geometry-d3":
      description = "Triangle with side lengths 13, 14, and 15.";
      content = (
        <>
          <path d="M70 200L220 200L136 88Z" />
          {label(89, 140, "13")}
          {label(194, 138, "14")}
          {label(145, 224, "15")}
        </>
      );
      break;
    case "math-exam-1-q05":
      description =
        "Rectangle with one side 5, unknown other side, and diagonal 13.";
      content = (
        <>
          <path d="M55 75H235V150H55Z" />
          <path d="M55 150L235 75" />
          {label(145, 172, "?")}
          {label(35, 117, "5")}
          {label(150, 105, "13")}
        </>
      );
      break;
    case "math-exam-1-q21":
      description =
        "Circle with radius 5 perpendicular to a tangent of length 12 from point P. The distance from P to the center is unknown.";
      content = (
        <>
          <circle cx="108" cy="95" r="50" />
          <path d="M108 95V145H228Z" />
          <path d="M108 136h9v9" />
          {label(96, 125, "5")}
          {label(169, 169, "12")}
          {label(238, 150, "P")}
          {label(166, 104, "?")}
          {label(96, 91, "O")}
        </>
      );
      break;
    case "math-exam-1-q28":
      description =
        "Coordinate triangle with vertices (1,1), (7,1), and (4,5).";
      content = (
        <>
          <path d="M60 210V55M45 195H245" strokeWidth="1" />
          <path d="M90 165H210L150 85Z" />
          {label(89, 187, "(1,1)")}
          {label(221, 187, "(7,1)")}
          {label(150, 71, "(4,5)")}
        </>
      );
      break;
    case "math-exam-1-q41":
      description = "Regular hexagon, every side length 4.";
      content = (
        <>
          <path d="M110 60H180L215 121L180 182H110L75 121Z" />
          {label(145, 48, "4")}
        </>
      );
      break;
    case "math-exam-1-q15":
      description =
        "Right triangle with a 30-degree acute angle, hypotenuse 10, and unknown opposite side.";
      content = (
        <>
          <path d="M60 175H233V75Z" />
          <path d="M223 175v-10h10" />
          <path d="M85 175A25 25 0 0 0 82 162" />
          {label(107, 166, "30°")}
          {label(142, 108, "10")}
          {label(248, 127, "?")}
        </>
      );
      break;
    default:
      return null;
  }
  return (
    <figure className="mb-5 max-w-sm">
      <svg
        role="img"
        aria-label={description}
        viewBox="0 0 300 245"
        className="w-full"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        {content}
      </svg>
      <figcaption className="text-xs text-ink-soft">
        Schematic. Use the stated measurements.
      </figcaption>
    </figure>
  );
}
