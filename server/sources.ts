import path from "node:path";
import JSZip from "jszip";

const MAX_SOURCE_CHARS = 1_200_000;
const MAX_FILES = 120;
const ALLOWED_EXTENSIONS = new Set([
  ".c", ".cc", ".cpp", ".cs", ".css", ".go", ".h", ".hpp", ".html", ".java",
  ".js", ".jsx", ".json", ".kt", ".kts", ".md", ".php", ".py", ".rb", ".rs",
  ".scala", ".sh", ".sql", ".swift", ".toml", ".ts", ".tsx", ".vue", ".xml",
  ".yaml", ".yml",
]);
const IGNORED_SEGMENTS = new Set([
  ".git", ".next", ".nuxt", ".output", ".turbo", ".venv", "build", "coverage",
  "dist", "node_modules", "out", "target", "vendor",
]);
const IGNORED_FILES = new Set([
  "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "composer.lock",
  "Cargo.lock", "poetry.lock",
]);

export interface ImportedSource {
  title: string;
  description: string;
  diff: string;
}

export interface GitHubTarget {
  owner: string;
  repo: string;
  kind: "pull" | "commit" | "compare" | "repository";
  value?: string;
}

export function parseGitHubUrl(input: string): GitHubTarget {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Enter a valid GitHub URL.");
  }
  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com") {
    throw new Error("Only HTTPS URLs from github.com are supported.");
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) throw new Error("The GitHub URL must include an owner and repository.");
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/, "");
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) {
    throw new Error("The GitHub owner or repository name is invalid.");
  }

  if (parts[2] === "pull" && /^\d+$/.test(parts[3] || "")) {
    return { owner, repo, kind: "pull", value: parts[3] };
  }
  if (parts[2] === "commit" && /^[A-Fa-f0-9]{7,64}$/.test(parts[3] || "")) {
    return { owner, repo, kind: "commit", value: parts[3] };
  }
  if (parts[2] === "compare" && parts[3]) {
    return { owner, repo, kind: "compare", value: decodeURIComponent(parts.slice(3).join("/")) };
  }
  if (parts.length === 2) return { owner, repo, kind: "repository" };
  throw new Error("Use a GitHub repository, pull request, commit, or compare URL.");
}

