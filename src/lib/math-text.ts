import katex from "katex";
import { renderStem } from "./format";

/** Only explicitly authored TeX is math; prices and ordinary prose stay text. */
export function renderMathText(text: string) {
  let html = "";
  let end = 0;
  for (const match of text.matchAll(/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g)) {
    html += renderStem(text.slice(end, match.index));
    html += katex.renderToString(match[1] ?? match[2], {
      displayMode: match[2] !== undefined,
      throwOnError: false,
      trust: false,
      maxSize: 10,
      maxExpand: 1000,
      output: "htmlAndMathml",
    });
    end = match.index + match[0].length;
  }
  return html + renderStem(text.slice(end));
}
