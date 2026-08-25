import Image from "next/image";
import { Marquee } from "./Marquee";
import { SectionHeader } from "./SectionHeader";

type Game = {
  name: string;
  image: string;
  fps: string;
  ping: string;
};

/* Content extracted from Figma nodes 3:153–3:214. Each card frame carries
 * the game art as an IMAGE fill with a solid black overlay at 75% opacity. */
const games: Game[] = [
  { name: "Valorant", image: "/games/valorant.png", fps: "+45 FPS Boost", ping: "-38% Ping Drop" },
  { name: "CS2", image: "/games/cs2.png", fps: "+55 FPS Boost", ping: "-42% Ping Drop" },
  { name: "Fortnite", image: "/games/fortnite.png", fps: "+60 FPS Boost", ping: "-35% Ping Drop" },
  { name: "Apex Legends", image: "/games/apex-legends.png", fps: "+40 FPS Boost", ping: "-30% Ping Drop" },
  { name: "Overwatch 2", image: "/games/overwatch-2.png", fps: "+48 FPS Boost", ping: "-36% Ping Drop" },
  { name: "League of Legends", image: "/games/league-of-legends.png", fps: "+80 FPS Boost", ping: "-45% Ping Drop" },
];

function GameCard({ game }: { game: Game }) {
  return (
    <article className="group relative flex h-[320px] w-[320px] shrink-0 flex-col justify-between overflow-hidden rounded-lg border border-rduc-border p-6 transition-colors duration-200 hover:border-rduc-red/60 sm:w-[400px]">
      {/* Game art background — Figma IMAGE fill, scaleMode FILL */}
      <Image
        src={game.image}
        alt=""
        fill
        sizes="(max-width: 640px) 320px, 400px"
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />
      {/* Black overlay at 75% opacity — Figma second fill */}
      <div className="absolute inset-0 bg-black/75" aria-hidden />

      <h3 className="relative font-display text-xl">{game.name}</h3>

      <dl className="relative flex flex-col gap-3">
        <div className="flex items-center justify-between border border-rduc-border py-2">
          <dt className="text-[13px] text-rduc-muted">FPS Boost</dt>
          <dd className="font-mono text-sm font-bold text-rduc-red">{game.fps}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-[13px] text-rduc-muted">Latency Cut</dt>
          <dd className="font-mono text-sm font-bold text-rduc-green">{game.ping}</dd>
        </div>
      </dl>
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
    <section id="games" className="scroll-mt-[84px] overflow-hidden bg-black">
      <div className="mx-auto w-full max-w-[1440px] px-6 pt-20 lg:px-24 lg:pt-[120px]">
        <SectionHeader
          badge="Integrated Games"
          title="Supports Top Competitive Titles"
          sub="Engineered optimizations tailored exactly to the network tick-rates and system demands of major competitive game engines."
        />
      </div>

      <div className="mt-16 pb-20 lg:pb-[120px]">
        <Marquee speed={35}>
          {games.map((game) => (
            <GameCard key={game.name} game={game} />
          ))}
        </Marquee>
      </div>
    </section>
  );
}