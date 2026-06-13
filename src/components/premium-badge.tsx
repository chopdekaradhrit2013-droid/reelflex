import { BadgeCheck } from "lucide-react";

export function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <BadgeCheck
      className={`inline-block h-4 w-4 align-text-bottom ${className}`}
      style={{ color: "#f1c40f", filter: "drop-shadow(0 0 4px rgba(241,196,15,0.7))" }}
      aria-label="Verified premium member"
    />
  );
}

export function PremiumLabel() {
  return (
    <span className="ml-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{
        background: "linear-gradient(135deg, #fff5d1, #ffd34d, #b8860b)",
        color: "#ffffff",
        textShadow: "0 1px 2px rgba(0,0,0,0.45)",
        boxShadow: "0 0 8px rgba(255,200,60,0.4), inset 0 0 4px rgba(255,255,255,0.5)",
        border: "1px solid rgba(255,215,0,0.7)",
      }}
    >
      Super
    </span>
  );
}

/** Wraps a username with verified badge + Super label when premium */
export function NameWithBadges({ name, premium }: { name?: string | null; premium?: boolean | null }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span>{name}</span>
      {premium && <VerifiedBadge />}
      {premium && <PremiumLabel />}
    </span>
  );
}
