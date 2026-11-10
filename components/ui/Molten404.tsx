"use client";

import { useEffect, useRef } from "react";
import { useCalmMode } from "@/lib/preferences";

/**
 * Page 404 (BRIEF.md §3.5) : un « 404 » en métal fondu coule, puis se reforme sous la
 * souris (ou au toucher). Canvas 2D décoratif (aria-hidden) : le texte « 404 » et le titre
 * existent en HTML. Version immobile en mouvement réduit ou « Expérience allégée ».
 */
export function Molten404() {
  const ref = useRef<HTMLCanvasElement>(null);
  const calm = useCalmMode();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || calm) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    type P = { hx: number; hy: number; x: number; y: number; vx: number; vy: number; heat: number };
    let particles: P[] = [];
    let w = 0;
    let h = 0;
    const pointer = { x: -1e4, y: -1e4 };

    const build = () => {
      const r = canvas.getBoundingClientRect();
      w = Math.round(r.width * dpr);
      h = Math.round(r.height * dpr);
      if (w < 2 || h < 2) {
        particles = [];
        return;
      }
      canvas.width = w;
      canvas.height = h;
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const o = off.getContext("2d")!;
      const font = getComputedStyle(canvas).fontFamily;
      o.fillStyle = "#fff";
      o.textAlign = "center";
      o.textBaseline = "middle";
      o.font = `400 ${Math.round(h * 0.82)}px ${font}`;
      o.fillText("404", w / 2, h / 2);
      const data = o.getImageData(0, 0, w, h).data;
      const step = Math.max(3, Math.round(4 * dpr));
      particles = [];
      for (let y = 0; y < h; y += step)
        for (let x = 0; x < w; x += step)
          if ((data[(y * w + x) * 4] ?? 0) > 128)
            particles.push({ hx: x, hy: y, x, y, vx: 0, vy: 0, heat: 1 });
    };

    build();
    const started = performance.now();
    let raf = 0;
    const loop = () => {
      const t = (performance.now() - started) / 1000;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      const radius = 110 * dpr;
      for (const p of particles) {
        // Distance à la place d'origine : survoler le « 404 » le reforme.
        const dx = p.hx - pointer.x;
        const dy = p.hy - pointer.y;
        const near = dx * dx + dy * dy < radius * radius;
        if (near) {
          // Sous la souris, le métal se reforme : ressort vers sa place, il se réchauffe.
          p.vx += (p.hx - p.x) * 0.08;
          p.vy += (p.hy - p.y) * 0.08;
          p.heat = Math.min(1, p.heat + 0.08);
        } else if (t > 1.2) {
          // Ailleurs, il coule : gravité, viscosité, et refroidit.
          p.vy += 0.3 * dpr * (0.6 + ((p.hx * 13) % 7) / 10);
          p.heat = Math.max(0.15, p.heat - 0.004);
        }
        p.vx *= 0.82;
        p.vy *= 0.86;
        p.x += p.vx;
        p.y = Math.min(h - 2 * dpr, p.y + p.vy);
        const heat = p.heat;
        const r = Math.round(255);
        const g = Math.round(90 + 150 * heat);
        const b = Math.round(30 + 120 * heat * heat);
        ctx.fillStyle = `rgba(${r},${g},${b},${0.35 + 0.5 * heat})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.4 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
      // Au repos (tout est retombé, rien sous la souris) : la boucle s'arrête.
      const still = particles.every((q) => Math.abs(q.vx) + Math.abs(q.vy) < 0.05);
      raf = still && t > 2 ? 0 : requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = (e.clientX - r.left) * dpr;
      pointer.y = (e.clientY - r.top) * dpr;
      wake();
    };
    const ro = new ResizeObserver(build);
    ro.observe(canvas);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
    };
  }, [calm]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="molten-404 font-serif"
      data-calm={calm ? "" : undefined}
    />
  );
}
