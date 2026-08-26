import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { catalogGroups, type CatalogGroup } from "../components/ProductCatalog";
import { Marquee } from "../components/Marquee";

const catalogImages = ["/games/valorant.png", "/games/cs2.png", "/games/apex-legends.png", "/games/fortnite.png", "/games/league-of-legends.png", "/games/overwatch-2.png"];

function CatalogItemCard({ item, image }: { item: string; image: string }) {
  return (
    <article className="group relative h-[360px] w-[220px] shrink-0 overflow-hidden border border-rduc-border bg-rduc-card transition-all duration-300 hover:-translate-y-1 hover:border-rduc-red/70 sm:w-[250px]">
      <Image src={image} alt="" fill sizes="250px" className="object-cover opacity-35 transition duration-500 group-hover:scale-105 group-hover:opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/10" aria-hidden />
      <div className="relative flex h-full flex-col justify-end p-6">
        <div className="rduc-hover-content mb-auto flex size-10 items-center justify-center border border-rduc-red/60 bg-black/70 font-mono text-sm text-rduc-red">#</div>
        <h3 className="font-display text-lg leading-tight">{item}</h3>
        <div className="rduc-hover-content mt-4 border-t border-rduc-red/60 pt-4">
          <p className="text-xs leading-5 text-rduc-muted">Sản phẩm minh họa tạm thời cho danh mục này.</p>
          <Link href="/#contact" className="mt-3 inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wide text-white hover:text-rduc-red">
            Xem sản phẩm <ArrowUpRight className="size-3" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}

function CatalogGroupSection({ group, groupIndex }: { group: CatalogGroup; groupIndex: number }) {
  const Icon = group.icon;

  return (
    <section id={`catalog-${groupIndex}`} className="border-t border-rduc-border pt-8 first:border-t-0">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center border border-rduc-red/60 bg-rduc-iconbg text-rduc-red">
          <Icon className="size-6" strokeWidth={1.8} aria-hidden />
        </div>
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-rduc-red">Mục lớn</p>
          <h2 className="font-display text-2xl sm:text-3xl">{group.title}</h2>
        </div>
        <ChevronDown className="ml-auto size-5 text-rduc-muted" aria-hidden />
      </div>
      <div className="mt-6">
        <Marquee speed={22}>
          {group.items.map((item, itemIndex) => (
            <CatalogItemCard key={item} item={item} image={catalogImages[(groupIndex + itemIndex) % catalogImages.length]} />
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
      <main className="min-h-screen bg-black">
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
