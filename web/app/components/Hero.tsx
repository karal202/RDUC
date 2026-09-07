"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ButtonOutline, ButtonPrimary } from "./buttons";
import { useLatestRelease } from "../hooks/useLatestRelease";


const heroBanners = [
  { src: "/banner/content2.png", alt: "Banner quảng cáo DAWA SHOP 1" },
  { src: "/banner/content3.png", alt: "Banner quảng cáo DAWA SHOP 2" },
  { src: "/banner/content4.png", alt: "Banner quảng cáo DAWA SHOP 3" },
];

/**
 * Hero — Figma spec (node 3:16): min-height 720, horizontal padding 96,
 * two columns gap 32; left copy stack gap 40, right dashboard card
 * (#121212 bg, border #262626, radius 8, padding 32, gap 24).
 * Red ellipse glow: #ff1b2d at 20% opacity with 150px layer blur.
 */
export function Hero() {
  const [activeBanner, setActiveBanner] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const { downloadUrl, version, loading } = useLatestRelease();


  useEffect(() => {
    if (isPaused) return;

    const timer = window.setInterval(() => {
      setActiveBanner((current) => (current + 1) % heroBanners.length);
    }, 2000);

    return () => window.clearInterval(timer);
  }, [isPaused]);

  const showBanner = (direction: number) => {
    setActiveBanner((current) => (current + direction + heroBanners.length) % heroBanners.length);
  };

  return (
    <section className="relative overflow-hidden border-b border-white/[0.08] bg-transparent">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute left-1/4 top-1/2 h-[550px] w-[550px] -translate-y-1/2 rounded-full bg-[#1677ff]/15 blur-[160px]" aria-hidden />
      <div className="pointer-events-none absolute right-10 top-1/3 h-[420px] w-[420px] -translate-y-1/2 rounded-full bg-[#00c2ff]/10 blur-[140px]" aria-hidden />

      <div className="relative mx-auto flex min-h-[720px] w-full max-w-[1440px] items-center gap-12 px-6 py-20 lg:grid lg:grid-cols-2 lg:gap-12 lg:px-24 lg:py-16">
        {/* Left copy column */}
        <div className="flex max-w-[640px] flex-col gap-8">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <span className="cyber-badge">
                <span className="cyber-radar-dot" />
                DAWA OPTIMIZER{version ? ` ${version}` : loading ? "" : " V1.0"} • SYSTEM ACCELERATOR
              </span>
            </div>

            <h1 className="font-display text-[44px] leading-[1.03] tracking-tight sm:text-[64px] sm:leading-[1.03]">
              <span className="text-white">BOOST FPS</span>
              <br />
              <span className="text-gradient-cyan">ZERO LATENCY</span>
            </h1>

            <p className="max-w-[540px] text-base leading-[1.7] text-slate-300 sm:text-lg">
              Tối ưu hiệu năng PC và in-game toàn diện chỉ với 1-click. Khai phóng 100% sức mạnh phần cứng, triệt tiêu độ trễ chuột bàn phím và giảm giật lag khung hình khi thi đấu.
            </p>
          </div>


          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <ButtonPrimary
              href={downloadUrl}
              download
              withIcon
            >
              {loading ? "Đang chuẩn bị link..." : "Tải xuống miễn phí"}
            </ButtonPrimary>
            <ButtonOutline href="#features">
              Khám phá tính năng
            </ButtonOutline>
          </div>
        </div>

        {/* Right HUD Chassis Carousel */}
        <div className="relative mx-auto w-full max-w-[620px] lg:mx-0 lg:ml-auto">
          {/* Tech decorative HUD corners */}
          <div className="pointer-events-none absolute -left-2 -top-2 z-20 size-5 border-l-2 border-t-2 border-[#00c2ff]" aria-hidden />
          <div className="pointer-events-none absolute -right-2 -top-2 z-20 size-5 border-r-2 border-t-2 border-[#00c2ff]" aria-hidden />
          <div className="pointer-events-none absolute -bottom-2 -left-2 z-20 size-5 border-b-2 border-l-2 border-[#00c2ff]" aria-hidden />
          <div className="pointer-events-none absolute -bottom-2 -right-2 z-20 size-5 border-b-2 border-r-2 border-[#00c2ff]" aria-hidden />

          <div
            aria-label="Carousel banner quảng cáo"
            aria-roledescription="carousel"
            className="relative aspect-[1656/956] w-full overflow-hidden rounded-xl border border-white/15 bg-[#090e17] shadow-[0_0_50px_rgba(22,119,255,0.25)]"
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") showBanner(-1);
              if (event.key === "ArrowRight") showBanner(1);
            }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onFocus={() => setIsPaused(true)}
            onBlur={() => setIsPaused(false)}
            tabIndex={0}
          >
            {heroBanners.map((banner, index) => (
              <Image
                key={banner.src}
                src={banner.src}
                alt={banner.alt}
                fill
                priority={index === 0}
                sizes="(max-width: 1023px) 100vw, 45vw"
                className={`rduc-image-bright object-contain p-2 transition-opacity duration-700 ${index === activeBanner ? "opacity-100" : "opacity-0"}`}
              />
            ))}

            {/* Navigation Arrows */}
            <button
              type="button"
              aria-label="Banner trước"
              className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg border border-white/20 bg-black/70 text-white backdrop-blur-md transition-all duration-200 hover:border-[#00c2ff] hover:bg-[#1677ff]/30 hover:text-[#38bdf8] hover:shadow-[0_0_15px_rgba(0,194,255,0.4)]"
              onClick={() => showBanner(-1)}
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Banner tiếp theo"
              className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg border border-white/20 bg-black/70 text-white backdrop-blur-md transition-all duration-200 hover:border-[#00c2ff] hover:bg-[#1677ff]/30 hover:text-[#38bdf8] hover:shadow-[0_0_15px_rgba(0,194,255,0.4)]"
              onClick={() => showBanner(1)}
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>

            {/* Slide Indicators */}
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 backdrop-blur-md" role="tablist" aria-label="Chọn banner">
              {heroBanners.map((banner, index) => (
                <button
                  key={banner.src}
                  type="button"
                  role="tab"
                  aria-label={`Chuyển đến banner ${index + 1}`}
                  aria-selected={index === activeBanner}
                  className={`h-1.5 rounded-full transition-all duration-300 ${index === activeBanner ? "w-7 bg-gradient-to-r from-[#1677ff] to-[#00c2ff] shadow-[0_0_8px_#00c2ff]" : "w-2.5 bg-white/30 hover:bg-white/70"}`}
                  onClick={() => setActiveBanner(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <a href="#catalog" className="rduc-side-banner rduc-side-banner-left" aria-label="Xem danh mục sản phẩm bên trái">
        <Image src="/banner/content.png" alt="" fill sizes="110px" className="object-cover" />
      </a>
      <a href="#catalog" className="rduc-side-banner rduc-side-banner-right" aria-label="Xem danh mục sản phẩm bên phải">
        <Image src="/banner/content1.png" alt="" fill sizes="110px" className="object-cover" />
      </a>
    </section>
  );
}