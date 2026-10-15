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
    case "activity-trapezoid":
      description =
        "Trapezoid with parallel bases 6 and 18, perpendicular height 4, and a slanted side 7.";
      content = (
        <>
          <path d="M105 90H177L249 138H33Z" />
          <path d="M105 90V138" strokeDasharray="5 4" />
          <path d="M105 128h10v10" />
          {label(141, 77, "6")}
          {label(141, 164, "18")}
          {label(121, 120, "4")}
          {label(60, 106, "7")}
        </>
      );
      break;
    case "activity-similar-solids":
      description =
        "Two similar cubes. The larger has 1.5 times each corresponding length. The smaller volume is 16; find the larger volume.";
      content = (
        <>
          <path d="M35 125h60v60H35ZM35 125l20-20h60v60l-20 20M95 125l20-20" />
          <path d="M155 100h90v90H155ZM155 100l30-30h90v90l-30 30M245 100l30-30" />
          {label(74, 212, "Volume 16")}
          {label(210, 225, "Length ×1.5")}
        </>
      );
      break;
    case "activity-inscribed-angle":
      description =
        "Circle with an inscribed angle at the left intercepting a 96-degree arc on the right. Find the inscribed angle.";
      content = (
        <>
          <circle cx="150" cy="125" r="80" />
          <path d="M203.53 65.55L70 125L203.53 184.45" />
          <path
            d="M203.53 65.55A80 80 0 0 1 203.53 184.45"
            stroke="var(--color-brand)"
            strokeWidth="4"
          />
          {label(253, 130, "96°")}
          {label(99, 130, "?")}
        </>
      );
      break;
    case "activity-cylinder":
      description =
        "Closed right circular cylinder with radius 4 and height 7.";
      content = (
        <>
          <ellipse cx="150" cy="70" rx="48" ry="17" />
          <path d="M102 70V190M198 70V190" />
          <ellipse cx="150" cy="190" rx="48" ry="17" />
          <path d="M150 70h48" />
          {label(174, 60, "4")}
          {label(218, 136, "7")}
        </>
      );
      break;
    case "activity-tangent":
      description =
        "A circle radius 12 is perpendicular to a tangent of length 9 from point P. Find the distance from P to the center.";
      content = (
        <>
          <circle cx="110" cy="90" r="60" />
          <path d="M110 90V150H155Z" />
          <path d="M110 141h9v9" />
          {label(95, 123, "12")}
          {label(134, 174, "9")}
          {label(169, 155, "P")}
          {label(145, 111, "?")}
          {label(97, 85, "O")}
        </>
      );
      break;
    case "activity-right-triangle":
      description =
        "Right triangle with acute angle theta, opposite side 8, hypotenuse 17, and an unlabeled adjacent side.";
      content = (
        <>
          <path d="M50 175H230V79Z" />
          <path d="M220 175v-10h10" />
          <path d="M77 175A27 27 0 0 0 74 162" />
          {label(90, 165, "θ")}
          {label(139, 110, "17")}
          {label(247, 131, "8")}
        </>
      );
      break;
    case "unit-circle":
      description =
        "Unit circle with axes and a radius at 150 degrees in Quadrant II. The angle's sine is its vertical coordinate.";
      content = (
        <>
          <path d="M40 125H260M150 25V225" strokeWidth="1" />
          <circle cx="150" cy="125" r="80" />
          <path d="M150 125L80.72 85" stroke="var(--color-brand)" />
          <path d="M80.72 85V125" strokeDasharray="4 4" />
          <circle cx="80.72" cy="85" r="3" fill="currentColor" />
          {label(127, 101, "150°")}
          {label(242, 145, "1")}
          {label(169, 48, "1")}
        </>
      );
      break;
    case "inscribed-angle":
      description =
        "Circle with an inscribed angle at the left intercepting an 80-degree arc on the right. Find the inscribed angle.";
      content = (
        <>
          <circle cx="150" cy="125" r="80" />
          <path d="M211 74L70 125L211 176" />
          <path
            d="M211 74A80 80 0 0 1 211 176"
            stroke="var(--color-brand)"
            strokeWidth="4"
          />
          {label(253, 130, "80°")}
          {label(99, 130, "?")}
        </>
      );
      break;
    case "similar-solids":
      description =
        "Two similar cubes. The larger cube has three times the side length; find how volume scales.";
      content = (
        <>
          <path d="M20 132h36v36H20ZM20 132l12-12h36v36l-12 12M56 132l12-12" />
          <path d="M115 90h108v108H115ZM115 90l36-36h108v108l-36 36M223 90l36-36" />
          {label(44, 194, "Volume 10")}
          {label(177, 224, "Length ×3 · volume ?")}
        </>
      );
      break;
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
          {label(108, 123, "5")}
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
