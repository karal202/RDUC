"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, Download } from "lucide-react";
import { ButtonPrimary } from "./buttons";

const navLinks = [
  { label: "Danh mục", href: "/catalog" },
  { label: "Tính năng", href: "/#features" },
  { label: "Trò chơi", href: "/#games" },
  { label: "VIP Support & Donate", href: "/#contact" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#04060a]/85 backdrop-blur-xl transition-all duration-200">
      <div className="mx-auto flex h-[78px] w-full max-w-[1440px] items-center justify-between gap-6 px-6 lg:px-24">
        {/* Logo */}
        <Link href="/" aria-label="DAWA SHOP home" className="group flex shrink-0 items-center overflow-visible">
          <Image
            src="/logo.png"
            alt="DAWA SHOP"
            width={450}
            height={140}
            className="h-[64px] w-auto max-w-[220px] object-contain brightness-125 contrast-110 drop-shadow-[0_0_16px_rgba(22,119,255,0.4)] transition-transform duration-300 group-hover:scale-105 sm:h-[72px] sm:max-w-[260px]"
            priority
          />
        </Link>

        {/* Desktop Nav */}
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="relative rounded-lg px-4 py-2 text-sm font-semibold text-rduc-muted transition-all duration-200 hover:text-white hover:bg-white/[0.04]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Action Button & Mobile Toggle */}
        <div className="flex items-center gap-4">
          <ButtonPrimary
            href="https://github.com/karal202/RDUC/releases/download/v1.0.0/DAWA.System.Check.Setup.1.0.0.exe"
            download
            className="hidden sm:inline-flex"
          >
            Tải xuống
          </ButtonPrimary>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu"}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white transition-colors hover:border-[#1677ff] hover:text-[#38bdf8] md:hidden"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="border-b border-white/10 bg-[#060910]/95 px-6 py-6 backdrop-blur-2xl md:hidden">
          <nav className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg border border-transparent px-4 py-3 text-base font-semibold text-slate-200 transition-colors hover:border-white/10 hover:bg-white/[0.05] hover:text-white"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-2">
              <ButtonPrimary
                href="https://github.com/karal202/RDUC/releases/download/v1.0.0/DAWA.System.Check.Setup.1.0.0.exe"
                download
                withIcon
                className="w-full"
              >
                Tải xuống DAWA App
              </ButtonPrimary>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}