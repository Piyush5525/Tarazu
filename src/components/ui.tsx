"use client";
import { motion, useReducedMotion } from "framer-motion";
import { Volume2, Square } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { speak, stopSpeaking } from "@/lib/voice";
import { grams } from "@/lib/ledger/units";
import { useT } from "@/lib/i18n";

/** "Listen" button: reads the given text aloud in the chosen language. On every card a karigar must understand. */
export function Speak({ text, className = "", label = true }: { text: string; className?: string; label?: boolean }) {
  const lang = useStore((s) => s.lang);
  const t = useT();
  const [on, setOn] = useState(false);
  useEffect(() => () => stopSpeaking(), []);
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); if (on) { stopSpeaking(); setOn(false); } else { setOn(true); speak(text, lang, () => setOn(false)); } }}
      className={`inline-flex min-h-12 items-center gap-2 rounded-full border border-gold/50 bg-gold-2/25 px-4 text-sm font-bold text-gold-deep active:scale-95 ${className}`}
      aria-label={t({ en: "Listen", hi: "सुनो", bn: "শোনো" })}
    >
      {on ? <Square size={18} fill="currentColor" /> : <Volume2 size={20} />}
      {label && <span>{on ? t({ en: "Stop", hi: "रोको", bn: "থামো" }) : t({ en: "Listen", hi: "सुनो", bn: "শোনো" })}</span>}
    </button>
  );
}

/** Card that leans toward the pointer / finger in 3D. */
export function Tilt({ children, className = "", max = 9 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const move = (e: React.PointerEvent) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.transform = `rotateY(${x * max}deg) rotateX(${-y * max}deg) translateZ(0)`;
  };
  return (
    <div className="persp h-full">
      <div ref={ref} onPointerMove={move} onPointerLeave={() => ref.current && (ref.current.style.transform = "")} className={`tilt h-full ${className}`}>
        {children}
      </div>
    </div>
  );
}

export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, delay, ease: [0.2, 0.8, 0.2, 1] }}>
      {children}
    </motion.div>
  );
}

/** Weight, always three decimals, mono, with unit. */
export function Grams({ mg, className = "", unit = true }: { mg: number; className?: string; unit?: boolean }) {
  return (
    <span className={`num ${className}`}>
      {grams(mg)}
      {unit && <span className="ml-1 text-[0.55em] font-semibold opacity-60">g</span>}
    </span>
  );
}

export function PageHead({ kicker, title, sub, right }: { kicker?: string; title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {kicker && <div className="mb-1 text-xs font-extrabold uppercase tracking-[0.18em] text-bahi">{kicker}</div>}
        <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
        {sub && <p className="mt-2 text-ink-2">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/** Ring gauge for percentages (on-time probability etc.). */
export function Ring({ bp, size = 132, label }: { bp: number; size?: number; label?: string }) {
  const r = size / 2 - 10, c = 2 * Math.PI * r, v = Math.max(0, Math.min(bp, 10000)) / 10000;
  const color = bp >= 8000 ? "#1f6f5c" : bp >= 6500 ? "#c9a24b" : "#c4553b";
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2d8c3" strokeWidth="10" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={c}
          initial={false} animate={{ strokeDashoffset: c * (1 - v) }} transition={{ duration: 1.1, ease: "easeOut" }} />
      </svg>
      <div className="absolute text-center">
        <div className="num text-3xl font-bold" style={{ color }}>{Math.round(bp / 100)}%</div>
        {label && <div className="text-[11px] font-semibold text-ink-3">{label}</div>}
      </div>
    </div>
  );
}

export function DemoNote({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-xs text-ink-3">{children}</p>;
}
