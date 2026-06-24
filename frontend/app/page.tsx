"use client";

import { useState, useRef, useCallback } from "react";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
type Severity = "illegal" | "void" | "warning" | "ok";

interface Finding {
  severity: Severity;
  clause_quote: string;
  legal_ref: string;
  plain_english: string;
  negotiation_script: string;
}

interface AuditResult {
  safety_score: number;
  summary: string;
  findings: Finding[];
}

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────
const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; color: string; bg: string; border: string; icon: string }
> = {
  illegal: {
    label: "ILLEGAL",
    color: "text-red-400",
    bg: "bg-red-950/40",
    border: "border-red-500/60",
    icon: "🚨",
  },
  void: {
    label: "VOID",
    color: "text-orange-400",
    bg: "bg-orange-950/40",
    border: "border-orange-500/60",
    icon: "⚠️",
  },
  warning: {
    label: "WARNING",
    color: "text-yellow-400",
    bg: "bg-yellow-950/30",
    border: "border-yellow-500/60",
    icon: "📋",
  },
  ok: {
    label: "GOOD",
    color: "text-emerald-400",
    bg: "bg-emerald-950/30",
    border: "border-emerald-500/60",
    icon: "✅",
  },
};

const LEGAL_HELP_URL =
  "https://wusa.ca/services/student-supports/student-legal-protection-program/";

const API_BASE =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL) ||
  "http://localhost:8000";

// ──────────────────────────────────────────────
// Goose SVG Mascot
// ──────────────────────────────────────────────
function GooseLawyer({ size = 80 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Legal Goose mascot"
    >
      <ellipse cx="50" cy="85" rx="28" ry="22" fill="white" />
      <ellipse cx="72" cy="82" rx="12" ry="8" fill="#e2e8f0" transform="rotate(15 72 82)" />
      <ellipse cx="50" cy="62" rx="10" ry="18" fill="white" />
      <ellipse cx="50" cy="42" rx="16" ry="14" fill="white" />
      <path d="M62 42 L74 40 L72 46 Z" fill="#F5C518" />
      <circle cx="58" cy="38" r="3" fill="#0f172a" />
      <circle cx="59" cy="37" r="1" fill="white" />
      <ellipse cx="50" cy="32" rx="18" ry="7" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
      <rect x="34" y="29" width="4" height="14" rx="2" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.5" />
      <rect x="62" y="29" width="4" height="14" rx="2" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.5" />
      <circle cx="36" cy="38" r="3" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.5" />
      <circle cx="64" cy="38" r="3" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.5" />
      <path d="M38 70 L50 65 L62 70 L62 78 L50 80 L38 78 Z" fill="#1e293b" />
      <path d="M44 70 L50 67 L56 70 L56 75 L50 76 L44 75 Z" fill="white" />
      <rect x="20" y="90" width="18" height="14" rx="2" fill="#92400e" stroke="#78350f" strokeWidth="1" />
      <rect x="24" y="88" width="10" height="4" rx="1" fill="#92400e" stroke="#78350f" strokeWidth="1" />
      <line x1="20" y1="97" x2="38" y2="97" stroke="#78350f" strokeWidth="1" />
      <line x1="29" y1="90" x2="29" y2="104" stroke="#78350f" strokeWidth="1" />
      <path d="M40 104 L36 110 L38 110 L40 107 L42 110 L44 110 L46 107 L48 110 L50 110 L46 104 Z" fill="#F5C518" />
      <path d="M52 104 L48 110 L50 110 L52 107 L54 110 L56 110 L58 107 L60 110 L62 110 L58 104 Z" fill="#F5C518" />
    </svg>
  );
}

// ──────────────────────────────────────────────
// Safety Score Ring
// ──────────────────────────────────────────────
function SafetyScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? "#34d399" : score >= 60 ? "#facc15" : score >= 40 ? "#fb923c" : "#f87171";
  const circumference = 2 * Math.PI * 38;
  const progress = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="38" fill="none" stroke="#1e293b" strokeWidth="10" />
          <circle
            cx="50" cy="50" r="38" fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black" style={{ color }}>{score}</span>
          <span className="text-[10px] text-slate-400 font-semibold tracking-widest">/100</span>
        </div>
      </div>
      <p className="text-xs text-slate-400 font-medium tracking-wider uppercase">Safety Score</p>
    </div>
  );
}

