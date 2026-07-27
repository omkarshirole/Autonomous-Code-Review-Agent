import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Braces,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Code2,
  FileCode2,
  FileArchive,
  Filter,
  Github,
  GitPullRequest,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Play,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Finding, ReviewRequest, ReviewResult, Severity } from "../shared/types";
import { DEMO_DIFF } from "./demo";
import { ProfilePage, RulesPage, SettingsPage } from "./Pages";
import {
  DEFAULT_PREFERENCES,
  DEFAULT_PROFILE,
  loadStored,
  type AppPreferences,
  type UserProfile,
} from "./preferences";

type Screen = "home" | "review";
type Page = "reviews" | "rules" | "settings" | "profile";
type FindingFilter = "all" | Severity;
type ReviewSettings = NonNullable<ReviewRequest["settings"]>;
type ReviewSubmission =
  | { kind: "diff"; request: ReviewRequest }
  | { kind: "github"; url: string; githubToken?: string; settings: ReviewSettings }
  | { kind: "zip"; file: File; settings: ReviewSettings };

const severityOrder: Severity[] = ["critical", "high", "medium", "low", "info"];

function Logo() {
  return (
    <div className="logo">
      <span className="logo-mark"><Braces size={18} /></span>
      <span>Review<span>Pilot</span></span>
      <span className="beta">BETA</span>
    </div>
  );
}

