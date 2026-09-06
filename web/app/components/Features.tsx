import {
  Activity,
  Cpu,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
  Wifi,
  Zap,
  Gamepad2,
  Shield,
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
    title: "Tối ưu FPS",
    desc: "Phân bổ lại luồng CPU để cô lập và ưu tiên xử lý từng khung hình.",
  },
  {
    icon: Activity,
    title: "Giảm độ trễ",
    desc: "Rút ngắn các vòng xử lý mạng tiêu chuẩn để giảm từng mili-giây quan trọng.",
  },
  {
    icon: Trash2,
    title: "Dọn dẹp hệ thống",
    desc: "Loại bỏ phần mềm nền dư thừa và dịch vụ bộ nhớ đệm không cần thiết.",
  },
  {
    icon: Cpu,
    title: "Tinh chỉnh GPU",
    desc: "Thiết lập cấu hình nguồn an toàn, hiệu quả cao cho nhu cầu chơi game.",
  },
  {
    icon: SlidersHorizontal,
    title: "Quản lý RAM",
    desc: "Giải phóng ngay phần bộ nhớ bị các ứng dụng không hoạt động chiếm dụng.",
  },
  {
    icon: Gamepad2,
    title: "Chế độ game",
    desc: "Dồn tài nguyên mạng và lõi xử lý cho tựa game cạnh tranh đang chơi.",
  },
  {
    icon: Wifi,
    title: "Tăng tốc mạng",
    desc: "Tối ưu đường truyền gói tin để hạn chế mất gói trong trận đấu.",
  },
  {
    icon: Shield,
    title: "Bảo vệ driver",
    desc: "Kiểm tra chuyên sâu để đảm bảo khả năng tương thích esports ổn định.",
  },
];

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const serial = `SYS-${String(index + 1).padStart(2, "0")}`;
  return (
    <article className="group relative flex h-[260px] w-[290px] shrink-0 flex-col justify-between overflow-hidden rounded-xl border border-white/[0.08] bg-[#070b14]/90 p-7 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-cyan-500/40 hover:shadow-[0_12px_30px_rgba(0,242,254,0.15)] sm:w-[310px]">
      {/* Top ambient glow on hover */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-500/10 blur-2xl transition-opacity duration-300 group-hover:opacity-100 opacity-30" />
      
      <div className="flex items-center justify-between">
        <div className="relative flex size-12 items-center justify-center rounded-lg border border-cyan-500/25 bg-cyan-950/40 text-cyan-400 shadow-[0_0_15px_rgba(0,242,254,0.1)] transition-transform duration-300 group-hover:scale-110 group-hover:border-cyan-400 group-hover:text-cyan-300">
          <feature.icon className="size-6" strokeWidth={2} aria-hidden />
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-500 group-hover:text-cyan-400/80 transition-colors">
          <span className="size-1.5 rounded-full bg-cyan-500/40 group-hover:bg-cyan-400 animate-pulse" />
          {serial}
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-4">
        <h3 className="font-display text-lg font-bold text-white transition-colors group-hover:text-cyan-300">
          {feature.title}
        </h3>
        <p className="text-sm leading-relaxed text-slate-400 line-clamp-3">
          {feature.desc}
        </p>
      </div>

      {/* Cyber bottom accent line */}
      <div className="mt-3 flex items-center justify-between pt-3 border-t border-white/[0.05] text-[11px] font-mono text-slate-500">
        <span className="text-emerald-400/90 font-medium">● ACTIVE</span>
        <span className="tracking-wider uppercase opacity-60">KERNEL-OPTIMIZED</span>
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
    <section id="features" className="scroll-mt-[84px] overflow-hidden bg-transparent">
      <div className="mx-auto w-full max-w-[1440px] px-6 pt-20 lg:px-24 lg:pt-[120px]">
        <SectionHeader
          badge="Tính năng lõi"
          title="Mọi thứ PC cần để chơi game tốt hơn"
          sub="Được xây dựng bởi game thủ và kỹ sư, DAWA tác động trực tiếp vào hệ điều hành để loại bỏ điểm nghẽn độ trễ."
        />
      </div>

      <div className="mt-16 pb-20 lg:pb-[120px]">
        <Marquee interval={1000} reserveSideBanners prevSectionId="catalog" nextSectionId="games">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </Marquee>
      </div>
    </section>
  );
}