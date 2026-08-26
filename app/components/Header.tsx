import Image from "next/image";
import { ButtonPrimary } from "./buttons";

const navLinks = [
  { label: "Tính năng", href: "#features" },
  { label: "Trò chơi", href: "#games" },
  { label: "Bảng giá", href: "#pricing" },
  { label: "Hỏi đáp", href: "#faq" },
  { label: "Liên hệ", href: "#contact" },
];

/**
 * Header — Figma spec (node 3:5): height 84, black bg, bottom border #262626,
 * horizontal padding 96, space-between with logo / nav / primary button.
 */
export function Header() {
  return (
    <header className="border-b border-rduc-border bg-black">
      <div className="mx-auto flex h-[84px] w-full max-w-[1440px] items-center justify-between gap-6 px-6 lg:px-24">
        <a href="#" aria-label="RDUC home" className="shrink-0">
          <Image src="/logo.png" alt="RDUC logo" width={103} height={44} priority />
        </a>

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

        <ButtonPrimary href="#download">Tải xuống</ButtonPrimary>
      </div>
    </header>
  );
}