function githubHeaders(token?: string, accept = "application/vnd.github+json") {
  return {
    Accept: accept,
    "User-Agent": "ReviewPilot/0.1",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function githubFetch(url: string, token?: string, accept?: string): Promise<Response> {
  const response = await fetch(url, {
    headers: githubHeaders(token, accept),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("GitHub could not find this resource. For a private repository, add a token with read access.");
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error("GitHub denied access. Check the token, repository permissions, or API rate limit.");
    }
    throw new Error(`GitHub returned ${response.status} while loading the source.`);
  }
  return response;
}

async function fetchDiff(apiUrl: string, token?: string): Promise<string> {
  const response = await githubFetch(apiUrl, token, "application/vnd.github.v3.diff");
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_SOURCE_CHARS) throw new Error("The GitHub diff is too large to review.");
  const diff = await response.text();
  if (diff.length > MAX_SOURCE_CHARS) throw new Error("The GitHub diff is too large to review.");
  if (!diff.includes("diff --git")) throw new Error("GitHub did not return a reviewable diff.");
  return diff;
}

export async function importGitHubSource(input: string, token?: string): Promise<ImportedSource> {
  const target = parseGitHubUrl(input);
  const root = `https://api.github.com/repos/${target.owner}/${target.repo}`;
  const label = `${target.owner}/${target.repo}`;

  if (target.kind === "pull") {
    const apiUrl = `${root}/pulls/${target.value}`;
    const [metadataResponse, diff] = await Promise.all([
      githubFetch(apiUrl, token),
      fetchDiff(apiUrl, token),
    ]);
    const metadata = await metadataResponse.json() as { title?: string; body?: string | null; number?: number };
    return {
      title: metadata.title || `${label} pull request #${target.value}`,
      description: metadata.body || `Imported from GitHub pull request #${target.value}.`,
      diff,
    };
  }

  if (target.kind === "commit") {
    const apiUrl = `${root}/commits/${target.value}`;
    const [metadataResponse, diff] = await Promise.all([
      githubFetch(apiUrl, token),
      fetchDiff(apiUrl, token),
    ]);
    const metadata = await metadataResponse.json() as { commit?: { message?: string } };
    const message = metadata.commit?.message?.split("\n")[0];
    return {
      title: message || `${label} commit ${target.value?.slice(0, 8)}`,
      description: `Imported from commit ${target.value} on GitHub.`,
      diff,
    };
  }

  if (target.kind === "compare") {
    const apiUrl = `${root}/compare/${target.value}`;
    return {
      title: `Compare ${target.value} in ${label}`,
      description: `Imported from a GitHub branch or tag comparison.`,
      diff: await fetchDiff(apiUrl, token),
    };
  }

  const repositoryResponse = await githubFetch(root, token);
  const repository = await repositoryResponse.json() as { default_branch?: string };
  const branch = repository.default_branch || "main";
  const commitsResponse = await githubFetch(`${root}/commits?sha=${encodeURIComponent(branch)}&per_page=1`, token);
  const commits = await commitsResponse.json() as Array<{ sha?: string; commit?: { message?: string } }>;
  const latest = commits[0];
  if (!latest?.sha) throw new Error("This repository does not contain a reviewable commit.");
  return {
    title: latest.commit?.message?.split("\n")[0] || `Latest change in ${label}`,
    description: `Latest commit on the ${branch} branch of ${label}.`,
    diff: await fetchDiff(`${root}/commits/${latest.sha}`, token),
  };
}

function safeArchivePath(input: string): string | undefined {
  const normalized = input.replaceAll("\\", "/").replace(/^\.\/+/, "");
  if (!normalized || normalized.startsWith("/") || normalized.split("/").includes("..")) return;
  const segments = normalized.split("/");
  if (segments.some((segment) => IGNORED_SEGMENTS.has(segment))) return;
  const fileName = segments.at(-1) || "";
  if (IGNORED_FILES.has(fileName) || !ALLOWED_EXTENSIONS.has(path.extname(fileName).toLowerCase())) return;
  return normalized;
}

function addedFileDiff(fileName: string, contents: string): string {
  const normalized = contents.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  if (lines.at(-1) === "") lines.pop();
  const additions = lines.map((line) => `+${line}`).join("\n");
  return `diff --git a/${fileName} b/${fileName}
new file mode 100644
--- /dev/null
+++ b/${fileName}
@@ -0,0 +1,${lines.length} @@
${additions}`;
}

export async function importZipSource(buffer: Buffer, originalName: string): Promise<ImportedSource> {
  let archive: JSZip;
  try {
    archive = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error("The uploaded file is not a valid ZIP archive.");
  }

  const candidates = Object.values(archive.files)
    .filter((entry) => !entry.dir)
    .map((entry) => ({ entry, safePath: safeArchivePath(entry.name) }))
    .filter((item): item is { entry: JSZip.JSZipObject; safePath: string } => Boolean(item.safePath));
  if (!candidates.length) throw new Error("The ZIP does not contain supported source files.");
  if (candidates.length > MAX_FILES) throw new Error(`The ZIP contains more than ${MAX_FILES} reviewable source files.`);
  const declaredSize = candidates.reduce((total, { entry }) => {
    const metadata = entry as JSZip.JSZipObject & { _data?: { uncompressedSize?: number } };
    return total + (metadata._data?.uncompressedSize || 0);
  }, 0);
  if (declaredSize > MAX_SOURCE_CHARS) throw new Error("The extracted source is too large to review.");

  const commonRoot = candidates.every(({ safePath }) => safePath.includes("/") && safePath.split("/")[0] === candidates[0].safePath.split("/")[0])
    ? `${candidates[0].safePath.split("/")[0]}/`
    : "";
  const diffs: string[] = [];
  let totalChars = 0;

  for (const { entry, safePath } of candidates) {
    const contents = await entry.async("string");
    if (contents.includes("\0")) continue;
    totalChars += contents.length;
    if (totalChars > MAX_SOURCE_CHARS) throw new Error("The extracted source is too large to review.");
    const displayPath = commonRoot ? safePath.slice(commonRoot.length) : safePath;
    diffs.push(addedFileDiff(displayPath, contents));
  }
  if (!diffs.length) throw new Error("The ZIP does not contain readable text source files.");
  const projectName = path.basename(originalName, path.extname(originalName));
  return {
    title: `Review ${projectName}`,
    description: `Snapshot review imported from ${originalName}. All supported source files are treated as newly added code.`,
    diff: diffs.join("\n"),
  };
}
