import { randomUUID } from "node:crypto";
import type { Finding, ReviewRequest, ReviewResult, Severity } from "../shared/types.js";
import { runAiReview } from "./ai-reviewer.js";
import { parseUnifiedDiff } from "./diff.js";
import { runRules } from "./rules.js";

const severityRank: Record<Severity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

function deduplicate(findings: Finding[]): Finding[] {
  const sorted = [...findings].sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);
  const seen = new Set<string>();
  return sorted.filter((finding) => {
    const location = `${finding.file}:${finding.line}:${finding.category}`;
    if (seen.has(location)) return false;
    seen.add(location);
    return true;
  });
}

export async function createReview(
  request: ReviewRequest,
  apiKey?: string,
): Promise<ReviewResult> {
  const parsed = parseUnifiedDiff(request.diff);
  let findings = runRules(parsed.addedLines, request.settings?.disabledRules);
  let aiSummary = "";
  let model: string | undefined;

  if (apiKey) {
    const ai = await runAiReview(request, parsed, apiKey);
    findings = deduplicate([...findings, ...ai.findings]);
    aiSummary = ai.summary;
    model = ai.model;
  }

  const count = (severity: Severity) => findings.filter((f) => f.severity === severity).length;
  const metrics = {
    filesChanged: parsed.files.length,
    additions: parsed.files.reduce((sum, file) => sum + file.additions, 0),
    deletions: parsed.files.reduce((sum, file) => sum + file.deletions, 0),
    critical: count("critical"),
    high: count("high"),
    medium: count("medium"),
    low: count("low"),
  };
  const verdict =
    metrics.critical || metrics.high
      ? "request_changes"
      : metrics.medium
        ? "comment"
        : "approve";
  const summary =
    aiSummary ||
    (findings.length
      ? `Found ${findings.length} actionable ${findings.length === 1 ? "issue" : "issues"} across ${metrics.filesChanged} changed ${metrics.filesChanged === 1 ? "file" : "files"}.`
      : `No actionable issues detected across ${metrics.filesChanged} changed ${metrics.filesChanged === 1 ? "file" : "files"}.`);

  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    title: request.title,
    summary,
    verdict,
    aiEnabled: Boolean(apiKey),
    model,
    findings,
    files: parsed.files.map((file) => {
      const fileFindings = findings.filter((finding) => finding.file === file.path);
      const maxSeverity = fileFindings.reduce(
        (max, finding) => Math.max(max, severityRank[finding.severity]),
        0,
      );
      return {
        ...file,
        risk: maxSeverity >= 4 ? "high" : maxSeverity >= 3 ? "medium" : file.risk,
        summary: fileFindings.length
          ? `${fileFindings.length} ${fileFindings.length === 1 ? "finding" : "findings"} · ${file.summary}`
          : `No findings · ${file.summary}`,
      };
    }),
    metrics,
  };
}
