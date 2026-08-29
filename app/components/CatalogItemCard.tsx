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
    <article className="group/item rduc-catalog-card relative z-0 h-[360px] w-[220px] shrink-0 group-hover/item:z-10 sm:w-[250px]">
      <div className="absolute inset-0 z-0 overflow-hidden rounded-lg border border-rduc-border bg-[#121823] shadow-[0_0_30px_rgba(22,119,255,0.08)]">
        <Image src={image} alt="" fill sizes="250px" className="object-cover scale-[1.04] opacity-70 brightness-110 saturate-110 contrast-110 transition duration-500 group-hover/item:opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05070b]/90 via-[#0b1220]/60 to-[#0b1220]/20" aria-hidden />
      </div>
      <div className="relative z-10 flex h-full w-full flex-col justify-end rounded-lg p-6">
        <div className="mb-auto flex size-10 items-center justify-center border border-rduc-red/60 bg-black/70 font-mono text-sm text-rduc-red">#</div>
        <h3 className="mt-2 break-words font-display text-lg leading-tight">{details?.label ?? item}</h3>
      </div>
      <div className="rduc-hover-content absolute inset-0 z-10 flex flex-col justify-end overflow-y-auto rounded-lg bg-black p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="break-words font-display text-lg leading-tight">{details?.label ?? item}</h3>
          </div>
          <ArrowUpRight className="mt-1 size-5 shrink-0 text-rduc-red" aria-hidden />
        </div>
        <div className="mt-4 border-t border-rduc-red/60 pt-4">
          <p className="whitespace-pre-line break-words text-xs leading-5 text-rduc-muted">{details?.description ?? "Sản phẩm minh họa tạm thời cho danh mục này."}</p>
          <Link href="/#contact" className="mt-3 inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wide text-white hover:text-rduc-red">
            Xem sản phẩm <ArrowUpRight className="size-3" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}