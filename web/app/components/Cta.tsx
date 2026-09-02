import { ButtonOutline, ButtonPrimary } from "./buttons";

/**
 * CTA — Figma spec (node 3:250): black bg, border #262626, padding 96,
 * centered stack gap 40; heading Archivo Black 48px, subtitle Archivo
 * 18px muted. Red ellipse glow: #ff1b2d at 20% opacity, 180px blur.
 */
export function Cta() {
  return (
    <section id="download" className="relative scroll-mt-[84px] overflow-hidden border-y border-rduc-border bg-black">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-rduc-red opacity-20 blur-[180px]"
      />

      <div className="relative mx-auto flex w-full max-w-[1440px] flex-col items-center gap-10 px-6 py-24 text-center lg:px-24">
        <div className="flex max-w-[720px] flex-col items-center gap-4">
          <h2 className="font-display text-[34px] leading-[1.05] sm:text-[48px] sm:leading-[50.4px]">
            NÓI KHÔNG VỚI NÂNG CẤP ĐẮT ĐỎ
          </h2>
          <p className="text-lg leading-[1.6] text-rduc-muted">
            Khôi phục hiệu năng vốn có của phần cứng. Chạy chẩn đoán, bật tối ưu
            hóa và nâng cao thứ hạng thi đấu cùng DAWA ngay hôm nay.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <ButtonPrimary href="https://github.com/karal202/RDUC/releases/download/v1.0.0/DAWA.System.Check.Setup.1.0.0.exe" download withIcon>
            Tải DAWA ngay
          </ButtonPrimary>
          <ButtonOutline href="#">Xem thông số hệ thống</ButtonOutline>
        </div>
      </div>
    </section>
  );
}