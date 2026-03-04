import { useState, useEffect, useCallback } from "react";

const REPO = "PostHog/posthog";
const GITHUB_API = "https://api.github.com";

// ── palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:      "#0f0e17",
  surface: "#1a1828",
  card:    "#201e30",
  border:  "#2e2b44",
  accent:  "#ff6b35",   // PostHog-ish orange
  blue:    "#7b8cde",
  green:   "#56cfaa",
  yellow:  "#f7c948",
  red:     "#f85149",
  muted:   "#7c7a96",
  text:    "#ede8ff",
};

const S = {
  root: {
    fontFamily: "'IBM Plex Mono', 'Fira Code', monospace",
    background: C.bg,
    minHeight: "100vh",
    color: C.text,
    padding: "2rem",
    maxWidth: 1100,
    margin: "0 auto",
  },
  hero: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "2rem",
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    background: C.accent,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.4rem",
    flexShrink: 0,
  },
  title: { margin: 0, fontSize: "1.4rem", fontWeight: 700, letterSpacing: "-0.5px" },
  sub:   { margin: "0.2rem 0 0", fontSize: "0.75rem", color: C.muted },
  tokenRow: {
    display: "flex",
    gap: "0.75rem",
    marginBottom: "1.5rem",
    alignItems: "center",
    flexWrap: "wrap",
  },
  input: {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.text,
    padding: "0.5rem 0.9rem",
    fontSize: "0.8rem",
    fontFamily: "inherit",
    outline: "none",
    flex: "1 1 260px",
  },
  btn: (active) => ({
    background: active ? C.accent : C.surface,
    color: active ? "#000" : C.muted,
    border: `1px solid ${active ? C.accent : C.border}`,
    borderRadius: 6,
    padding: "0.5rem 1.1rem",
    fontFamily: "inherit",
    fontSize: "0.8rem",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.2s",
  }),
  error: {
    background: `${C.red}18`,
    border: `1px solid ${C.red}50`,
    borderRadius: 6,
    padding: "0.65rem 1rem",
    color: C.red,
    fontSize: "0.8rem",
    marginBottom: "1rem",
  },
  grid4: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "0.75rem",
    marginBottom: "1rem",
  },
  statCard: (color) => ({
    background: C.card,
    border: `1px solid ${C.border}`,
    borderLeft: `3px solid ${color}`,
    borderRadius: 8,
    padding: "1rem",
    textAlign: "center",
  }),
  statNum: (color) => ({ fontSize: "1.8rem", fontWeight: 700, color, lineHeight: 1, marginBottom: "0.3rem" }),
  statLabel: { fontSize: "0.65rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.8px" },
  section: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "1.25rem",
    marginBottom: "1rem",
  },
  sectionTitle: { fontSize: "0.65rem", color: C.muted, textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 1rem" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" },
  th: {
    textAlign: "left",
    color: C.muted,
    fontSize: "0.65rem",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    padding: "0.4rem 0.6rem",
    borderBottom: `1px solid ${C.border}`,
  },
  td: { padding: "0.5rem 0.6rem", borderBottom: `1px solid ${C.border}22` },
  avatar: { width: 20, height: 20, borderRadius: "50%", marginRight: "0.5rem", verticalAlign: "middle" },
  bar: (pct, color) => ({
    display: "inline-block",
    width: `${pct}%`,
    height: 6,
    background: color,
    borderRadius: 3,
    verticalAlign: "middle",
    transition: "width 0.4s",
  }),
  barBg: {
    display: "inline-block",
    width: "100%",
    height: 6,
    background: C.border,
    borderRadius: 3,
    marginTop: 4,
    overflow: "hidden",
  },
  tag: (color) => ({
    display: "inline-block",
    background: `${color}22`,
    color,
    borderRadius: 4,
    padding: "0 0.4rem",
    fontSize: "0.65rem",
    marginLeft: "0.4rem",
    verticalAlign: "middle",
  }),
  loading: { color: C.muted, textAlign: "center", padding: "3rem", fontSize: "0.85rem" },
  progress: {
    width: "100%",
    height: 3,
    background: C.border,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: "1.5rem",
  },
  progressBar: (pct) => ({
    height: "100%",
    width: `${pct}%`,
    background: C.accent,
    borderRadius: 2,
    transition: "width 0.4s",
  }),
};

