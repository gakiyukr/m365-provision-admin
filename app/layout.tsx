import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Office 365 User Admin",
  description: "Office licensing admin shell",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