function KeyDialog({
  initial,
  onClose,
  onSave,
}: {
  initial: string;
  onClose: () => void;
  onSave: (key: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const valid = value.trim().length >= 20;
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="api-key-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="icon-button modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="modal-icon"><KeyRound size={24} /></div>
        <h2 id="api-key-title">Connect your AI reviewer</h2>
        <p>Use your own OpenAI API key to add semantic, context-aware analysis on top of the built-in checks.</p>
        <label className="field-label" htmlFor="api-key">OpenAI API key</label>
        <div className="key-input">
          <LockKeyhole size={17} />
          <input
            id="api-key"
            type="password"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="sk-proj-••••••••••••••••"
            autoComplete="off"
            autoFocus
          />
        </div>
        <div className="privacy-note">
          <ShieldCheck size={17} />
          <span><strong>Private by design.</strong> The key stays in this browser tab and is sent only with review requests. The server never persists it.</span>
        </div>
        <div className="modal-actions">
          <button className="secondary-button" onClick={() => { onSave(""); onClose(); }}>Use rules only</button>
          <button className="primary-button" disabled={!valid} onClick={() => { onSave(value.trim()); onClose(); }}>
            <Sparkles size={16} /> Enable AI review
          </button>
        </div>
      </section>
    </div>
  );
}

function Header({
  apiKey,
  onKey,
  page,
  onNavigate,
}: {
  apiKey: string;
  onKey: () => void;
  page: Page;
  onNavigate: (page: Page) => void;
}) {
  return (
    <header className="app-header">
      <Logo />
      <nav>
        <button className={`nav-link ${page === "reviews" ? "active" : ""}`} aria-current={page === "reviews" ? "page" : undefined} onClick={() => onNavigate("reviews")}><GitPullRequest size={16} /> Reviews</button>
        <button className={`nav-link ${page === "rules" ? "active" : ""}`} aria-current={page === "rules" ? "page" : undefined} onClick={() => onNavigate("rules")}><CircleDot size={16} /> Rules</button>
        <button className={`nav-link ${page === "settings" ? "active" : ""}`} aria-current={page === "settings" ? "page" : undefined} onClick={() => onNavigate("settings")}><Settings2 size={16} /> Settings</button>
      </nav>
      <div className="header-actions">
        <span className={`ai-status ${apiKey ? "connected" : ""}`}>
          <span className="status-dot" />
          {apiKey ? "AI connected" : "Rules only"}
        </span>
        <button className="key-button" onClick={onKey}>
          <KeyRound size={16} /> {apiKey ? "Manage key" : "Add API key"}
        </button>
        <button className={`avatar ${page === "profile" ? "active" : ""}`} aria-current={page === "profile" ? "page" : undefined} onClick={() => onNavigate("profile")} aria-label="Open profile">OM</button>
      </div>
    </header>
  );
}

function ReviewDepth({
  value,
  onChange,
}: {
  value: "relaxed" | "balanced" | "strict";
  onChange: (value: "relaxed" | "balanced" | "strict") => void;
}) {
  return (
    <label>
      <span>Review depth</span>
      <div className="select-wrap">
        <select value={value} onChange={(event) => onChange(event.target.value as typeof value)}>
          <option value="relaxed">Relaxed — blockers only</option>
          <option value="balanced">Balanced — recommended</option>
          <option value="strict">Strict — deep review</option>
        </select>
        <ChevronDown size={15} />
      </div>
    </label>
  );
}

function EmptyState({
  apiKey,
  loading,
  onReview,
  onKey,
  preferences,
}: {
  apiKey: string;
  loading: boolean;
  onReview: (submission: ReviewSubmission) => void;
  onKey: () => void;
  preferences: AppPreferences;
}) {
  const [sourceType, setSourceType] = useState<"diff" | "github" | "zip">("diff");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [diff, setDiff] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [githubToken, setGithubToken] = useState(() => sessionStorage.getItem("reviewpilot_github_token") || "");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [strictness, setStrictness] = useState<"relaxed" | "balanced" | "strict">(preferences.strictness);
  const canReview =
    sourceType === "diff"
      ? Boolean(title.trim() && diff.trim().length >= 10)
      : sourceType === "github"
        ? /^https:\/\/github\.com\//i.test(githubUrl.trim())
        : Boolean(zipFile);

  const settings: ReviewSettings = {
    strictness,
    model: preferences.model,
    instructions: preferences.instructions,
    disabledRules: preferences.disabledRules,
  };

  const submit = () => {
    if (!canReview) return;
    if (sourceType === "github") {
      if (githubToken) sessionStorage.setItem("reviewpilot_github_token", githubToken);
      else sessionStorage.removeItem("reviewpilot_github_token");
      onReview({ kind: "github", url: githubUrl.trim(), githubToken: githubToken.trim() || undefined, settings });
      return;
    }
    if (sourceType === "zip" && zipFile) {
      onReview({ kind: "zip", file: zipFile, settings });
      return;
    }
    onReview({ kind: "diff", request: { title: title.trim(), description: description.trim(), diff, settings } });
  };

  const loadDemo = () => {
    setSourceType("diff");
    setTitle("Harden authentication and report exports");
    setDescription("Refactors session generation and adds transformation support to report exports.");
    setDiff(DEMO_DIFF);
  };

  return (
    <main className="home-shell">
      <section className="hero">
        <span className="eyebrow"><Sparkles size={14} /> AI-POWERED CODE REVIEW</span>
        <h1>Catch the bugs<br />your tests <em>miss.</em></h1>
        <p>Paste a pull request diff and get a line-by-line review for security, correctness, reliability, and performance.</p>
        <div className="trust-row">
          <span><Check size={14} /> Added lines only</span>
          <span><Check size={14} /> Zero key storage</span>
          <span><Check size={14} /> Actionable fixes</span>
        </div>
      </section>

      <section className="composer-card">
        <div className="composer-heading">
          <div>
            <span className="step-number">01</span>
            <h2>Start a review</h2>
          </div>
          <button className="demo-button" onClick={loadDemo}><Play size={14} /> Load demo PR</button>
        </div>
        <div className="source-tabs" role="tablist" aria-label="Review source">
          <button role="tab" aria-selected={sourceType === "diff"} className={sourceType === "diff" ? "active" : ""} onClick={() => setSourceType("diff")}><Code2 size={15} /><span>Paste diff<small>Unified patch</small></span></button>
          <button role="tab" aria-selected={sourceType === "github"} className={sourceType === "github" ? "active" : ""} onClick={() => setSourceType("github")}><Github size={15} /><span>GitHub URL<small>Repo, PR, or commit</small></span></button>
          <button role="tab" aria-selected={sourceType === "zip"} className={sourceType === "zip" ? "active" : ""} onClick={() => setSourceType("zip")}><FileArchive size={15} /><span>ZIP archive<small>Project snapshot</small></span></button>
        </div>

        {sourceType === "diff" && (
          <>
            <div className="two-fields">
              <label>
                <span>Pull request title</span>
                <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Add password reset flow" />
              </label>
              <ReviewDepth value={strictness} onChange={setStrictness} />
            </div>
            <label>
              <span>Context <small>optional</small></span>
              <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What does this change do? Any context the reviewer should know?" />
            </label>
            <label>
              <span>Unified diff</span>
              <div className="diff-editor">
                <div className="editor-topbar">
                  <div><span className="dot red" /><span className="dot yellow" /><span className="dot green" /></div>
                  <span>pull-request.diff</span>
                  <Code2 size={15} />
                </div>
                <textarea
                  value={diff}
                  onChange={(event) => setDiff(event.target.value)}
                  placeholder={"diff --git a/src/app.ts b/src/app.ts\n--- a/src/app.ts\n+++ b/src/app.ts\n@@ -10,3 +10,4 @@\n+ const newCode = true;"}
                  spellCheck={false}
                />
              </div>
            </label>
          </>
        )}

        {sourceType === "github" && (
          <div className="import-panel">
            <div className="import-panel-title"><span><Github size={20} /></span><div><strong>Import from GitHub</strong><p>Review a repository's latest commit, a pull request, commit, or comparison.</p></div></div>
            <div className="two-fields import-fields">
              <label>
                <span>GitHub URL</span>
                <input value={githubUrl} onChange={(event) => setGithubUrl(event.target.value)} placeholder="https://github.com/owner/repository/pull/123" />
              </label>
              <ReviewDepth value={strictness} onChange={setStrictness} />
            </div>
            <label>
              <span>GitHub token <small>optional · private repositories</small></span>
              <div className="key-input"><LockKeyhole size={17} /><input type="password" value={githubToken} onChange={(event) => setGithubToken(event.target.value)} placeholder="github_pat_••••••••••••" autoComplete="off" /></div>
            </label>
            <div className="source-note"><ShieldCheck size={15} /><span>Only github.com URLs are accepted. The token stays in this browser tab and is never persisted by the server.</span></div>
          </div>
        )}

        {sourceType === "zip" && (
          <div className="import-panel">
            <div className="import-panel-title"><span><FileArchive size={20} /></span><div><strong>Upload project archive</strong><p>Review supported source files as a new-code snapshot.</p></div></div>
            <div className="two-fields import-fields">
              <label className="zip-picker">
                <input type="file" accept=".zip,application/zip" onChange={(event) => setZipFile(event.target.files?.[0] || null)} />
                <span className="zip-icon">{zipFile ? <Check size={22} /> : <Upload size={22} />}</span>
                <strong>{zipFile ? zipFile.name : "Choose a ZIP file"}</strong>
                <small>{zipFile ? `${(zipFile.size / 1024 / 1024).toFixed(2)} MB selected` : "Up to 12 MB · source files only"}</small>
              </label>
              <ReviewDepth value={strictness} onChange={setStrictness} />
            </div>
            <div className="source-note"><ShieldCheck size={15} /><span>Dependencies, build output, lockfiles, binaries, and hidden repository data are automatically excluded.</span></div>
          </div>
        )}
        <footer className="composer-footer">
          <button className={`mode-pill ${apiKey ? "ai" : ""}`} onClick={onKey}>
            {apiKey ? <Sparkles size={15} /> : <ShieldCheck size={15} />}
            {apiKey ? "AI + rules" : "Static rules"}
            <span>Change</span>
          </button>
          <button className="review-button" disabled={!canReview || loading} aria-busy={loading} onClick={submit}>
            {loading ? <LoaderCircle className="spin" size={18} /> : <Bot size={18} />}
            {loading ? "Analyzing source…" : sourceType === "zip" ? "Review ZIP project" : sourceType === "github" ? "Import & review" : "Review this PR"}
          </button>
        </footer>
      </section>

      <section className="capabilities">
        <div><ShieldCheck /><strong>Security</strong><span>Secrets, injection, XSS, unsafe execution</span></div>
        <div><CircleDot /><strong>Correctness</strong><span>Edge cases, state errors, broken behavior</span></div>
        <div><GitPullRequest /><strong>PR intelligence</strong><span>Risk scoring, summaries, merge verdicts</span></div>
      </section>
    </main>
  );
}

function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`severity ${severity}`}>{severity}</span>;
}

