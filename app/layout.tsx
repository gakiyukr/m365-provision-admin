import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Microsoft 365 使用者管理後台",
  description: "Microsoft 365 授權與建立使用者管理介面",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
