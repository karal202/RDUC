import Image from "next/image";
import { Marquee } from "./Marquee";
import { SectionHeader } from "./SectionHeader";

type Game = {
  name: string;
  image: string;
};

/* Content extracted from Figma nodes 3:153–3:214. Each card frame carries
 * the game art as an IMAGE fill with a solid black overlay at 75% opacity. */
const games: Game[] = [
  { name: "Valorant", image: "/games/valorant.png" },
  { name: "CS2", image: "/games/cs2.png" },
  { name: "Fortnite", image: "/games/fortnite.png" },
  { name: "Apex Legends", image: "/games/apex-legends.png" },
  { name: "Overwatch 2", image: "/games/overwatch-2.png" },
  { name: "League of Legends", image: "/games/league-of-legends.png" },
  { name: "GTA V", image: "/games/gta5.jpg" },
];

const gameTags: Record<string, string> = {
  Valorant: "TACTICAL FPS",
  CS2: "COMPETITIVE SHOOTER",
  Fortnite: "BATTLE ROYALE",
  "Apex Legends": "FAST ACTION",
  "Overwatch 2": "HERO SHOOTER",
  "League of Legends": "MOBA ESPORT",
  "GTA V": "OPEN WORLD",
};

function GameCard({ game }: { game: Game }) {
  const tag = gameTags[game.name] || "ESPORTS";

  return (
    <article className="group relative flex h-[340px] w-[300px] shrink-0 flex-col justify-between overflow-hidden rounded-xl border border-white/[0.1] p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-cyan-400/70 hover:shadow-[0_12px_30px_rgba(0,242,254,0.2)] sm:w-[360px]">
      {/* Game art background */}
      <Image
        src={game.image}
        alt={game.name}
        fill
        sizes="(max-width: 640px) 300px, 360px"
        className="object-cover transition-all duration-500 group-hover:scale-110"
      />

      {/* Cyber gradient layers */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#04060a] via-[#04060a]/60 to-transparent transition-opacity duration-300 group-hover:opacity-90" aria-hidden />
      <div className="absolute inset-0 bg-cyan-950/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden />

      {/* Top badges */}
      <div className="relative z-10 flex items-center justify-between">
        <span className="rounded-md border border-cyan-400/30 bg-cyan-950/80 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-cyan-300 backdrop-blur-md">
          {tag}
        </span>
      </div>

      {/* Bottom details */}
      <div className="relative z-10 mt-auto">
        <h3 className="font-display text-2xl font-black uppercase tracking-tight text-white drop-shadow-md group-hover:text-cyan-200 transition-colors">
          {game.name}
        </h3>

        <div className="mt-3 flex items-center justify-between border-t border-white/[0.1] pt-3 text-xs font-mono text-slate-300">
          <span className="flex items-center gap-1.5 text-cyan-400">
            <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
            SẴN SÀNG TỐI ƯU
          </span>
          <span className="flex size-7 items-center justify-center rounded-full bg-white/10 text-white font-bold transition-transform duration-300 group-hover:translate-x-1 group-hover:bg-cyan-500 group-hover:text-black">
            →
          </span>
        </div>
      </div>
    </article>
  );
}

/**
 * Games — Figma spec (node 3:145): bg #000000, padding 120/96; cards
 * radius 8, padding 24, min-height 320, game art background dimmed by
 * black overlay at 75% opacity. Rendered as an auto-scrolling horizontal
 * list (see Marquee).
 */
export function Games() {
  return (
    <section id="games" className="scroll-mt-[84px] overflow-hidden bg-transparent">
      <div className="mx-auto w-full max-w-[1440px] px-6 pt-20 lg:px-24 lg:pt-[120px]">
        <SectionHeader
          badge="Game được hỗ trợ"
          title="Tối ưu cho các tựa game cạnh tranh hàng đầu"
          sub="Tối ưu hóa theo đúng nhịp mạng và yêu cầu hệ thống của các engine game phổ biến."
        />
      </div>

      <div className="mt-16 pb-20 lg:pb-[120px]">
        <Marquee interval={1000} reserveSideBanners prevSectionId="features" nextSectionId="download">
          {games.map((game) => (
            <GameCard key={game.name} game={game} />
          ))}
        </Marquee>
      </div>
    </section>
  );
}