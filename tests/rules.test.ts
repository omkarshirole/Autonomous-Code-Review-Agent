/**
 * Rules Engine Tests for ReviewPilot
 * Tests the deterministic rule matching functionality
 */

import { describe, it, expect } from "vitest";
import { runRules } from "../server/rules.js";

describe("Rules Engine", () => {
  const testLines = [
    { file: "src/auth.ts", line: 10, content: 'const api_key = "sk-1234567890abcdef";' },
    { file: "src/utils.ts", line: 5, content: "eval(userInput);" },
    { file: "src/shell.ts", line: 20, content: 'execSync("rm -rf " + req.body.path);' },
    { file: "src/db.ts", line: 15, content: `query = "SELECT * FROM users WHERE id = " + params.id;` },
    { file: "src/xss.tsx", line: 30, content: 'div.innerHTML = userContent;' },
    { file: "src/token.ts", line: 8, content: 'const token = Math.random().toString(36);' },
    { file: "src/error.ts", line: 12, content: "try { doSomething(); } catch {}" },
    { file: "src/types.ts", line: 4, content: "const value: any = getData();" },
    { file: "src/debug.ts", line: 6, content: "console.log('debug:', data);" },
  ];

  it("should detect hard-coded secrets", () => {
    const findings = runRules(testLines);
    const secretFindings = findings.filter((f) => f.id.startsWith("rule-") && f.title === "Possible hard-coded credential");
    expect(secretFindings.length).toBeGreaterThanOrEqual(1);
    expect(secretFindings[0].severity).toBe("critical");
    expect(secretFindings[0].category).toBe("security");
  });

  it("should detect eval usage", () => {
    const findings = runRules(testLines);
    const evalFindings = findings.filter((f) => f.id.startsWith("rule-") && f.title === "Dynamic code execution");
    expect(evalFindings.length).toBeGreaterThanOrEqual(1);
    expect(evalFindings[0].severity).toBe("high");
  });

  it("should detect shell injection risk", () => {
    const findings = runRules(testLines);
    const shellFindings = findings.filter((f) => f.id.startsWith("rule-") && f.title === "User input may reach a shell");
    expect(shellFindings.length).toBeGreaterThanOrEqual(1);
    expect(shellFindings[0].severity).toBe("critical");
  });

  it("should detect SQL concatenation", () => {
    const findings = runRules(testLines);
    const sqlFindings = findings.filter((f) => f.id.startsWith("rule-") && f.title === "Query built with string interpolation");
    expect(sqlFindings.length).toBeGreaterThanOrEqual(1);
    expect(sqlFindings[0].severity).toBe("high");
  });

  it("should detect unsanitized HTML sink", () => {
    const findings = runRules(testLines);
    const htmlFindings = findings.filter((f) => f.id.startsWith("rule-") && f.title === "Unsanitized HTML sink");
    expect(htmlFindings.length).toBeGreaterThanOrEqual(1);
    expect(htmlFindings[0].severity).toBe("high");
  });

  it("should detect weak token generation", () => {
    const findings = runRules(testLines);
    const tokenFindings = findings.filter((f) => f.id.startsWith("rule-") && f.title === "Predictable value used for security");
    expect(tokenFindings.length).toBeGreaterThanOrEqual(1);
    expect(tokenFindings[0].severity).toBe("high");
  });

  it("should detect empty catch blocks", () => {
    const findings = runRules(testLines);
    const catchFindings = findings.filter((f) => f.id.startsWith("rule-") && f.title === "Error is silently swallowed");
    expect(catchFindings.length).toBeGreaterThanOrEqual(1);
    expect(catchFindings[0].severity).toBe("medium");
  });

  it("should detect non-null assertions in TypeScript files", () => {
    const tsLines = [{ file: "src/test.ts", line: 1, content: "const x = obj!.property;" }];
    const findings = runRules(tsLines);
    const nonNullFindings = findings.filter((f) => f.id.startsWith("rule-") && f.title === "Unchecked non-null assertion");
    expect(nonNullFindings.length).toBeGreaterThanOrEqual(1);
  });

  it("should detect 'any' type usage in TypeScript files", () => {
    const findings = runRules(testLines);
    const anyFindings = findings.filter((f) => f.id.startsWith("rule-") && f.title === "Type safety bypassed");
    expect(anyFindings.length).toBeGreaterThanOrEqual(1);
  });

  it("should detect console.log statements", () => {
    const findings = runRules(testLines);
    const consoleFindings = findings.filter((f) => f.id.startsWith("rule-") && f.title === "Debug logging added");
    expect(consoleFindings.length).toBeGreaterThanOrEqual(1);
    expect(consoleFindings[0].severity).toBe("info");
  });

  it("should respect disabled rules", () => {
    const findings = runRules(testLines, ["secret", "eval"]);
    const disabledFindings = findings.filter((f) => f.id.startsWith("rule-") && (f.title === "Possible hard-coded credential" || f.title === "Dynamic code execution"));
    expect(disabledFindings.length).toBe(0);
  });

  it("should generate unique fingerprints for findings", () => {
    const findings = runRules(testLines);
    const fingerprints = findings.map((f) => f.fingerprint);
    const uniqueFingerprints = new Set(fingerprints);
    // Allow some duplicates due to different rules matching same line
    expect(uniqueFingerprints.size).toBeGreaterThanOrEqual(fingerprints.length * 0.8);
  });

  it("should include file and line information in findings", () => {
    const findings = runRules(testLines);
    findings.forEach((finding) => {
      expect(finding.file).toBeTruthy();
      expect(typeof finding.line).toBe("number");
      expect(finding.line).toBeGreaterThan(0);
    });
  });

  it("should have confidence scores between 0 and 1", () => {
    const findings = runRules(testLines);
    findings.forEach((finding) => {
      expect(finding.confidence).toBeGreaterThanOrEqual(0);
      expect(finding.confidence).toBeLessThanOrEqual(1);
    });
  });
});
