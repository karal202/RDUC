import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Cpu, Gamepad2, MonitorCog, Network, ShieldCheck } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

export type CatalogGroup = {
  title: string;
  items: string[];
  icon: typeof Cpu;
};

export const catalogGroups: CatalogGroup[] = [
  { title: "Setting", items: ["setting-dawa", "setting-window", "bios-setting", "highlight"], icon: Cpu },
  { title: "Reshade-Mod2k", items: ["Reshade-Roleplay", "Reshade-Mod2K", "Reshade-Photo", "Review-Reshade"], icon: Gamepad2 },
  { title: "Windows", items: ["Window-kenelos", "Window-ghost", "Window-imos", "Window-aura", "Window-atlas", "Window-revios", "Window-sapphi­reos", "Window-xlite", "Window-xos", "Window-kirbyos", "Window-10", "Window-11", "Review-Windows"], icon: MonitorCog },
  { title: "Edit", items: ["Edit-Video", "Video", "Review-Editvideo"], icon: Network },
  { title: "Bath Thailand", items: ["Notification-Bath", "Giá-Bath", "Chat", "Review"], icon: ShieldCheck },
  { title: "Tài khoản Rockstar FiveM", items: ["Code-Rockstar", "Tài-Khoản-Rockstar", "Tài-Khoản-Steam", "Discord"], icon: ShieldCheck },
];

const catalogImages = ["/games/valorant.png", "/games/cs2.png", "/games/apex-legends.png", "/games/fortnite.png", "/games/league-of-legends.png", "/games/overwatch-2.png"];

function HomepageCatalogCard({ group, index }: { group: CatalogGroup; index: number }) {
  const Icon = group.icon;

  return (
    <article className="group relative min-h-[230px] overflow-hidden rounded-lg border border-rduc-border bg-rduc-card transition-all duration-300 hover:border-rduc-red/70 hover:shadow-[0_18px_40px_rgba(22,119,255,0.16)]">
      <Image
        src={catalogImages[index]}
        alt=""
        fill
        sizes="(max-width: 767px) 100vw, 50vw"
        className="object-cover opacity-40 transition duration-500 group-hover:scale-105 group-hover:opacity-55"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/20" aria-hidden />
      <div className="relative flex min-h-[230px] flex-col justify-between p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex size-11 items-center justify-center border border-rduc-red/60 bg-black/65 text-rduc-red">
            <Icon className="size-5" strokeWidth={1.8} aria-hidden />
          </div>
          <span className="font-mono text-xs font-bold text-rduc-red">0{index + 1}</span>
        </div>
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-rduc-red">Mục lớn</p>
          <h3 className="mt-1 font-display text-2xl sm:text-3xl">{group.title}</h3>
          <div className="rduc-hover-content mt-3 max-w-[430px]">
            <p className="text-sm leading-6 text-rduc-muted">{group.items.length} sản phẩm và dịch vụ trong danh mục này.</p>
            <Link href="/catalog" className="mt-3 inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wide text-white hover:text-rduc-red">
              Xem chi tiết <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProductCatalog() {
  return (
    <section id="catalog" className="scroll-mt-[84px] border-b border-rduc-border bg-rduc-darker">
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
