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
    icon: Shield,
    title: "Chế độ game",
    desc: "Dồn tài nguyên mạng và lõi xử lý cho tựa game cạnh tranh đang chơi.",
  },
  {
    icon: Wifi,
    title: "Tăng tốc mạng",
    desc: "Tối ưu đường truyền gói tin để hạn chế mất gói trong trận đấu.",
  },
  {
    icon: RefreshCw,
    title: "Bảo vệ driver",
    desc: "Kiểm tra chuyên sâu để đảm bảo khả năng tương thích esports ổn định.",
  },
];

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  return (
    <article className="group flex h-[250px] w-[280px] shrink-0 flex-col rounded-lg border border-rduc-border bg-rduc-card p-8 transition-colors duration-200 hover:border-rduc-red/60 sm:w-[294px]">
      <div className="flex items-center justify-between">
        <div className="flex size-12 items-center justify-center rounded border border-rduc-border bg-rduc-iconbg">
          <feature.icon className="size-6 text-rduc-red" strokeWidth={2} aria-hidden />
        </div>
        <span className="font-mono text-sm font-bold text-rduc-ghost">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <div className="mt-auto flex flex-col gap-2">
        <h3 className="font-display text-lg">{feature.title}</h3>
        <div className="rduc-hover-content flex flex-col gap-2">
        <p className="text-sm leading-[1.5] text-rduc-muted">{feature.desc}</p>
        </div>
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
          badge="Tính năng lõi"
          title="Mọi thứ PC cần để chơi game tốt hơn"
          sub="Được xây dựng bởi game thủ và kỹ sư, RDUC tác động trực tiếp vào hệ điều hành để loại bỏ điểm nghẽn độ trễ."
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