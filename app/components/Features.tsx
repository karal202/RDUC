import {
  Activity,
  Cpu,
  RefreshCw,
  Shield,
  SlidersHorizontal,
  Trash2,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Marquee } from "./Marquee";
import { SectionHeader } from "./SectionHeader";

type Feature = {
  icon: LucideIcon;
  title: string;
  desc: string;
};

/* Content extracted from Figma nodes 3:81–3:144 */
const features: Feature[] = [
  {
    icon: Zap,
    title: "FPS Optimizer",
    desc: "Instantly reallocate system CPU threads to isolate and drive priority frames.",
  },
  {
    icon: Activity,
    title: "Latency Reducer",
    desc: "Bypass standard network processing loops to shave off critical milliseconds.",
  },
  {
    icon: Trash2,
    title: "System Cleaner",
    desc: "Purge background bloatware and unnecessary caching services on startup.",
  },
  {
    icon: Cpu,
    title: "GPU Tuner",
    desc: "Configure safe, high-efficiency power profiles tailored for gaming demands.",
  },
  {
    icon: SlidersHorizontal,
    title: "RAM Manager",
    desc: "Instantly release memory reserves locked by inactive system apps.",
  },
  {
    icon: Shield,
    title: "Game Mode",
    desc: "Divert all network and core activity strictly to your live competitive title.",
  },
  {
    icon: Wifi,
    title: "Network Booster",
    desc: "Streamline packet routing paths to avoid packet loss during active queues.",
  },
  {
    icon: RefreshCw,
    title: "Driver Shield",
    desc: "Perform deep verification checks to guarantee standard esports compatibility.",
  },
];

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  return (
    <article className="w-[280px] shrink-0 rounded-lg border border-rduc-border bg-rduc-card p-8 transition-colors duration-200 hover:border-rduc-red/60 sm:w-[294px]">
      <div className="flex items-center justify-between">
        <div className="flex size-12 items-center justify-center rounded border border-rduc-border bg-rduc-iconbg">
          <feature.icon className="size-6 text-rduc-red" strokeWidth={2} aria-hidden />
        </div>
        <span className="font-mono text-sm font-bold text-rduc-ghost">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <div className="mt-6 flex flex-col gap-2">
        <h3 className="font-display text-lg">{feature.title}</h3>
        <p className="text-sm leading-[1.5] text-rduc-muted">{feature.desc}</p>
      </div>
    </article>
  );
}

/**
 * Features — Figma spec (node 3:71): bg #070707, padding 120/96;
 * cards #121212 bg, border #262626, radius 8, padding 32.
 * Rendered as an auto-scrolling horizontal list (see Marquee).
 */
export function Features() {
  return (
    <section id="features" className="scroll-mt-[84px] overflow-hidden bg-rduc-darker">
      <div className="mx-auto w-full max-w-[1440px] px-6 pt-20 lg:px-24 lg:pt-[120px]">
        <SectionHeader
          badge="Engine Core Features"
          title="Everything Your PC Needs to Game Better"
          sub="Designed by competitive gamers and engineers, RDUC operates directly with your OS to remove latency bottlenecks."
        />
      </div>

      <div className="mt-16 pb-20 lg:pb-[120px]">
        <Marquee speed={30}>
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </Marquee>
      </div>
    </section>
  );
}