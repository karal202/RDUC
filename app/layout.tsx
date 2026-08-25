import type { Metadata } from "next";
import { Archivo, Archivo_Black, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const archivoBlack = Archivo_Black({
  weight: "400",
  variable: "--font-archivo-black",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RDUC — Boost FPS. Reduce Latency.",
  description:
    "Optimize your PC & in-game performance with one click. Clear the bottleneck, unlock hardware potential, and achieve absolute responsiveness.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${archivoBlack.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-black font-sans text-white">
        {children}
      </body>
    </html>
  );
}