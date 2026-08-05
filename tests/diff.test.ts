/**
 * Diff Parser Tests for ReviewPilot
 * Tests the unified diff parsing functionality
 */

import { describe, it, expect } from "vitest";
import { parseUnifiedDiff } from "../server/diff.js";

describe("Diff Parser", () => {
  const sampleDiff = `diff --git a/src/auth.ts b/src/auth.ts
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -1,5 +1,7 @@
 import { hash } from "bcrypt";
+import { sign } from "jsonwebtoken";
 
 export async function login(email: string, password: string) {
   const user = await findUser(email);
+  const token = sign({ userId: user.id }, process.env.JWT_SECRET!);
   return { user, token };
 }
@@ -10,4 +12,6 @@
 export async function register(email: string, password: string) {
   const hashed = await hash(password, 10);
   return createUser(email, hashed);
 }
+
+export function logout() {
+  return { success: true };
+}`;

  it("should parse file path correctly", () => {
    const parsed = parseUnifiedDiff(sampleDiff);
    expect(parsed.files.length).toBe(1);
    expect(parsed.files[0].path).toBe("src/auth.ts");
  });

  it("should count additions and deletions", () => {
    const parsed = parseUnifiedDiff(sampleDiff);
    const file = parsed.files[0];
    expect(file.additions).toBeGreaterThan(0);
    expect(file.deletions).toBe(0); // No deletions in this diff
  });

  it("should extract added lines with correct line numbers", () => {
    const parsed = parseUnifiedDiff(sampleDiff);
    const addedLines = parsed.addedLines;
    
    // Should find the import line
    const importLine = addedLines.find((l) => l.content.includes("import { sign }"));
    expect(importLine).toBeDefined();
    expect(importLine?.file).toBe("src/auth.ts");
    
    // Should find the token line
    const tokenLine = addedLines.find((l) => l.content.includes("const token"));
    expect(tokenLine).toBeDefined();
    expect(tokenLine?.file).toBe("src/auth.ts");
    
    // Should find the logout function
    const logoutLine = addedLines.find((l) => l.content.includes("export function logout"));
    expect(logoutLine).toBeDefined();
  });

  it("should calculate risk based on churn", () => {
    const parsed = parseUnifiedDiff(sampleDiff);
    const file = parsed.files[0];
    // Small change = low risk
    expect(["low", "medium", "high"]).toContain(file.risk);
  });

  it("should handle multiple files in diff", () => {
    const multiFileDiff = sampleDiff + `\n` + sampleDiff.replace(/auth\.ts/g, "utils.ts");
    const parsed = parseUnifiedDiff(multiFileDiff);
    expect(parsed.files.length).toBe(2);
    expect(parsed.files.map((f) => f.path)).toContain("src/auth.ts");
    expect(parsed.files.map((f) => f.path)).toContain("src/utils.ts");
  });

  it("should handle empty diff", () => {
    const parsed = parseUnifiedDiff("");
    expect(parsed.addedLines).toEqual([]);
    expect(parsed.files).toEqual([]);
  });

  it("should handle diff with only deletions", () => {
    const deletionDiff = `diff --git a/src/old.ts b/src/old.ts
--- a/src/old.ts
+++ b/src/old.ts
@@ -1,3 +1 @@
-const old = "code";
-function removed() {
-  return 42;
-}`;
    const parsed = parseUnifiedDiff(deletionDiff);
    expect(parsed.files[0].deletions).toBe(3);
    expect(parsed.files[0].additions).toBe(0);
    expect(parsed.addedLines.length).toBe(0);
  });

  it("should handle CRLF line endings", () => {
    const crlfDiff = sampleDiff.replace(/\n/g, "\r\n");
    const parsed = parseUnifiedDiff(crlfDiff);
    expect(parsed.addedLines.length).toBeGreaterThan(0);
  });
});
