import Image from "next/image";
import Link from "next/link";
import { ButtonPrimary } from "./buttons";


const navLinks = [
  { label: "Danh mục", href: "/catalog" },
  { label: "Tính năng", href: "/#features" },
  { label: "Trò chơi", href: "/#games" },
  { label: "Liên hệ", href: "/#contact" },
];

/**
 * Header — Figma spec (node 3:5): height 84, black bg, bottom border #262626,
 * horizontal padding 96, space-between with logo / nav / primary button.
 */
export function Header() {
  return (
    <header className="border-b border-rduc-border bg-black">
      <div className="mx-auto flex h-[84px] w-full max-w-[1440px] items-center justify-between gap-6 px-6 lg:px-24">
        <Link href="/" aria-label="DAWA SHOP home" className="flex shrink-0 items-center overflow-visible">
          <Image
            src="/logo.png"
            alt="DAWA SHOP"
            width={450}
            height={140}
            className="h-[72px] w-auto max-w-[260px] object-contain brightness-125 contrast-110 drop-shadow-[0_0_12px_rgba(255,255,255,0.35)] sm:h-[76px] sm:max-w-[290px] md:h-[84px] md:max-w-[320px]"
            priority
          />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-semibold text-rduc-muted transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

            <ButtonPrimary href="/downloads/dawa-system-check-1.0.0.exe?v=20260902" download>
          Tải xuống
        </ButtonPrimary>
      </div>
    </header>
  );
}