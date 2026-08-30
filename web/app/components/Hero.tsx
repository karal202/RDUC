"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ButtonOutline, ButtonPrimary } from "./buttons";

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
    <section className="relative overflow-hidden border-b border-rduc-border bg-black">
      <div className="absolute left-1/3 top-1/2 h-[520px] w-[520px] -translate-y-1/2 rounded-full bg-rduc-red/10 blur-[150px]" aria-hidden />
      <div className="relative mx-auto flex min-h-[680px] w-full max-w-[1440px] items-center gap-12 px-6 py-20 lg:grid lg:grid-cols-2 lg:gap-8 lg:px-24 lg:py-0">
        <div className="flex max-w-[610px] flex-col gap-9">
          <div className="flex flex-col gap-6">
            <p className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wide text-rduc-red">
              <span className="size-2 rounded-sm bg-rduc-red" aria-hidden />
              Phần mềm tối ưu PC
            </p>
            <h1 className="font-display text-[40px] leading-[1.05] sm:text-[56px] sm:leading-[1.05]">
              BOOST FPS
              <br />
              REDUCE LATENCY
            </h1>
            <p className="max-w-[520px] text-lg leading-[1.6] text-rduc-muted">
              Tối ưu hiệu năng PC và trong game chỉ với một cú nhấp. Loại bỏ điểm nghẽn, khai phá sức mạnh phần cứng và đạt phản hồi tức thì.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <ButtonPrimary href="#catalog" withIcon>
              Tải xuống miễn phí
            </ButtonPrimary>
            <ButtonOutline href="#features">Xem thêm</ButtonOutline>
          </div>
        </div>

        <div
          aria-label="Carousel banner quảng cáo"
          aria-roledescription="carousel"
          className="relative mx-auto aspect-[1656/956] w-full max-w-[600px] overflow-hidden rounded-lg border border-rduc-border bg-rduc-card/40 shadow-[0_0_40px_rgba(22,119,255,0.08)] lg:mx-0 lg:ml-auto"
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
              sizes="(max-width: 1023px) 100vw, 40vw"
              className={`rduc-image-bright object-contain transition-opacity duration-700 ${index === activeBanner ? "opacity-100" : "opacity-0"}`}
            />
          ))}
          <button
            type="button"
            aria-label="Banner trước"
            className="absolute left-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center border border-white/30 bg-black/60 text-white transition-colors hover:border-rduc-red hover:text-rduc-red"
            onClick={() => showBanner(-1)}
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Banner tiếp theo"
            className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center border border-white/30 bg-black/60 text-white transition-colors hover:border-rduc-red hover:text-rduc-red"
            onClick={() => showBanner(1)}
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2" role="tablist" aria-label="Chọn banner">
            {heroBanners.map((banner, index) => (
              <button
                key={banner.src}
                type="button"
                role="tab"
                aria-label={`Chuyển đến banner ${index + 1}`}
                aria-selected={index === activeBanner}
                className={`h-1.5 transition-all ${index === activeBanner ? "w-8 bg-rduc-red" : "w-4 bg-white/50 hover:bg-white"}`}
                onClick={() => setActiveBanner(index)}
              />
            ))}
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