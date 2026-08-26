"use client";

import { useEffect, useRef, type ReactNode } from "react";

type MarqueeProps = {
  children: ReactNode;
  /** Auto-scroll speed in pixels per second. */
  speed?: number;
  /** When false, scroll through the fixed list once and stop at the end. */
  loop?: boolean;
  className?: string;
};

/**
 * Horizontal auto-scrolling list ("marquee") built on a native scroll
 * container so it also supports mouse wheel, trackpad and touch input.
 *
 * - Children are rendered twice; the roll resets at the exact width of the
 *   first copy for a seamless infinite loop.
 * - Vertical wheel input is translated into horizontal scrolling while the
 *   cursor is over the list.
 * - Auto-scroll pauses briefly after any manual interaction
 *   (wheel / drag / touch) and resumes automatically.
 * - Respects `prefers-reduced-motion`.
 */
export function Marquee({ children, speed = 35, loop = true, className = "" }: MarqueeProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let last = performance.now();
    let pausedUntil = 0;
    let pausedByHover = false;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(now - last, 100);
      last = now;

      if (pausedByHover || now < pausedUntil) return;
      const copyWidth = copyRef.current?.offsetWidth ?? 0;
      const gap = Number.parseFloat(getComputedStyle(viewport.firstElementChild as Element).columnGap) || 0;
      const loopPoint = copyWidth + gap;
      if (!loopPoint) return;

      viewport.scrollLeft += (speed * dt) / 1000;
      if (loop && viewport.scrollLeft >= loopPoint) viewport.scrollLeft -= loopPoint;
      if (!loop && viewport.scrollLeft >= viewport.scrollWidth - viewport.clientWidth) {
        viewport.scrollLeft = viewport.scrollWidth - viewport.clientWidth;
      }
    };

    raf = requestAnimationFrame(tick);

    /* --- Manual interaction handling ------------------------------- */

    // Mouse wheel / trackpad: translate vertical delta into horizontal
    // scrolling, then pause the auto-roll briefly.
    const onWheel = (event: WheelEvent) => {
      const delta = Math.abs(event.deltaX) >= Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (delta === 0) return;
      event.preventDefault();
      viewport.scrollLeft += delta;
      const copyWidth = copyRef.current?.offsetWidth ?? 0;
      const gap = Number.parseFloat(getComputedStyle(viewport.firstElementChild as Element).columnGap) || 0;
      if (loop && viewport.scrollLeft >= copyWidth + gap) viewport.scrollLeft -= copyWidth + gap;
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
        const copyWidth = copyRef.current?.offsetWidth ?? 0;
        const gap = Number.parseFloat(getComputedStyle(viewport.firstElementChild as Element).columnGap) || 0;
        if (loop && viewport.scrollLeft >= copyWidth + gap) viewport.scrollLeft -= copyWidth + gap;
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
      last = performance.now();
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
      cancelAnimationFrame(raf);
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
  }, [loop, speed]);

  return (
    <div
      ref={viewportRef}
      className={`overflow-x-auto select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] ${className}`}
    >
      <div className="flex w-max gap-6 py-1 pl-6 pr-6 lg:pl-24">
        <div ref={copyRef} className="flex w-max gap-6">
          {children}
        </div>
        {loop && <div className="flex w-max gap-6" aria-hidden="true">{children}</div>}
      </div>
    </div>
  );
}