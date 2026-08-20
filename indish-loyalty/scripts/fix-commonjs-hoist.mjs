// Post-build patch for a Rolldown/Nitro bundling bug (Linux-specific,
// reproducible on this project's beta toolchain as of Aug 2026): esbuild-style
// CJS-interop helpers (__commonJSMin, __toESM, __toCommonJS, __esmMin,
// __copyProps, __getProtoOf, __require, etc.) get emitted as top-level
//   var __helperName = (params) => EXPR;      (function form)
//   var __helperName = some.static.member;    (plain value-alias form)
// neither of which is hoisted WITH ITS VALUE in ESM — only the `var`
// binding itself is. In a circular import between chunks, a consumer
// chunk's top-level code can run and use one of these helpers before its
// assignment line has executed, seeing `undefined` and crashing with
// "TypeError: X is not a function".
//
// Fix: a `function` declaration IS fully hoisted with its implementation
// available immediately, regardless of import-cycle ordering. So:
//  - function-form helpers get rewritten to real `function` declarations
//    (block bodies copied as-is; expression bodies get a `return` wrapper).
//  - plain value-alias helpers get wrapped as
//    `function NAME() { return (original expr).apply(this, arguments); }`
//    — forwarding both `this` and `arguments` keeps it correct whether the
//    call site uses `NAME(x)` or `NAME.call(obj, x)` / `NAME.apply(...)`.
// Both patterns are found generically (scanning for the double-underscore
// bundler-helper naming convention) rather than hardcoding specific names,
// since which ones actually get hit depends on the chunk graph shape.
//
// Run automatically after every build (see package.json's "postbuild").
// Safe to delete once upstream fixes the underlying Rolldown bug.
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const OUTPUT_DIR = ".output/server";
// `var __name = (` at the start of a line — only top-level declarations,
// and only the double-underscore-prefixed bundler-interop-helper naming
// convention (esbuild/Rolldown's __commonJSMin, __toESM, __toCommonJS,
// __esmMin, __exportAll, etc.) — real application/library code doesn't use
// this prefix, so this stays narrowly scoped to the actual bug rather than
// rewriting arbitrary arrow functions (which would risk changing `this`
// binding behavior for anything actually depending on arrow semantics).
const DECL_START = /^var (__\w+) = \(/gm;

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (entry.endsWith(".mjs")) files.push(full);
  }
  return files;
}

/** Scans forward from `start` (the arrow function's `(` params-open),
 *  tracking bracket depth across (), [], {} to find the statement's end.
 *  Handles both expression bodies (`(p) => expr;`) and block bodies
 *  (`(p) => { ...statements... };`) — block bodies convert directly with
 *  no `return` wrapping needed, since the block already has its own. */
function parseArrowStatement(content, parenOpen) {
  let depth = 0;
  let i = parenOpen;
  let paramsEnd = -1;
  for (; i < content.length; i++) {
    const ch = content[i];
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
      if (depth === 0 && ch === ")") {
        paramsEnd = i;
        break;
      }
    }
  }
  if (paramsEnd === -1) return null;

  let j = paramsEnd + 1;
  while (/\s/.test(content[j])) j++;
  if (content.slice(j, j + 2) !== "=>") return null;
  j += 2;
  while (/\s/.test(content[j])) j++;

  const params = content.slice(parenOpen + 1, paramsEnd);

  if (content[j] === "{") {
    // Block body — scan matching braces, take the block as-is (no `return`
    // wrapping — `function NAME(p) { ...same statements... }`).
    const blockStart = j;
    depth = 0;
    for (; j < content.length; j++) {
      const ch = content[j];
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          j++;
          break;
        }
      }
    }
    let k = j;
    while (/\s/.test(content[k])) k++;
    if (content[k] !== ";") return null;
    return {
      params,
      block: content.slice(blockStart, j),
      statementEnd: k + 1,
    };
  }

  const bodyStart = j;
  depth = 0;
  for (; j < content.length; j++) {
    const ch = content[j];
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth--;
    else if (ch === ";" && depth === 0) break;
  }
  if (content[j] !== ";") return null;

  return {
    params,
    body: content.slice(bodyStart, j),
    statementEnd: j + 1, // include the semicolon
  };
}

// Second pattern: `var __name = some.static.member;` (no arrow, no call) —
// e.g. `var __getProtoOf = Object.getPrototypeOf;`. These are plain value
// aliases, not functions, so they can't be hoisted by conversion to a
// `function` declaration the same way — but wrapping in a `this`/`arguments`
// -forwarding function achieves the same effect (immediately available,
// hoisted) while staying correct for both `__name(x)` and `__name.call(x, y)`
// call styles, since `.apply(this, arguments)` faithfully forwards either.
const SIMPLE_ALIAS = /^var (__\w+) = (?!\()([^\n]+?);$/gm;

function patchFile(content) {
  let result = "";
  let cursor = 0;
  let count = 0;

  DECL_START.lastIndex = 0;
  let match;
  while ((match = DECL_START.exec(content))) {
    const name = match[1];
    const parenOpen = match.index + match[0].length - 1;
    const parsed = parseArrowStatement(content, parenOpen);
    if (!parsed) continue; // not a simple expression-bodied arrow — leave as-is

    result += content.slice(cursor, match.index);
    result +=
      "block" in parsed
        ? `function ${name}(${parsed.params}) ${parsed.block}`
        : `function ${name}(${parsed.params}) { return ${parsed.body}; }`;
    cursor = parsed.statementEnd;
    count++;
    DECL_START.lastIndex = cursor;
  }
  result += content.slice(cursor);

  const afterPassOne = result;
  result = "";
  cursor = 0;
  SIMPLE_ALIAS.lastIndex = 0;
  while ((match = SIMPLE_ALIAS.exec(afterPassOne))) {
    const [, name, expr] = match;
    result += afterPassOne.slice(cursor, match.index);
    result += `function ${name}() { return (${expr}).apply(this, arguments); }`;
    cursor = match.index + match[0].length;
    count++;
    SIMPLE_ALIAS.lastIndex = cursor;
  }
  result += afterPassOne.slice(cursor);

  return { result, count };
}

let totalPatched = 0;
let filesTouched = 0;
try {
  for (const file of walk(OUTPUT_DIR)) {
    const content = readFileSync(file, "utf8");
    const { result, count } = patchFile(content);
    if (count === 0) continue;
    writeFileSync(file, result);
    filesTouched++;
    totalPatched += count;
    console.log(`[fix-commonjs-hoist] Patched ${count} helper(s) in ${file}`);
  }
  console.log(`[fix-commonjs-hoist] Done — ${totalPatched} helper(s) across ${filesTouched} file(s).`);
} catch (err) {
  // Non-fatal: if the output dir doesn't exist (e.g. preset changed) or
  // nothing matches (upstream fixed it), don't break the build.
  console.warn("[fix-commonjs-hoist] Skipped:", err.message);
}
