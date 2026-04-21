import * as React from "react";
import { cn, initials, avatarGradient, roleColor } from "../../lib/utils";
import type { Role } from "../../types/supabase";

// ── CARD ──────────────────────────────────────────────────────────────────────
export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-2xl bg-card border border-border text-card-foreground", className)} {...props} />
  )
);
Card.displayName = "Card";

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1 p-5 pb-3", className)} {...props} />
);
export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("font-display font-bold text-base leading-none tracking-tight text-foreground", className)} {...props} />
);
export const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm text-muted-foreground leading-relaxed", className)} {...props} />
);
export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-5 pt-0", className)} {...props} />
);
export const CardFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center p-5 pt-0", className)} {...props} />
);

// ── BADGE ─────────────────────────────────────────────────────────────────────
interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "violet" | "cyan" | "teal" | "rose" | "amber" | "emerald" | "outline";
}
export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide border",
      {
        default: "bg-muted text-muted-foreground border-border",
        violet: "bg-violet-500/15 text-violet-400 border-violet-500/30",
        cyan: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
        teal: "bg-teal-500/15 text-teal-400 border-teal-500/30",
        rose: "bg-rose-500/15 text-rose-400 border-rose-500/30",
        amber: "bg-amber-500/15 text-amber-400 border-amber-500/30",
        emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        outline: "bg-transparent text-foreground border-border",
      }[variant],
      className
    )} {...props} />
  );
}

// Role badge shortcut
export function RoleBadge({ role }: { role: string }) {
  const rc = roleColor(role);
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide border", rc.bg, rc.text, rc.border)}>
      {role}
    </span>
  );
}

// ── AVATAR ────────────────────────────────────────────────────────────────────
interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}
const sizeMap = { xs: "size-6 text-[0.55rem]", sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-12 text-base", xl: "size-16 text-lg" };

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const grad = avatarGradient(name);
  if (src) return <img src={src} alt={name} className={cn("rounded-xl object-cover", sizeMap[size], className)} />;
  return (
    <div className={cn("rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold flex-shrink-0", grad, sizeMap[size], className)}>
      {initials(name)}
    </div>
  );
}

// ── STAT CARD ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  helper?: string;
  icon?: React.ReactNode;
  color?: "violet" | "cyan" | "teal" | "rose" | "amber" | "emerald";
  trend?: "up" | "down";
}
const colorMap = {
  violet: "from-violet-500 to-violet-600",
  cyan: "from-cyan-500 to-cyan-600",
  teal: "from-teal-500 to-teal-600",
  rose: "from-rose-500 to-rose-600",
  amber: "from-amber-500 to-amber-600",
  emerald: "from-emerald-500 to-emerald-600",
};
export function StatCard({ label, value, helper, icon, color = "violet", trend }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        {icon && (
          <div className={cn("size-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white flex-shrink-0", colorMap[color])}>
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-2xl font-display font-bold text-foreground">{value}</div>
          <div className="text-xs font-medium text-muted-foreground mt-1">{label}</div>
          {helper && (
            <div className={cn("text-xs mt-1", trend === "up" ? "text-emerald-400" : trend === "down" ? "text-rose-400" : "text-muted-foreground")}>
              {trend === "up" ? "↑" : trend === "down" ? "↓" : ""} {helper}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ── PROGRESS BAR ──────────────────────────────────────────────────────────────
interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  className?: string;
  label?: string;
}
export function ProgressBar({ value, max = 100, color = "from-primary to-secondary", className, label }: ProgressBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          <span className="font-mono">{Math.round(pct)}%</span>
        </div>
      )}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── EMPTY STATE ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && <div className="text-4xl mb-4 text-muted-foreground/40">{icon}</div>}
      <h3 className="font-display font-bold text-foreground mb-2">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mb-6 max-w-sm">{description}</p>}
      {action}
    </div>
  );
}
