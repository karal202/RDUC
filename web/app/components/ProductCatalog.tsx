import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Cpu, Gamepad2, MonitorCog, Network, ShieldCheck, Settings, User } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

export type CatalogGroup = {
  title: string;
  items: string[];
  icon: typeof Cpu;
};

export const catalogGroups: CatalogGroup[] = [
  { title: "Setting", items: ["setting-dawa", "setting-window", "bios-setting", "network-setting"], icon: Settings },
  { title: "Windows", items: ["Window-kenelos", "Window-ghost", "Window-imos", "Window-aura", "Window-atlas", "Window-revios", "Window-sapphi­reos", "Window-xlite", "Window-xos", "Window-kirbyos", "Window-10", "Window-11"], icon: MonitorCog },
  { title: "Reshade-Mod2k", items: ["Reshade-Roleplay", "Reshade-Mod2K", "Reshade-Photo", "Review-Reshade"], icon: Gamepad2 },
  { title: "Edit", items: ["Edit-Video", "Video", "Review-Editvideo"], icon: Network },
  { title: "Bath Thailand", items: ["Notification-Bath", "Giá-Bath", "Chat", "Review"], icon: ShieldCheck },
  { title: "Tài khoản Rockstar FiveM", items: ["Code-Rockstar", "Tài-Khoản-Rockstar", "Tài-Khoản-Steam", "Discord"], icon: User },
];

const catalogImages = ["/banner5.jpg", "/banner5.jpg", "/banner5.jpg", "/banner5.jpg", "/banner5.jpg", "/banner5.jpg"];

const groupImages: Record<string, string> = {
  Windows: "/banner5.jpg",
  Setting: "/banner5.jpg",
};

export const windowsProductDetails: Record<string, { label: string; description: string }> = {
  "Window-kenelos": {
    label: "KernelOS",
    description: "Phù hợp máy cấu hình thấp đến trung bình, đặc biệt dành cho game thủ. Giảm tiến trình chạy nền, giảm RAM và CPU, giảm input lag, đồng thời loại bỏ ứng dụng Windows cài sẵn không cần thiết.",
  },
  "Window-ghost": {
    label: "Ghost",
    description: "Tối ưu cho máy cấu hình thấp, giúp tăng FPS. Giảm tiến trình Windows khởi chạy ban đầu và giảm mức sử dụng RAM, CPU cho các tác vụ không cần thiết.",
  },
  "Window-imos": {
    label: "iMoS",
    description: "Phù hợp máy cấu hình thấp đến trung bình và game thủ. Giảm tiến trình chạy nền, giảm RAM và CPU, giảm input lag, loại bỏ các ứng dụng Windows cài sẵn không cần thiết.",
  },
  "Window-aura": {
    label: "Aura",
    description: "Phù hợp mọi cấu hình và được tối ưu cho gaming. Giảm tiến trình nền, RAM, CPU, input lag và độ trễ hệ thống xuống mức rất thấp. Không hỗ trợ Microsoft Store hoặc Win+Shift+S.",
  },
  "Window-atlas": {
    label: "Atlas",
    description: "Có thể cài đè lên Windows hiện tại, phù hợp mọi cấu hình mà không cần cài mới từ đầu. Giảm tải CPU, giảm RAM và CPU không cần thiết, giúp máy mượt hơn và giảm input lag.",
  },
  "Window-revios": {
    label: "ReviOS",
    description: "Có thể cài đè lên Windows hiện tại, phù hợp mọi cấu hình mà không cần cài mới từ đầu. Giảm tải CPU, giảm RAM và CPU không cần thiết, giúp máy mượt hơn và giảm input lag.",
  },
  "Window-sapphi­reos": {
    label: "SapphireOS",
    description: "Giảm các tiến trình Windows chạy nền, giảm mức sử dụng RAM và CPU không cần thiết, đồng thời giảm input lag và độ trễ hệ thống xuống mức rất thấp.",
  },
  "Window-xlite": {
    label: "X-Lite",
    description: "Phù hợp máy cấu hình thấp lẫn hệ thống hiệu năng cao. Giảm dịch vụ chạy nền, có thể cải thiện FPS, hạn chế telemetry, loại bỏ ứng dụng thừa và cho phép kiểm soát Defender, Edge, Store, Update.",
  },
  "Window-xos": {
    label: "XOS",
    description: "Ít tiến trình hơn Windows thông thường, tăng FPS và giúp hệ thống sạch, mượt hơn. Loại bỏ ứng dụng cài sẵn không cần thiết, phù hợp chơi game lẫn làm việc và có hỗ trợ trong quá trình sử dụng.",
  },
  "Window-kirbyos": {
    label: "KirbyOS",
    description: "Mượt hơn Windows tiêu chuẩn, giảm giật lag và drop FPS, giảm input lag, ổn định FPS, khởi động nhanh, loại bỏ phần mềm thừa và phù hợp với máy cấu hình thấp.",
  },
  "Window-10": {
    label: "Windows 10",
    description: "Cấu hình Windows được tối ưu hóa, cho hiệu năng chơi game và FPS cao hơn Windows 11, đồng thời tương thích với mọi cấu hình máy tính.",
  },
  "Window-11": {
    label: "Windows 11",
    description: "Cài đặt mới Windows 11, thiết lập các tùy chọn Windows, giúp hệ thống hoạt động mượt như máy tính mới và cài đặt các phần mềm cơ bản.",
  },
};

