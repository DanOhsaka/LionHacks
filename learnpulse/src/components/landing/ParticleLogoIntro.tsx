"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PaletteHsl = { h: number; s: number; l: number };

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

class Particle {
  baseX: number;
  baseY: number;
  h: number;
  s: number;
  l: number;
  paletteIndex: number;
  density: number;
  vx = 0;
  vy = 0;
  targetSize: number;
  size: number;
  isAssembling: boolean;
  x: number;
  y: number;
  delay: number;
  timer = 0;

  constructor(
    x: number,
    y: number,
    h: number,
    s: number,
    l: number,
    paletteIndex: number,
    canvasWidth: number,
  ) {
    this.baseX = x;
    this.baseY = y;
    this.h = h;
    this.s = s;
    this.l = l;
    this.paletteIndex = paletteIndex;
    this.density = Math.random() * 30 + 5;
    this.targetSize = 1 + Math.random() * 1.5;
    this.size = 0;
    this.isAssembling = true;
    this.x = this.baseX - 40;
    this.y = this.baseY + 40;
    this.delay = (this.baseX / canvasWidth) * 100 + Math.random() * 15;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    userPalette: PaletteHsl[],
  ) {
    if (this.size <= 0) return;
    const groupColor = userPalette[this.paletteIndex];
    if (!groupColor) return;
    ctx.fillStyle = `hsl(${groupColor.h}, ${groupColor.s}%, ${this.l}%)`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
  }

  update(mouse: { x: number | null; y: number | null; radius: number }) {
    if (this.isAssembling) {
      this.timer++;
      if (this.timer < this.delay) return;

      if (this.size < this.targetSize) this.size += 0.05;

      const dxBase = this.baseX - this.x;
      const dyBase = this.baseY - this.y;

      this.vx += dxBase * 0.04;
      this.vy += dyBase * 0.04;
      this.vx *= 0.82;
      this.vy *= 0.82;

      this.x += this.vx;
      this.y += this.vy;

      if (
        Math.abs(dxBase) < 0.5 &&
        Math.abs(dyBase) < 0.5 &&
        this.size >= this.targetSize
      ) {
        this.isAssembling = false;
        this.size = this.targetSize;
        this.x = this.baseX;
        this.y = this.baseY;
      }
      return;
    }

    const targetX = this.baseX;
    const targetY = this.baseY;

    const dxTarget = targetX - this.x;
    const dyTarget = targetY - this.y;

    if (mouse.x != null && mouse.y != null) {
      const dxMouse = mouse.x - this.x;
      const dyMouse = mouse.y - this.y;
      const distanceMouse = Math.hypot(dxMouse, dyMouse);

      if (distanceMouse < mouse.radius && distanceMouse > 0.001) {
        const forceDirectionX = dxMouse / distanceMouse;
        const forceDirectionY = dyMouse / distanceMouse;
        const force = (mouse.radius - distanceMouse) / mouse.radius;
        this.vx -= forceDirectionX * force * this.density;
        this.vy -= forceDirectionY * force * this.density;
      }
    }

    const springStrength = 0.08;
    const friction = 0.88;

    this.vx += dxTarget * springStrength;
    this.vy += dyTarget * springStrength;
    this.vx *= friction;
    this.vy *= friction;
    this.x += this.vx;
    this.y += this.vy;
  }
}

function buildParticlesFromImage(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
): { particles: Particle[]; userPalette: PaletteHsl[] } {
  const padding = 100;
  const availableWidth = canvas.width - padding;
  const availableHeight = canvas.height - padding;
  const scale = Math.min(
    availableWidth / image.width,
    availableHeight / image.height,
    1,
  );
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const startX = (canvas.width - drawWidth) / 2;
  const startY = (canvas.height - drawHeight) / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, startX, startY, drawWidth, drawHeight);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const gap = 4;
  const validPixels: {
    x: number;
    y: number;
    r: number;
    g: number;
    b: number;
    h: number;
    s: number;
    l: number;
  }[] = [];

  const colorBins: Record<
    string,
    { count: number; r: number; g: number; b: number }
  > = {};

  for (let y = 0; y < canvas.height; y += gap) {
    for (let x = 0; x < canvas.width; x += gap) {
      const index = (y * canvas.width + x) * 4;
      const r = imageData.data[index] ?? 0;
      const g = imageData.data[index + 1] ?? 0;
      const b = imageData.data[index + 2] ?? 0;
      const a = imageData.data[index + 3] ?? 0;

      if (a > 128 && (r > 20 || g > 20 || b > 20)) {
        const [h, s, l] = rgbToHsl(r, g, b);
        validPixels.push({ x, y, r, g, b, h, s, l });

        const factor = 48;
        const rB = Math.round(r / factor) * factor;
        const gB = Math.round(g / factor) * factor;
        const bB = Math.round(b / factor) * factor;
        const key = `${rB},${gB},${bB}`;

        if (!colorBins[key]) {
          colorBins[key] = { count: 0, r: 0, g: 0, b: 0 };
        }
        const bin = colorBins[key];
        bin.count++;
        bin.r += r;
        bin.g += g;
        bin.b += b;
      }
    }
  }

  const sortedBins = Object.values(colorBins).sort((a, b) => b.count - a.count);
  const topColors = sortedBins.slice(0, 5);

  const extractedPalette = topColors.map((bin) => {
    const avgR = Math.round(bin.r / bin.count);
    const avgG = Math.round(bin.g / bin.count);
    const avgB = Math.round(bin.b / bin.count);
    const [h, s, l] = rgbToHsl(avgR, avgG, avgB);
    return { r: avgR, g: avgG, b: avgB, h, s, l };
  });

  const userPalette: PaletteHsl[] = extractedPalette.map((p) => ({
    h: p.h,
    s: p.s,
    l: p.l,
  }));

  const particles: Particle[] = [];

  validPixels.forEach((p) => {
    let minDist = Infinity;
    let pIndex = 0;
    extractedPalette.forEach((pal, i) => {
      const dist =
        (p.r - pal.r) ** 2 + (p.g - pal.g) ** 2 + (p.b - pal.b) ** 2;
      if (dist < minDist) {
        minDist = dist;
        pIndex = i;
      }
    });
    particles.push(
      new Particle(p.x, p.y, p.h, p.s, p.l, pIndex, canvas.width),
    );
  });

  return { particles, userPalette };
}

