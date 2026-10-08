import React from "react";
import "./admin.css";
import "./arco-theme.css";
import DesignProvider from "@/components/admin/DesignProvider";
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DesignProvider>
      <div className="admin-root">{children}</div>
    </DesignProvider>
  );
}
