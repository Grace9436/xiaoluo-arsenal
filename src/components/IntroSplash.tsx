import { useEffect, useRef, useState } from "react";

type Trail = {
  id: number;
  x: number;
  y: number;
};

type IntroSplashProps = {
  onComplete: () => void;
};

export function IntroSplash({ onComplete }: IntroSplashProps) {
  const [progress, setProgress] = useState(0);
  const [mouse, setMouse] = useState({ x: 50, y: 50 });
  const [trail, setTrail] = useState<Trail[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    if (progress >= 100) {
      const timer = window.setTimeout(onComplete, 380);
      return () => window.clearTimeout(timer);
    }
  }, [onComplete, progress]);

  const move = (clientX: number, clientY: number) => {
    const x = (clientX / window.innerWidth) * 100;
    const y = (clientY / window.innerHeight) * 100;
    setMouse({ x, y });
    setProgress((value) => Math.min(100, value + 1.55));
    const item = { id: nextId.current++, x, y };
    setTrail((items) => [...items.slice(-16), item]);
    window.setTimeout(() => {
      setTrail((items) => items.filter((trailItem) => trailItem.id !== item.id));
    }, 820);
  };

  return (
    <div
      className={`intro-splash ${progress >= 100 ? "intro-exit" : ""}`}
      onMouseMove={(event) => move(event.clientX, event.clientY)}
      onTouchMove={(event) => {
        const touch = event.touches[0];
        if (touch) move(touch.clientX, touch.clientY);
      }}
    >
      <div
        className="intro-blue-reveal"
        style={{
          clipPath: `circle(${18 + progress * 1.05}vmax at ${mouse.x}% ${mouse.y}%)`,
        }}
      />
      <div className="intro-layer paper-a" style={{ transform: `translate(${(mouse.x - 50) * -0.06}px, ${(mouse.y - 50) * -0.04}px) rotate(-8deg)` }} />
      <div className="intro-layer paper-b" style={{ transform: `translate(${(mouse.x - 50) * 0.08}px, ${(mouse.y - 50) * 0.05}px) rotate(6deg)` }} />
      <div className="intro-layer paper-c" style={{ transform: `translate(${(mouse.x - 50) * -0.1}px, ${(mouse.y - 50) * 0.07}px) rotate(13deg)` }} />
      {trail.map((item) => (
        <span
          className="paint-trail"
          key={item.id}
          style={{ left: `${item.x}%`, top: `${item.y}%` }}
        />
      ))}
      <div
        className="intro-title"
        style={{
          transform: `translate(${(mouse.x - 50) * 0.03}px, ${(mouse.y - 50) * 0.025}px) skew(${(mouse.x - 50) * 0.025}deg, ${(mouse.y - 50) * -0.015}deg)`,
        }}
      >
        <span className="intro-kicker">BRUSH TO ENTER</span>
        <h1>小落的弹药库</h1>
        <p>Xiaoluo's Arsenal</p>
      </div>
      <div className="intro-meter" aria-label="开场揭示进度">
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