type ParticleLogoIntroProps = {
  imageSrc?: string;
  onComplete: () => void;
};

export function ParticleLogoIntro({
  imageSrc = "/pridepath-lion.png",
  onComplete,
}: ParticleLogoIntroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const paletteRef = useRef<PaletteHsl[]>([]);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);
  const mouseRef = useRef({ x: null as number | null, y: null as number | null, radius: 80 });
  const runningRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [exiting, setExiting] = useState(false);
  const [ready, setReady] = useState(false);

  const stopLoop = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  const handleContinue = useCallback(() => {
    setExiting(true);
    window.setTimeout(() => {
      stopLoop();
      onCompleteRef.current();
    }, 500);
  }, [stopLoop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const rebuildFromImage = () => {
      const img = loadedImageRef.current;
      if (!img || !img.complete) return;
      const built = buildParticlesFromImage(canvas, ctx, img);
      particlesRef.current = built.particles;
      paletteRef.current = built.userPalette;
    };

    let resizeDebounce: number | null = null;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (!loadedImageRef.current?.complete) return;
      if (resizeDebounce) clearTimeout(resizeDebounce);
      resizeDebounce = window.setTimeout(() => {
        rebuildFromImage();
        resizeDebounce = null;
      }, 120);
    };

    resize();

    const onMove = (event: MouseEvent) => {
      mouseRef.current.x = event.clientX;
      mouseRef.current.y = event.clientY;
    };
    const onLeave = () => {
      mouseRef.current.x = null;
      mouseRef.current.y = null;
    };
    const onTouchStart = (event: TouchEvent) => {
      const t = event.touches[0];
      if (!t) return;
      mouseRef.current.x = t.clientX;
      mouseRef.current.y = t.clientY;
    };
    const onTouchMove = (event: TouchEvent) => {
      const t = event.touches[0];
      if (!t) return;
      mouseRef.current.x = t.clientX;
      mouseRef.current.y = t.clientY;
      event.preventDefault();
    };
    const onTouchEnd = () => {
      mouseRef.current.x = null;
      mouseRef.current.y = null;
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);

    const img = new window.Image();
    img.decoding = "async";

    img.onload = () => {
      loadedImageRef.current = img;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      rebuildFromImage();
      setReady(true);
      runningRef.current = true;

      const loop = () => {
        if (!runningRef.current || !canvasRef.current) return;
        const c = canvasRef.current;
        const cctx = c.getContext("2d");
        if (!cctx) return;

        cctx.clearRect(0, 0, c.width, c.height);
        const parts = particlesRef.current;
        const pal = paletteRef.current;
        const mouse = mouseRef.current;

        for (let i = 0; i < parts.length; i++) {
          parts[i].update(mouse);
          parts[i].draw(cctx, pal);
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    };

    img.onerror = () => {
      setReady(true);
      stopLoop();
      onCompleteRef.current();
    };

    img.src = imageSrc;

    return () => {
      if (resizeDebounce) clearTimeout(resizeDebounce);
      loadedImageRef.current = null;
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      stopLoop();
    };
  }, [imageSrc, stopLoop]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ready) handleContinue();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleContinue, ready]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col bg-black transition-opacity duration-500 ${
        exiting ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      aria-label="PridePath particle intro"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full cursor-crosshair"
      />

      <div className="pointer-events-none absolute bottom-24 left-0 right-0 z-10 text-center text-sm text-zinc-500">
        Move the cursor over the logo to nudge the particles
      </div>

      <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center px-4">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!ready}
          className="pointer-events-auto rounded-full bg-emerald-500 px-8 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"
        >
          {ready ? "Continue" : "Loading…"}
        </button>
      </div>
    </div>
  );
}
