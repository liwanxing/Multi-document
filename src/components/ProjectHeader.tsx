"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { BookOpen, ArrowUpRight } from "lucide-react";
import ThemeModeSwitch from "./ThemeModeSwitch";
import type { Project } from "@/lib/dataStore";

export default function ProjectHeader({ project }: { project: Project }) {
  const pathname = usePathname();

  const isFavorites = pathname === "/favorites";
  const isProjectHome = pathname === `/projects/${project.slug}`;
  const isDocumentPreview = pathname?.startsWith(`/projects/${project.slug}/products/`) && pathname.includes("/docs/");

  return (
    <header className="project-public-header">
      <div>
        <Link
          href={`/projects/${project.slug}`}
          className="public-brand group transition-transform active:scale-[0.99]"
        >
          <span className="public-logo">
            <BookOpen size={21} />
          </span>
          <strong>{project.company || project.name}</strong>
          <i />
          <span>文档中心</span>
        </Link>
        <nav>
          {!isDocumentPreview && <ThemeModeSwitch />}
          <Link
            href="/favorites"
            className={`transition-colors py-1 px-2.5 rounded-md ${
              isFavorites
                ? "text-[#1664FF] font-medium bg-[#1664FF10]"
                : "hover:text-[#1664FF]"
            }`}
          >
            我的收藏
          </Link>
          <Link
            href={`/projects/${project.slug}`}
            className={`transition-colors py-1 px-2.5 rounded-md ${
              isProjectHome
                ? "text-[#1664FF] font-medium bg-[#1664FF10]"
                : "hover:text-[#1664FF]"
            }`}
          >
            全部产品
          </Link>
          <Link
            href="/admin"
            className="hover:text-[#1664FF] transition-colors py-1 px-2.5 rounded-md flex items-center gap-1 active:scale-95"
          >
            管理后台
            <ArrowUpRight size={13} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
