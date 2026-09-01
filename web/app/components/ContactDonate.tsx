import type { ReactNode } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import Image from "next/image";

function DiscordIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z" />
    </svg>
  );
}

type ContactLink = {
  name: string;
  handle: string;
  href: string;
  icon: ReactNode;
};

const contacts: ContactLink[] = [
  {
    name: "Discord",
    handle: "discord.gg/dawa",
    href: "https://discord.gg/tDe8UfztmE",
    icon: <DiscordIcon />,
  },
];

function ContactCard({ contact }: { contact: ContactLink }) {
  return (
    <a
      href={contact.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-between gap-5 rounded-[22px] border border-rduc-border bg-[#111111] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-all duration-300 hover:-translate-y-1 hover:border-[#1e72ff]/80 hover:shadow-[0_12px_30px_rgba(17,83,255,0.12)] sm:p-6"
    >
      <div className="flex items-center gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-rduc-border bg-[#181818] text-white transition-colors group-hover:text-[#3ea1ff]">
          {contact.icon}
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-display text-lg text-white">{contact.name}</span>
          <span className="font-mono text-xs text-rduc-muted">{contact.handle}</span>
        </div>
      </div>
      <ArrowUpRight
        className="size-5 shrink-0 text-rduc-muted transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#3ea1ff]"
        strokeWidth={2}
        aria-hidden
      />
    </a>
  );
}

function DonationCard() {
  return (
    <div className="rduc-stagger-item rduc-delay-2 w-full max-w-[620px] rounded-[28px] border border-[#1e72ff]/40 bg-[#0d1117] p-4 text-white shadow-[0_20px_40px_rgba(12,19,31,0.5)]">
      <div className="flex items-center justify-between gap-3 rounded-[18px] border border-white/5 bg-[#121a24] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-[#1d2b3a] text-xl text-[#3ea1ff] shadow-sm">✦</div>
          <div className="font-display text-[20px] font-bold tracking-tight text-white sm:text-[22px]">TON THAT VO QUOC TIEN</div>
        </div>
        <ChevronDown className="size-6 shrink-0 text-[#cfe6ff]" strokeWidth={2.5} aria-hidden />
      </div>

      <div className="mt-4 grid gap-5 rounded-[22px] border border-[#1d2d44] bg-[#101821] p-4 sm:grid-cols-[170px_1fr] sm:p-6">
        <div className="flex items-center justify-center rounded-[18px] bg-white p-3 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]">
          <Image src="/donate-qr.png" alt="Mã QR ủng hộ DAWA" width={170} height={170} className="h-[150px] w-[150px] object-contain sm:h-[170px] sm:w-[170px]" />
        </div>

        <div className="flex flex-col justify-center">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-end gap-1 text-[24px] font-black leading-none tracking-tight sm:text-[28px]">
              <span className="text-[#e63845]">VIET</span>
              <span className="text-[#3ea1ff]">QR</span>
            </div>
            <div className="text-[20px] font-black tracking-tight text-[#3ea1ff] sm:text-[24px]">MB</div>
          </div>

          <div className="rounded-[12px] bg-[#f5f8ff] px-4 py-3 text-center shadow-[inset_0_0_0_1px_rgba(15,23,42,0.04)]">
            <p className="text-[18px] font-black tracking-[0.08em] text-[#111827] sm:text-[22px]">70511200799999</p>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#223247] pt-4 text-[13px] font-black text-white sm:text-[16px]">
            <div className="flex items-center gap-1.5">
              <span className="text-[#d62839]">VIET</span>
              <span className="text-[#3ea1ff]">QR</span>
              <span className="text-[#dfe9f8]">Pay</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#d62839]">VIET</span>
              <span className="text-[#3ea1ff]">QR</span>
              <span className="text-[#dfe9f8]">Global</span>
            </div>
            <div className="text-[#48d39b]">napas 247</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ContactDonate() {
  return (
    <section id="contact" className="scroll-mt-[84px] bg-transparent">
      <div className="mx-auto w-full max-w-[1440px] px-6 py-16 lg:px-24 lg:py-[120px]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
          <div className="rduc-stagger-item rduc-delay-1 w-full">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#3ea1ff]">Liên hệ & Ủng hộ</p>
            <h2 className="mt-4 font-display text-4xl leading-tight text-white sm:text-5xl">Thông tin liên hệ & Phương thức chuyển khoản</h2>
            <p className="mt-4 max-w-[520px] text-base leading-7 text-rduc-muted">
              Theo dõi kênh của DAWA hoặc ủng hộ dự án để chúng tôi tiếp tục tối ưu trải nghiệm chơi game.
            </p>

            <div className="mt-8 max-w-[430px]">
              {contacts.map((contact, index) => (
                <div key={contact.name} className={`rduc-stagger-item ${index === 0 ? "rduc-delay-2" : "rduc-delay-3"}`}>
                  <ContactCard contact={contact} />
                </div>
              ))}
            </div>
          </div>

          <div className="rduc-stagger-item rduc-delay-2 w-full lg:flex lg:justify-center">
            <DonationCard />
          </div>
        </div>
      </div>
    </section>
  );
}