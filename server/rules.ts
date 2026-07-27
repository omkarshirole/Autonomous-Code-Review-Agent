import { createHash } from "node:crypto";
import type { Finding, ReviewCategory, Severity } from "../shared/types.js";
import type { AddedLine } from "./diff.js";

interface Rule {
  id: string;
  pattern: RegExp;
  severity: Severity;
  category: ReviewCategory;
  title: string;
  message: string;
  suggestion?: string;
  confidence: number;
  files?: RegExp;
}

const RULES: Rule[] = [
  {
    id: "secret",
    pattern: /(api[_-]?key|secret|password|token)\s*[:=]\s*["'][A-Za-z0-9_\-/+.]{12,}["']/i,
    severity: "critical",
    category: "security",
    title: "Possible hard-coded credential",
    message: "This added line appears to contain a credential. Committed secrets remain recoverable from repository history.",
    suggestion: "Load the value from a secret manager or an environment variable, then rotate the exposed credential.",
    confidence: 0.96,
  },
  {
    id: "eval",
    pattern: /\b(eval|new\s+Function)\s*\(/,
    severity: "high",
    category: "security",
    title: "Dynamic code execution",
    message: "Executing dynamically constructed code can turn untrusted input into arbitrary code execution.",
    suggestion: "Replace dynamic evaluation with an explicit parser or a constrained dispatch table.",
    confidence: 0.94,
  },
  {
    id: "shell",
    pattern: /\b(exec|execSync|spawn)\s*\([^)]*(req\.|input|params|query|body)/i,
    severity: "critical",
    category: "security",
    title: "User input may reach a shell",
    message: "Untrusted input appears to flow into a process execution API, creating a command-injection risk.",
    suggestion: "Use an argument array, avoid a shell, and validate values against a strict allowlist.",
    confidence: 0.91,
  },
  {
    id: "sql-concat",
    pattern: /(SELECT|INSERT|UPDATE|DELETE).*(\$\{|["']\s*\+)|(\+\s*.*(query|params|body))/i,
    severity: "high",
    category: "security",
    title: "Query built with string interpolation",
    message: "Interpolating values into a database query can allow SQL injection.",
    suggestion: "Use parameterized queries or your database library's query builder.",
    confidence: 0.89,
  },
  {
    id: "inner-html",
    pattern: /(dangerouslySetInnerHTML|\.innerHTML\s*=)/,
    severity: "high",
    category: "security",
    title: "Unsanitized HTML sink",
    message: "Rendering raw HTML can introduce cross-site scripting when any portion is user controlled.",
    suggestion: "Render structured elements or sanitize with a well-maintained allowlist-based sanitizer.",
    confidence: 0.86,
  },
  {
    id: "weak-token",
    pattern: /Math\.random\(\).*(token|secret|session|password)|(?:token|secret|session).*=.*Math\.random\(\)/i,
    severity: "high",
    category: "security",
    title: "Predictable value used for security",
    message: "Math.random is not cryptographically secure and can produce guessable tokens.",
    suggestion: "Use crypto.randomUUID() or crypto.randomBytes() as appropriate.",
    confidence: 0.93,
  },
  {
    id: "empty-catch",
    pattern: /catch\s*(?:\([^)]*\))?\s*\{\s*\}/,
    severity: "medium",
    category: "reliability",
    title: "Error is silently swallowed",
    message: "An empty catch block hides failures and makes production incidents difficult to diagnose.",
    suggestion: "Handle the expected error explicitly or log and rethrow unexpected failures.",
    confidence: 0.91,
  },
  {
    id: "non-null",
    pattern: /\w+!\.(?:\w+)|\w+!\[/,
    severity: "low",
    category: "reliability",
    title: "Unchecked non-null assertion",
    message: "A non-null assertion suppresses the type checker and may become a runtime exception.",
    suggestion: "Guard the value or model the nullable state explicitly.",
    confidence: 0.72,
    files: /\.(ts|tsx)$/,
  },
  {
    id: "any",
    pattern: /:\s*any\b|as\s+any\b/,
    severity: "low",
    category: "maintainability",
    title: "Type safety bypassed",
    message: "Using any removes useful compiler guarantees across this boundary.",
    suggestion: "Use unknown and narrow it, or define the expected interface.",
    confidence: 0.8,
    files: /\.(ts|tsx)$/,
  },
  {
    id: "console",
    pattern: /\bconsole\.(log|debug)\s*\(/,
    severity: "info",
    category: "style",
    title: "Debug logging added",
    message: "Ad-hoc console output can leak data or add noise in production.",
    suggestion: "Remove it or use the application's structured logger at an appropriate level.",
    confidence: 0.77,
  },
];

const fingerprint = (rule: string, file: string, line: number) =>
  createHash("sha1").update(`${rule}:${file}:${line}`).digest("hex").slice(0, 12);

export function runRules(lines: AddedLine[], disabledRules: string[] = []): Finding[] {
  const findings: Finding[] = [];
  const disabled = new Set(disabledRules);
  for (const line of lines) {
    for (const rule of RULES) {
      if (disabled.has(rule.id)) continue;
      rule.pattern.lastIndex = 0;
      if (rule.files && !rule.files.test(line.file)) continue;
      if (!rule.pattern.test(line.content)) continue;
      const fp = fingerprint(rule.id, line.file, line.line);
      findings.push({
        id: `rule-${fp}`,
        source: "rule",
        severity: rule.severity,
        category: rule.category,
        file: line.file,
        line: line.line,
        title: rule.title,
        message: rule.message,
        suggestion: rule.suggestion,
        confidence: rule.confidence,
        fingerprint: fp,
      });
    }
  }
  return findings;
}
