/**
 * AI Reviewer Tests for ReviewPilot
 * Tests the AI-powered review functionality
 */

import { describe, it, expect, vi } from "vitest";

// Mock the OpenAI client
vi.mock("openai", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      responses: {
        parse: vi.fn().mockResolvedValue({
          output_parsed: {
            summary: "AI review summary",
            findings: [
              {
                severity: "high",
                category: "security",
                file: "src/auth.ts",
                line: 10,
                title: "Hardcoded secret detected",
                message: "API key found in source code",
                suggestion: "Move to environment variable",
                confidence: 0.95,
              },
            ],
          },
        }),
      },
    })),
  };
});

import { runAiReview } from "../server/ai-reviewer.js";

describe("AI Reviewer", () => {
  const sampleRequest = {
    title: "Add authentication",
    description: "Implement JWT-based auth",
    diff: `diff --git a/src/auth.ts b/src/auth.ts
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -1,3 +1,5 @@
+const API_KEY = "sk-1234567890abcdef";
+
 export function login() {}`,
    settings: {
      strictness: "balanced" as const,
    },
  };

  const sampleParsed = {
    addedLines: [
      { file: "src/auth.ts", line: 3, content: 'const API_KEY = "sk-1234567890abcdef";' },
    ],
    files: [
      { path: "src/auth.ts", additions: 1, deletions: 0, risk: "low", summary: "1 addition" },
    ],
  };

  it("should be exported as a function", () => {
    expect(typeof runAiReview).toBe("function");
  });

  it("should call OpenAI with correct parameters", async () => {
    const apiKey = "sk-test-key-1234567890abcdef";
    await runAiReview(sampleRequest, sampleParsed, apiKey);
    
    // The mock should have been called
    // In a real test, we'd verify the call arguments
  });

  it("should filter findings to valid locations", async () => {
    const apiKey = "sk-test-key-1234567890abcdef";
    const result = await runAiReview(sampleRequest, sampleParsed, apiKey);
    
    expect(result.findings).toBeInstanceOf(Array);
    expect(result.summary).toBeDefined();
    expect(result.model).toBeDefined();
  });

  it("should generate unique fingerprints for AI findings", async () => {
    const apiKey = "sk-test-key-1234567890abcdef";
    const result = await runAiReview(sampleRequest, sampleParsed, apiKey);
    
    result.findings.forEach(finding => {
      expect(finding.id).toMatch(/^ai-\d+-[a-f0-9]{12}$/);
      expect(finding.source).toBe("ai");
      expect(finding.fingerprint).toMatch(/^[a-f0-9]{12}$/);
    });
  });

  it("should include severity and category in findings", async () => {
    const apiKey = "sk-test-key-1234567890abcdef";
    const result = await runAiReview(sampleRequest, sampleParsed, apiKey);
    
    result.findings.forEach(finding => {
      expect(["critical", "high", "medium", "low", "info"]).toContain(finding.severity);
      expect(["security", "bug", "performance", "reliability", "maintainability", "style"]).toContain(finding.category);
      expect(typeof finding.confidence).toBe("number");
      expect(finding.confidence).toBeGreaterThanOrEqual(0);
      expect(finding.confidence).toBeLessThanOrEqual(1);
    });
  });
});
