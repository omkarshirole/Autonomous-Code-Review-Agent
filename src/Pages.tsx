import {
  Activity,
  Bell,
  BookOpen,
  Bot,
  Building2,
  Check,
  ChevronRight,
  CircleUserRound,
  Code2,
  ExternalLink,
  Filter,
  Github,
  KeyRound,
  Languages,
  LockKeyhole,
  Mail,
  MapPin,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ReviewCategory } from "../shared/types";
import type { AppPreferences, UserProfile } from "./preferences";
import { RULE_CATALOG } from "./ruleCatalog";

function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="page-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      className={`toggle ${checked ? "on" : ""}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

export function RulesPage({
  preferences,
  onChange,
}: {
  preferences: AppPreferences;
  onChange: (next: AppPreferences) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | ReviewCategory>("all");
  const activeCount = RULE_CATALOG.length - preferences.disabledRules.length;
  const rules = useMemo(
    () =>
      RULE_CATALOG.filter(
        (rule) =>
          (category === "all" || rule.category === category) &&
          `${rule.name} ${rule.description} ${rule.languages.join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [category, query],
  );

  const setRule = (id: string, enabled: boolean) => {
    const disabledRules = enabled
      ? preferences.disabledRules.filter((rule) => rule !== id)
      : [...new Set([...preferences.disabledRules, id])];
    onChange({ ...preferences, disabledRules });
  };

  return (
    <main className="product-page">
      <PageHeading
        eyebrow="REVIEW POLICY"
        title="Rules"
        description="Control the deterministic checks that run on every patch, even when AI review is disabled."
        action={
          <div className="page-stat">
            <ShieldCheck size={18} />
            <span><strong>{activeCount}/{RULE_CATALOG.length}</strong> checks active</span>
          </div>
        }
      />

      <section className="rules-overview">
        <div><ShieldCheck /><span><strong>{RULE_CATALOG.filter((rule) => rule.category === "security").length}</strong> Security rules</span></div>
        <div><Activity /><span><strong>{RULE_CATALOG.filter((rule) => rule.category === "reliability").length}</strong> Reliability rules</span></div>
        <div><Code2 /><span><strong>{RULE_CATALOG.filter((rule) => ["maintainability", "style"].includes(rule.category)).length}</strong> Quality rules</span></div>
      </section>

      <section className="page-card">
        <div className="rule-toolbar">
          <label className="page-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search rule name, language, or purpose…" /></label>
          <div className="category-filter">
            <Filter size={14} />
            <select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>
              <option value="all">All categories</option>
              <option value="security">Security</option>
              <option value="reliability">Reliability</option>
              <option value="maintainability">Maintainability</option>
              <option value="style">Style</option>
            </select>
          </div>
        </div>
        <div className="rule-list">
          {rules.map((rule) => {
            const enabled = !preferences.disabledRules.includes(rule.id);
            return (
              <article className={`rule-item ${enabled ? "" : "disabled"}`} key={rule.id}>
                <span className={`rule-symbol ${rule.category}`}><ShieldCheck size={17} /></span>
                <div className="rule-copy">
                  <div><strong>{rule.name}</strong><span className={`mini-severity ${rule.severity}`}>{rule.severity}</span><code>{rule.id}</code></div>
                  <p>{rule.description}</p>
                  <small><Languages size={12} /> {rule.languages.join(" · ")}</small>
                </div>
                <Toggle checked={enabled} onChange={(value) => setRule(rule.id, value)} label={`${enabled ? "Disable" : "Enable"} ${rule.name}`} />
              </article>
            );
          })}
          {!rules.length && <div className="empty-search"><Search /><strong>No rules found</strong><span>Try a different search or category.</span></div>}
        </div>
      </section>
    </main>
  );
}

export function SettingsPage({
  preferences,
  apiKey,
  onSave,
  onOpenKey,
}: {
  preferences: AppPreferences;
  apiKey: string;
  onSave: (next: AppPreferences) => void;
  onOpenKey: () => void;
}) {
  const [draft, setDraft] = useState(preferences);
  const [saved, setSaved] = useState(false);
  const save = () => {
    onSave(draft);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <main className="product-page">
      <PageHeading eyebrow="WORKSPACE" title="Settings" description="Set the defaults ReviewPilot uses whenever you start a code review." />
      <div className="settings-layout">
        <aside className="settings-nav">
          <button className="active" onClick={() => document.getElementById("reviewer-settings")?.scrollIntoView({ behavior: "smooth" })}><Bot size={16} /> Reviewer <ChevronRight size={14} /></button>
          <button onClick={() => document.getElementById("interface-settings")?.scrollIntoView({ behavior: "smooth" })}><SlidersHorizontal size={16} /> Interface <ChevronRight size={14} /></button>
          <button onClick={onOpenKey}><LockKeyhole size={16} /> API key <ChevronRight size={14} /></button>
        </aside>
        <section className="settings-content">
          <div className="settings-section" id="reviewer-settings">
            <div className="section-title"><span><Sparkles size={17} /></span><div><h2>AI reviewer</h2><p>Configure semantic analysis and model behavior.</p></div></div>
            <div className="settings-field">
              <div><label>OpenAI connection</label><p>Your key is kept only for the current browser tab.</p></div>
              <button className={`connection-button ${apiKey ? "connected" : ""}`} onClick={onOpenKey}>
                {apiKey ? <Check size={15} /> : <KeyRound size={15} />}
                {apiKey ? "Connected" : "Add API key"}
              </button>
            </div>
            <div className="settings-field stack">
              <div><label htmlFor="model">Default model</label><p>Used only when an API key is connected.</p></div>
              <select id="model" value={draft.model} onChange={(event) => setDraft({ ...draft, model: event.target.value })}>
                <option value="gpt-5.6-sol">GPT-5.6 Sol — deepest code review</option>
                <option value="gpt-5.6">GPT-5.6 — balanced general review</option>
              </select>
            </div>
            <div className="settings-field stack">
              <div><label htmlFor="strictness-setting">Review strictness</label><p>Controls how selective the reviewer is when reporting issues.</p></div>
              <div className="segmented">
                {(["relaxed", "balanced", "strict"] as const).map((value) => (
                  <button key={value} className={draft.strictness === value ? "active" : ""} onClick={() => setDraft({ ...draft, strictness: value })}>
                    <strong>{value}</strong>
                    <span>{value === "relaxed" ? "Blockers only" : value === "balanced" ? "Recommended" : "Maximum coverage"}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="settings-field stack">
              <div><label htmlFor="instructions">Repository instructions</label><p>Persistent context applied to every AI review.</p></div>
              <textarea id="instructions" value={draft.instructions} onChange={(event) => setDraft({ ...draft, instructions: event.target.value })} placeholder="Example: Treat changes to billing as high risk. Require tests for new API routes." />
              <small className="char-count">{draft.instructions.length}/8,000</small>
            </div>
          </div>

          <div className="settings-section" id="interface-settings">
            <div className="section-title"><span><SlidersHorizontal size={17} /></span><div><h2>Review experience</h2><p>Choose how findings appear in the review console.</p></div></div>
            <div className="settings-field">
              <div><label>Expand findings by default</label><p>Show explanations and suggested fixes immediately.</p></div>
              <Toggle checked={draft.autoExpandFindings} onChange={(value) => setDraft({ ...draft, autoExpandFindings: value })} label="Expand findings by default" />
            </div>
            <div className="settings-field">
              <div><label>Show confidence scores</label><p>Display the reviewer's confidence for each finding.</p></div>
              <Toggle checked={draft.showConfidence} onChange={(value) => setDraft({ ...draft, showConfidence: value })} label="Show confidence scores" />
            </div>
          </div>

          <div className="settings-savebar">
            <span>{saved ? <><Check size={15} /> Settings saved</> : "Changes are saved in this browser."}</span>
            <button className="primary-button" onClick={save}><Save size={15} /> Save settings</button>
          </div>
        </section>
      </div>
    </main>
  );
}

export function ProfilePage({
  profile,
  onSave,
}: {
  profile: UserProfile;
  onSave: (next: UserProfile) => void;
}) {
  const [draft, setDraft] = useState(profile);
  const [editing, setEditing] = useState(false);
  const initials = draft.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  const update = (key: keyof UserProfile, value: string) => setDraft({ ...draft, [key]: value });

  const save = () => {
    onSave(draft);
    setEditing(false);
  };

  return (
    <main className="product-page profile-page">
      <PageHeading eyebrow="DEVELOPER ACCOUNT" title="Profile" description="Your identity and activity across ReviewPilot." />
      <section className="profile-hero">
        <div className="profile-avatar">{initials}<span /></div>
        <div className="profile-identity">
          <h2>{profile.name}</h2>
          <p>@{profile.username}</p>
          <div><span><Building2 size={13} /> {profile.company}</span><span><MapPin size={13} /> {profile.location}</span></div>
        </div>
        <button className="secondary-button" onClick={() => setEditing(!editing)}><UserRound size={15} /> {editing ? "Cancel editing" : "Edit profile"}</button>
      </section>

      <section className="profile-stats">
        <div><strong>24</strong><span>Reviews completed</span></div>
        <div><strong>71</strong><span>Issues prevented</span></div>
        <div><strong>86%</strong><span>Fix acceptance</span></div>
        <div><strong>8.4h</strong><span>Review time saved</span></div>
      </section>

      <div className="profile-grid">
        <section className="page-card profile-details">
          <div className="card-title"><div><h2>Developer details</h2><p>Profile information shown in your workspace.</p></div><CircleUserRound size={20} /></div>
          <div className="profile-form">
            <label><span>Full name</span><input disabled={!editing} value={draft.name} onChange={(event) => update("name", event.target.value)} /></label>
            <label><span>Username</span><input disabled={!editing} value={draft.username} onChange={(event) => update("username", event.target.value)} /></label>
            <label><span>Email</span><div className="input-icon"><Mail size={15} /><input disabled={!editing} type="email" value={draft.email} onChange={(event) => update("email", event.target.value)} /></div></label>
            <label><span>Role</span><input disabled={!editing} value={draft.role} onChange={(event) => update("role", event.target.value)} /></label>
            <label><span>Company</span><input disabled={!editing} value={draft.company} onChange={(event) => update("company", event.target.value)} /></label>
            <label><span>Location</span><input disabled={!editing} value={draft.location} onChange={(event) => update("location", event.target.value)} /></label>
            <label className="full"><span>Bio</span><textarea disabled={!editing} value={draft.bio} onChange={(event) => update("bio", event.target.value)} /></label>
          </div>
          {editing && <div className="profile-actions"><button className="primary-button" onClick={save}><Save size={15} /> Save profile</button></div>}
        </section>

        <aside className="profile-side">
          <section className="page-card">
            <div className="card-title"><div><h2>Connected accounts</h2><p>Developer services linked to your profile.</p></div></div>
            <div className="connected-account">
              <span><Github size={19} /></span>
              <div><strong>GitHub</strong><small>Not connected</small></div>
              <button title="GitHub integration is planned"><ExternalLink size={14} /></button>
            </div>
            <div className="connected-account">
              <span><KeyRound size={19} /></span>
              <div><strong>OpenAI</strong><small>Bring your own key</small></div>
              <span className="account-badge">Local</span>
            </div>
          </section>
          <section className="page-card developer-tier">
            <span><BookOpen size={18} /></span>
            <div><strong>Developer workspace</strong><p>Local-first review with complete control over source code and credentials.</p></div>
          </section>
        </aside>
      </div>
    </main>
  );
}
