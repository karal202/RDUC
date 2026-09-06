"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { ArrowUpRight, Check, Copy, ShieldCheck, Sparkles } from "lucide-react";
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
    name: "Discord Cộng Đồng DAWA",
    handle: "discord.gg/tDe8UfztmE",
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
      className="group relative flex items-center justify-between gap-5 overflow-hidden rounded-2xl border border-indigo-500/30 bg-[#080d1e]/85 p-6 backdrop-blur-xl shadow-[0_10px_30px_rgba(79,70,229,0.15)] transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400/60 hover:shadow-[0_15px_40px_rgba(99,102,241,0.25)]"
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-indigo-500/15 blur-2xl group-hover:opacity-100 transition-opacity" />

      <div className="flex items-center gap-4">
        <div className="relative flex size-14 shrink-0 items-center justify-center rounded-xl border border-indigo-500/30 bg-[#5865F2]/15 text-[#5865F2] shadow-[0_0_20px_rgba(88,101,242,0.25)] transition-all duration-300 group-hover:scale-105 group-hover:bg-[#5865F2] group-hover:text-white">
          {contact.icon}
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-bold text-white group-hover:text-indigo-200 transition-colors">
              {contact.name}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE
            </span>
          </div>
          <span className="font-mono text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
            {contact.handle}
          </span>
        </div>
      </div>

      <div className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition-all duration-300 group-hover:border-indigo-400/50 group-hover:bg-indigo-500 group-hover:text-white">
        <ArrowUpRight className="size-5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={2.5} />
      </div>
    </a>
  );
}

function DonationCard() {
  const [copied, setCopied] = useState(false);
  const accountNumber = "70511200799999";

  const handleCopy = () => {
    navigator.clipboard.writeText(accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="relative w-full max-w-[640px] overflow-hidden rounded-3xl border border-cyan-500/30 bg-[#060b17]/95 p-6 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(0,242,254,0.12)]">
      {/* Cyber ambient aura */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-48 w-48 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-48 w-48 rounded-full bg-blue-600/15 blur-3xl" />

      {/* Holographic Header Bar */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-black shadow-[0_0_20px_rgba(0,242,254,0.4)]">
            <Sparkles className="size-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-lg font-black tracking-wide text-white sm:text-xl">
                TON THAT VO QUOC TIEN
              </span>
              <ShieldCheck className="size-4 text-cyan-400" />
            </div>
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-cyan-400/80">
              CHỦ TÀI KHOẢN XÁC THỰC • MB BANK
            </span>
          </div>
        </div>

        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] font-bold text-emerald-400">
          24/7 AUTO
        </div>
      </div>

      {/* Main Payment Section */}
      <div className="mt-5 grid gap-6 rounded-2xl border border-white/[0.08] bg-[#091122]/90 p-5 sm:grid-cols-[180px_1fr] sm:p-6">
        {/* QR Code Container with Cyber Frame */}
        <div className="group relative flex flex-col items-center justify-center rounded-2xl border border-cyan-500/20 bg-white p-3 shadow-[0_0_25px_rgba(0,242,254,0.1)]">
          <Image
            src="/donate-qr.png"
            alt="Mã QR ủng hộ DAWA"
            width={180}
            height={180}
            className="h-[155px] w-[155px] object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <span className="mt-2 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-700">
            QUÉT MÃ VIETQR
          </span>
        </div>

        {/* Details & Quick Copy */}
        <div className="flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-baseline gap-1 text-2xl font-black tracking-tight">
              <span className="text-[#ea384c]">VIET</span>
              <span className="text-cyan-400">QR</span>
            </div>
            <div className="rounded-lg bg-blue-600/20 border border-blue-500/40 px-3 py-1 font-mono text-sm font-black text-blue-300">
              MB BANK
            </div>
          </div>

          {/* Account Number Box with 1-Click Copy */}
          <div className="my-4">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1.5">
              <span>SỐ TÀI KHOẢN (STK)</span>
              <span className="text-cyan-400 text-[11px]">Bấm để sao chép</span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="group/btn relative flex w-full items-center justify-between rounded-xl border border-cyan-500/30 bg-[#040813] px-4 py-3.5 transition-all duration-200 hover:border-cyan-400 hover:bg-cyan-950/30 hover:shadow-[0_0_20px_rgba(0,242,254,0.15)] active:scale-[0.98]"
            >
              <span className="font-mono text-xl sm:text-2xl font-black tracking-[0.1em] text-white group-hover/btn:text-cyan-300 transition-colors">
                {accountNumber}
              </span>
              <div
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold transition-all ${
                  copied
                    ? "bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                    : "bg-white/10 text-slate-300 group-hover/btn:bg-cyan-500 group-hover/btn:text-black"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="size-3.5 stroke-[3]" />
                    <span>ĐÃ COPY</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    <span>COPY</span>
                  </>
                )}
              </div>
            </button>
          </div>

          {/* Network Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08] pt-3 text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <span className="text-[#ea384c]">VIET</span>
              <span className="text-cyan-400">QR</span>
              <span className="text-slate-300">Pay</span>
            </div>
            <div className="flex items-center gap-1 font-mono text-[11px] text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              NAPAS 247
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ContactDonate() {
  return (
    <section id="contact" className="relative scroll-mt-[84px] overflow-hidden bg-transparent">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute left-1/4 top-1/2 -z-10 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[160px]" />

      <div className="mx-auto w-full max-w-[1440px] px-6 py-20 lg:px-24 lg:py-[120px]">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2.5 self-start rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-mono font-bold uppercase tracking-widest text-cyan-400 shadow-[0_0_15px_rgba(0,242,254,0.15)]">
              <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />
              DIRECT ACCESS & DONATE
            </div>

            <h2 className="font-display text-4xl font-black uppercase tracking-tight text-white drop-shadow-md sm:text-5xl leading-tight">
              Thông tin liên hệ & Phương thức chuyển khoản
            </h2>

            <p className="max-w-[540px] text-base sm:text-lg leading-relaxed text-slate-400">
              Gia nhập Discord chính thức của DAWA để nhận hỗ trợ kỹ thuật trực tiếp, cập nhật profile game mới, hoặc chuyển khoản ủng hộ duy trì hệ thống máy chủ.
            </p>

            <div className="mt-2 max-w-[460px]">
              {contacts.map((contact) => (
                <ContactCard key={contact.name} contact={contact} />
              ))}
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <DonationCard />
          </div>
        </div>
      </div>
    </section>
  );
}