function FindingCard({
  finding,
  expanded,
  showConfidence,
}: {
  finding: Finding;
  expanded: boolean;
  showConfidence: boolean;
}) {
  const [open, setOpen] = useState(expanded);
  return (
    <article className={`finding-card ${finding.severity}`}>
      <button className="finding-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="finding-icon">
          {finding.severity === "critical" || finding.severity === "high" ? <XCircle size={18} /> : <AlertTriangle size={18} />}
        </span>
        <span className="finding-title">
          <span><SeverityBadge severity={finding.severity} /><span className="category">{finding.category}</span></span>
          <strong>{finding.title}</strong>
        </span>
        <span className="confidence">{showConfidence ? `${Math.round(finding.confidence * 100)}% confidence` : ""}</span>
        <ChevronDown className={open ? "rotated" : ""} size={18} />
      </button>
      {open && (
        <div className="finding-body">
          <div className="location"><FileCode2 size={15} /> {finding.file}<span>:</span><strong>{finding.line}</strong></div>
          <p>{finding.message}</p>
          {finding.suggestion && (
            <div className="suggestion">
              <span><Sparkles size={14} /> Suggested fix</span>
              <p>{finding.suggestion}</p>
            </div>
          )}
          <div className="finding-meta">
            <span>{finding.source === "ai" ? <><Bot size={13} /> AI analysis</> : <><Braces size={13} /> Deterministic rule</>}</span>
            <code>{finding.fingerprint}</code>
          </div>
        </div>
      )}
    </article>
  );
}

