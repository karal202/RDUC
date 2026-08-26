import type { Metadata } from "next";
import { Archivo, Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const beVietnamPro = Be_Vietnam_Pro({
  weight: "800",
  variable: "--font-be-vietnam-pro",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RDUC — Tăng FPS. Giảm độ trễ.",
  description:
    "Tối ưu hiệu năng PC và trong game chỉ với một cú nhấp. Loại bỏ điểm nghẽn và khai phá sức mạnh phần cứng.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${beVietnamPro.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-black font-sans text-white">
        {children}
      </body>
    </html>
  );
}