// ──────────────────────────────────────────────
// Finding Card
// ──────────────────────────────────────────────
function FindingCard({ finding, index }: { finding: Finding; index: number }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(finding.severity === "illegal");
  const cfg = SEVERITY_CONFIG[finding.severity];

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(finding.negotiation_script);
    } catch {
      const el = document.createElement("textarea");
      el.value = finding.negotiation_script;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [finding.negotiation_script]);

  return (
    <div
      className={`rounded-2xl border ${cfg.bg} ${cfg.border} overflow-hidden transition-all duration-200`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-start gap-3 p-4 text-left"
        aria-expanded={expanded}
      >
        <span className="text-xl flex-shrink-0 mt-0.5">{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-black tracking-widest uppercase ${cfg.color} px-2 py-0.5 rounded-full border ${cfg.border}`}>
              {cfg.label}
            </span>
            <span className="text-xs text-slate-500 font-mono">{finding.legal_ref}</span>
          </div>
          <p className="mt-1.5 text-sm text-slate-300 font-medium leading-snug line-clamp-2">
            {finding.plain_english}
          </p>
        </div>
        <span className="text-slate-500 flex-shrink-0 mt-1">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Offending Clause
            </p>
            <blockquote className="text-sm text-slate-300 italic bg-black/30 rounded-lg px-3 py-2 border-l-4 border-white/20 font-mono leading-relaxed">
              "{finding.clause_quote}"
            </blockquote>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Negotiation Script
            </p>
            <p className="text-sm text-slate-300 bg-black/20 rounded-lg p-3 leading-relaxed whitespace-pre-wrap">
              {finding.negotiation_script}
            </p>
          </div>
          {finding.severity !== "ok" && (
            <button
              onClick={handleCopy}
              className={`w-full py-3 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 flex items-center justify-center gap-2
                ${copied
                  ? "bg-emerald-600 text-white"
                  : "bg-[#F5C518] text-black hover:bg-yellow-400 active:scale-95"
                }`}
            >
              {copied ? "✓ Copied to Clipboard!" : "📋 Copy Negotiation Script"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────
export default function SubletGoosePage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setResult(null);
    setError(null);
    if (selected.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
    } else {
      setPreview(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? `Server error (${res.status})`);
      }
      const data: AuditResult = await res.json();
      setResult(data);
      setTimeout(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const illegalCount = result?.findings.filter((f) => f.severity === "illegal").length ?? 0;
  const voidCount = result?.findings.filter((f) => f.severity === "void").length ?? 0;

  return (
    <div className="min-h-screen bg-[#070d1a] text-slate-100 font-sans">

      {/* Sticky Safety Score Bar */}
      {result && (
        <div className="sticky top-0 z-50 bg-[#070d1a]/95 backdrop-blur border-b border-white/10 px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center gap-4">
            <SafetyScoreBadge score={result.safety_score} />
            <div className="flex-1">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Lease Audit Complete
              </p>
              <div className="flex flex-wrap gap-2 mt-1">
                {illegalCount > 0 && (
                  <span className="text-xs bg-red-950 text-red-400 border border-red-500/50 rounded-full px-2 py-0.5 font-bold">
                    🚨 {illegalCount} Illegal
                  </span>
                )}
                {voidCount > 0 && (
                  <span className="text-xs bg-orange-950 text-orange-400 border border-orange-500/50 rounded-full px-2 py-0.5 font-bold">
                    ⚠️ {voidCount} Void
                  </span>
                )}
              </div>
            </div>
            <a
              href={LEGAL_HELP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 bg-[#F5C518] text-black text-xs font-black px-3 py-2 rounded-xl hover:bg-yellow-400 transition-colors"
            >
              Get Help
            </a>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 pb-24">

        {/* Hero */}
        <header className="text-center pt-10 pb-6">
          <div className="flex justify-center mb-3">
            <GooseLawyer size={90} />
          </div>
          <h1 className="text-4xl font-black tracking-tight">
            <span className="text-[#F5C518]">Sublet</span>
            <span className="text-white"> Goose</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto leading-relaxed">
            Drop your lease. Our legal goose will hunt down every illegal clause.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 bg-blue-950/50 border border-blue-500/30 rounded-full px-3 py-1">
            <span className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase">
              🍁 Ontario RTA Powered
            </span>
          </div>
        </header>

        {/* Upload Zone */}
        <section className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`relative rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 p-8 text-center
              ${file
                ? "border-[#F5C518]/60 bg-yellow-950/20"
                : "border-slate-700 bg-slate-900/50 hover:border-slate-500 hover:bg-slate-900"
              }`}
          >
            {/* Hybrid input: camera on mobile, file picker on desktop */}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/*"
              capture="environment"
              onChange={handleFileChange}
              className="sr-only"
              aria-label="Upload or photograph your lease"
            />

            {preview ? (
              <img src={preview} alt="Lease preview" className="max-h-48 mx-auto rounded-lg object-contain" />
            ) : (
              <>
                <div className="text-5xl mb-3">{file?.type === "application/pdf" ? "📄" : "📸"}</div>
                <p className="text-slate-300 font-semibold text-base">
                  {file ? file.name : "Tap to upload or photograph lease"}
                </p>
                <p className="text-slate-500 text-xs mt-1">PDF or photo · Max 10MB</p>
              </>
            )}
            {file && !preview && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <span className="text-[#F5C518] text-sm font-semibold">📄 {file.name}</span>
              </div>
            )}
          </div>

          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={!file || loading}
            className={`w-full py-4 rounded-2xl text-base font-black tracking-wide transition-all duration-200 flex items-center justify-center gap-2
              ${!file || loading
                ? "bg-slate-800 text-slate-600 cursor-not-allowed"
                : "bg-[#F5C518] text-black hover:bg-yellow-400 active:scale-95 shadow-lg shadow-yellow-900/30"
              }`}
          >
            {loading ? (
              <><span className="animate-spin text-lg">🪿</span><span>Goose is reviewing...</span></>
            ) : (
              <><span>🔍</span><span>Audit My Lease</span></>
            )}
          </button>

          {error && (
            <div className="rounded-2xl border border-red-500/40 bg-red-950/30 p-4 text-sm text-red-400">
              <p className="font-bold mb-1">⚠️ Analysis failed</p>
              <p>{error}</p>
            </div>
          )}
        </section>

        {/* Results */}
        {result && (
          <section id="results" className="mt-8 space-y-4">
            {/* Summary Card */}
            <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-5">
              <div className="flex items-center gap-3 mb-3">
                <SafetyScoreBadge score={result.safety_score} />
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                    Overall Assessment
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed mt-1">{result.summary}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-200 uppercase tracking-wider">
                Negotiation Dashboard
              </h2>
              <span className="text-xs text-slate-500">{result.findings.length} findings</span>
            </div>

            {(["illegal", "void", "warning", "ok"] as Severity[]).map((sev) =>
              result.findings
                .filter((f) => f.severity === sev)
                .map((finding, i) => (
                  <FindingCard key={`${sev}-${i}`} finding={finding} index={i} />
                ))
            )}

            {/* Legal Help CTA */}
            <div className="rounded-2xl border border-blue-500/30 bg-blue-950/30 p-5 text-center space-y-3">
              <GooseLawyer size={50} />
              <p className="text-sm font-bold text-slate-200">
                Need a real lawyer? The goose has backup.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                WUSA's Student Legal Protection Program offers free legal consultations
                for University of Waterloo students.
              </p>
              <a
                href={LEGAL_HELP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3.5 bg-[#F5C518] text-black rounded-xl text-sm font-black tracking-wide hover:bg-yellow-400 active:scale-95 transition-all"
              >
                🦆 Get Free Legal Help → WUSA SLPP
              </a>
            </div>
          </section>
        )}

        {/* Disclaimer */}
        <footer className="mt-10 text-center space-y-2 pb-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              <span className="font-semibold text-slate-400">Social Impact Disclosure:</span>{" "}
              This tool provides educational information based on the Ontario Residential
              Tenancies Act (RTA) and is{" "}
              <span className="underline">not a substitute for legal advice</span>. Always
              consult a qualified legal professional for your specific situation.
            </p>
          </div>
          <p className="text-xs text-slate-700">
            Built at UW Hackathon · Powered by Claude · 🍁 Ontario RTA 2006
          </p>
        </footer>
      </div>
    </div>
  );
}
