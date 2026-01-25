import { useEffect, useMemo, useRef } from 'react';

type Star = {
  x: number;
  y: number;
  r: number;
  a: number;
  vx: number;
  vy: number;
  tw: number;
};

const clamp = (min: number, max: number, v: number) => Math.max(min, Math.min(max, v));

const SpaceBackdrop = ({ className = '' }: { className?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const stars = useMemo<Star[]>(() => {
    const makeStar = (speed: number, radius: [number, number]) => {
      const angle = Math.random() * Math.PI * 2;
      const v = speed * (0.6 + Math.random() * 0.8);
      const r = radius[0] + Math.random() * (radius[1] - radius[0]);
      return {
        x: Math.random(),
        y: Math.random(),
        r,
        a: 0.35 + Math.random() * 0.55,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        tw: 0.8 + Math.random() * 1.6,
      };
    };

    const s: Star[] = [];
    for (let i = 0; i < 240; i++) s.push(makeStar(0.012, [0.35, 1.0]));
    for (let i = 0; i < 70; i++) s.push(makeStar(0.020, [0.9, 1.9]));
    for (let i = 0; i < 14; i++) s.push(makeStar(0.030, [1.6, 2.8]));
    return s;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

    let raf = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      const parent = canvas.parentElement;
      const w = parent?.clientWidth ?? window.innerWidth;
      const h = parent?.clientHeight ?? window.innerHeight;
      dpr = clamp(1, 2, window.devicePixelRatio || 1);
      width = w;
      height = h;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    let t0 = performance.now();
    const draw = (t: number) => {
      const dt = clamp(0, 0.05, (t - t0) / 1000);
      t0 = t;

      ctx.clearRect(0, 0, width, height);

      // Subtle nebula / vignette base.
      const g1 = ctx.createRadialGradient(width * 0.52, height * 0.35, 0, width * 0.52, height * 0.35, Math.max(width, height) * 0.75);
      g1.addColorStop(0.0, 'rgba(255,255,255,0.08)');
      g1.addColorStop(0.35, 'rgba(99,102,241,0.07)');
      g1.addColorStop(0.7, 'rgba(2,6,23,0.15)');
      g1.addColorStop(1.0, 'rgba(2,6,23,0.55)');
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, width, height);

      const g2 = ctx.createRadialGradient(width * 0.18, height * 0.72, 0, width * 0.18, height * 0.72, Math.max(width, height) * 0.65);
      g2.addColorStop(0.0, 'rgba(56,189,248,0.06)');
      g2.addColorStop(0.55, 'rgba(15,23,42,0.04)');
      g2.addColorStop(1.0, 'rgba(2,6,23,0.0)');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, width, height);

      // Stars.
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (const s of stars) {
        if (!prefersReduced) {
          s.x = (s.x + s.vx * dt + 1) % 1;
          s.y = (s.y + s.vy * dt + 1) % 1;
        }
        const px = s.x * width;
        const py = s.y * height;
        const twinkle = prefersReduced ? 1 : 0.78 + 0.22 * Math.sin(t * 0.001 * s.tw + s.x * 12.3);
        const alpha = clamp(0, 1, s.a * twinkle);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Vignette on top for depth.
      const vg = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.25, width / 2, height / 2, Math.max(width, height) * 0.72);
      vg.addColorStop(0.0, 'rgba(0,0,0,0.0)');
      vg.addColorStop(1.0, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, width, height);

      raf = window.requestAnimationFrame(draw);
    };

    raf = window.requestAnimationFrame(draw);
    return () => {
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(raf);
    };
  }, [stars]);

  return (
    <div className={`absolute inset-0 ${className}`} aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
};

export default SpaceBackdrop;

