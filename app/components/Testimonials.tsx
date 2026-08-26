import Image from "next/image";
import { SectionHeader } from "./SectionHeader";

type Testimonial = {
  name: string;
  handle: string;
  avatar: string;
  quote: string;
  result: string;
};

/* Content extracted from Figma nodes 3:222–3:249; avatars are the
 * original image fills downloaded from the Figma file. */
const testimonials: Testimonial[] = [
  {
    name: "Alex 'Apex' Carter",
    handle: "@apexcarter_cs",
    avatar: "/avatar-4.png",
    quote:
      "RDUC giúp tôi tiết kiệm hàng chục triệu đồng. Hệ thống GTX 1080 cũ tăng từ 120 FPS lên 240 FPS ổn định trong những khu vực đông người của Valorant.",
    result: "Kết quả: tăng 120 FPS",
  },
  {
    name: "Marcus Miller",
    handle: "@millerm_ow",
    avatar: "/avatar-5.png",
    quote:
      "Độ trễ thao tác giảm từ 12ms xuống 3,8ms ngay sau khi khởi chạy RDUC. Trong trận đấu cạnh tranh, khác biệt đó quyết định ai ra đòn trước.",
    result: "Kết quả: giảm 8,2ms độ trễ",
  },
  {
    name: "Elena Rostova",
    handle: "@elena_fps",
    avatar: "/avatar-6.png",
    quote:
      "Không còn giật khung hình trong những pha giao tranh căng thẳng. Tự động phân bổ RAM giúp Discord chạy nền và game được tách biệt hoàn toàn.",
    result: "Kết quả: mất 0% gói tin",
  },
];

/**
 * Testimonials — Figma spec (node 3:215): bg #070707, padding 120/96, gap 64;
 * grid 3 columns, gap 24; cards #121212 bg, border #262626, radius 8,
 * padding 32, vertical gap 24.
 */
export function Testimonials() {
  return (
    <section id="testimonials" className="scroll-mt-[84px] bg-rduc-darker">
      <div className="mx-auto w-full max-w-[1440px] px-6 py-20 lg:px-24 lg:py-[120px]">
        <SectionHeader
          badge="Game thủ xác nhận"
          title="Cộng đồng esports nói gì về RDUC"
          sub="Khám phá cách game thủ chuyên nghiệp, streamer và người yêu phần cứng lấy lại hiệu năng tối đa cho PC."
        />

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <article
              key={testimonial.handle}
              className="flex flex-col gap-6 rounded-lg border border-rduc-border bg-rduc-card p-8"
            >
              <div className="flex items-center gap-2">
                <Image
                  src={testimonial.avatar}
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 rounded-full border border-rduc-border object-cover"
                />
                <div className="flex flex-col gap-0.5">
                  <span className="font-display text-sm">{testimonial.name}</span>
                  <span className="font-mono text-[11px] text-rduc-red">{testimonial.handle}</span>
                </div>
              </div>

              <blockquote className="text-[15px] leading-6 text-rduc-muted">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>

              <p className="mt-auto rounded bg-rduc-iconbg px-4 py-2 font-mono text-xs text-white">
                {testimonial.result}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}