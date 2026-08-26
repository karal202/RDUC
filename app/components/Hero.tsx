import Image from "next/image";
import { ButtonOutline, ButtonPrimary } from "./buttons";

/* Bar heights (px) extracted from Figma node 3:39 chart, tallest = 33 */
const stabilityBars = [7, 9, 8, 11, 14, 13, 17, 16, 20, 23, 21, 27, 33];

type StatCardProps = {
  label: string;
  value: string;
  delta: string;
  deltaColor: string;
  barColor: string;
};

/** Stat card — Figma spec (nodes 3:40 / 3:47): black bg, border #262626,
 * radius 6, padding 24, vertical gap 12. */
function StatCard({ label, value, delta, deltaColor, barColor }: StatCardProps) {
  return (
    <div className="rounded-md border border-rduc-border bg-black p-6">
      <p className="font-mono text-[11px] text-rduc-muted">{label}</p>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-[40px] leading-none sm:text-[48px] sm:leading-[52px]">
          {value}
        </span>
        <span className={`font-mono text-base font-bold ${deltaColor}`}>{delta}</span>
      </div>
      <div className={`mt-3 h-1 w-full max-w-[216px] rounded-sm ${barColor}`} />
    </div>
  );
}

/**
 * Hero — Figma spec (node 3:16): min-height 720, horizontal padding 96,
 * two columns gap 32; left copy stack gap 40, right dashboard card
 * (#121212 bg, border #262626, radius 8, padding 32, gap 24).
 * Red ellipse glow: #ff1b2d at 20% opacity with 150px layer blur.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-black">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-rduc-red opacity-20 blur-[150px]"
      />

      <div className="relative mx-auto flex min-h-[720px] w-full max-w-[1440px] flex-col items-center justify-center gap-12 px-6 py-20 lg:flex-row lg:gap-8 lg:px-24 lg:py-0">
        {/* Left column — copy */}
        <div className="flex w-full flex-col gap-10 lg:max-w-[608px]">
          <div className="flex flex-col gap-6">
            <p className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wide text-rduc-red">
              <span className="size-2 rounded-sm bg-rduc-red" aria-hidden />
              Phần mềm tối ưu PC
            </p>
            <h1 className="font-display text-[40px] leading-[1.05] sm:text-[56px] sm:leading-[58.8px]">
              BOOST FPS.
              <br />
              REDUCE LATENCY.
            </h1>
            <p className="max-w-[520px] text-lg leading-[1.6] text-rduc-muted">
              Tối ưu hiệu năng PC và trong game chỉ với một cú nhấp. Loại bỏ
              điểm nghẽn, khai phá sức mạnh phần cứng và đạt phản hồi tức thì.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <ButtonPrimary href="#download" withIcon>
              Tải RDUC
            </ButtonPrimary>
            <ButtonOutline href="#features">Xem thêm</ButtonOutline>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex -space-x-2.5">
              {[1, 2, 3].map((n) => (
                <Image
                  key={n}
                  src={`/avatar-${n}.png`}
                  alt=""
                  width={36}
                  height={36}
                  className="size-9 rounded-full ring-2 ring-black"
                />
              ))}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-display text-sm">Được 2,5 triệu+ game thủ tin dùng</span>
              <span className="text-xs text-rduc-muted">
                Đồng hành cùng các giải esports hàng đầu
              </span>
            </div>
          </div>
        </div>

        {/* Right column — live metrics dashboard */}
        <div className="w-full max-w-[608px] rounded-lg border border-rduc-border bg-rduc-card p-6 sm:p-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard
              label="Tốc độ FPS"
              value="340"
              delta="+42%"
              deltaColor="text-rduc-red"
              barColor="bg-rduc-red"
            />
            <StatCard
              label="Độ trễ hệ thống"
              value="4.2ms"
              delta="-68%"
              deltaColor="text-rduc-green"
              barColor="bg-rduc-green"
            />
          </div>

          {/* Engine stability chart — Figma node 3:60: red border, bars aligned bottom */}
          <div className="mt-6 rounded-md border border-rduc-red bg-black p-6">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase">Độ ổn định RDUC</span>
              <span className="font-mono text-xs font-bold uppercase text-rduc-red">Đã tối ưu</span>
            </div>
            <div
              role="img"
              aria-label="Biểu đồ độ ổn định hệ thống đang tăng"
              className="mt-4 flex h-10 items-end gap-1"
            >
              {stabilityBars.map((height, index) => (
                <div
                  key={index}
                  style={{ height: `${(height / 33) * 100}%` }}
                  className={`min-w-0 flex-1 rounded-sm ${
                    index === stabilityBars.length - 1 ? "bg-rduc-red" : "bg-rduc-iconbg"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}