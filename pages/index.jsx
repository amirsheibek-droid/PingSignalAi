import React, { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  RefreshCw, Cpu, TrendingUp, Wrench, Radio, ChevronRight, ExternalLink, AlertCircle, X, Lock,
  Gavel, Mail, Download, Trash2, Zap, Calendar, WifiOff, Bell, BellOff, Plus, ShieldCheck,
  CheckCircle2, Clock, Trash, Sparkles, Infinity as InfinityIcon, TrendingUp as TrendUp, Filter, Check, Minus,
  Route, HelpCircle,
} from "lucide-react";
import { saveOfflineFeed, loadOfflineFeed } from "../lib/offlineCache";
import { registerPush } from "../lib/push";
import { playPing } from "../lib/sound";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function CubixBackground() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    let w, h, stars, cubes;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function resize() { w = canvas.width = canvas.offsetWidth * devicePixelRatio; h = canvas.height = canvas.offsetHeight * devicePixelRatio; }
    function init() {
      resize();
      stars = Array.from({ length: 90 }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.2 + 0.2, tw: Math.random() * Math.PI * 2 }));
      cubes = Array.from({ length: 4 }, (_, i) => ({ cx: (w / 5) * (i + 1) + (Math.random() - 0.5) * 80, cy: h * (0.15 + Math.random() * 0.7), size: 26 + Math.random() * 34, rot: Math.random() * Math.PI, speed: (0.0006 + Math.random() * 0.0008) * (i % 2 === 0 ? 1 : -1) }));
    }
    function project(x, y, z, rot) {
      const cos = Math.cos(rot), sin = Math.sin(rot);
      const rx = x * cos - z * sin, rz = x * sin + z * cos;
      const scale = 220 / (220 + rz);
      return { x: rx * scale, y: y * scale };
    }
    function drawCube(c, t) {
      const s = c.size;
      const verts = [[-s,-s,-s],[s,-s,-s],[s,s,-s],[-s,s,-s],[-s,-s,s],[s,-s,s],[s,s,s],[-s,s,s]];
      const rot = c.rot + t * c.speed;
      const pts = verts.map((v) => { const p = project(v[0], v[1], v[2], rot); return { x: c.cx + p.x, y: c.cy + p.y }; });
      const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
      ctx.strokeStyle = "rgba(255,178,56,0.16)";
      ctx.lineWidth = 1 * devicePixelRatio;
      edges.forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(pts[a].x, pts[a].y); ctx.lineTo(pts[b].x, pts[b].y); ctx.stroke(); });
    }
    function frame(t) {
      ctx.clearRect(0, 0, w, h);
      stars.forEach((s) => { const alpha = 0.35 + 0.35 * Math.sin(t * 0.001 + s.tw); ctx.fillStyle = `rgba(232,236,241,${alpha * 0.5})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * devicePixelRatio, 0, Math.PI * 2); ctx.fill(); });
      cubes.forEach((c) => drawCube(c, t));
      if (!reduce) raf = requestAnimationFrame(frame);
    }
    init(); frame(0); if (reduce) frame(0);
    window.addEventListener("resize", init);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", init); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" />;
}

function Logo({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="11" fill="#131B2C" stroke="#1E293B" strokeWidth="1" />
      <path d="M5 21 H13 L16 12 L21 29 L25 17 L27.5 21 H35" stroke="#FFB238" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

const CATS = [
  { key: "all", label: "All", icon: Radio },
  { key: "models", label: "Models", icon: Cpu },
  { key: "industry", label: "Industry", icon: TrendingUp },
  { key: "tools", label: "Tools", icon: Wrench },
  { key: "compliance", label: "Compliance", icon: Gavel },
];
const CAT_COLOR = { models: "#5EEAD4", industry: "#FFB238", tools: "#A78BFA", compliance: "#FF6B6B" };

const TAG_OPTIONS = [
  { key: "employment", label: "Hiring / worker management" },
  { key: "biometrics", label: "Biometric ID / facial or voice recognition" },
  { key: "credit_insurance", label: "Credit, insurance, or benefits decisions" },
  { key: "general_purpose", label: "General-purpose AI feature (chat, generation, summarisation)" },
];

// Our own honest, dogfooded compliance status — visible so you (and
// prospective customers) never have to just take our word for it.
const OUR_COMPLIANCE = {
  lastReviewed: "7 July 2026",
  nextReviewDue: "7 October 2026",
  items: [
    { label: "Server-side API keys, never exposed to browser", status: "done" },
    { label: "Real authentication (magic link) on every request", status: "done" },
    { label: "Row Level Security on all database tables", status: "done" },
    { label: "GDPR: access & erasure tools live in Account Settings", status: "done" },
    { label: "GDPR: Data Processing Agreements accepted (Stripe/Supabase/Anthropic)", status: "pending" },
    { label: "EU representative appointed (Article 27)", status: "pending" },
    { label: "Own AI Act self-assessment on file (Annex I/III test)", status: "done" },
    { label: "Legal review of Privacy Policy / Terms by a solicitor", status: "pending" },
  ],
};

const PRIVACY_TEXT = `Last updated: 7 July 2026

WHAT WE COLLECT AND WHY
- Email — necessary to run your subscription and let you sign in (contract).
- Subscription tier and billing status (contract).
- Automatic refresh consent — only for the Pro tier (refreshed every 4 hours), only with your explicit opt-in (consent).
- Your registered AI systems and their category tags (optional) — used only to filter compliance news to what's relevant to you.
- Daily usage count (Free tier) — a simple counter for fair-use limits.

SUB-PROCESSORS
Supabase (database), Stripe (payments), Anthropic (search/summarisation — never receives your email or registered systems, only a generic search instruction).

EU REPRESENTATIVE
[Company name] has appointed an EU representative under Article 27 GDPR: [add contact before EU launch].

CALIFORNIA RESIDENTS (CPRA)
We do not sell or share your personal information. You may request access, deletion, or correction via Account Settings.

YOUR RIGHTS
Access, erasure, portability, and withdrawal of consent are available directly in Account Settings.

CONTACT
Data protection queries can be directed to the app's operator.`;

const TERMS_TEXT = `Last updated: 7 July 2026

TIERS
- Free: tap to refresh, up to 5×/week — after that, upgrade for fast, continuous updates.
- Pro (£5/month): refreshed automatically every 4 hours — 6x more often than a daily newsletter — optionally personalised to your registered systems.

NOT PROFESSIONAL ADVICE
Content is AI-generated summary of third-party reporting, for general awareness only — not financial, legal, investment, or professional advice.

ACCURACY
Summaries may contain errors or omissions. Always verify against the original source before relying on any headline, especially compliance deadlines.

CANCELLATION
Cancel any time; deleting your account cancels billing and erases your data.

LIABILITY
To the fullest extent permitted by law, the app's operator is not liable for decisions made based on content shown in this app.`;

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState(null);

  const [tier, setTier] = useState("pull");
  const [weeklyConsent, setWeeklyConsent] = useState(false);
  const [subChecking, setSubChecking] = useState(false);
  const [subError, setSubError] = useState(null);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [upgradePrompt, setUpgradePrompt] = useState(false);
  const [upgradeConsent, setUpgradeConsent] = useState(false);
  const [offline, setOffline] = useState(false);
  const [active, setActive] = useState("all");
  const [relevantOnly, setRelevantOnly] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [legalOpen, setLegalOpen] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [complianceOpen, setComplianceOpen] = useState(false);
  const [actionPlanItem, setActionPlanItem] = useState(null);
  const [actionPlan, setActionPlan] = useState(null);
  const [actionPlanLoading, setActionPlanLoading] = useState(false);
  const [actionPlanError, setActionPlanError] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [systemsOpen, setSystemsOpen] = useState(false);
  const [systems, setSystems] = useState([]);
  const [newSystemName, setNewSystemName] = useState("");
  const [newSystemTags, setNewSystemTags] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notifBusy, setNotifBusy] = useState(false);
  const firstLoad = useRef(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, sess) => setSession(sess));
    return () => listener.subscription.unsubscribe();
  }, []);

  const authedHeaders = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${data?.session?.access_token || ""}` };
  }, []);

  const fetchNews = useCallback(async () => {
    setLoading(true); setError(null); setOffline(false); setUpgradePrompt(false);
    try {
      const headers = await authedHeaders();
      const response = await fetch("/api/news", { method: "POST", headers: { "Content-Type": "application/json", ...headers } });
      if (response.status === 402) { setError("Your subscription isn't active."); return; }
      if (response.status === 429) { const d = await response.json(); setError(d.error); setUpgradePrompt(!!d.upgrade); return; }
      if (!response.ok) throw new Error("Request failed (" + response.status + ")");
      const data = await response.json();
      const clean = (data.items || [])
        .filter((it) => it && it.headline && it.category)
        .map((it, i) => ({
          id: `${Date.now()}-${i}`,
          headline: String(it.headline),
          source: String(it.source || "Unknown"),
          url: it.url && /^https?:\/\//.test(it.url) ? it.url : null,
          category: CAT_COLOR[it.category] ? it.category : "tools",
          jurisdiction: String(it.jurisdiction || "Global"),
          summary: String(it.summary || ""),
          recency: String(it.recency || "recent"),
          deadlineImpact: String(it.deadline_impact || ""),
        }));
      setItems(clean);
      setLastUpdated(data.refreshedAt ? new Date(data.refreshedAt) : new Date());
      saveOfflineFeed(clean);
      if (notificationsEnabled && clean.length) playPing();
    } catch (e) {
      const cached = await loadOfflineFeed();
      if (cached?.items?.length) { setItems(cached.items); setLastUpdated(cached.savedAt ? new Date(cached.savedAt) : null); setOffline(true); }
      else setError(e.message || "Couldn't load the feed. Try again.");
    } finally { setLoading(false); }
  }, [authedHeaders, notificationsEnabled]);

  const loadSystems = useCallback(async () => {
    const headers = await authedHeaders();
    const res = await fetch("/api/systems", { headers });
    if (res.ok) { const d = await res.json(); setSystems(d.systems || []); }
  }, [authedHeaders]);

  useEffect(() => {
    if (session && firstLoad.current) {
      firstLoad.current = false;
      // Show the last-known feed INSTANTLY (no spinner, no wait) while a
      // fresh pull happens silently behind it — this is the perceived-speed
      // win: the app never opens to a blank loading screen the way waiting
      // for a newsletter to load or render does.
      (async () => {
        const cached = await loadOfflineFeed();
        if (cached?.items?.length) {
          setItems(cached.items);
          setLastUpdated(cached.savedAt ? new Date(cached.savedAt) : null);
        }
        fetchNews(); // silently replaces with fresh data once it lands
      })();
      loadSystems();
      registerPush(supabase);
      (async () => {
        const headers = await authedHeaders();
        const res = await fetch("/api/account/preferences", { headers });
        if (res.ok) { const d = await res.json(); setNotificationsEnabled(d.notificationsEnabled); setIsPro(d.tier === "push"); }
      })();
    }
  }, [session, fetchNews, loadSystems, authedHeaders]);

  const toggleNotifications = async () => {
    setNotifBusy(true);
    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    const headers = await authedHeaders();
    await fetch("/api/account/preferences", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ notificationsEnabled: next }) });
    if (next) playPing();
    setNotifBusy(false);
  };

  const handleSendLink = async () => {
    if (!email) return;
    setAuthBusy(true); setAuthError(null);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: process.env.NEXT_PUBLIC_APP_URL } });
    setAuthBusy(false);
    if (error) setAuthError(error.message); else setLinkSent(true);
  };

  const handleSubscribe = async () => {
    if (!email) return;
    if (tier === "push" && !weeklyConsent) { setSubError("Please tick the consent box to enable automatic refresh."); return; }
    setSubChecking(true); setSubError(null);
    try {
      if (tier === "pull") {
        await handleSendLink();
      } else {
        const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, weeklyConsent }) });
        const data = await res.json();
        if (data.url) window.location.href = data.url; else setSubError(data.error || "Couldn't start checkout.");
      }
    } catch (e) { setSubError("Something went wrong."); }
    finally { setSubChecking(false); }
  };

  const openActionPlan = async (item) => {
    setActionPlanItem(item);
    setActionPlan(null);
    setActionPlanError(null);
    if (!isPro) return; // modal will show the upgrade nudge instead of loading
    setActionPlanLoading(true);
    try {
      const headers = await authedHeaders();
      const res = await fetch("/api/action-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ headline: item.headline, summary: item.summary, jurisdiction: item.jurisdiction, deadlineImpact: item.deadlineImpact }),
      });
      const data = await res.json();
      if (!res.ok) { setActionPlanError(data.error || "Couldn't build an action plan."); return; }
      setActionPlan(data.plan);
    } catch (e) {
      setActionPlanError("Couldn't reach the server.");
    } finally {
      setActionPlanLoading(false);
    }
  };

  const handleUpgradeNow = async () => {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: session.user.email, weeklyConsent: true }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  const handleExport = async () => { const headers = await authedHeaders(); const res = await fetch("/api/account/export", { headers }); const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "pingsignal-my-data.json"; a.click(); };
  const handleDelete = async () => { if (!window.confirm("This permanently deletes your account, cancels billing, and erases all your data. Continue?")) return; const headers = await authedHeaders(); await fetch("/api/account/delete", { method: "POST", headers }); await supabase.auth.signOut(); setSession(null); };

  const toggleNewTag = (key) => setNewSystemTags((prev) => (prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]));
  const addSystem = async () => {
    if (!newSystemName.trim()) return;
    const headers = await authedHeaders();
    const res = await fetch("/api/systems", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ name: newSystemName, tags: newSystemTags }) });
    if (res.ok) { setNewSystemName(""); setNewSystemTags([]); loadSystems(); }
  };
  const removeSystem = async (id) => { const headers = await authedHeaders(); await fetch("/api/systems", { method: "DELETE", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ id }) }); loadSystems(); };

  const myTags = new Set(systems.flatMap((s) => s.tags || []));
  const catFiltered = active === "all" ? items : items.filter((it) => it.category === active);
  const visible = relevantOnly && myTags.size ? catFiltered.filter((it) => it.category !== "compliance" || myTags.has(it.subcat) || true) : catFiltered;
  const ticker = items.length ? items.map((it) => it.headline).join("   ///   ") : "PINGSIGNAL AI IS WARMING UP   ///   PULLING THE LATEST AI NEWS";
  const fontImport = "@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');";

  if (!session) {
    return (
      <div style={{ fontFamily: "'Inter', sans-serif" }} className="relative min-h-screen bg-[#0B1220] text-[#E8ECF1] overflow-hidden">
        <style>{`${fontImport} .disp{font-family:'Space Grotesk',sans-serif;}`}</style>
        <CubixBackground />
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-12">
          <Logo size={52} />
          <h1 className="disp text-4xl sm:text-5xl font-bold text-white mt-4 tracking-tight">Ping<span className="text-[#FFB238]">Signal</span> <span className="text-[#5A6478] text-2xl align-top">AI</span></h1>
          <p className="text-[13.5px] sm:text-[15px] text-[#8B95A7] mt-1 mb-10 text-center max-w-sm">Free reads slow. Pro pings fast — and tells you exactly what to do about it.</p>

          <div className="w-full max-w-sm sm:max-w-md">
            <div className="bg-[#131B2C]/90 backdrop-blur border border-[#1E293B] rounded-2xl p-5 mb-4">
              <p className="text-[12.5px] font-medium text-white mb-3">Choose your plan:</p>
              <button onClick={() => setTier("pull")} className={"w-full text-left rounded-xl border p-3 mb-2 transition " + (tier === "pull" ? "border-[#FFB238] bg-[#1A1A12]" : "border-[#1E293B]")}>
                <div className="flex items-center gap-2 mb-1"><Zap size={14} className="text-[#FFB238]" /><span className="text-[13px] font-semibold text-white">Free — tap when curious</span></div>
                <p className="text-[11.5px] text-[#8B95A7]">Refresh on demand, up to 5×/week. After that, get fast, continuous updates instead.</p>
              </button>
              <button onClick={() => setTier("push")} className={"w-full text-left rounded-xl border p-3 mb-1 transition " + (tier === "push" ? "border-[#FFB238] bg-[#1A1A12]" : "border-[#1E293B]")}>
                <div className="flex items-center gap-2 mb-1"><Calendar size={14} className="text-[#FFB238]" /><span className="text-[13px] font-semibold text-white">Pro — £5/month</span></div>
                <p className="text-[11.5px] text-[#8B95A7]">Refreshed automatically every 4 hours — billed to your subscription.</p>
                <p className="text-[10.5px] text-[#5A6478] mt-1">Covers the AI cost of staying fast and accurate, plus a fair bit that goes to me for building and running it.</p>
              </button>
              {tier === "push" && (
                <label className="flex items-start gap-2 mt-2 mb-1">
                  <input type="checkbox" checked={weeklyConsent} onChange={(e) => setWeeklyConsent(e.target.checked)} className="mt-0.5" />
                  <span className="text-[11px] text-[#8B95A7]">I agree to automated searches run on my behalf every 4 hours, billed to my subscription. I can withdraw and switch to Free at any time.</span>
                </label>
              )}
            </div>

            <div className="bg-[#131B2C]/90 backdrop-blur border border-[#1E293B] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3"><Lock size={15} className="text-[#FFB238]" /><span className="text-[13px] font-medium text-white">Get started</span></div>
              <input type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#0B1220] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-[13.5px] text-white placeholder-[#5A6478] mb-3 outline-none focus:border-[#FFB238]" />
              <button onClick={handleSubscribe} disabled={!email || subChecking} className="w-full bg-[#FFB238] text-[#0B1220] font-semibold text-[13.5px] rounded-xl py-2.5 mb-2 disabled:opacity-50">
                {subChecking ? "One moment…" : tier === "push" ? "Subscribe — £5/month" : "Get started free"}
              </button>
              {subError && <p className="text-[11.5px] text-[#F87171] mb-2">{subError}</p>}
              <div className="border-t border-[#1E293B] my-3" />
              <p className="text-[11.5px] text-[#8B95A7] mb-2">Already signed up? Sign in with a magic link.</p>
              <button onClick={handleSendLink} disabled={!email || authBusy || linkSent} className="w-full flex items-center justify-center gap-2 border border-[#1E293B] text-[12.5px] text-white rounded-xl py-2.5 disabled:opacity-50">
                <Mail size={14} />{linkSent ? "Check your email for the link" : authBusy ? "Sending…" : "Email me a sign-in link"}
              </button>
              {authError && <p className="text-[11.5px] text-[#F87171] mt-2">{authError}</p>}
            </div>
          </div>

          <div className="flex items-center gap-4 mt-8 flex-wrap justify-center">
            <button onClick={() => setLegalOpen("privacy")} className="text-[11px] text-[#5A6478] underline underline-offset-2">Privacy Policy</button>
            <button onClick={() => setLegalOpen("terms")} className="text-[11px] text-[#5A6478] underline underline-offset-2">Terms of Service</button>
            <button onClick={() => setComplianceOpen(true)} className="text-[11px] text-[#5A6478] underline underline-offset-2 flex items-center gap-1"><ShieldCheck size={11} />Our own compliance status</button>
          </div>
        </div>

        {legalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50" onClick={() => setLegalOpen(null)}>
            <div className="bg-[#0F1626] border border-[#1E293B] rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4"><h2 className="disp text-lg font-semibold text-white">{legalOpen === "privacy" ? "Privacy Policy" : "Terms of Service"}</h2><button onClick={() => setLegalOpen(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#131B2C] border border-[#1E293B]"><X size={15} className="text-[#8B95A7]" /></button></div>
              <pre className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-[#AEB6C4]">{legalOpen === "privacy" ? PRIVACY_TEXT : TERMS_TEXT}</pre>
            </div>
          </div>
        )}
        <ComplianceModal open={complianceOpen} onClose={() => setComplianceOpen(false)} />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="relative min-h-screen bg-[#0B1220] text-[#E8ECF1]">
      <style>{`
        ${fontImport}
        .disp{font-family:'Space Grotesk',sans-serif;} .mono{font-family:'JetBrains Mono',monospace;}
        @keyframes marquee{0%{transform:translateX(0);}100%{transform:translateX(-50%);}}
        .marquee-track{animation:marquee 32s linear infinite;}
        @media (prefers-reduced-motion: reduce){.marquee-track{animation:none;}}
        .cardpress:active{transform:scale(0.985);}
        .feed-grid{display:grid;grid-template-columns:1fr;gap:0.75rem;}
        @media (min-width:768px){.feed-grid{grid-template-columns:repeat(2,1fr);}}
        @media (min-width:1200px){.feed-grid{grid-template-columns:repeat(3,1fr);}}
      `}</style>

      <div className="border-b border-[#1E293B] bg-[#0B1220] overflow-hidden py-2 relative z-10">
        <div className="flex whitespace-nowrap marquee-track mono text-[11px] tracking-wide text-[#8B95A7]"><span className="px-4">{ticker}</span><span className="px-4">{ticker}</span></div>
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="px-5 sm:px-8 pt-5 pb-4">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <Logo size={34} />
              <div>
                <h1 className="disp text-3xl sm:text-4xl font-bold tracking-tight text-white leading-none">Ping<span className="text-[#FFB238]">Signal</span> <span className="text-[#5A6478] text-xl align-top">AI</span></h1>
                <p className="text-[13px] text-[#8B95A7] mt-1">AI &amp; tech, distilled — not the firehose.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <button onClick={() => setSystemsOpen(true)} className="flex items-center gap-1.5 px-3 h-10 rounded-full bg-[#131B2C] border border-[#1E293B] text-[12px] text-[#8B95A7]"><Plus size={14} />My systems</button>
              <button onClick={fetchNews} disabled={loading} aria-label="Refresh feed" className="flex items-center justify-center w-10 h-10 rounded-full bg-[#131B2C] border border-[#1E293B] active:scale-95 transition disabled:opacity-50"><RefreshCw size={17} className={loading ? "animate-spin text-[#FFB238]" : "text-[#8B95A7]"} /></button>
              <button onClick={() => setAccountOpen(true)} aria-label="Account" className="flex items-center justify-center w-10 h-10 rounded-full bg-[#131B2C] border border-[#1E293B] active:scale-95 transition text-[11px] text-[#8B95A7] font-medium">{session.user.email?.[0]?.toUpperCase()}</button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {lastUpdated && <p className="mono text-[10.5px] text-[#5A6478]">Last pulled {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>}
            {loading && items.length > 0 && <span className="flex items-center gap-1 text-[10.5px] text-[#FFB238]"><RefreshCw size={10} className="animate-spin" />Updating in the background…</span>}
            {offline && <span className="flex items-center gap-1 text-[10.5px] text-[#FFB238]"><WifiOff size={11} />Showing cached feed — offline</span>}
          </div>
        </div>

        <div className="px-5 sm:px-8 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
          {CATS.map((c) => {
            const IconEl = c.icon;
            const isActive = active === c.key;
            const color = c.key !== "all" ? CAT_COLOR[c.key] : null;
            return (
              <button key={c.key} onClick={() => setActive(c.key)}
                className={"flex items-center gap-1.5 shrink-0 px-3.5 py-2 rounded-full text-[12.5px] font-medium border transition " + (isActive ? "text-[#0B1220] border-transparent" : "bg-transparent text-[#8B95A7] border-[#1E293B]")}
                style={isActive ? { background: color || "#E8ECF1" } : undefined}>
                <IconEl size={13} />{c.label}
              </button>
            );
          })}
        </div>

        <div className="px-5 sm:px-8 pb-10">
          {loading && items.length === 0 && (<div className="flex flex-col items-center justify-center py-24 gap-3"><RefreshCw size={22} className="animate-spin text-[#FFB238]" /><p className="text-[13px] text-[#8B95A7]">Scanning the web for what actually matters…</p></div>)}
          {error && upgradePrompt && <UpgradeScreen error={error} onUpgrade={handleUpgradeNow} consent={upgradeConsent} setConsent={setUpgradeConsent} onDismiss={() => { setError(null); setUpgradePrompt(false); }} />}
          {error && !upgradePrompt && (<div className="flex items-start gap-2.5 bg-[#1C1420] border border-[#3A1F26] rounded-2xl p-4 mb-4"><AlertCircle size={17} className="text-[#F87171] shrink-0 mt-0.5" /><div><p className="text-[13px] text-[#F1D5D5] font-medium">Feed didn't load</p><p className="text-[12px] text-[#8B95A7] mt-0.5">{error}</p></div></div>)}
          {!loading && !error && visible.length === 0 && items.length > 0 && <p className="text-center text-[13px] text-[#8B95A7] py-16">Nothing in this category right now.</p>}

          <div className="feed-grid">
            {visible.map((it) => {
              const isCompliance = it.category === "compliance";
              return (
                <a key={it.id} href={it.url || undefined} target={it.url ? "_blank" : undefined} rel={it.url ? "noopener noreferrer" : undefined}
                  onClick={(e) => { if (!it.url) e.preventDefault(); }}
                  className={"cardpress block rounded-2xl p-4 transition border " + (isCompliance ? "bg-[#2A1315] border-[#B00020]" : "bg-[#131B2C] border-[#1E293B] hover:border-[#FFB238]/50") + (it.url ? " cursor-pointer" : " cursor-default")}>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: CAT_COLOR[it.category] }} />
                    <span className="mono text-[10.5px] uppercase tracking-wider font-bold" style={{ color: isCompliance ? "#FF6B6B" : CAT_COLOR[it.category] }}>{isCompliance ? "⚠ Compliance" : it.category}</span>
                    <span className="text-[#3A4459]">•</span><span className="text-[11px] text-[#5A6478]">{it.recency}</span>
                  </div>
                  <h3 className="disp text-[16.5px] font-semibold leading-snug text-white mb-1.5">{it.headline}</h3>
                  <p className="text-[13px] text-[#AEB6C4] leading-relaxed mb-2">{it.summary}</p>
                  {it.deadlineImpact && (
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <Clock size={11} className="text-[#FF6B6B]" />
                      <span className="text-[11.5px] text-[#FF9F9F] font-medium">{it.deadlineImpact}</span>
                    </div>
                  )}
                  {isCompliance && (
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); openActionPlan(it); }}
                      className="w-full flex items-center justify-center gap-1.5 bg-[#B00020]/15 border border-[#B00020]/40 rounded-lg py-2 mb-2.5 text-[11.5px] font-semibold text-[#FF9F9F]"
                    >
                      <Route size={13} />Do I need to act? Get the action plan
                    </button>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[11.5px] text-[#5A6478] font-medium">{it.source}</span>
                    {it.url ? <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: isCompliance ? "#FF6B6B" : "#FFB238" }}>Read source <ExternalLink size={12} /></span> : <ChevronRight size={14} className="text-[#3A4459]" />}
                  </div>
                </a>
              );
            })}
          </div>

          {items.length === 0 && !loading && !error && <div className="text-center py-16"><p className="text-[13px] text-[#8B95A7]">No feed yet.</p></div>}

          <div className="flex items-center justify-center gap-4 pt-6 pb-2 flex-wrap">
            <button onClick={() => setLegalOpen("privacy")} className="text-[11.5px] text-[#5A6478] underline underline-offset-2">Privacy Policy</button>
            <span className="text-[#2A3448]">•</span>
            <button onClick={() => setLegalOpen("terms")} className="text-[11.5px] text-[#5A6478] underline underline-offset-2">Terms of Service</button>
            <span className="text-[#2A3448]">•</span>
            <button onClick={() => setComplianceOpen(true)} className="text-[11.5px] text-[#5A6478] underline underline-offset-2 flex items-center gap-1"><ShieldCheck size={12} />Our own compliance status</button>
          </div>
        </div>
      </div>

      {legalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50" onClick={() => setLegalOpen(null)}>
          <div className="bg-[#0F1626] border border-[#1E293B] rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="disp text-lg font-semibold text-white">{legalOpen === "privacy" ? "Privacy Policy" : "Terms of Service"}</h2><button onClick={() => setLegalOpen(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#131B2C] border border-[#1E293B]"><X size={15} className="text-[#8B95A7]" /></button></div>
            <pre className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-[#AEB6C4]">{legalOpen === "privacy" ? PRIVACY_TEXT : TERMS_TEXT}</pre>
          </div>
        </div>
      )}

      {systemsOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50" onClick={() => setSystemsOpen(false)}>
          <div className="bg-[#0F1626] border border-[#1E293B] rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="disp text-lg font-semibold text-white">My AI systems</h2><button onClick={() => setSystemsOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#131B2C] border border-[#1E293B]"><X size={15} className="text-[#8B95A7]" /></button></div>
            <p className="text-[12px] text-[#8B95A7] mb-4">Add each product you've built and tag what it does. This is optional — it's only used to help you spot which compliance items matter most to you.</p>
            <div className="space-y-2 mb-4">
              {systems.map((s) => (
                <div key={s.id} className="flex items-center justify-between bg-[#131B2C] border border-[#1E293B] rounded-xl px-3.5 py-2.5">
                  <div><p className="text-[13px] text-white font-medium">{s.name}</p><p className="text-[11px] text-[#8B95A7]">{(s.tags || []).map((t) => TAG_OPTIONS.find((o) => o.key === t)?.label || t).join(", ") || "No tags"}</p></div>
                  <button onClick={() => removeSystem(s.id)} aria-label="Remove"><Trash size={14} className="text-[#5A6478]" /></button>
                </div>
              ))}
              {!systems.length && <p className="text-[12px] text-[#5A6478] text-center py-4">No systems added yet.</p>}
            </div>
            <div className="border-t border-[#1E293B] pt-4">
              <input value={newSystemName} onChange={(e) => setNewSystemName(e.target.value)} placeholder="e.g. Contract Analyzer" className="w-full bg-[#131B2C] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder-[#5A6478] mb-3 outline-none focus:border-[#FFB238]" />
              <p className="text-[11.5px] text-[#8B95A7] mb-2">What does it do?</p>
              <div className="space-y-1.5 mb-3">
                {TAG_OPTIONS.map((t) => (
                  <label key={t.key} className="flex items-start gap-2"><input type="checkbox" checked={newSystemTags.includes(t.key)} onChange={() => toggleNewTag(t.key)} className="mt-0.5" /><span className="text-[12px] text-[#C9D0DC]">{t.label}</span></label>
                ))}
              </div>
              <button onClick={addSystem} disabled={!newSystemName.trim()} className="w-full bg-[#FFB238] text-[#0B1220] font-semibold text-[13px] rounded-xl py-2.5 disabled:opacity-50">Add system</button>
            </div>
          </div>
        </div>
      )}

      {accountOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50" onClick={() => setAccountOpen(false)}>
          <div className="bg-[#0F1626] border border-[#1E293B] rounded-t-3xl sm:rounded-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="disp text-lg font-semibold text-white">Account</h2><button onClick={() => setAccountOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#131B2C] border border-[#1E293B]"><X size={15} className="text-[#8B95A7]" /></button></div>
            <p className="text-[12.5px] text-[#8B95A7] mb-4">{session.user.email}</p>
            <button onClick={toggleNotifications} disabled={notifBusy} className="w-full flex items-center justify-between border border-[#1E293B] rounded-xl py-2.5 px-3.5 mb-2">
              <span className="flex items-center gap-2 text-[12.5px] text-white">{notificationsEnabled ? <Bell size={14} className="text-[#FFB238]" /> : <BellOff size={14} className="text-[#5A6478]" />}Ping sound &amp; notifications</span>
              <span className={"w-9 h-5 rounded-full relative transition " + (notificationsEnabled ? "bg-[#FFB238]" : "bg-[#2A3448]")}><span className={"absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all " + (notificationsEnabled ? "left-4" : "left-0.5")} /></span>
            </button>
            <button onClick={handleExport} className="w-full flex items-center gap-2 justify-center border border-[#1E293B] text-[12.5px] text-white rounded-xl py-2.5 mb-2"><Download size={14} />Export my data (GDPR)</button>
            <button onClick={handleDelete} className="w-full flex items-center gap-2 justify-center border border-[#3A1F26] text-[12.5px] text-[#F87171] rounded-xl py-2.5 mb-2"><Trash2 size={14} />Delete my account &amp; all data</button>
            <button onClick={async () => { await supabase.auth.signOut(); setSession(null); setAccountOpen(false); }} className="w-full text-[12px] text-[#5A6478] underline underline-offset-2 py-2">Sign out</button>
          </div>
        </div>
      )}

      <ComplianceModal open={complianceOpen} onClose={() => setComplianceOpen(false)} />
      <ActionPlanModal
        item={actionPlanItem}
        plan={actionPlan}
        loading={actionPlanLoading}
        error={actionPlanError}
        isPro={isPro}
        onClose={() => setActionPlanItem(null)}
        onUpgrade={() => { setActionPlanItem(null); setError("Upgrade to unlock action plans."); setUpgradePrompt(true); }}
      />
    </div>
  );
}

function UpgradeScreen({ error, onUpgrade, consent, setConsent, onDismiss }) {
  const rows = [
    { label: "Turn a law change into a yes/no action plan", free: false, pro: true, proWin: true },
    { label: "Speed — how fast you're pinged", free: "Manual, when you remember", pro: "Automatic, every 4 hours", proWin: true },
    { label: "Feels like opening a newsletter", free: "Yes — wait for it to load", pro: "No — opens instantly, cached", proWin: true },
    { label: "News categories", free: true, pro: true },
    { label: "Compliance & regulation tracking", free: true, pro: true },
    { label: "Ping sound + notifications", free: true, pro: true },
    { label: "Personalised to your registered systems", free: false, pro: true },
    { label: "Source links on every item", free: true, pro: true },
    { label: "Priced against your time, not a subscription tax", free: null, pro: "~£0.16/day", proWin: true },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1220] overflow-y-auto">
      <div className="max-w-lg mx-auto px-6 py-10">
        <div className="flex justify-end mb-2">
          <button onClick={onDismiss} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#131B2C] border border-[#1E293B]"><X size={15} className="text-[#8B95A7]" /></button>
        </div>

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#1A1A12] border-2 border-[#FFB238] flex items-center justify-center mx-auto mb-4">
            <Sparkles size={24} className="text-[#FFB238]" />
          </div>
          <p className="disp text-2xl font-bold text-white mb-2">You're clearly finding this useful.</p>
          <p className="text-[13px] text-[#8B95A7] max-w-xs mx-auto">{error} Reading the news is free-tier. Turning it into a yes/no action plan for what you've built — that's the real unlock.</p>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6 text-center">
          <div className="bg-[#131B2C] border border-[#1E293B] rounded-2xl p-4">
            <InfinityIcon size={18} className="text-[#5EEAD4] mx-auto mb-1.5" />
            <p className="text-[11px] text-[#8B95A7]">No weekly limit</p>
          </div>
          <div className="bg-[#131B2C] border border-[#1E293B] rounded-2xl p-4">
            <RefreshCw size={18} className="text-[#FFB238] mx-auto mb-1.5" />
            <p className="text-[11px] text-[#8B95A7]">Refreshed every 4hrs</p>
          </div>
          <div className="bg-[#131B2C] border border-[#1E293B] rounded-2xl p-4">
            <Filter size={18} className="text-[#A78BFA] mx-auto mb-1.5" />
            <p className="text-[11px] text-[#8B95A7]">Filtered to your systems</p>
          </div>
        </div>

        <div className="bg-[#131B2C] border border-[#1E293B] rounded-2xl overflow-hidden mb-6">
          <div className="grid grid-cols-3 px-4 py-2.5 bg-[#0F1626] border-b border-[#1E293B]">
            <span className="text-[11px] text-[#5A6478] font-medium">Feature</span>
            <span className="text-[11px] text-[#5A6478] font-medium text-center">Free</span>
            <span className="text-[11px] text-[#FFB238] font-semibold text-center">Pro</span>
          </div>
          {rows.map((r, i) => (
            <div key={i} className={"grid grid-cols-3 px-4 py-3 items-center " + (i !== rows.length - 1 ? "border-b border-[#1E293B]" : "")}>
              <span className="text-[11.5px] text-[#C9D0DC] pr-2">{r.label}</span>
              <span className="text-center">
                {r.free === true ? <Check size={14} className="text-[#5A6478] mx-auto" /> : r.free === false ? <Minus size={14} className="text-[#3A4459] mx-auto" /> : <span className="text-[10.5px] text-[#8B95A7]">{r.free}</span>}
              </span>
              <span className="text-center">
                {r.pro === true ? <Check size={14} className="text-[#5EEAD4] mx-auto" /> : <span className={"text-[10.5px] font-medium " + (r.proWin ? "text-[#FFB238]" : "text-[#5EEAD4]")}>{r.pro}</span>}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-b from-[#1A1A12] to-[#131B2C] border-2 border-[#FFB238] rounded-2xl p-5 mb-4">
          <div className="flex items-baseline gap-1 justify-center mb-1">
            <span className="disp text-3xl font-bold text-white">£5</span>
            <span className="text-[13px] text-[#8B95A7]">/month</span>
          </div>
          <p className="text-[11px] text-[#8B95A7] text-center mb-4">Cancel any time. That's about 16p a day.</p>
          <p className="text-[10.5px] text-[#5A6478] text-center mb-4 leading-relaxed">Where it goes: the AI cost of searching and staying accurate every 4 hours, plus a fair bit that goes to me for building and keeping this running.</p>
          <label className="flex items-start gap-2 mb-3 text-left">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
            <span className="text-[11px] text-[#8B95A7]">I agree to automated searches run on my behalf every 4 hours, billed to my subscription. I can withdraw and switch to Free at any time.</span>
          </label>
          <button onClick={onUpgrade} disabled={!consent} className="w-full bg-[#FFB238] text-[#0B1220] font-semibold text-[14px] rounded-xl py-3 disabled:opacity-50">
            Upgrade to Pro
          </button>
        </div>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <span className="flex items-center gap-1 text-[10.5px] text-[#5A6478]"><ShieldCheck size={11} />GDPR-ready</span>
          <span className="flex items-center gap-1 text-[10.5px] text-[#5A6478]"><Lock size={11} />Secure by design</span>
          <span className="flex items-center gap-1 text-[10.5px] text-[#5A6478]"><Check size={11} />Cancel anytime</span>
        </div>

        <button onClick={onDismiss} className="w-full text-center text-[11.5px] text-[#5A6478] underline underline-offset-2 mt-6">Not now, take me back</button>
      </div>
    </div>
  );
}

function ActionPlanModal({ item, plan, loading, error, isPro, onClose, onUpgrade }) {
  if (!item) return null;
  const applies = plan?.applies;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#0F1626] border border-[#1E293B] rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="disp text-lg font-semibold text-white flex items-center gap-2"><Route size={17} className="text-[#FF6B6B]" />Action plan</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#131B2C] border border-[#1E293B]"><X size={15} className="text-[#8B95A7]" /></button>
        </div>
        <p className="text-[12px] text-[#8B95A7] mb-4 leading-relaxed">{item.headline}</p>

        {!isPro && (
          <div className="text-center py-6">
            <Lock size={22} className="text-[#FFB238] mx-auto mb-3" />
            <p className="text-[13.5px] font-semibold text-white mb-1">Action plans are a Pro feature.</p>
            <p className="text-[12px] text-[#8B95A7] mb-4 max-w-xs mx-auto">Anyone can read the news. Pro turns it into "do I need to act, and what exactly do I do" — a real yes/no path, not another headline.</p>
            <button onClick={onUpgrade} className="bg-[#FFB238] text-[#0B1220] font-semibold text-[13px] rounded-xl py-2.5 px-6">See Pro plans</button>
          </div>
        )}

        {isPro && loading && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <RefreshCw size={20} className="animate-spin text-[#FFB238]" />
            <p className="text-[12.5px] text-[#8B95A7]">Building your decision path…</p>
          </div>
        )}

        {isPro && error && (
          <div className="flex items-start gap-2.5 bg-[#1C1420] border border-[#3A1F26] rounded-2xl p-4"><AlertCircle size={17} className="text-[#F87171] shrink-0 mt-0.5" /><p className="text-[12.5px] text-[#8B95A7]">{error}</p></div>
        )}

        {isPro && plan && (
          <div>
            {/* Decision map: single yes/no/unclear node */}
            <div className="flex flex-col items-center mb-4">
              <div className="bg-[#131B2C] border border-[#1E293B] rounded-xl px-4 py-2.5 text-center mb-2">
                <p className="text-[11px] text-[#8B95A7] flex items-center gap-1.5 justify-center"><HelpCircle size={12} />Does this apply to your registered systems?</p>
              </div>
              <div className="w-px h-4 bg-[#2A3448]" />
              <div className={
                "rounded-full px-5 py-2 font-bold text-[13px] mb-1 " +
                (applies === "yes" ? "bg-[#B00020] text-white" : applies === "no" ? "bg-[#1B7A3D] text-white" : "bg-[#5A4A1A] text-[#FFD98A]")
              }>
                {applies === "yes" ? "YES — action needed" : applies === "no" ? "NO — no action needed" : "UNCLEAR — check manually"}
              </div>
            </div>

            <p className="text-[12.5px] text-[#C9D0DC] leading-relaxed mb-4 text-center">{plan.reasoning}</p>

            {plan.steps?.length > 0 && (
              <div className="space-y-2 mb-4">
                {plan.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5 bg-[#131B2C] border border-[#1E293B] rounded-xl px-3.5 py-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#FFB238] text-[#0B1220] text-[10.5px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <span className="text-[12.5px] text-white">{step}</span>
                  </div>
                ))}
              </div>
            )}

            {plan.suggested_deadline && (
              <div className="flex items-center gap-1.5 justify-center mb-2">
                <Clock size={12} className="text-[#FF6B6B]" />
                <span className="text-[11.5px] text-[#FF9F9F] font-medium">{plan.suggested_deadline}</span>
              </div>
            )}
            <p className="text-[10.5px] text-[#5A6478] text-center mt-3">Not legal advice — a starting point. Confirm anything deadline-critical with a professional.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ComplianceModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#0F1626] border border-[#1E293B] rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="disp text-lg font-semibold text-white flex items-center gap-2"><ShieldCheck size={17} className="text-[#5EEAD4]" />Our own compliance status</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#131B2C] border border-[#1E293B]"><X size={15} className="text-[#8B95A7]" /></button>
        </div>
        <p className="text-[11.5px] text-[#8B95A7] mb-1">We track our own regulatory obligations here too — no hiding behind "trust us."</p>
        <p className="mono text-[10.5px] text-[#5A6478] mb-4">Last reviewed {OUR_COMPLIANCE.lastReviewed} · Next review due {OUR_COMPLIANCE.nextReviewDue}</p>
        <div className="space-y-2">
          {OUR_COMPLIANCE.items.map((it, i) => (
            <div key={i} className="flex items-center gap-2.5 bg-[#131B2C] border border-[#1E293B] rounded-xl px-3.5 py-2.5">
              {it.status === "done" ? <CheckCircle2 size={15} className="text-[#5EEAD4] shrink-0" /> : <Clock size={15} className="text-[#FFB238] shrink-0" />}
              <span className="text-[12.5px] text-[#C9D0DC]">{it.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
