"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type MarqueeProps = {
  children: ReactNode;
  /** Automatic slide interval in milliseconds. */
  interval?: number;
  /** When false, scroll through the fixed list once and stop at the end. */
  loop?: boolean;
  /** Disable automatic movement while keeping manual scrolling available. */
  autoPlay?: boolean;
  /** Reserve the fixed advertising gutters on wide screens. */
  reserveSideBanners?: boolean;
  /** Center content when the carousel is static and fits in the viewport. */
  centerContent?: boolean;
  className?: string;
};

/**
 * Horizontal carousel built on a native scroll
 * container so it also supports mouse wheel, trackpad and touch input.
 *
 * - Children are rendered twice so the carousel can loop without a blank gap.
 * - Vertical wheel input is translated into horizontal scrolling while the
 *   cursor is over the list.
 * - Auto-scroll pauses briefly after any manual interaction
 *   (wheel / drag / touch) and resumes automatically.
 * - Respects `prefers-reduced-motion`.
 */
export function Marquee({
  children,
  interval = 5000,
  loop = true,
  autoPlay = true,
  reserveSideBanners = false,
  centerContent = false,
  className = "",
}: MarqueeProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const slideIndexRef = useRef(0);
  const marqueeConfig = `${interval}|${autoPlay ? "on" : "off"}`;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const [intervalValue, autoPlayValue] = marqueeConfig.split("|");

    let pausedByHover = false;
    let pausedUntil = 0;

    const getSlideStep = () => {
      const firstSlide = copyRef.current?.firstElementChild;
      if (!firstSlide) return 0;
      const gap = Number.parseFloat(getComputedStyle(copyRef.current as Element).columnGap) || 0;
      return firstSlide.getBoundingClientRect().width + gap;
    };

    const moveToNextSlide = () => {
      if (pausedByHover || performance.now() < pausedUntil) return;
      const copy = copyRef.current;
      const step = getSlideStep();
      if (!copy || !step) return;

      const slideCount = copy.children.length;
      slideIndexRef.current += 1;
      if (!loop && slideIndexRef.current >= slideCount) {
        slideIndexRef.current = slideCount - 1;
      }

      viewport.scrollTo({
        left: slideIndexRef.current * step,
        behavior: "smooth",
      });

      if (loop && slideIndexRef.current >= slideCount) {
        window.setTimeout(() => {
          slideIndexRef.current = 0;
          viewport.scrollLeft = 0;
        }, 650);
      }
    };

    const timer = autoPlayValue === "on" ? window.setInterval(moveToNextSlide, Number(intervalValue)) : undefined;

    /* --- Manual interaction handling ------------------------------- */

    // Mouse wheel / trackpad: translate vertical delta into horizontal
    // scrolling, then pause the auto-roll briefly.
    const onWheel = (event: WheelEvent) => {
      const delta = Math.abs(event.deltaX) >= Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (delta === 0) return;
      event.preventDefault();
      viewport.scrollLeft += delta;
      pausedUntil = performance.now() + 2000;
    };

    // Drag to scroll (with a small threshold so clicks still work).
    let dragging = false;
    let moved = false;
    let startX = 0;
    let startScroll = 0;

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch") return; // native touch scroll
      dragging = true;
      moved = false;
      startX = event.clientX;
      startScroll = viewport.scrollLeft;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      const dx = event.clientX - startX;
      if (!moved && Math.abs(dx) > 5) moved = true;
      if (moved) {
        viewport.scrollLeft = startScroll - dx;
        pausedUntil = performance.now() + 2000;
      }
    };

    const onPointerUp = () => {
      dragging = false;
    };

    // Swallow the click that follows a drag so links don't fire.
    const onClickCapture = (event: MouseEvent) => {
      if (moved) {
        event.preventDefault();
        event.stopPropagation();
        moved = false;
      }
    };

    const onTouchStart = () => {
      pausedUntil = performance.now() + 2500;
    };

    const onMouseEnter = () => {
      pausedByHover = true;
    };

    const onMouseLeave = () => {
      pausedByHover = false;
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", onPointerUp);
    viewport.addEventListener("pointercancel", onPointerUp);
    viewport.addEventListener("click", onClickCapture, true);
    viewport.addEventListener("touchstart", onTouchStart, { passive: true });
    viewport.addEventListener("mouseenter", onMouseEnter);
    viewport.addEventListener("mouseleave", onMouseLeave);

    return () => {
      if (timer !== undefined) window.clearInterval(timer);
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", onPointerUp);
      viewport.removeEventListener("pointercancel", onPointerUp);
      viewport.removeEventListener("click", onClickCapture, true);
      viewport.removeEventListener("touchstart", onTouchStart);
      viewport.removeEventListener("mouseenter", onMouseEnter);
      viewport.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [marqueeConfig, loop]);

  const moveSlide = (direction: number) => {
    const viewport = viewportRef.current;
    const copy = copyRef.current;
    if (!viewport || !copy) return;

    const firstSlide = copy.firstElementChild;
    const gap = Number.parseFloat(getComputedStyle(copy).columnGap) || 0;
    const step = (firstSlide?.getBoundingClientRect().width ?? 0) + gap;
    if (!step) return;

    const slideCount = copy.children.length;
    slideIndexRef.current = Math.max(0, Math.min(slideCount - 1, slideIndexRef.current + direction));
    viewport.scrollTo({ left: slideIndexRef.current * step, behavior: "smooth" });
  };

  return (
    <div className={`group/marquee relative ${reserveSideBanners ? "xl:px-[132px]" : ""}`}>
      <button
        type="button"
        aria-label="Mục trước"
        className={`absolute top-1/2 z-30 flex size-9 -translate-y-1/2 items-center justify-center border border-white/30 bg-black/70 text-white opacity-0 transition-opacity group-hover/marquee:opacity-100 focus:opacity-100 hover:border-rduc-red hover:text-rduc-red ${reserveSideBanners ? "left-[122px]" : "left-3"}`}
        onClick={() => moveSlide(-1)}
      >
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Mục tiếp theo"
        className={`absolute top-1/2 z-30 flex size-9 -translate-y-1/2 items-center justify-center border border-white/30 bg-black/70 text-white opacity-0 transition-opacity group-hover/marquee:opacity-100 focus:opacity-100 hover:border-rduc-red hover:text-rduc-red ${reserveSideBanners ? "right-[122px]" : "right-3"}`}
        onClick={() => moveSlide(1)}
      >
        <ChevronRight className="size-5" aria-hidden />
      </button>
      <div
        ref={viewportRef}
        className={`overflow-x-auto overflow-y-hidden scroll-smooth select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] ${centerContent ? "flex justify-center" : ""} ${className}`}
      >
        <div className="flex w-max gap-6 py-1">
          <div ref={copyRef} className={`flex w-max gap-6 ${centerContent ? "" : `pl-6 pr-6 ${reserveSideBanners ? "xl:pl-0 xl:pr-0" : "lg:pl-[110px] lg:pr-[110px]"}`}`}>
            {children}
          </div>
          {loop && <div className={`flex w-max gap-6 pl-6 pr-6 ${reserveSideBanners ? "xl:pl-0 xl:pr-0" : "lg:pl-[110px] lg:pr-[110px]"}`} aria-hidden="true">{children}</div>}
        </div>
      </div>
    </div>
  );
}