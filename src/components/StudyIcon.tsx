import type { SVGProps } from "react";

export type StudyIconName =
  | "home"
  | "book"
  | "practice"
  | "progress"
  | "settings"
  | "english"
  | "math"
  | "reading"
  | "science"
  | "check"
  | "arrow"
  | "calendar"
  | "clock"
  | "star"
  | "formula";

const paths: Record<StudyIconName, string> = {
  home: "m3 10 9-7 9 7v11h-6v-7H9v7H3z",
  book: "M12 5C8 2 4 3 2 4v16c3-2 7-2 10 0 3-2 7-2 10 0V4c-2-1-6-2-10 1Zm0 0v15",
  reading:
    "M12 5C8 2 4 3 2 4v16c3-2 7-2 10 0 3-2 7-2 10 0V4c-2-1-6-2-10 1Zm0 0v15",
  english: "M5 3h14v18H5zM8 7h8M8 11h8M8 15h5",
  practice: "M5 3h14v18H5zM8 7h8M8 11h8M8 15h4",
  progress: "M4 20v-6h3v6Zm7 0V9h3v11Zm7 0V3h3v17Z",
  settings:
    "m10 3-.8 3-2.7 1-2.8-.8-1.5 2.6 2 2.2v3l-2 2.2 1.5 2.6 2.8-.8 2.7 1 .8 3h3l.8-3 2.7-1 2.8.8 1.5-2.6-2-2.2v-3l2-2.2-1.5-2.6-2.8.8-2.7-1L13 3Zm5.5 9a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  math: "M5 2h14v20H5zM8 5h8v4H8zM8 13h2M9 12v2M14 13h2M8 18h2M14 17l2 2m0-2-2 2",
  science: "M9 2h6M10 2v8L4 20v2h16v-2l-6-10V2M7 16h10",
  check: "m5 12 4 4L19 6",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  calendar: "M4 5h16v16H4zM8 2v6m8-6v6M4 10h16M8 14h2m4 0h2M8 17h2",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v6l4 2",
  star: "m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z",
  formula: "M5 19 9 5h9M4 10h11m-2 4 6 6m0-6-6 6",
};

export function StudyIcon({
  name,
  size = 24,
  ...props
}: SVGProps<SVGSVGElement> & { name: StudyIconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