function ReviewScreen({
  result,
  onBack,
  preferences,
}: {
  result: ReviewResult;
  onBack: () => void;
  preferences: AppPreferences;
}) {
  const [filter, setFilter] = useState<FindingFilter>("all");
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => result.findings.filter((finding) =>
      (filter === "all" || finding.severity === filter) &&
      `${finding.title} ${finding.message} ${finding.file}`.toLowerCase().includes(query.toLowerCase()),
    ),
    [result, filter, query],
  );
  const verdict = {
    approve: { label: "Ready to merge", icon: <CheckCircle2 />, copy: "No blocking issues found" },
    comment: { label: "Review suggested", icon: <AlertTriangle />, copy: "Address findings when practical" },
    request_changes: { label: "Changes requested", icon: <XCircle />, copy: "Blocking issues should be fixed" },
  }[result.verdict];

  return (
    <main className="review-shell">
      <button className="back-button" onClick={onBack}><ArrowLeft size={16} /> New review</button>
      <section className="review-titlebar">
        <div>
          <span className="pr-label"><GitPullRequest size={15} /> PULL REQUEST REVIEW</span>
          <h1>{result.title}</h1>
          <p>Reviewed {new Date(result.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {result.aiEnabled ? result.model : "Built-in rules"}</p>
        </div>
        <div className={`verdict ${result.verdict}`}>
          {verdict.icon}
          <span><strong>{verdict.label}</strong><small>{verdict.copy}</small></span>
        </div>
      </section>

      <section className="metric-grid">
        <div><span>Files changed</span><strong>{result.metrics.filesChanged}</strong><small><b className="plus">+{result.metrics.additions}</b> <b className="minus">−{result.metrics.deletions}</b></small></div>
        <div><span>Blocking</span><strong>{result.metrics.critical + result.metrics.high}</strong><small>critical & high severity</small></div>
        <div><span>Suggestions</span><strong>{result.metrics.medium + result.metrics.low}</strong><small>medium & low severity</small></div>
        <div><span>Review mode</span><strong className="mode-value">{result.aiEnabled ? "AI + Rules" : "Rules"}</strong><small>{result.aiEnabled ? "semantic analysis enabled" : "add a key for deeper review"}</small></div>
      </section>

      <div className="review-layout">
        <section className="findings-column">
          <div className="summary-card">
            <span className="summary-icon"><Bot size={19} /></span>
            <div><strong>Review summary</strong><p>{result.summary}</p></div>
          </div>
          <div className="toolbar">
            <div className="filter-tabs">
              <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All <span>{result.findings.length}</span></button>
              {severityOrder.slice(0, 4).map((severity) => {
                const count = result.findings.filter((finding) => finding.severity === severity).length;
                return count ? <button key={severity} className={filter === severity ? "active" : ""} onClick={() => setFilter(severity)}>{severity} <span>{count}</span></button> : null;
              })}
            </div>
            <label className="search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search findings" /></label>
          </div>
          <div className="finding-list">
            {filtered.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                expanded={preferences.autoExpandFindings}
                showConfidence={preferences.showConfidence}
              />
            ))}
            {!filtered.length && <div className="no-findings"><CheckCircle2 /><strong>No matching findings</strong><span>Try a different filter or search.</span></div>}
          </div>
        </section>

        <aside className="files-panel">
          <div className="panel-heading"><span>Changed files</span><small>{result.files.length}</small></div>
          {result.files.map((file) => (
            <div className="file-row" key={file.path}>
              <FileCode2 size={16} />
              <div><strong>{file.path.split("/").pop()}</strong><span>{file.path}</span><small>{file.summary}</small></div>
              <span className={`risk ${file.risk}`}>{file.risk}</span>
            </div>
          ))}
          <div className="panel-note">
            <ShieldCheck size={17} />
            <p><strong>Privacy</strong>Your API key and source diff are held only for the duration of the request.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default function App() {
  const [apiKey, setApiKey] = useState(() => sessionStorage.getItem("reviewpilot_api_key") || "");
  const [page, setPage] = useState<Page>("reviews");
  const [showKey, setShowKey] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [preferences, setPreferences] = useState<AppPreferences>(() =>
    loadStored("reviewpilot_preferences", DEFAULT_PREFERENCES),
  );
  const [profile, setProfile] = useState<UserProfile>(() =>
    loadStored("reviewpilot_profile", DEFAULT_PROFILE),
  );

  const saveKey = (key: string) => {
    setApiKey(key);
    if (key) sessionStorage.setItem("reviewpilot_api_key", key);
    else sessionStorage.removeItem("reviewpilot_api_key");
  };

  const savePreferences = (next: AppPreferences) => {
    setPreferences(next);
    localStorage.setItem("reviewpilot_preferences", JSON.stringify(next));
  };

  const saveProfile = (next: UserProfile) => {
    setProfile(next);
    localStorage.setItem("reviewpilot_profile", JSON.stringify(next));
  };

  const runReview = async (submission: ReviewSubmission) => {
    setLoading(true);
    setError("");
    try {
      let endpoint = "/api/reviews";
      let body: BodyInit;
      const headers: Record<string, string> = apiKey ? { "x-openai-key": apiKey } : {};
      if (submission.kind === "zip") {
        endpoint = "/api/sources/zip";
        const form = new FormData();
        form.append("archive", submission.file);
        form.append("settings", JSON.stringify(submission.settings));
        body = form;
      } else if (submission.kind === "github") {
        endpoint = "/api/sources/github";
        headers["content-type"] = "application/json";
        if (submission.githubToken) headers["x-github-token"] = submission.githubToken;
        body = JSON.stringify({ url: submission.url, settings: submission.settings });
      } else {
        headers["content-type"] = "application/json";
        body = JSON.stringify(submission.request);
      }
      const response = await fetch(endpoint, { method: "POST", headers, body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.details || data.error || "Review failed");
      setReview(data);
      setScreen("review");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Review failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <Header apiKey={apiKey} onKey={() => setShowKey(true)} page={page} onNavigate={setPage} />
      {error && <div className="error-toast"><XCircle size={17} /><span>{error}</span><button onClick={() => setError("")}><X size={15} /></button></div>}
      {page === "reviews" && (
        screen === "home" || !review
          ? <EmptyState apiKey={apiKey} loading={loading} onReview={runReview} onKey={() => setShowKey(true)} preferences={preferences} />
          : <ReviewScreen result={review} onBack={() => setScreen("home")} preferences={preferences} />
      )}
      {page === "rules" && <RulesPage preferences={preferences} onChange={savePreferences} />}
      {page === "settings" && <SettingsPage preferences={preferences} apiKey={apiKey} onSave={savePreferences} onOpenKey={() => setShowKey(true)} />}
      {page === "profile" && <ProfilePage profile={profile} onSave={saveProfile} />}
      {showKey && <KeyDialog initial={apiKey} onClose={() => setShowKey(false)} onSave={saveKey} />}
    </div>
  );
}
