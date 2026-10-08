"use client";
import { ConfigProvider, Modal } from "@arco-design/web-react";
import zhCN from "@arco-design/web-react/es/locale/zh-CN";
export default function DesignProvider({
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
      {children}
    </ConfigProvider>
  );
}
export function confirmAction(
  content: string,
  danger = false,
): Promise<boolean> {
  return new Promise((resolve) =>
    Modal.confirm({
      title: danger ? "确认删除" : "确认操作",
      content,
      okText: danger ? "确认删除" : "确认",
      cancelText: "取消",
      okButtonProps: { status: danger ? "danger" : undefined },
      maskClosable: false,
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    }),
  );
}
