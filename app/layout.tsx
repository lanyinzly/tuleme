import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "秃了么｜一张照片读懂头皮",
  description:
    "上传手机或专业设备拍摄的头皮照片，观察毛囊覆盖、炎症迹象、油脂平衡与清洁状态。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/tuleme-logo.png",
    shortcut: "/tuleme-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
