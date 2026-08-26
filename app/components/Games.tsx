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
  { name: "Valorant", image: "/games/valorant.png", fps: "+45 FPS", ping: "-38% độ trễ" },
  { name: "CS2", image: "/games/cs2.png", fps: "+55 FPS", ping: "-42% độ trễ" },
  { name: "Fortnite", image: "/games/fortnite.png", fps: "+60 FPS", ping: "-35% độ trễ" },
  { name: "Apex Legends", image: "/games/apex-legends.png", fps: "+40 FPS", ping: "-30% độ trễ" },
  { name: "Overwatch 2", image: "/games/overwatch-2.png", fps: "+48 FPS", ping: "-36% độ trễ" },
  { name: "League of Legends", image: "/games/league-of-legends.png", fps: "+80 FPS", ping: "-45% độ trễ" },
  { name: "GTA V", image: "/games/gta5.jpg", fps: "+35 FPS", ping: "-24% độ trễ" },
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
          <dt className="text-[13px] text-rduc-muted">Tăng FPS</dt>
          <dd className="font-mono text-sm font-bold text-rduc-red">{game.fps}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-[13px] text-rduc-muted">Giảm độ trễ</dt>
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
          badge="Game được hỗ trợ"
          title="Tối ưu cho các tựa game cạnh tranh hàng đầu"
          sub="Tối ưu hóa theo đúng nhịp mạng và yêu cầu hệ thống của các engine game phổ biến."
        />
      </div>

      <div className="mt-16 pb-20 lg:pb-[120px]">
        <Marquee speed={35} loop={false}>
          {games.map((game) => (
            <GameCard key={game.name} game={game} />
          ))}
        </Marquee>
      </div>
    </section>
  );
}