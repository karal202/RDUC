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
      "RDUC saved me thousands. My older GTX 1080 system went from dragging at 120 FPS to hitting an incredibly steady 240 FPS inside busy Valorant sites.",
    result: "Result: +120 FPS Increase",
  },
  {
    name: "Marcus Miller",
    handle: "@millerm_ow",
    avatar: "/avatar-5.png",
    quote:
      "Input latency dropped from 12ms to 3.8ms immediately after launching RDUC. In competitive queues, that difference dictates who registers the tap.",
    result: "Result: -8.2ms Input Latency",
  },
  {
    name: "Elena Rostova",
    handle: "@elena_fps",
    avatar: "/avatar-6.png",
    quote:
      "Zero micro-stutters during intensive team fights. The automated RAM allocation keeps my background Discord and game queue strictly isolated.",
    result: "Result: 0% Packet Loss",
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
          badge="Gamer Verified"
          title="Praise From the Esports Grid"
          sub="Read how pro gamers, streamers, and hardware hobbyists alike are reclaiming their PC's peak capacity."
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