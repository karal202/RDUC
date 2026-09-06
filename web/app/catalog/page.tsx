import { ChevronDown } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { catalogGroups, type CatalogGroup } from "../components/ProductCatalog";
import { Marquee } from "../components/Marquee";
import { CatalogItemCard } from "../components/CatalogItemCard";

const catalogImages = ["/banner5.jpg", "/banner5.jpg", "/banner5.jpg", "/banner5.jpg", "/banner5.jpg", "/banner5.jpg"];

const settingImages = ["/setting/dawa.png", "/setting/window.png", "/setting/BIOS.png", "/setting/network.png"];

const windowsImages = [
  "/catalog/windows/kernelos.png",
  "/catalog/windows/ghost.png",
  "/catalog/windows/imos.png",
  "/catalog/windows/aura.png",
  "/catalog/windows/atlas.png",
  "/catalog/windows/revios.png",
  "/catalog/windows/sapphireos.png",
  "/catalog/windows/xlite.png",
  "/catalog/windows/xos.png",
  "/catalog/windows/kirbyos.png",
  "/catalog/windows/win10.png",
  "/catalog/windows/win11.png",
  "/catalog/windown/win11.png",
];

function CatalogGroupSection({ group, groupIndex }: { group: CatalogGroup; groupIndex: number }) {
  const Icon = group.icon;

  return (
    <section id={`catalog-${groupIndex}`} className="scroll-mt-[96px] border-t border-white/[0.08] pt-10 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-3.5">
        <div className="flex size-12 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/60 text-cyan-400 shadow-[0_0_15px_rgba(0,242,254,0.15)]">
          <Icon className="size-6" strokeWidth={1.8} aria-hidden />
        </div>
        <div>
          <h2 className="font-display text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
            {group.title}
          </h2>
          <p className="font-mono text-xs text-slate-400">
            Mục {String(groupIndex + 1).padStart(2, "0")} • {group.items.length} cấu hình
          </p>
        </div>
        <ChevronDown className="ml-auto size-5 text-slate-500" aria-hidden />
      </div>
      <div className="mt-6">
        <Marquee
          interval={1000}
          loop={group.items.length > 4}
          autoPlay={group.items.length > 4}
          centerContent={group.items.length <= 4}
          prevSectionId={groupIndex > 0 ? `catalog-${groupIndex - 1}` : "catalog-top"}
          nextSectionId={groupIndex < catalogGroups.length - 1 ? `catalog-${groupIndex + 1}` : "contact"}
          className="rduc-catalog-carousel"
        >
          {group.items.map((item, itemIndex) => (
            <CatalogItemCard
              key={item}
              item={item}
              image={group.title === "Windows" ? windowsImages[itemIndex] : group.title === "Setting" ? settingImages[itemIndex] : "/banner5.jpg"}
            />
          ))}
        </Marquee>
      </div>
    </section>
  );
}

export default function CatalogPage() {
  return (
    <>
      <Header />
      <main id="catalog-top" className="relative min-h-screen bg-[#04060a] overflow-hidden">
        {/* Ambient Top Aurora */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[160px]" />

        <div className="mx-auto max-w-[1440px] px-6 pb-20 pt-16 lg:px-24 lg:pb-32 lg:pt-24">
          <div className="max-w-[780px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-mono font-bold uppercase tracking-widest text-cyan-400 shadow-[0_0_12px_rgba(0,242,254,0.15)]">
              <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />
              DAWA SHOP / DANH MỤC HỆ THỐNG
            </div>
            <h1 className="mt-5 font-display text-5xl font-black uppercase tracking-tight text-white drop-shadow-lg sm:text-7xl">
              Danh mục sản phẩm
            </h1>
            <p className="mt-5 max-w-[640px] text-base sm:text-lg leading-relaxed text-slate-400">
              Chọn nhóm giải pháp tối ưu phù hợp với cấu hình phần cứng và tựa game bạn tham chiến.
            </p>
          </div>

          <div className="mt-14 flex flex-col gap-12">
            {catalogGroups.map((group, index) => (
              <CatalogGroupSection key={group.title} group={group} groupIndex={index} />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
