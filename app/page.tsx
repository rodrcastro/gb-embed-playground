import Link from "next/link";

import FloatingEmbedPortal from "./components/FloatingEmbedPortal";
import GitBookEmbed from "./components/GitBookEmbed";
import GitBookEmbedNpm from "./components/GitBookEmbedNpm";
import GitBookEmbedScript from "./components/GitBookEmbedScript";

const features = [
  {
    title: "Pulse-aware sync",
    description:
      "Nebula Sync watches every creative surface and keeps asset states aligned without noisy polling.",
  },
  {
    title: "Scenes, not folders",
    description:
      "Organize deliveries by moments in a campaign, then track every revision in a living timeline.",
  },
  {
    title: "Intentional handoffs",
    description:
      "Route approvals through smart checkpoints and surface blockers before they stall launch.",
  },
];

const metrics = [
  { label: "Workspaces aligned", value: "148" },
  { label: "Median sync time", value: "2.4s" },
  { label: "Live incidents", value: "0" },
];

type EmbedMode = "react" | "npm" | "script";

const EMBED_MODES: Array<{ id: EmbedMode; label: string }> = [
  { id: "react", label: "React" },
  { id: "npm", label: "NPM" },
  { id: "script", label: "Script" },
];

function parseEmbedMode(value?: string): EmbedMode {
  if (value === "react" || value === "npm" || value === "script") {
    return value;
  }

  return "react";
}

function renderEmbed(mode: EmbedMode) {
  if (mode === "npm") {
    return <GitBookEmbedNpm />;
  }

  if (mode === "script") {
    return <GitBookEmbedScript />;
  }

  return <GitBookEmbed />;
}

function renderFloatingEmbed(mode: EmbedMode) {
  if (mode === "script") {
    return <GitBookEmbedScript />;
  }

  return <FloatingEmbedPortal>{renderEmbed(mode)}</FloatingEmbedPortal>;
}

function NebulaIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <radialGradient
          id="nebulaGlow"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(48 40) rotate(45) scale(120)"
        >
          <stop stopColor="#9F7AEA" />
          <stop offset="0.55" stopColor="#4C1D95" />
          <stop offset="1" stopColor="#1A1036" />
        </radialGradient>
        <linearGradient
          id="nebulaFlow"
          x1="25"
          y1="32"
          x2="135"
          y2="140"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#C4B5FD" stopOpacity="0.9" />
          <stop offset="0.6" stopColor="#7C3AED" stopOpacity="0.4" />
          <stop offset="1" stopColor="#312E81" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <circle cx="80" cy="80" r="70" fill="url(#nebulaGlow)" />
      <path
        d="M32 88C32 58 55 36 85 36C112 36 129 50 129 70C129 90 111 105 84 105C64 105 54 115 54 129C54 139 63 146 76 148C52 146 32 124 32 88Z"
        fill="url(#nebulaFlow)"
      />
      <path
        d="M62 70L66 58L70 70L82 74L70 78L66 90L62 78L50 74L62 70Z"
        fill="#F5F1FF"
        opacity="0.9"
      />
      <circle cx="102" cy="52" r="4" fill="#EDE9FE" />
      <circle cx="118" cy="94" r="2" fill="#EDE9FE" opacity="0.7" />
    </svg>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ embed?: string }>;
}) {
  const params = await searchParams;
  const activeEmbed = parseEmbedMode(params?.embed);

  return (
    <div className="nebula-shell">
      <div className="nebula-content mx-auto flex max-w-6xl flex-col gap-16 px-6 pb-24 pt-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="nebula-orb soft-ring flex h-12 w-12 items-center justify-center">
              <NebulaIcon className="h-10 w-10" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.38em] text-white/60">
                Nebula Sync
              </p>
              <p className="text-sm nebula-muted">
                Harmonize creative operations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/50">
            <span className="hidden sm:inline">Product</span>
            <span className="hidden sm:inline">Docs</span>
            <span className="hidden sm:inline">Security</span>
          </div>
          <button className="rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-white transition hover:bg-white/20">
            Request access
          </button>
        </header>

        <div className="embed-toggle-wrap">
          <div className="embed-toggle" role="tablist" aria-label="Embed mode">
            {EMBED_MODES.map((mode) => (
              <Link
                key={mode.id}
                href={`/?embed=${mode.id}`}
                scroll={false}
                className={`embed-toggle-link ${activeEmbed === mode.id ? "is-active" : ""}`}
              >
                {mode.label}
              </Link>
            ))}
          </div>
        </div>

        <main className="flex flex-col gap-16">
          <section className="grid gap-12 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="flex flex-col gap-8">
              <span className="nebula-tag w-fit rounded-full px-4 py-1 text-xs uppercase tracking-[0.3em]">
                Product Preview
              </span>
              <div className="flex flex-col gap-6">
                <h1 className="font-display text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
                  The calm control layer for fast-moving product launches.
                </h1>
                <p className="text-lg leading-relaxed nebula-muted">
                  Nebula Sync keeps your creative, engineering, and product
                  teams in lockstep. Watch revisions settle in real time, spin
                  up version-specific spaces, and keep every launch aligned from
                  first draft to final signal.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <button className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#1c1631] transition hover:-translate-y-0.5 hover:bg-white/90">
                  Start a pilot
                </button>
                <button className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-white/50 hover:text-white">
                  Explore live docs
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="glass-card animate-fade-up rounded-2xl px-4 py-3 delay-1"
                  >
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                      {metric.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-white">
                      {metric.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card animate-float flex flex-col gap-6 rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm uppercase tracking-[0.32em] text-white/60">
                  Sync Timeline
                </p>
                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-200">
                  Stable
                </span>
              </div>
              <div className="nebula-orb mx-auto flex h-48 w-48 items-center justify-center">
                <NebulaIcon className="h-40 w-40" />
              </div>
              <div className="flex flex-col gap-3 text-sm nebula-muted">
                <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                  <span>Release Scene 09</span>
                  <span className="text-white">Synced 12s ago</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                  <span>Asset Review</span>
                  <span className="text-white">Awaiting sign-off</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                  <span>Orbits Delta</span>
                  <span className="text-white">Aligned</span>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="glass-card animate-fade-up rounded-3xl p-6 delay-2"
              >
                <h2 className="font-display text-2xl text-white">
                  {feature.title}
                </h2>
                <p className="mt-4 text-sm leading-relaxed nebula-muted">
                  {feature.description}
                </p>
              </div>
            ))}
          </section>

          <section className="grid gap-10">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <div className="nebula-orb flex h-11 w-11 items-center justify-center">
                  <NebulaIcon className="h-9 w-9" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                    Embedded Docs
                  </p>
                  <p className="text-lg font-semibold text-white">
                    GitBook, inside Nebula Sync.
                  </p>
                </div>
              </div>
              <p className="text-base leading-relaxed nebula-muted">
                Compare the three embed implementations from a single page. The
                toggle at the top switches between React, npm, and script
                versions.
              </p>
              <div className="glass-card rounded-2xl p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                  Suggested launches
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/80">
                  <span className="rounded-full border border-white/20 px-3 py-1">
                    Launch readiness checklist
                  </span>
                  <span className="rounded-full border border-white/20 px-3 py-1">
                    Sync API quickstart
                  </span>
                  <span className="rounded-full border border-white/20 px-3 py-1">
                    Incident response flow
                  </span>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
      {renderFloatingEmbed(activeEmbed)}
    </div>
  );
}
