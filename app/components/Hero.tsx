import Image from "next/image";
import { ButtonOutline, ButtonPrimary } from "./buttons";

/**
 * Hero — Figma spec (node 3:16): min-height 720, horizontal padding 96,
 * two columns gap 32; left copy stack gap 40, right dashboard card
 * (#121212 bg, border #262626, radius 8, padding 32, gap 24).
 * Red ellipse glow: #ff1b2d at 20% opacity with 150px layer blur.
 */
export function Hero() {
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
              BOOST FPS.
              <br />
              REDUCE LATENCY.
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
          aria-label="Vị trí chờ banner quảng cáo"
          className="relative w-full max-w-[600px] aspect-[1656/956] overflow-hidden rounded-lg border border-rduc-border bg-rduc-card/40 shadow-[0_0_40px_rgba(22,119,255,0.08)] mx-auto lg:mx-0 lg:ml-auto"
        >
          <Image
            src="/content2.png"
            alt="Banner quảng cáo DAWA SHOP"
            fill
            priority
            sizes="(max-width: 1023px) 100vw, 40vw"
            className="object-contain"
          />
        </div>
      </div>
      <a href="#catalog" className="rduc-side-banner rduc-side-banner-left" aria-label="Xem danh mục sản phẩm bên trái">
        <Image src="/content.png" alt="" fill sizes="92px" className="object-cover" />
      </a>
      <a href="#catalog" className="rduc-side-banner rduc-side-banner-right" aria-label="Xem danh mục sản phẩm bên phải">
        <Image src="/content1.png" alt="" fill sizes="92px" className="object-cover" />
      </a>
    </section>
  );
}