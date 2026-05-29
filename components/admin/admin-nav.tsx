import React from "react";

const adminLinks = [
  { href: "/admin", label: "總覽" },
  { href: "/admin/subscriptions", label: "訂閱" },
  { href: "/admin/features", label: "功能項" },
  { href: "/admin/templates", label: "模板" },
  { href: "/admin/policies", label: "策略" },
  { href: "/admin/records", label: "記錄" },
  { href: "/admin/settings", label: "設定" },
  { href: "/", label: "自助前台" },
];

export function AdminNav() {
  return (
    <nav style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
      {adminLinks.map((link) => (
        <a
          href={link.href}
          key={link.href}
          style={{
            border: "1px solid #d6deea",
            borderRadius: "0.5rem",
            color: "#26364d",
            fontSize: "0.92rem",
            padding: "0.5rem 0.7rem",
          }}
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}

