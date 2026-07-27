import { describe, expect, it } from "vitest";
import { parseUnifiedDiff } from "./diff.js";
import { createReview } from "./review.js";
import { runRules } from "./rules.js";

const diff = `diff --git a/src/example.ts b/src/example.ts
--- a/src/example.ts
+++ b/src/example.ts
@@ -2,2 +2,5 @@
 const existing = true;
+const password = "very-secret-password-value";
+const value: any = eval(input);
+console.log(value);
 export { existing };`;

describe("diff parser", () => {
  it("maps additions to their new-file line numbers", () => {
    const parsed = parseUnifiedDiff(diff);
    expect(parsed.files).toHaveLength(1);
    expect(parsed.files[0]).toMatchObject({ path: "src/example.ts", additions: 3 });
    expect(parsed.addedLines.map((line) => line.line)).toEqual([3, 4, 5]);
  });
});

describe("deterministic rules", () => {
  it("finds security and maintainability issues without an API key", () => {
    const findings = runRules(parseUnifiedDiff(diff).addedLines);
    expect(findings.some((finding) => finding.title === "Possible hard-coded credential")).toBe(true);
    expect(findings.some((finding) => finding.title === "Dynamic code execution")).toBe(true);
    expect(findings.some((finding) => finding.title === "Type safety bypassed")).toBe(true);
  });

  it("honors disabled workspace rules", () => {
    const findings = runRules(parseUnifiedDiff(diff).addedLines, ["secret", "eval"]);
    expect(findings.some((finding) => finding.title === "Possible hard-coded credential")).toBe(false);
    expect(findings.some((finding) => finding.title === "Dynamic code execution")).toBe(false);
    expect(findings.some((finding) => finding.title === "Type safety bypassed")).toBe(true);
  });
});

describe("review orchestration", () => {
  it("requests changes for high severity findings", async () => {
    const review = await createReview({ title: "Test change", diff });
    expect(review.aiEnabled).toBe(false);
    expect(review.verdict).toBe("request_changes");
    expect(review.metrics.filesChanged).toBe(1);
    expect(review.metrics.critical).toBeGreaterThan(0);
  });
});
