import type { Metadata } from "next";
import { Be_Vietnam_Pro, Noto_Sans_JP } from "next/font/google";
import AppShell from "@/components/AppShell";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vn",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const notoJP = Noto_Sans_JP({
  variable: "--font-noto-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Nihongo AI — Học tiếng Nhật cùng AI",
  description: "Học từ vựng, kanji, ngữ pháp N5–N1 và luyện nói tiếng Nhật với AI",
};

// Áp dụng giao diện sáng/tối đã lưu trước khi trang hiển thị (tránh nháy màu)
const themeScript = `try{var t=localStorage.getItem("nihongo.theme");if(t)document.documentElement.dataset.theme=JSON.parse(t)}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${beVietnam.variable} ${notoJP.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
