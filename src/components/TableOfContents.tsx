"use client";

import { useEffect, useState, useMemo } from "react";
import { Anchor } from "@arco-design/web-react";

type HeadingItem = {
  id: string;
  text: string;
  level: number;
};

type HeadingTreeNode = HeadingItem & {
  children: HeadingItem[];
};

export default function TableOfContents({
  contentKey,
}: {
  contentKey: string;
}) {
  const [items, setItems] = useState<HeadingItem[]>([]);

  useEffect(() => {
    const root = document.querySelector(".product-reading-article");
    if (!root) return;

    const collect = () => {
      const headings = Array.from(
        root.querySelectorAll<HTMLElement>(
          ".prose-clean h2[id], .prose-clean h3[id]",
        ),
      );
      const seen = new Set<string>();
      const next: HeadingItem[] = headings.map((heading, index) => {
        let id = heading.id;
        while (seen.has(id)) id += `-${index + 1}`;
        seen.add(id);
        if (heading.id !== id) heading.id = id;
        return {
          id,
          text: heading.textContent || "",
          level: Number(heading.tagName.slice(1)),
        };
      });

      setItems((previous) =>
        JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
      );
    };

    collect();
    const mutation = new MutationObserver(collect);
    mutation.observe(root, { childList: true, subtree: true });

    return () => {
      mutation.disconnect();
    };
  }, [contentKey]);

  // Organize flat h2/h3 headings into a tree structure for nested Anchor.Link
  const tree = useMemo(() => {
    const result: HeadingTreeNode[] = [];
    let currentH2: HeadingTreeNode | null = null;

    items.forEach((item) => {
      if (item.level === 2) {
        currentH2 = { ...item, children: [] };
        result.push(currentH2);
      } else if (item.level === 3 && currentH2) {
        currentH2.children.push(item);
      } else {
        result.push({ ...item, children: [] });
      }
    });

    return result;
  }, [items]);

  if (!items.length) return null;

  return (
    <aside className="document-toc" aria-label="本页目录">
      <div className="toc-title">本页目录</div>
      <Anchor
        affix={false}
        boundary={100}
        hash={false}
        animation
        className="document-anchor"
      >
        {tree.map((node) => (
          <Anchor.Link key={node.id} href={`#${node.id}`} title={node.text}>
            {node.children.map((child) => (
              <Anchor.Link
                key={child.id}
                href={`#${child.id}`}
                title={child.text}
              />
            ))}
          </Anchor.Link>
        ))}
      </Anchor>
    </aside>
  );
}
