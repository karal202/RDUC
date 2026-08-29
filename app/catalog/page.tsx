import { ChevronDown } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { catalogGroups, type CatalogGroup } from "../components/ProductCatalog";
import { Marquee } from "../components/Marquee";
import { CatalogItemCard } from "../components/CatalogItemCard";

const catalogImages = ["/games/valorant.png", "/games/cs2.png", "/games/apex-legends.png", "/games/fortnite.png", "/games/league-of-legends.png", "/games/overwatch-2.png"];

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
    <section id={`catalog-${groupIndex}`} className="scroll-mt-[96px] border-t border-rduc-border pt-8 first:border-t-0">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center border border-rduc-red/60 bg-rduc-iconbg text-rduc-red">
          <Icon className="size-6" strokeWidth={1.8} aria-hidden />
        </div>
        <div>
          <h2 className="font-display text-2xl sm:text-3xl">{group.title}</h2>
        </div>
        <ChevronDown className="ml-auto size-5 text-rduc-muted" aria-hidden />
      </div>
      <div className="mt-6">
        <Marquee
          interval={2000}
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
              image={group.title === "Windows" ? windowsImages[itemIndex] : group.title === "Setting" ? settingImages[itemIndex] : catalogImages[(groupIndex + itemIndex) % catalogImages.length]}
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
      <main id="catalog-top" className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,92,169,0.22),_transparent_42%),_#050b13]">
        <div className="mx-auto max-w-[1440px] px-6 pb-20 pt-16 lg:px-24 lg:pb-32 lg:pt-24">
          <div className="max-w-[760px]">
            <p className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.16em] text-rduc-red">
              <span className="size-2 bg-rduc-red" aria-hidden />
              DAWA SHOP / DANH MỤC
            </p>
            <h1 className="mt-5 font-display text-5xl leading-none sm:text-7xl">Danh mục sản phẩm</h1>
            <p className="mt-6 max-w-[620px] text-base leading-7 text-rduc-muted">
              Chọn nhóm sản phẩm phù hợp và bắt đầu tối ưu hệ thống theo cách bạn chơi.
            </p>
          </div>

          <div className="mt-14 flex flex-col gap-10">
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
