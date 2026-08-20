import logo from "@/assets/indish-logo.png";

export function IndishLogo({ className = "", size = 40 }: { className?: string; size?: number }) {
  return (
    <img
      src={logo}
      alt="Indish — Fusion Food & Cocktails"
      width={size}
      height={size}
      loading="lazy"
      className={`rounded-md object-contain ${className}`}
    />
  );
}

export function IndishWordmark({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <IndishLogo size={44} className="ring-1 ring-border" />
      <div className="leading-tight">
        <div className="font-display text-xl tracking-wide text-gold">Indish</div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Loyalty Suite
        </div>
      </div>
    </div>
  );
}
