import type { ReactNode } from "react";
import { ArrowUpRight, MessageCircle, ScanLine } from "lucide-react";
import Image from "next/image";
import { SectionHeader } from "./SectionHeader";

/* Biểu tượng thương hiệu dùng đường dẫn đơn giản, không cần thêm thư viện. */
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

function ContactCard({ contact }: { contact: ContactLink }) {
  return (
    <a
      href={contact.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-between gap-5 rounded-lg border border-rduc-border bg-rduc-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-rduc-red/60 hover:shadow-[0_12px_30px_rgba(255,27,45,0.12)] sm:p-6"
    >
      <div className="flex items-center gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded border border-rduc-border bg-rduc-iconbg text-white transition-colors group-hover:text-rduc-red">
          {contact.icon}
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-display text-lg">{contact.name}</span>
          <span className="font-mono text-xs text-rduc-muted">{contact.handle}</span>
        </div>
      </div>
      <ArrowUpRight
        className="size-5 shrink-0 text-rduc-muted transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-rduc-red"
        strokeWidth={2}
        aria-hidden
      />
    </a>
  );
}

export function CommunityLinks() {
  return (
    <section className="border-y border-rduc-border bg-[#0b0b0b]">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-6 py-10 lg:flex-row lg:items-center lg:px-24 lg:py-12">
        <div className="rduc-rise-in lg:w-[38%]">
          <p className="font-mono text-xs font-bold uppercase tracking-wide text-rduc-red">Cộng đồng RDUC</p>
          <h2 className="mt-3 font-display text-2xl sm:text-3xl">Luôn kết nối cùng đội ngũ</h2>
          <p className="mt-3 max-w-[460px] text-sm leading-6 text-rduc-muted">
            Tham gia cộng đồng để nhận hỗ trợ, cập nhật phiên bản mới và chia sẻ trải nghiệm chơi game.
          </p>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
          {contacts.slice(0, 2).map((contact, index) => (
            <div key={contact.name} className={`rduc-rise-in ${index === 0 ? "rduc-delay-1" : "rduc-delay-2"}`}>
              <ContactCard contact={contact} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ContactDonate() {
  return (
    <section id="contact" className="scroll-mt-[84px] bg-rduc-darker">
      <div className="mx-auto w-full max-w-[1440px] px-6 py-20 lg:px-24 lg:py-[120px]">
        <div className="grid items-start gap-12 lg:grid-cols-[1fr_420px] lg:gap-20">
          <div className="rduc-rise-in">
            <SectionHeader
              badge="Liên hệ & Ủng hộ"
              title="Chung tay xây dựng RDUC"
              sub="Theo dõi các kênh của RDUC hoặc ủng hộ dự án để chúng tôi tiếp tục tối ưu trải nghiệm chơi game."
            />

            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {contacts.slice(2).map((contact, index) => (
                <div key={contact.name} className={`rduc-rise-in ${index === 0 ? "rduc-delay-1" : "rduc-delay-2"}`}>
                  <ContactCard contact={contact} />
                </div>
              ))}
            </div>
          </div>

          <a
            href="https://zypage.vn/rduc"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Mở trang ủng hộ RDUC"
            className="rduc-rise-in rduc-delay-2 group relative overflow-hidden rounded-lg border border-rduc-red/60 bg-black p-8 transition-all duration-300 hover:-translate-y-1 hover:border-rduc-red hover:shadow-[0_16px_45px_rgba(255,27,45,0.16)]"
          >
            <div className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-rduc-red/10 blur-3xl" aria-hidden />
            <div className="relative flex flex-col items-center text-center">
              <span className="font-mono text-xs font-bold uppercase tracking-wide text-rduc-red">Ủng hộ dự án</span>
              <div className="mt-6 rounded-md bg-white p-3 transition-transform duration-300 group-hover:scale-105">
                <Image src="/donate-qr.svg" alt="Mã QR mở trang ủng hộ RDUC" width={176} height={176} className="size-44" />
              </div>
              <span className="mt-6 font-display text-xl">Quét mã để ủng hộ</span>
              <span className="mt-2 text-sm leading-6 text-rduc-muted">Mỗi đóng góp giúp RDUC tiếp tục miễn phí cho cộng đồng game thủ.</span>
              <span className="rduc-pulse-line mt-6 h-1 w-24 rounded-full bg-rduc-red" aria-hidden />
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}