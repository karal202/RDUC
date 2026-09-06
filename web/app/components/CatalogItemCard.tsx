import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { windowsProductDetails } from "./ProductCatalog";

type CatalogItemCardProps = {
  item: string;
  image: string;
};

export function CatalogItemCard({ item, image }: CatalogItemCardProps) {
  const details = windowsProductDetails[item];

  return (
    <article className="group/item rduc-catalog-card relative z-0 h-[370px] w-[230px] shrink-0 group-hover/item:z-10 sm:w-[260px]">
      <div className="absolute inset-0 z-0 overflow-hidden rounded-xl border border-white/[0.08] bg-[#070b14] shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all duration-300 group-hover/item:border-cyan-500/50 group-hover/item:shadow-[0_10px_30px_rgba(0,242,254,0.18)]">
        <Image
          src={image}
          alt=""
          fill
          sizes="260px"
          className="object-cover scale-[1.04] transition duration-500 group-hover/item:scale-110 group-hover/item:brightness-50 group-hover/item:saturate-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050914] via-[#050914]/60 to-black/30 transition-opacity duration-300 group-hover/item:bg-[#050914]/90" aria-hidden />
      </div>

      <div className="relative z-10 flex h-full w-full flex-col justify-between rounded-xl p-5 sm:p-6">
        <div className="flex size-9 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-950/80 font-mono text-xs font-bold text-cyan-400 shadow-[0_0_12px_rgba(0,242,254,0.15)]">
          ✦
        </div>
        <div>
          <h3 className="break-words font-display text-lg font-black uppercase tracking-tight text-white group-hover/item:text-cyan-200 transition-colors">
            {details?.label ?? item}
          </h3>
        </div>
      </div>

      <div className="rduc-hover-content absolute inset-0 z-10 flex flex-col justify-between overflow-y-auto rounded-xl border border-cyan-500/50 bg-[#070b14]/95 p-5 backdrop-blur-md sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h3 className="break-words font-display text-lg font-bold text-white">
            {details?.label ?? item}
          </h3>
          <ArrowUpRight className="size-5 shrink-0 text-cyan-400" aria-hidden />
        </div>
        <div className="mt-3 flex-1 border-t border-white/[0.08] pt-3">
          <p className="whitespace-pre-line break-words text-xs leading-relaxed text-slate-400">
            {details?.description ?? "Cấu hình được tinh chỉnh độc quyền bởi đội ngũ DAWA SHOP."}
          </p>
        </div>
        <Link
          href="/#contact"
          className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/15 py-2 text-center font-mono text-[11px] font-bold uppercase tracking-wider text-cyan-300 transition-all hover:bg-cyan-500 hover:text-black hover:shadow-[0_0_15px_rgba(0,242,254,0.3)]"
        >
          Liên hệ tư vấn <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </article>
  );
}