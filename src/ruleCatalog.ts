import type { ReviewCategory, Severity } from "../shared/types";

export interface RuleDefinition {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  category: ReviewCategory;
  languages: string[];
}

export const RULE_CATALOG: RuleDefinition[] = [
  { id: "secret", name: "Hard-coded credentials", description: "Detect API keys, passwords, access tokens, and other secrets committed to source.", severity: "critical", category: "security", languages: ["All"] },
  { id: "shell", name: "Shell command injection", description: "Flag untrusted request data passed into process execution APIs.", severity: "critical", category: "security", languages: ["JavaScript", "TypeScript"] },
  { id: "eval", name: "Dynamic code execution", description: "Detect eval and Function constructors that may execute attacker-controlled code.", severity: "high", category: "security", languages: ["JavaScript", "TypeScript"] },
  { id: "sql-concat", name: "SQL string interpolation", description: "Find database queries constructed with concatenated or interpolated values.", severity: "high", category: "security", languages: ["All"] },
  { id: "inner-html", name: "Unsafe HTML rendering", description: "Detect raw HTML sinks that can introduce cross-site scripting.", severity: "high", category: "security", languages: ["JavaScript", "TypeScript"] },
  { id: "weak-token", name: "Predictable security token", description: "Prevent non-cryptographic randomness from being used for sessions and secrets.", severity: "high", category: "security", languages: ["JavaScript", "TypeScript"] },
  { id: "empty-catch", name: "Swallowed exceptions", description: "Catch empty error handlers that hide operational failures.", severity: "medium", category: "reliability", languages: ["JavaScript", "TypeScript"] },
  { id: "non-null", name: "Unchecked non-null assertion", description: "Highlight assertions that can turn nullable state into runtime exceptions.", severity: "low", category: "reliability", languages: ["TypeScript"] },
  { id: "any", name: "Type safety bypass", description: "Find uses of any that remove compiler guarantees at important boundaries.", severity: "low", category: "maintainability", languages: ["TypeScript"] },
  { id: "console", name: "Debug logging", description: "Identify ad-hoc console output that may leak data or create production noise.", severity: "info", category: "style", languages: ["JavaScript", "TypeScript"] },
];
