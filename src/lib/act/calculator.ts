/** Small expression parser for the practice calculator; never executes code. */
export function calculate(input: string, degrees = true): number {
  const source = input.replace(/\s+/g, "");
  const tokens =
    source.match(
      /(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[a-z]+|[+\-*/^()%]/gi,
    ) ?? [];
  if (!tokens.length || tokens.join("").toLowerCase() !== source.toLowerCase())
    throw new Error(
      "Use numbers, operators, parentheses, or the listed functions.",
    );
  let pos = 0;
  function atom(): number {
    const t = tokens[pos++];
    if (t === "+" || t === "-") {
      const n = expr(3);
      return t === "-" ? -n : n;
    }
    if (t === "(") {
      const n = expr(0);
      if (tokens[pos++] !== ")") throw new Error("Close the parentheses.");
      return n;
    }
    if (t && /^\d|^\.\d/.test(t)) return Number(t);
    if (t?.toLowerCase() === "pi") return Math.PI;
    if (t?.toLowerCase() === "e") return Math.E;
    const funcs: Record<string, (x: number) => number> = {
      sqrt: Math.sqrt,
      abs: Math.abs,
      log: Math.log10,
      ln: Math.log,
      sin: (x) => Math.sin(degrees ? (x * Math.PI) / 180 : x),
      cos: (x) => Math.cos(degrees ? (x * Math.PI) / 180 : x),
      tan: (x) => {
        const angle = degrees ? (x * Math.PI) / 180 : x;
        if (Math.abs(Math.cos(angle)) < 1e-12)
          throw new Error("Tangent is undefined at this angle.");
        return Math.tan(angle);
      },
    };
    const fn = t ? funcs[t.toLowerCase()] : undefined;
    if (!fn || tokens[pos++] !== "(")
      throw new Error("Check the expression. Functions need parentheses.");
    const n = expr(0);
    if (tokens[pos++] !== ")") throw new Error("Close the parentheses.");
    return fn(n);
  }
  function expr(min: number): number {
    let left = atom();
    while (pos < tokens.length) {
      const op = tokens[pos];
      if (op === "%") {
        pos++;
        left /= 100;
        continue;
      }
      const p: Record<string, number> = {
          "+": 1,
          "-": 1,
          "*": 2,
          "/": 2,
          "^": 3,
        },
        prec = p[op];
      if (!prec || prec < min) break;
      pos++;
      const right = expr(op === "^" ? prec : prec + 1);
      left =
        op === "+"
          ? left + right
          : op === "-"
            ? left - right
            : op === "*"
              ? left * right
              : op === "/"
                ? left / right
                : left ** right;
    }
    return left;
  }
  const result = expr(0);
  if (pos !== tokens.length) throw new Error("Use × as * between factors.");
  if (!Number.isFinite(result))
    throw new Error("The result is undefined or too large.");
  return result;
}
