import type { FileReview } from "../shared/types.js";

export interface AddedLine {
  file: string;
  line: number;
  content: string;
}

export interface ParsedDiff {
  addedLines: AddedLine[];
  files: FileReview[];
}

const fileName = (value: string) =>
  value.replace(/^[ab]\//, "").trim() || "unknown";

export function parseUnifiedDiff(diff: string): ParsedDiff {
  const lines = diff.replace(/\r\n/g, "\n").split("\n");
  const addedLines: AddedLine[] = [];
  const fileMap = new Map<string, FileReview>();
  let currentFile = "unknown";
  let newLine = 0;

  for (const raw of lines) {
    if (raw.startsWith("+++ ")) {
      currentFile = fileName(raw.slice(4));
      if (!fileMap.has(currentFile)) {
        fileMap.set(currentFile, {
          path: currentFile,
          additions: 0,
          deletions: 0,
          risk: "low",
          summary: "Changed file",
        });
      }
      continue;
    }

    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }

    const file = fileMap.get(currentFile);
    if (!file) continue;
    if (raw.startsWith("+") && !raw.startsWith("+++")) {
      file.additions += 1;
      addedLines.push({ file: currentFile, line: newLine, content: raw.slice(1) });
      newLine += 1;
    } else if (raw.startsWith("-") && !raw.startsWith("---")) {
      file.deletions += 1;
    } else if (!raw.startsWith("\\")) {
      newLine += 1;
    }
  }

  for (const file of fileMap.values()) {
    const churn = file.additions + file.deletions;
    file.risk = churn > 120 ? "high" : churn > 40 ? "medium" : "low";
    file.summary = `${file.additions} additions and ${file.deletions} deletions`;
  }
  return { addedLines, files: [...fileMap.values()] };
}
