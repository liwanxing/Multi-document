"use client";

import React from "react";
import {
  FolderOpen,
  BookOpen,
  Cpu,
  Cloud,
  Database,
  Code2,
  Shield,
  Rocket,
  Settings,
  FileText,
  Globe,
  Boxes,
  Sparkles,
  Brain,
  Network,
  ShieldCheck,
  Terminal,
  Server,
  BarChart3,
  Layers,
  Workflow,
  Zap,
  Flame,
  HelpCircle,
  Video,
  Play,
  Share2,
  Atom,
  Film,
  Scan,
  Palette,
  type LucideIcon,
} from "lucide-react";
import { getIconItem } from "@/lib/iconRegistry";

export const categoryIcons: Record<string, LucideIcon> = {
  folder: FolderOpen,
  book: BookOpen,
  cpu: Cpu,
  cloud: Cloud,
  database: Database,
  code: Code2,
  shield: Shield,
  rocket: Rocket,
  settings: Settings,
  file: FileText,
  globe: Globe,
  boxes: Boxes,
  sparkles: Sparkles,
  brain: Brain,
  network: Network,
  "shield-check": ShieldCheck,
  terminal: Terminal,
  server: Server,
  "bar-chart": BarChart3,
  "data-analytics": BarChart3,
  layers: Layers,
  workflow: Workflow,
  zap: Zap,
  flame: Flame,
  "help-circle": HelpCircle,
  video: Video,
  "video-gen": Film,
  play: Play,
  share: Share2,
  atom: Atom,
  think: Atom,
  scan: Scan,
  palette: Palette,
};

export default function CategoryIcon({
  name,
  size = 16,
  className,
  fallback: Fallback,
}: {
  name?: string;
  size?: number;
  className?: string;
  fallback?: LucideIcon;
}) {
  if (name) {
    const normalized = name.toLowerCase().trim();

    // 1. Check iconRegistry (supports both id and Chinese name from IconPicker)
    const regItem = getIconItem(normalized);
    if (regItem?.icon) {
      const RegIcon = regItem.icon;
      return <RegIcon size={size} className={className} />;
    }

    // 2. Check local categoryIcons dictionary
    if (categoryIcons[normalized]) {
      const Icon = categoryIcons[normalized];
      return <Icon size={size} className={className} />;
    }
  }

  // 3. Fallback component if provided
  if (Fallback) {
    return <Fallback size={size} className={className} />;
  }

  return <FolderOpen size={size} className={className} />;
}
