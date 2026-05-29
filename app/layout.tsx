import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Microsoft 365 使用者自助建立",
  description: "Microsoft 365 使用者建立、授權預覽與後台管理介面",
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
