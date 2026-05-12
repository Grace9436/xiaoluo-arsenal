import Matter from "matter-js";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import "./FriendsWall.css";

type Footprint = {
  id: string;
  nickname: string;
  message: string;
  color: string;
  x: number;
  y: number;
  rotation: number;
  createdAt: number;
};

type FootprintView = {
  x: number;
  y: number;
  rotation: number;
  impact: boolean;
};

const STORAGE_KEY = "footprints_data";
const FOOTPRINT_SIZE = { width: 82, height: 92 };
const PALETTE = ["#ff8a3d", "#f8e85c", "#9bea63", "#ff5d73", "#57b8ff", "#b693ff", "#c8ccd6"];

function readFootprints(): Footprint[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFootprints(items: Footprint[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("footprints:changed"));
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function makeId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getFootprintPositionStyle(view: FootprintView | undefined, footprint: Footprint) {
  return {
    left: view ? `${view.x}px` : `${footprint.x}%`,
    top: view ? `${view.y}px` : `${footprint.y}%`,
  };
}

export function FriendsWall() {
  const [footprints, setFootprints] = useState<Footprint[]>(() => readFootprints());
  const [views, setViews] = useState<Record<string, FootprintView>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const worldRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const bodiesRef = useRef(new Map<string, Matter.Body>());
  const initialViewsRef = useRef(new Map<string, FootprintView>());
  const frameRef = useRef<number | null>(null);
  const draggingRef = useRef<{
    id: string;
    lastX: number;
    lastY: number;
    lastTime: number;
    vx: number;
    vy: number;
  } | null>(null);

  const count = footprints.length;

  const particles = useMemo(
    () =>
      Array.from({ length: 42 }, (_, index) => ({
        id: index,
        left: randomBetween(2, 98),
        top: randomBetween(6, 92),
        delay: randomBetween(0, 6),
        size: randomBetween(1, 3.5),
      })),
    [],
  );

  useEffect(() => {
    const sync = () => setFootprints(readFootprints());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  useEffect(() => {
    const element = worldRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const engine = Matter.Engine.create({ enableSleeping: true });
    engine.gravity.y = 0.92;
    engineRef.current = engine;
    bodiesRef.current.clear();
    initialViewsRef.current.clear();

    const walls = [
      Matter.Bodies.rectangle(rect.width / 2, rect.height + 52, rect.width + 180, 100, { isStatic: true }),
      Matter.Bodies.rectangle(rect.width / 2, -52, rect.width + 180, 100, { isStatic: true }),
      Matter.Bodies.rectangle(-52, rect.height / 2, 100, rect.height + 180, { isStatic: true }),
      Matter.Bodies.rectangle(rect.width + 52, rect.height / 2, 100, rect.height + 180, { isStatic: true }),
    ];

    const nextViews: Record<string, FootprintView> = {};
    const bodies = footprints.map((footprint) => {
      const x = (footprint.x / 100) * rect.width;
      const y = (footprint.y / 100) * rect.height;
      const body = Matter.Bodies.rectangle(x, y, FOOTPRINT_SIZE.width, FOOTPRINT_SIZE.height, {
        label: footprint.id,
        restitution: 0.52,
        friction: 0.16,
        frictionAir: 0.022,
        density: 0.002,
      });
      Matter.Body.setAngle(body, (footprint.rotation * Math.PI) / 180);
      Matter.Body.setStatic(body, true);
      bodiesRef.current.set(footprint.id, body);
      const initialView = { x, y, rotation: footprint.rotation, impact: false };
      initialViewsRef.current.set(footprint.id, initialView);
      nextViews[footprint.id] = initialView;
      return body;
    });

    Matter.Composite.add(engine.world, [...walls, ...bodies]);

    Matter.Events.on(engine, "collisionStart", (event) => {
      const hitIds = event.pairs.flatMap((pair) => [pair.bodyA.label, pair.bodyB.label]).filter((label) => bodiesRef.current.has(label));
      if (hitIds.length === 0) return;
      setViews((current) => {
        const next = { ...current };
        for (const id of hitIds) {
          const view = next[id];
          if (view) next[id] = { ...view, impact: true };
        }
        return next;
      });
      window.setTimeout(() => {
        setViews((current) => {
          const next = { ...current };
          for (const id of hitIds) {
            const view = next[id];
            if (view) next[id] = { ...view, impact: false };
          }
          return next;
        });
      }, 160);
    });

    setViews(nextViews);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      Matter.Engine.clear(engine);
      engineRef.current = null;
      bodiesRef.current.clear();
      initialViewsRef.current.clear();
    };
  }, [footprints]);

  const tickPhysics = () => {
    const engine = engineRef.current;
    if (!engine) return;
    Matter.Engine.update(engine, 1000 / 60);
    setViews((current) => {
      const next = { ...current };
      for (const [id, body] of bodiesRef.current) {
        next[id] = {
          x: body.position.x,
          y: body.position.y,
          rotation: (body.angle * 180) / Math.PI,
          impact: current[id]?.impact ?? false,
        };
      }
      return next;
    });
    frameRef.current = requestAnimationFrame(tickPhysics);
  };

  const startPhysics = () => {
    if (frameRef.current !== null) return;
    for (const body of bodiesRef.current.values()) {
      Matter.Body.setStatic(body, false);
      Matter.Sleeping.set(body, false);
    }
    frameRef.current = requestAnimationFrame(tickPhysics);
  };

  const pausePhysics = () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  };

  const resetFootprints = () => {
    pausePhysics();
    setViews((current) => {
      const next = { ...current };
      for (const [id, body] of bodiesRef.current) {
        const initial = initialViewsRef.current.get(id);
        if (!initial) continue;
        Matter.Body.setStatic(body, true);
        Matter.Body.setPosition(body, { x: initial.x, y: initial.y });
        Matter.Body.setAngle(body, (initial.rotation * Math.PI) / 180);
        Matter.Body.setVelocity(body, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(body, 0);
        next[id] = { ...initial, impact: false };
      }
      return next;
    });
  };

  const openDialog = () => {
    setError("");
    setDialogOpen(true);
  };

  const addFootprint = () => {
    const cleanName = nickname.trim();
    if (!cleanName) {
      setError("请留下你的 ID / 昵称");
      return;
    }
    const next: Footprint = {
      id: makeId(),
      nickname: cleanName.slice(0, 18),
      message: message.trim().slice(0, 50),
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      x: randomBetween(22, 78),
      y: randomBetween(24, 58),
      rotation: randomBetween(-15, 15),
      createdAt: Date.now(),
    };
    const nextItems = [...footprints, next];
    setFootprints(nextItems);
    saveFootprints(nextItems);
    setNickname("");
    setMessage("");
    setDialogOpen(false);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>, id: string) => {
    const body = bodiesRef.current.get(id);
    if (!body) return;
    pausePhysics();
    Matter.Body.setStatic(body, true);
    Matter.Body.setVelocity(body, { x: 0, y: 0 });
    draggingRef.current = {
      id,
      lastX: event.clientX,
      lastY: event.clientY,
      lastTime: performance.now(),
      vx: 0,
      vy: 0,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>, id: string) => {
    const drag = draggingRef.current;
    const body = bodiesRef.current.get(id);
    if (!drag || drag.id !== id || !body) return;
    const now = performance.now();
    const dt = Math.max(16, now - drag.lastTime);
    const dx = event.clientX - drag.lastX;
    const dy = event.clientY - drag.lastY;
    drag.vx = dx / dt;
    drag.vy = dy / dt;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.lastTime = now;
    Matter.Body.setPosition(body, { x: body.position.x + dx, y: body.position.y + dy });
    setViews((current) => ({
      ...current,
      [id]: {
        x: body.position.x,
        y: body.position.y,
        rotation: (body.angle * 180) / Math.PI,
        impact: false,
      },
    }));
  };

  const onPointerUp = (event: React.PointerEvent<HTMLButtonElement>, id: string) => {
    const drag = draggingRef.current;
    const body = bodiesRef.current.get(id);
    if (!drag || drag.id !== id || !body) return;
    draggingRef.current = null;
    Matter.Body.setStatic(body, false);
    Matter.Body.setVelocity(body, { x: drag.vx * 17, y: drag.vy * 17 });
    Matter.Body.setAngularVelocity(body, Math.max(-0.18, Math.min(0.18, drag.vx * 0.08)));
    event.currentTarget.releasePointerCapture(event.pointerId);
    startPhysics();
  };

  return (
    <main className="friends-wall">
      <div className="friends-aurora" aria-hidden="true" />
      <div className="friends-grain" aria-hidden="true" />
      {particles.map((particle) => (
        <span
          className="friends-particle"
          key={particle.id}
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}

      <a className="back-home-link" href="/">
        ← 回工具墙
      </a>

      <header className="friends-title-block">
        <h1>脚印墙</h1>
        <p>FRIENDS WALL · {count} 朋友来过</p>
      </header>

      <section className="friends-quote" aria-label="引言">
        <p lang="ja">ここに来た人、みな足跡をひとつ。</p>
        <p>每一个来过的朋友，都留下一只脚印。</p>
      </section>

      <section className="friends-contact" aria-label="联系作者">
        <h2>联系作者</h2>
        <p>Email: 2538084873@qq.com</p>
      </section>

      <section className="friends-actions" aria-label="脚印操作">
        <button type="button" onClick={resetFootprints}>
          ↺ 复原
        </button>
        <button type="button" className="ghost-action" onClick={openDialog}>
          👣 施一下脚印试试 ✦
        </button>
      </section>

      <div className="footprints-stage" ref={worldRef} aria-label="脚印画布">
        {footprints.length === 0 && (
          <div className="empty-footprints">
            <span>まだ誰もいない</span>
            <strong>第一只脚印，等你落下。</strong>
          </div>
        )}
        {footprints.map((footprint) => {
          const view = views[footprint.id];
          return (
            <button
              className={`footprint-token ${view?.impact ? "is-impacting" : ""}`}
              key={footprint.id}
              type="button"
              onPointerDown={(event) => onPointerDown(event, footprint.id)}
              onPointerMove={(event) => onPointerMove(event, footprint.id)}
              onPointerUp={(event) => onPointerUp(event, footprint.id)}
              onPointerCancel={(event) => onPointerUp(event, footprint.id)}
              style={{
                ...getFootprintPositionStyle(view, footprint),
                "--footprint-color": footprint.color,
                transform: `translate(-50%, -50%) rotate(${view?.rotation ?? footprint.rotation}deg) scale(${view?.impact ? 1.08 : 1})`,
              } as CSSProperties}
            >
              <span className="footprint-glyph">👣</span>
              <span className="footprint-name">{footprint.nickname}</span>
              {footprint.message && <span className="footprint-tooltip">{footprint.message}</span>}
            </button>
          );
        })}
      </div>

      <button className="leave-footprint-btn" type="button" onClick={openDialog}>
        👣 留下我的脚印
      </button>

      {dialogOpen && (
        <div className="footprint-dialog-backdrop" role="presentation" onMouseDown={() => setDialogOpen(false)}>
          <section
            className="footprint-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="footprint-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="footprint-dialog-title">留下一只脚印</h2>
            <label>
              <span>你的 ID / 昵称</span>
              <input
                autoFocus
                value={nickname}
                maxLength={18}
                placeholder="比如：小落的朋友"
                onChange={(event) => {
                  setNickname(event.target.value);
                  setError("");
                }}
              />
            </label>
            <label>
              <span>想说的话</span>
              <textarea
                value={message}
                maxLength={50}
                placeholder="最多 50 字，可以留空"
                onChange={(event) => setMessage(event.target.value)}
              />
            </label>
            <div className="dialog-hint">
              <span>{message.length}/50</span>
              {error && <strong>{error}</strong>}
            </div>
            <div className="dialog-actions">
              <button type="button" onClick={addFootprint}>
                保存
              </button>
              <button type="button" onClick={() => setDialogOpen(false)}>
                取消
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
