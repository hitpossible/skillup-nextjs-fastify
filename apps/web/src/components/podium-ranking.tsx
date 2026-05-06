"use client"

import { useEffect, useState } from "react"

interface LeaderEntry {
  rank: number
  userId: string
  name: string
  completedCourses: number
}

const PODIUM_CONFIG = [
  // order: [2nd, 1st, 3rd] — standard podium layout
  {
    rank: 2,
    height: "h-28",
    bg: "from-slate-300 to-slate-400",
    avatarBg: "bg-slate-200",
    avatarText: "text-slate-700",
    podiumText: "text-slate-600",
    label: "bg-slate-100 text-slate-600",
    delay: { podium: "0.3s", avatar: "0.75s", name: "0.9s" },
    avatarSize: "w-16 h-16",
    avatarRing: "ring-2 ring-slate-300",
    glow: "",
  },
  {
    rank: 1,
    height: "h-40",
    bg: "from-amber-400 to-amber-500",
    avatarBg: "bg-amber-100",
    avatarText: "text-amber-800",
    podiumText: "text-amber-100",
    label: "bg-amber-50 text-amber-700",
    delay: { podium: "0.1s", avatar: "0.5s", name: "0.65s" },
    avatarSize: "w-20 h-20",
    avatarRing: "ring-4 ring-amber-400 ring-offset-2",
    glow: "shadow-[0_0_32px_rgba(251,191,36,0.45)]",
  },
  {
    rank: 3,
    height: "h-20",
    bg: "from-orange-400 to-orange-500",
    avatarBg: "bg-orange-100",
    avatarText: "text-orange-800",
    podiumText: "text-orange-100",
    label: "bg-orange-50 text-orange-700",
    delay: { podium: "0.5s", avatar: "1.0s", name: "1.15s" },
    avatarSize: "w-14 h-14",
    avatarRing: "ring-2 ring-orange-400",
    glow: "",
  },
]

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function PodiumRanking({
  entries,
  dictionary,
}: {
  entries: LeaderEntry[]
  dictionary: any
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(t)
  }, [])

  if (entries.length === 0) {
    return (
      <p className="text-center text-sm text-gray-400 py-8">
        {dictionary.leaderboard_empty}
      </p>
    )
  }

  const byRank = new Map(entries.map((e) => [e.rank, e]))

  return (
    <div className="relative pt-6 pb-2">
      {/* Decorative background dots */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
      >
        {[
          { top: "12%", left: "8%", size: 6, delay: "0s" },
          { top: "20%", left: "88%", size: 8, delay: "0.4s" },
          { top: "55%", left: "4%", size: 5, delay: "0.8s" },
          { top: "60%", left: "94%", size: 7, delay: "0.2s" },
          { top: "8%", left: "50%", size: 9, delay: "0.6s" },
        ].map((s, i) => (
          <span
            key={i}
            style={{
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              animationDelay: mounted ? s.delay : undefined,
              animation: mounted
                ? `starPop 0.5s cubic-bezier(.34,1.56,.64,1) both, floatBob 3s ease-in-out ${s.delay} infinite`
                : "none",
              opacity: 0,
            }}
            className="absolute rounded-full bg-amber-300/60"
          />
        ))}
      </div>

      {/* Stage */}
      <div className="flex items-end justify-center gap-3 sm:gap-5">
        {PODIUM_CONFIG.map((cfg) => {
          const entry = byRank.get(cfg.rank)
          if (!entry) return null

          return (
            <div
              key={cfg.rank}
              className="flex flex-col items-center gap-2"
              style={{ minWidth: cfg.rank === 1 ? 140 : 112 }}
            >
              {/* Crown for #1 */}

              {/* Avatar */}
              <div
                className={`
                  ${cfg.avatarSize} ${cfg.avatarBg} ${cfg.avatarRing} ${cfg.glow}
                  rounded-full flex items-center justify-center font-bold text-lg
                  ${cfg.avatarText} select-none
                `}
                style={{
                  animation: mounted
                    ? `avatarDrop 0.55s cubic-bezier(.34,1.56,.64,1) ${cfg.delay.avatar} both`
                    : "none",
                  opacity: mounted ? undefined : 0,
                }}
              >
                {getInitials(entry.name)}
              </div>

              {/* Name */}
              <div
                className="text-center"
                style={{
                  animation: mounted
                    ? `fadeSlideUp 0.4s ease ${cfg.delay.name} both`
                    : "none",
                  opacity: mounted ? undefined : 0,
                }}
              >
                <p className="text-sm font-semibold text-gray-800 leading-tight max-w-[120px] truncate">
                  {entry.name}
                </p>
                <p className={`mt-0.5 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.label}`}>
                  {entry.completedCourses} {dictionary.leaderboard_courses}
                </p>
              </div>

              {/* Podium block */}
              <div
                className={`w-full bg-gradient-to-b ${cfg.bg} rounded-t-xl flex items-center justify-center ${cfg.height}`}
                style={{
                  transformOrigin: "bottom",
                  animation: mounted
                    ? `podiumRise 0.55s cubic-bezier(.34,1.56,.64,1) ${cfg.delay.podium} both`
                    : "none",
                  opacity: mounted ? undefined : 0,
                }}
              >
                <span className={`text-2xl font-black ${cfg.podiumText}`}>
                  {cfg.rank}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Stage floor */}
      <div
        className="h-2 rounded-b-xl bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 mx-0"
        style={{
          animation: mounted ? `fadeSlideUp 0.3s ease 0.1s both` : "none",
          opacity: mounted ? undefined : 0,
        }}
      />
    </div>
  )
}
