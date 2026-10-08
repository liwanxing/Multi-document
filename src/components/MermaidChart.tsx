"use client";

import React, { useEffect, useRef, useState } from "react";

import { THEME_CHANGE_EVENT } from "@/lib/theme";

interface MermaidChartProps {
  code: string;
}

export default function MermaidChart({ code }: MermaidChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const [theme, setTheme] = useState("neutral");
  useEffect(() => {
    const sync = () => setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "neutral");
    sync();
    window.addEventListener(THEME_CHANGE_EVENT, sync);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, sync);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function renderChart() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: theme as "neutral" | "dark",
          securityLevel: "strict",
          fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif",
        });

        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.render(id, code.trim());
        if (isMounted) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Mermaid 解析失败");
        }
      }
    }

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [code, theme]);

  if (error) {
    return (
      <div className="p-3 my-4 rounded border border-red-200 bg-red-50 text-red-700 text-xs font-mono">
        <div>图表语法错误：</div>
        <pre className="mt-1 text-[11px] overflow-x-auto">{code}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="py-8 text-center text-xs text-gray-400 bg-gray-50 rounded-lg animate-pulse">
        正在渲染图表...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-6 p-4 rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto flex justify-center"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
