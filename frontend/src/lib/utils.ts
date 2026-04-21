import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function timeAgo(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

export function initials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function roleColor(role: string) {
  switch (role?.toLowerCase()) {
    case "founder": return { bg: "bg-violet-500/20", text: "text-violet-400", border: "border-violet-500/40" };
    case "collaborator": return { bg: "bg-cyan-500/20", text: "text-cyan-400", border: "border-cyan-500/40" };
    case "investor": return { bg: "bg-teal-500/20", text: "text-teal-400", border: "border-teal-500/40" };
    case "organisation": return { bg: "bg-rose-500/20", text: "text-rose-400", border: "border-rose-500/40" };
    default: return { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" };
  }
}

export function avatarGradient(name: string): string {
  const gradients = [
    "from-violet-500 to-cyan-500",
    "from-cyan-500 to-teal-500",
    "from-rose-500 to-violet-500",
    "from-teal-500 to-cyan-500",
    "from-violet-600 to-rose-500",
    "from-blue-500 to-cyan-500",
  ];
  const idx = name.charCodeAt(0) % gradients.length;
  return gradients[idx];
}
