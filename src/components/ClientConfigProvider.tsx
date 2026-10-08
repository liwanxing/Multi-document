"use client";

import React from "react";
import { ConfigProvider } from "@arco-design/web-react";
import ThemeSync from "./ThemeSync";
import zhCN from "@arco-design/web-react/es/locale/zh-CN";

export default function ClientConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConfigProvider
      locale={zhCN}
      size="default"
      componentConfig={{
        Modal: {
          maskClosable: false,
          getChildrenPopupContainer: () => document.body,
        },
        Button: { size: "default" },
      }}
    >
      <ThemeSync />
      {children}
    </ConfigProvider>
  );
}
