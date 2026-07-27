import JSZip from "jszip";

const baseUrl = process.env.REVIEWPILOT_URL || "http://localhost:8787";
const results = [];

async function check(name, test) {
  try {
    const details = await test();
    results.push({ name, status: "pass", details });
  } catch (error) {
    results.push({
      name,
      status: "fail",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

async function json(response) {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(`${response.status}: ${body.details || body.error || "Request failed"}`);
  }
  return body;
}

await check("health endpoint", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const body = await json(response);
  if (body.status !== "ok") throw new Error("Unexpected health response");
  return `${response.status} ${body.service}`;
});

await check("deterministic diff review", async () => {
  const diff = `diff --git a/app.ts b/app.ts
--- a/app.ts
+++ b/app.ts
@@ -1,1 +1,2 @@
 const ok = true;
+const token = "hardcoded-secret-value-12345";`;
  const response = await fetch(`${baseUrl}/api/reviews`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Backend smoke test", diff }),
  });
  const body = await json(response);
  if (body.verdict !== "request_changes" || body.metrics?.critical !== 1) {
    throw new Error("Expected a critical finding and request-changes verdict");
  }
  return `${response.status} ${body.findings.length} finding`;
});

await check("GitHub repository import", async () => {
  const response = await fetch(`${baseUrl}/api/sources/github`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: "https://github.com/octocat/Hello-World" }),
  });
  const body = await json(response);
  if (!body.title || body.metrics?.filesChanged < 1) {
    throw new Error("GitHub import did not produce a review");
  }
  return `${response.status} ${body.metrics.filesChanged} changed file`;
});

await check("GitHub SSRF protection", async () => {
  const response = await fetch(`${baseUrl}/api/sources/github`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: "https://github.com.example.org/owner/repo" }),
  });
  const body = await response.json();
  if (response.status < 400 || !String(body.details).includes("github.com")) {
    throw new Error("Lookalike GitHub host was not rejected");
  }
  return `${response.status} lookalike host rejected`;
});

await check("ZIP snapshot import", async () => {
  const archive = new JSZip();
  archive.file(
    "project/src/index.ts",
    'const password = "archive-secret-password-12345";\nconsole.log(password);\n',
  );
  archive.file("project/node_modules/ignored.js", "eval(input);");
  const bytes = await archive.generateAsync({ type: "uint8array" });
  const form = new FormData();
  form.append("archive", new Blob([bytes], { type: "application/zip" }), "project.zip");
  const response = await fetch(`${baseUrl}/api/sources/zip`, {
    method: "POST",
    body: form,
  });
  const body = await json(response);
  if (body.metrics?.filesChanged !== 1 || body.files.some((file) => file.path.includes("node_modules"))) {
    throw new Error("ZIP filtering or source extraction failed");
  }
  return `${response.status} ${body.metrics.filesChanged} source file, dependencies excluded`;
});

for (const result of results) {
  console.log(`${result.status === "pass" ? "PASS" : "FAIL"}  ${result.name} — ${result.details}`);
}

const failures = results.filter((result) => result.status === "fail");
console.log(`\n${results.length - failures.length}/${results.length} live backend checks passed`);
if (failures.length) process.exitCode = 1;
