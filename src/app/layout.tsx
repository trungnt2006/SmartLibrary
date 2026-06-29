import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["vietnamese"] });

export const metadata: Metadata = {
  title: "Smart Library - Hệ thống quản lý thư viện",
  description: "Hệ thống quản lý thư viện thông minh - Smart Library giúp quản lý kho sách, mượn trả, độc giả và báo cáo một cách hiệu quả.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Smart Library",
    description: "Hệ thống quản lý thư viện thông minh - Quản lý kho sách, mượn trả, độc giả và báo cáo.",
    url: "https://library.trungnt.online",
    siteName: "Smart Library",
    type: "website",
    images: [{ url: "/favicon.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary",
    title: "Smart Library",
    description: "Hệ thống quản lý thư viện thông minh",
    images: ["/favicon.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
