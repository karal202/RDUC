import type { ReactNode } from "react";
import { ArrowUpRight, MessageCircle, ScanLine } from "lucide-react";
import Image from "next/image";
import { SectionHeader } from "./SectionHeader";

/* Brand icons removed from lucide-react — original simple-icons paths. */
function DiscordIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

type ContactLink = {
  name: string;
  handle: string;
  href: string;
  icon: ReactNode;
};

/**
 * NOTE: placeholder URLs — replace the `href` values below with your real
 * community / donation pages.
 */
const contacts: ContactLink[] = [
  {
    name: "Discord",
    handle: "discord.gg/rduc",
    href: "https://discord.gg/rduc",
    icon: <DiscordIcon />,
  },
  {
    name: "Facebook",
    handle: "facebook.com/rduc",
    href: "https://www.facebook.com/rduc",
    icon: <FacebookIcon />,
  },
  {
    name: "Zypage",
    handle: "zypage.vn/rduc",
    href: "https://zypage.vn/rduc",
    icon: <MessageCircle className="size-6 text-rduc-red" strokeWidth={2} aria-hidden />,
  },
  {
    name: "WeScan",
    handle: "wescan.vn/rduc",
    href: "https://wescan.vn/rduc",
    icon: <ScanLine className="size-6 text-rduc-red" strokeWidth={2} aria-hidden />,
  },
];

/**
 * Contact & Donate — community channels open in a new tab on click
 * (target="_blank"), plus a QR code for quick donations.
 */
export function ContactDonate() {
  return (
    <section id="contact" className="scroll-mt-[84px] bg-rduc-darker">
      <div className="mx-auto w-full max-w-[1440px] px-6 py-20 lg:px-24 lg:py-[120px]">
        <SectionHeader
          badge="Contact & Donate"
          title="Join the Grid, Fuel the Engine"
          sub="Hop into our community channels or send some love to keep RDUC free for every gamer out there."
        />

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-5">
          {/* Channel cards — each opens in a new tab */}
          {contacts.map((contact) => (
            <a
              key={contact.name}
              href={contact.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-6 rounded-lg border border-rduc-border bg-rduc-card p-8 transition-colors duration-200 hover:border-rduc-red/60"
            >
              <div className="flex items-start justify-between">
                <div className="flex size-12 items-center justify-center rounded border border-rduc-border bg-rduc-iconbg text-white transition-colors group-hover:text-rduc-red">
                  {contact.icon}
                </div>
                <ArrowUpRight
                  className="size-5 text-rduc-muted transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-rduc-red"
                  strokeWidth={2}
                  aria-hidden
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-display text-lg">{contact.name}</span>
                <span className="font-mono text-xs text-rduc-muted">{contact.handle}</span>
              </div>
            </a>
          ))}

          {/* QR donation card */}
          <a
            href="https://zypage.vn/rduc"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open RDUC donation page"
            className="group flex flex-col items-center gap-4 rounded-lg border border-rduc-red/60 bg-rduc-card p-8 text-center transition-colors duration-200 hover:border-rduc-red"
          >
            <div className="rounded-md bg-white p-3 transition-transform duration-200 group-hover:scale-105">
              <Image
                src="/donate-qr.svg"
                alt="QR code to open the RDUC donation page"
                width={112}
                height={112}
                className="size-28"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-display text-lg">Scan to Donate</span>
              <span className="font-mono text-xs text-rduc-muted">Every FPS counts</span>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}