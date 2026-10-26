"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Empty,
  Message,
  List,
  Breadcrumb,
  Card,
  Spin,
} from "@arco-design/web-react";
import { IconDelete, IconBook } from "@arco-design/web-react/icon";
import { readFavorites, writeFavorites, type Favorite } from "@/lib/favorites";

export default function FavoritesPage() {
  const router = useRouter();
  const [items, setItems] = useState<Favorite[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [canGoBack, setCanGoBack] = useState(false);

  // 本站没有公开的项目列表，收藏页不能指向首页（对访客是 404），
  // 所以回上一个页面；直接打开时没有历史栈，改用说明文案占位
  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  useEffect(() => {
    const sync = () => {
      try {
        setItems(readFavorites());
        setError("");
      } catch {
        setError("无法读取当前浏览器收藏，请检查存储权限。");
      }
      setLoaded(true);
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("favorites-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("favorites-changed", sync);
    };
  }, []);

  const current = Math.min(page, Math.max(1, Math.ceil(items.length / 10)));

  function remove(href: string) {
    try {
      writeFavorites(items.filter((v) => v.href !== href));
      Message.success("已取消收藏");
    } catch {
      Message.error("取消收藏失败，请重试");
    }
  }

  const pagedItems = items.slice((current - 1) * 10, current * 10);

  return (
    <main className="favorites-page max-w-[1000px] w-full mx-auto px-5 py-8 flex-1">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0 mb-1">我的收藏</h1>
          <p className="text-sm text-gray-500 m-0">
            共 {items.length} 篇文档 · 收藏保存在当前浏览器
          </p>
        </div>
        {canGoBack ? (
          <Button size="small" className="shrink-0" onClick={() => router.back()}>
            ← 返回上一页
          </Button>
        ) : (
          <span className="text-xs text-gray-400 shrink-0">
            请从分享给你的文档链接进入
          </span>
        )}
      </header>

      {error && (
        <div
          role="alert"
          className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm border border-red-100"
        >
          {error}
        </div>
      )}

      <Card bordered={false} className="shadow-sm rounded-xl">
        {!loaded ? (
          <div className="py-16 text-center">
            <Spin tip="正在加载收藏…" />
          </div>
        ) : !items.length ? (
          <div className="py-12">
            <Empty description="暂无收藏，阅读文档时点击“收藏”即可添加" />
          </div>
        ) : (
          <List
            bordered={false}
            pagination={{
              current,
              pageSize: 10,
              total: items.length,
              onChange: setPage,
              showTotal: true,
              style: { marginTop: 24, justifyContent: "flex-end" },
            }}
            dataSource={pagedItems}
            render={(item) => (
              <List.Item
                key={item.href}
                className="hover:bg-gray-50/80 transition-colors rounded-lg px-3"
                actions={[
                  <Button
                    key="remove"
                    type="text"
                    status="danger"
                    size="small"
                    icon={<IconDelete />}
                    onClick={() => remove(item.href)}
                  >
                    取消收藏
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <IconBook style={{ fontSize: 18 }} />
                    </div>
                  }
                  title={
                    <Link
                      href={item.href}
                      className="text-base font-medium text-gray-900 hover:text-blue-600 no-underline transition-colors"
                    >
                      {item.title}
                    </Link>
                  }
                  description={
                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                      <span>
                        {item.project} / {item.product}
                      </span>
                      <span>
                        收藏时间：
                        {new Date(item.savedAt).toLocaleString("zh-CN", {
                          hour12: false,
                        })}
                      </span>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </main>
  );
}
