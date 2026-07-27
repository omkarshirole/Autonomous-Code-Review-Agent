export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type ReviewCategory =
  | "security"
  | "bug"
  | "performance"
  | "reliability"
  | "maintainability"
  | "style";

export interface Finding {
  id: string;
  source: "rule" | "ai";
  severity: Severity;
  category: ReviewCategory;
  file: string;
  line: number;
  title: string;
  message: string;
  suggestion?: string;
  confidence: number;
  fingerprint: string;
}

export interface FileReview {
  path: string;
  additions: number;
  deletions: number;
  risk: "high" | "medium" | "low";
  summary: string;
}

export interface ReviewResult {
  id: string;
  createdAt: string;
  title: string;
  summary: string;
  verdict: "approve" | "comment" | "request_changes";
  aiEnabled: boolean;
  model?: string;
  findings: Finding[];
  files: FileReview[];
  metrics: {
    filesChanged: number;
    additions: number;
    deletions: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface ReviewRequest {
  title: string;
  description?: string;
  diff: string;
  settings?: {
    model?: string;
    strictness?: "relaxed" | "balanced" | "strict";
    instructions?: string;
    disabledRules?: string[];
  };
}