function HomepageCatalogCard({ group, index }: { group: CatalogGroup; index: number }) {
  const Icon = group.icon;

  return (
    <Link
      href={`/catalog#catalog-${index}`}
      className="group block rduc-catalog-card relative min-h-[250px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#070b14]/90 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-cyan-500/50 hover:shadow-[0_15px_35px_rgba(0,242,254,0.15)]"
    >
      <div className="absolute inset-0 overflow-hidden rounded-2xl">
        <Image
          src={groupImages[group.title] ?? catalogImages[index]}
          alt=""
          fill
          sizes="(max-width: 767px) 100vw, 50vw"
          className="object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-50 group-hover:saturate-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050914] via-[#050914]/75 to-black/30 transition-opacity duration-300 group-hover:bg-[#050914]/90" aria-hidden />
      </div>

      <div className="relative flex min-h-[250px] flex-col justify-between p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/70 text-cyan-400 shadow-[0_0_15px_rgba(0,242,254,0.15)] transition-transform duration-300 group-hover:scale-110">
            <Icon className="size-6" strokeWidth={1.8} aria-hidden />
          </div>
          <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 font-mono text-xs font-bold text-cyan-400">
            0{index + 1}
          </span>
        </div>
        <div>
          <h3 className="font-display text-2xl font-black uppercase tracking-tight text-white group-hover:text-cyan-200 sm:text-3xl transition-colors">
            {group.title}
          </h3>
          <p className="mt-1 font-mono text-xs text-slate-400">
            {group.items.length} cấu hình tối ưu sẵn sàng
          </p>
        </div>
      </div>

      <div className="rduc-hover-content absolute inset-0 z-10 flex flex-col justify-end overflow-hidden rounded-2xl border border-cyan-500/40 bg-[#070b14]/95 p-6 backdrop-blur-md sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-xl font-bold text-white sm:text-2xl">{group.title}</h3>
          </div>
          <div className="flex size-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
            <ArrowUpRight className="size-5" aria-hidden />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-[repeat(3,minmax(0,1fr))] gap-x-3 gap-y-1.5 border-t border-white/[0.08] pt-3">
          {group.items.map((item) => (
            <span key={item} className="truncate font-mono text-[11px] leading-5 text-slate-400 group-hover:text-slate-300" title={item}>
              {item}
            </span>
          ))}
        </div>
        <span className="mt-4 inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-cyan-400 group-hover:text-cyan-300">
          Xem chi tiết danh mục <ArrowUpRight className="size-4" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

export function ProductCatalog() {
  return (
    <section id="catalog" className="scroll-mt-[84px] border-b border-white/[0.06] bg-transparent">
      <div className="mx-auto w-full max-w-[1440px] px-6 py-20 lg:px-24 lg:py-[120px]">
        <SectionHeader
          badge="Danh mục sản phẩm"
          title="Chọn đúng cấu hình cho lối chơi của bạn"
          sub="Tất cả công cụ và dịch vụ DAWA SHOP được phân loại theo từng nhu cầu tối ưu rõ ràng."
        />

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {catalogGroups.map((group, index) => (
            <HomepageCatalogCard key={group.title} group={group} index={index} />
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-6 py-3.5 font-mono text-xs font-bold uppercase tracking-widest text-cyan-300 backdrop-blur-md transition-all duration-300 hover:border-cyan-400 hover:bg-cyan-400 hover:text-black hover:shadow-[0_0_25px_rgba(0,242,254,0.3)]"
          >
            Xem toàn bộ danh mục <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}

