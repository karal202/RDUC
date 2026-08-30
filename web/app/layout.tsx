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
  title: "DAWA SHOP — Boost FPS",
  description:
    "Danh mục sản phẩm tối ưu PC, Windows, Network, BIOS và tài khoản game cho game thủ.",
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