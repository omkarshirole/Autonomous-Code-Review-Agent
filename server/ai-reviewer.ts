import { createHash } from "node:crypto";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { Finding, ReviewRequest } from "../shared/types.js";
import type { ParsedDiff } from "./diff.js";

/**
 * Schema for AI review response
 * Ensures structured output from the LLM
 */
const AiReviewSchema = z.object({
  summary: z.string(),
  findings: z.array(
    z.object({
      severity: z.enum(["critical", "high", "medium", "low", "info"]),
      category: z.enum([
        "security",
        "bug",
        "performance",
        "reliability",
        "maintainability",
        "style",
      ]),
      file: z.string(),
      line: z.number().int().nonnegative(),
      title: z.string(),
      message: z.string(),
      suggestion: z.string(),
      confidence: z.number().min(0).max(1),
    }),
  ).max(30),
});

/**
 * Run AI-powered code review using OpenAI Responses API
 * @param request - The review request containing diff and settings
 * @param parsed - Parsed diff with added lines
 * @param apiKey - OpenAI API key for authentication
 * @returns Promise resolving to AI review summary and findings
 */
export async function runAiReview(
  request: ReviewRequest,
  parsed: ParsedDiff,
  apiKey: string
): Promise<{ summary: string; findings: Finding[]; model: string }> {
  const model = request.settings?.model || "gpt-4o";
  const client = new OpenAI({ apiKey });
  
  // Build list of valid file:line locations for the AI to reference
  const validLocations = parsed.addedLines
    .map((line) => `${line.file}:${line.line}`)
    .join(", ");

  const response = await client.responses.parse({
    model,
    reasoning: { effort: "medium" },
    input: [
      {
        role: "system",
        content: `You are a senior staff engineer reviewing a pull request. Find only actionable defects introduced by the patch.

Review for correctness, security, race conditions, data loss, error handling, performance regressions, and broken edge cases. Do not report formatting, personal preferences, or issues outside added lines. Every finding must point to one of the supplied valid file:line locations. Explain the concrete failure mode. Keep the review concise and avoid duplicates.

Strictness: ${request.settings?.strictness || "balanced"}
Repository instructions: ${request.settings?.instructions || "None supplied"}`,
      },
      {
        role: "user",
        content: `PR: ${request.title}
Description: ${request.description || "Not supplied"}
Valid added-line locations: ${validLocations}

Patch:
${request.diff}`,
      },
    ],
    text: { format: zodTextFormat(AiReviewSchema, "code_review") },
  });

  const review = response.output_parsed;
  if (!review) throw new Error("The model did not return a structured review.");
  
  // Filter findings to only include valid locations
  const valid = new Set(parsed.addedLines.map((line) => `${line.file}:${line.line}`));
  const findings = review.findings
    .filter((finding) => valid.has(`${finding.file}:${finding.line}`))
    .map((finding, index) => {
      const fp = createHash("sha1")
        .update(`ai:${finding.file}:${finding.line}:${finding.title.toLowerCase()}`)
        .digest("hex")
        .slice(0, 12);
      return {
        ...finding,
        id: `ai-${index}-${fp}`,
        source: "ai" as const,
        fingerprint: fp,
      };
    });
  
  return { summary: review.summary, findings, model };
}