// ── helpers ───────────────────────────────────────────────────────────────────
async function apiFetch(url, token) {
  const headers = { Accept: "application/vnd.github+json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.message || `HTTP ${res.status}`);
  }
  return { data: await res.json(), headers: res.headers };
}

async function fetchPaged(baseUrl, token, maxItems = 300) {
  let url = baseUrl + (baseUrl.includes("?") ? "&" : "?") + "per_page=100";
  let all = [];
  while (url && all.length < maxItems) {
    const { data, headers } = await apiFetch(url, token);
    all = [...all, ...data];
    const link = headers.get("Link") || "";
    const m = link.match(/<([^>]+)>;\s*rel="next"/);
    url = m ? m[1] : null;
  }
  return all;
}

// ── main component ────────────────────────────────────────────────────────────
export default function App() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("overview");

  const run = useCallback(async () => {
    setLoading(true); setError(null); setData(null); setProgress(0);
    const t = token.trim() || null;
    try {
      setProgressLabel("fetching repo info…"); setProgress(5);
      const { data: repo } = await apiFetch(`${GITHUB_API}/repos/${REPO}`, t);

      setProgressLabel("fetching commits…"); setProgress(15);
      const commits = await fetchPaged(`${GITHUB_API}/repos/${REPO}/commits`, t, 500);

      setProgressLabel("fetching pull requests…"); setProgress(40);
      const prs = await fetchPaged(`${GITHUB_API}/repos/${REPO}/pulls?state=all`, t, 300);

      setProgressLabel("fetching issues…"); setProgress(65);
      const issues = await fetchPaged(`${GITHUB_API}/repos/${REPO}/issues?state=all`, t, 300);
      const realIssues = issues.filter(i => !i.pull_request);

      setProgressLabel("fetching contributors…"); setProgress(82);
      const contribsRaw = await fetchPaged(`${GITHUB_API}/repos/${REPO}/contributors`, t, 100);

      setProgressLabel("processing…"); setProgress(95);

      // -- contributor map from commits
      const authorMap = {};
      const ensure = (login, avatar) => {
        if (!authorMap[login]) authorMap[login] = { login, avatar, commits: 0, prs: 0, issues: 0, additions: 0, deletions: 0 };
      };
      for (const c of commits) {
        const login = c.author?.login || c.commit?.author?.name || "unknown";
        const avatar = c.author?.avatar_url || null;
        ensure(login, avatar);
        authorMap[login].commits++;
      }
      for (const pr of prs) {
        const login = pr.user?.login || "unknown";
        ensure(login, pr.user?.avatar_url || null);
        authorMap[login].prs++;
      }
      for (const iss of realIssues) {
        const login = iss.user?.login || "unknown";
        ensure(login, iss.user?.avatar_url || null);
        authorMap[login].issues++;
      }
      // merge additions/deletions from contributors endpoint
      for (const c of contribsRaw) {
        if (authorMap[c.login]) {
          authorMap[c.login].contributions = c.contributions;
        }
      }

      const contributors = Object.values(authorMap).sort((a, b) => b.commits - a.commits);

      // -- commit activity last 12 months
      const now = new Date();
      const monthBuckets = {};
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthBuckets[key] = 0;
      }
      for (const c of commits) {
        const d = new Date(c.commit?.author?.date || "");
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (key in monthBuckets) monthBuckets[key]++;
      }

      // -- PR merge rate
      const merged = prs.filter(p => p.merged_at).length;
      const closed = prs.filter(p => p.state === "closed").length;

      // -- issue close rate
      const closedIssues = realIssues.filter(i => i.state === "closed").length;

      // -- day-of-week commit heatmap
      const dow = [0,0,0,0,0,0,0];
      for (const c of commits) {
        const d = new Date(c.commit?.author?.date || "");
        if (!isNaN(d)) dow[d.getDay()]++;
      }

      setProgress(100);
      setData({ repo, commits, prs, realIssues, contributors, monthBuckets, merged, closed, closedIssues, dow, contribsRaw });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // auto-run without token on mount
  useEffect(() => { run(); }, []); // eslint-disable-line

  const maxCommits = data ? Math.max(...data.contributors.map(c => c.commits), 1) : 1;
  const maxMonth   = data ? Math.max(...Object.values(data.monthBuckets), 1) : 1;
  const maxDow     = data ? Math.max(...(data.dow || [1]), 1) : 1;
  const DOW_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  return (
    <div style={S.root}>
      {/* Header */}
      <div style={S.hero}>
        <div style={S.logo}>🦔</div>
        <div>
          <h1 style={S.title}>PostHog · Contribution Analytics</h1>
          <p style={S.sub}>github.com/{REPO}  •  live data via GitHub API</p>
        </div>
      </div>

      {/* Token input */}
      <div style={S.tokenRow}>
        <input
          style={S.input}
          type="password"
          placeholder="GitHub token (optional — avoids 60 req/hr rate limit)"
          value={token}
          onChange={e => setToken(e.target.value)}
          onKeyDown={e => e.key === "Enter" && run()}
        />
        <button style={S.btn(true)} onClick={run} disabled={loading}>
          {loading ? "loading…" : "↺ refresh"}
        </button>
      </div>

      {/* Progress */}
      {loading && (
        <>
          <div style={S.progress}><div style={S.progressBar(progress)} /></div>
          <div style={S.loading}>{progressLabel}</div>
        </>
      )}

      {error && <div style={S.error}>⚠ {error}{error.includes("rate limit") ? " — add a GitHub token above to increase the limit." : ""}</div>}

      {data && (
        <>
          {/* Stat cards */}
          <div style={S.grid4}>
            {[
              { n: data.commits.length.toLocaleString(), l: "commits fetched", c: C.green },
              { n: data.prs.length.toLocaleString(), l: "pull requests", c: C.blue },
              { n: data.realIssues.length.toLocaleString(), l: "issues", c: C.yellow },
              { n: data.contributors.length.toLocaleString(), l: "contributors", c: C.accent },
              { n: data.repo.stargazers_count.toLocaleString(), l: "stars ⭐", c: C.yellow },
              { n: data.repo.forks_count.toLocaleString(), l: "forks", c: C.muted },
              { n: data.merged && data.closed ? `${Math.round(data.merged/data.closed*100)}%` : "—", l: "PR merge rate", c: C.green },
              { n: data.closedIssues && data.realIssues.length ? `${Math.round(data.closedIssues/data.realIssues.length*100)}%` : "—", l: "issue close rate", c: C.blue },
            ].map(({ n, l, c }) => (
              <div key={l} style={S.statCard(c)}>
                <div style={S.statNum(c)}>{n}</div>
                <div style={S.statLabel}>{l}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            {["overview", "contributors", "activity"].map(t => (
              <button key={t} style={S.btn(tab === t)} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>

          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <>
              {/* Commit activity */}
              <div style={S.section}>
                <p style={S.sectionTitle}>commit activity — last 12 months</p>
                <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 90 }}>
                  {Object.entries(data.monthBuckets).map(([month, count]) => (
                    <div key={month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div
                        title={`${month}: ${count} commits`}
                        style={{
                          width: "100%",
                          height: count > 0 ? `${Math.max((count / maxMonth) * 64, 4)}px` : 3,
                          background: count > 0 ? C.accent : C.border,
                          borderRadius: "3px 3px 0 0",
                          minHeight: 3,
                        }}
                      />
                      <span style={{ fontSize: "0.55rem", color: C.muted, transform: "rotate(-45deg)", whiteSpace: "nowrap" }}>
                        {month.slice(5)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Repo meta */}
              <div style={S.section}>
                <p style={S.sectionTitle}>repository info</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.5rem", fontSize: "0.8rem" }}>
                  {[
                    ["language",    data.repo.language || "—"],
                    ["default branch", data.repo.default_branch],
                    ["open issues", data.repo.open_issues_count],
                    ["watchers",    data.repo.watchers_count],
                    ["created",     data.repo.created_at?.slice(0,10)],
                    ["last push",   data.repo.pushed_at?.slice(0,10)],
                    ["license",     data.repo.license?.name || "none"],
                    ["size",        `${(data.repo.size/1024).toFixed(1)} MB`],
                  ].map(([k,v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0.5rem", background: C.surface, borderRadius: 5 }}>
                      <span style={{ color: C.muted }}>{k}</span>
                      <span style={{ color: C.text }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── CONTRIBUTORS ── */}
          {tab === "contributors" && (
            <div style={S.section}>
              <p style={S.sectionTitle}>top contributors (by commits fetched)</p>
              <table style={S.table}>
                <thead>
                  <tr>
                    {["#","user","commits","PRs","issues opened"].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.contributors.slice(0, 30).map((c, i) => (
                    <tr key={c.login}>
                      <td style={{ ...S.td, color: C.muted, width: "2rem" }}>{i + 1}</td>
                      <td style={S.td}>
                        {c.avatar && <img src={c.avatar} alt="" style={S.avatar} />}
                        <a href={`https://github.com/${c.login}`} target="_blank" rel="noreferrer"
                          style={{ color: C.text, textDecoration: "none" }}>
                          {c.login}
                        </a>
                        {i === 0 && <span style={S.tag(C.yellow)}>top</span>}
                      </td>
                      <td style={S.td}>
                        <span style={{ color: C.green }}>{c.commits}</span>
                        <div style={S.barBg}>
                          <div style={S.bar(Math.round((c.commits / maxCommits) * 100), C.green)} />
                        </div>
                      </td>
                      <td style={{ ...S.td, color: C.blue }}>{c.prs}</td>
                      <td style={{ ...S.td, color: C.yellow }}>{c.issues}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.contributors.length > 30 && (
                <p style={{ color: C.muted, fontSize: "0.7rem", marginTop: "0.5rem" }}>
                  showing top 30 of {data.contributors.length} contributors
                </p>
              )}
            </div>
          )}

          {/* ── ACTIVITY ── */}
          {tab === "activity" && (
            <>
              {/* Day of week heatmap */}
              <div style={S.section}>
                <p style={S.sectionTitle}>commits by day of week</p>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 80 }}>
                  {data.dow.map((count, i) => (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: "0.65rem", color: C.muted }}>{count}</span>
                      <div
                        title={`${DOW_LABELS[i]}: ${count} commits`}
                        style={{
                          width: "100%",
                          height: `${Math.max((count / maxDow) * 50, 3)}px`,
                          background: C.blue,
                          borderRadius: "3px 3px 0 0",
                          minHeight: 3,
                        }}
                      />
                      <span style={{ fontSize: "0.7rem", color: C.muted }}>{DOW_LABELS[i]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent commits */}
              <div style={S.section}>
                <p style={S.sectionTitle}>recent commits</p>
                <table style={S.table}>
                  <thead>
                    <tr>
                      {["author","message","date"].map(h => <th key={h} style={S.th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {data.commits.slice(0, 20).map((c) => {
                      const msg = c.commit?.message?.split("\n")[0] || "";
                      return (
                        <tr key={c.sha}>
                          <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                            {c.author?.avatar_url && <img src={c.author.avatar_url} alt="" style={S.avatar} />}
                            <span style={{ color: C.accent }}>{c.author?.login || c.commit?.author?.name || "—"}</span>
                          </td>
                          <td style={{ ...S.td, color: C.text, maxWidth: 400 }}>
                            <a href={c.html_url} target="_blank" rel="noreferrer"
                              style={{ color: C.text, textDecoration: "none" }}>
                              {msg.length > 72 ? msg.slice(0, 72) + "…" : msg}
                            </a>
                          </td>
                          <td style={{ ...S.td, color: C.muted, whiteSpace: "nowrap", fontSize: "0.7rem" }}>
                            {c.commit?.author?.date?.slice(0, 10)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
