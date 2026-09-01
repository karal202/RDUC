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
    <Link href={`/catalog#catalog-${index}`} className="group block rduc-catalog-card relative min-h-[230px] overflow-visible rounded-lg border border-rduc-border bg-rduc-card transition-all duration-300 hover:z-10 hover:scale-[1.03] hover:border-rduc-red/70 hover:shadow-[0_18px_40px_rgba(22,119,255,0.16)]">
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        <Image
          src={groupImages[group.title] ?? catalogImages[index]}
          alt=""
          fill
          sizes="(max-width: 767px) 100vw, 50vw"
          className="object-cover opacity-100 transition duration-500 group-hover:scale-105 group-hover:brightness-50 group-hover:saturate-50"
        />
        <div className="absolute inset-0 bg-black/25 transition-opacity duration-300 group-hover:bg-black/80" aria-hidden />
      </div>
      <div className="relative flex min-h-[230px] flex-col justify-between p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex size-11 items-center justify-center border border-rduc-red/60 bg-black/65 text-rduc-red">
            <Icon className="size-5" strokeWidth={1.8} aria-hidden />
          </div>
          <span className="font-mono text-xs font-bold text-rduc-red">0{index + 1}</span>
        </div>
        <div>
          <h3 className="font-display text-2xl sm:text-3xl">{group.title}</h3>
        </div>
      </div>
      <div className="rduc-hover-content absolute inset-0 z-10 flex flex-col justify-end overflow-hidden rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-[1px] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-xl sm:text-2xl">{group.title}</h3>
          </div>
          <ArrowUpRight className="mt-1 size-5 shrink-0 text-rduc-red" aria-hidden />
        </div>
        <div className="mt-4 grid grid-cols-[repeat(3,minmax(0,1fr))] gap-x-3 gap-y-1 border-t border-rduc-red/60 pt-3">
          {group.items.map((item) => (
            <span key={item} className="break-words font-mono text-[10px] leading-5 text-rduc-muted" title={item}>
              {item}
            </span>
          ))}
        </div>
        <span className="mt-3 inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wide text-white group-hover:text-rduc-red">
          Xem danh mục <ArrowUpRight className="size-4" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

export function ProductCatalog() {
  return (
    <section id="catalog" className="scroll-mt-[84px] border-b border-rduc-border bg-transparent">
      <div className="mx-auto w-full max-w-[1440px] px-6 py-20 lg:px-24 lg:py-[120px]">
        <SectionHeader
          badge="Danh mục sản phẩm"
          title="Chọn đúng cấu hình cho lối chơi của bạn"
          sub="Tất cả công cụ và dịch vụ DAWA SHOP được sắp xếp theo từng nhu cầu tối ưu rõ ràng."
        />

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
          {catalogGroups.map((group, index) => (
            <HomepageCatalogCard key={group.title} group={group} index={index} />
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <Link href="/catalog" className="inline-flex items-center gap-2 border border-rduc-red px-5 py-3 font-mono text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-rduc-red">
            Xem toàn bộ danh mục <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
