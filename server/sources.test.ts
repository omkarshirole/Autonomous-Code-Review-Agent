import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { createReview } from "./review.js";
import { importZipSource, parseGitHubUrl } from "./sources.js";

describe("GitHub source URLs", () => {
  it("recognizes repository, pull request, commit, and compare URLs", () => {
    expect(parseGitHubUrl("https://github.com/acme/widget")).toMatchObject({
      owner: "acme", repo: "widget", kind: "repository",
    });
    expect(parseGitHubUrl("https://github.com/acme/widget/pull/42")).toMatchObject({
      kind: "pull", value: "42",
    });
    expect(parseGitHubUrl("https://github.com/acme/widget/commit/abcdef1234567")).toMatchObject({
      kind: "commit", value: "abcdef1234567",
    });
    expect(parseGitHubUrl("https://github.com/acme/widget/compare/main...feature")).toMatchObject({
      kind: "compare", value: "main...feature",
    });
  });

  it("rejects lookalike and non-HTTPS hosts", () => {
    expect(() => parseGitHubUrl("https://github.com.example.org/acme/widget")).toThrow("github.com");
    expect(() => parseGitHubUrl("http://github.com/acme/widget")).toThrow("HTTPS");
  });
});

describe("ZIP source import", () => {
  it("extracts supported source while ignoring dependencies and binaries", async () => {
    const zip = new JSZip();
    zip.file("widget/src/auth.ts", 'const password = "very-secret-password-value";\n');
    zip.file("widget/src/readme.md", "# Widget\n");
    zip.file("widget/node_modules/pkg/index.js", "console.log('ignored');");
    zip.file("widget/public/logo.png", Buffer.from([0, 1, 2, 3]));
    const buffer = await zip.generateAsync({ type: "nodebuffer" });

    const imported = await importZipSource(buffer, "widget.zip");
    expect(imported.diff).toContain("b/src/auth.ts");
    expect(imported.diff).toContain("b/src/readme.md");
    expect(imported.diff).not.toContain("node_modules");
    expect(imported.diff).not.toContain("logo.png");

    const review = await createReview(imported);
    expect(review.findings.some((finding) => finding.title === "Possible hard-coded credential")).toBe(true);
  });

  it("rejects an archive without reviewable source files", async () => {
    const zip = new JSZip();
    zip.file("assets/logo.png", Buffer.from([0, 1, 2, 3]));
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    await expect(importZipSource(buffer, "assets.zip")).rejects.toThrow("supported source files");
  });
});
