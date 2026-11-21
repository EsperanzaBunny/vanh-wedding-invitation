import React, { useEffect, useId, useRef, useState } from "react";
import { wedding, themes } from "./config";
import {
  OPENING_PHASES,
  OPENING_TIMING,
  nextOpeningPhase,
  openingDelay,
} from "./opening-timing";
import "./envelope.css";

const ART = "/opening/envelope-reference.webp";
// All four surfaces share the first frame's coordinates, so the closed envelope
// is a seamless image. Each surface then folds independently in 3D.
function scallopedEdge(from, to, count, direction) {
  const dx = to[0] - from[0],
    dy = to[1] - from[1],
    length = Math.hypot(dx, dy);
  const nx = (direction * dy) / length,
    ny = (-direction * dx) / length;
  let path = "";
  for (let i = 0; i < count; i++) {
    const mid = (i + 0.5) / count,
      end = (i + 1) / count;
    path += ` Q${(from[0] + dx * mid + nx * 15).toFixed(1)} ${(from[1] + dy * mid + ny * 15).toFixed(1)} ${(from[0] + dx * end).toFixed(1)} ${(from[1] + dy * end).toFixed(1)}`;
  }
  return path;
}
const SHAPES = {
  top: "M0 0H720L366 642Z",
  bottom: "M0 1280H720L366 642Z",
  left:
    "M0 0" +
    scallopedEdge([0, 0], [366, 642], 16, 1) +
    scallopedEdge([366, 642], [0, 1280], 16, 1) +
    "Z",
  right:
    "M720 0" +
    scallopedEdge([720, 0], [366, 642], 16, -1) +
    scallopedEdge([366, 642], [720, 1280], 16, -1) +
    "Z",
};
function EnvelopeLeaf({ side, uid }) {
  const clip = `${uid}-${side}-clip`,
    mask = `${uid}-${side}-mask`;
  return (
    <div className={`opening-leaf opening-leaf-${side}`} aria-hidden="true">
      <div className="opening-leaf-face">
        <svg viewBox="0 0 720 1280" preserveAspectRatio="none">
          <defs>
            <clipPath id={clip}>
              <path d={SHAPES[side]} />
            </clipPath>
            <mask id={mask}>
              <rect width="720" height="1280" fill="white" />
              <ellipse cx="368" cy="638" rx="113" ry="111" fill="black" />
            </mask>
          </defs>
          <g clipPath={`url(#${clip})`}>
            <path d={SHAPES[side]} className="opening-leaf-fill" />
            <image
              href={ART}
              width="720"
              height="1280"
              className="opening-leaf-art"
              mask={`url(#${mask})`}
            />
          </g>
        </svg>
      </div>
      {side === "left" && (
        <svg
          className="opening-gold-seal"
          viewBox="0 0 720 1280"
          preserveAspectRatio="none"
        >
          <defs>
            <clipPath id={`${uid}-seal`}>
              <path d="M368 531C395 529 406 547 427 561C448 578 469 600 474 630C477 652 465 674 450 693C434 720 410 738 381 742C354 746 331 735 308 724C281 713 276 691 267 668C256 645 258 619 270 597C282 573 302 562 321 549C335 538 349 533 368 531Z" />
            </clipPath>
          </defs>
          <image
            href={ART}
            width="720"
            height="1280"
            clipPath={`url(#${uid}-seal)`}
          />
        </svg>
      )}
    </div>
  );
}
function Botanical() {
  return (
    <svg
      className="opening-botanical"
      viewBox="0 0 160 90"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 78C41 74 72 54 112 12M37 67C22 56 19 47 22 36C34 42 40 51 37 67ZM56 56C44 40 45 29 49 21C60 31 64 44 56 56ZM76 42C71 23 76 13 84 8C90 23 87 32 76 42ZM40 65C57 68 67 65 74 58C60 53 50 56 40 65ZM65 49C83 53 98 47 102 40C87 35 74 40 65 49ZM89 29C105 32 117 29 124 19C110 17 101 21 89 29Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M103 68C121 55 134 48 151 46M122 56C119 44 123 35 129 31C135 42 132 50 122 56ZM131 52C144 57 153 54 157 49C148 43 140 47 131 52Z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}
export default function EnvelopeOpening({
  guest,
  theme,
  onThemeChange,
  onComplete,
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [phase, setPhase] = useState("sealed");
  const [leaving, setLeaving] = useState(false);
  const [reduced, setReduced] = useState(
    () =>
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  );
  const phaseRef = useRef(phase),
    lastGesture = useRef(0),
    touchStart = useRef(null),
    completed = useRef(false),
    exitTimer = useRef(null),
    sealRef = useRef(null),
    stageRef = useRef(null),
    nextRef = useRef(null);
  phaseRef.current = phase;
  useEffect(() => {
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sealRef.current?.focus({ preventScroll: true });
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const changed = (e) => setReduced(e.matches);
    media?.addEventListener?.("change", changed);
    return () => {
      document.body.style.overflow = oldOverflow;
      media?.removeEventListener?.("change", changed);
      clearTimeout(exitTimer.current);
      previous?.focus?.({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    const delay = openingDelay(phase, reduced);
    if (delay === null || leaving) return;
    const timer = setTimeout(
      () => setPhase((current) => nextOpeningPhase(current)),
      delay,
    );
    return () => clearTimeout(timer);
  }, [phase, reduced, leaving]);
  useEffect(() => {
    if (phase !== "sealed") nextRef.current?.focus({ preventScroll: true });
  }, [phase]);
  function finish() {
    if (completed.current) return;
    completed.current = true;
    setLeaving(true);
    if (reduced) onComplete();
    else exitTimer.current = setTimeout(onComplete, OPENING_TIMING.exit);
  }
  function advance() {
    const current = phaseRef.current;
    if (current === "portrait") {
      finish();
      return;
    }
    if (current === "sealed") {
      setPhase(reduced ? "portrait" : "folding");
      return;
    }
    setPhase(nextOpeningPhase(current));
  }
  function gesture() {
    const now = Date.now();
    if (now - lastGesture.current < OPENING_TIMING.gestureCooldown) return;
    lastGesture.current = now;
    // Let a scroll start the folding shot; a fresh gesture advances the next card.
    if (phaseRef.current === "folding") return;
    advance();
  }
  function keyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      finish();
      return;
    }
    if (["ArrowDown", "PageDown"].includes(event.key)) {
      event.preventDefault();
      gesture();
      return;
    }
    if (event.key === "Tab") {
      const controls = [
        ...stageRef.current.querySelectorAll("button:not(:disabled)"),
      ].filter(
        (el) =>
          !el.hidden &&
          el.getAttribute("aria-hidden") !== "true" &&
          !el.closest("[hidden]"),
      );
      const first = controls[0],
        last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  }
  const folded = phase !== "sealed";
  return (
    <section
      className={`opening-screen ${leaving ? "opening-leaving" : ""} ${!["sealed", "folding"].includes(phase) ? "showing-paper" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="opening-title"
      onKeyDown={keyDown}
      ref={stageRef}
    >
      <h1 id="opening-title" className="sr-only">
        Thiệp cưới {wedding.groom} và {wedding.bride}
      </h1>
      <div className="opening-toolbar">
        <span className="opening-brand">
          V<span>&</span>A
        </span>
        {onThemeChange && (
          <div
            className="opening-themes"
            role="group"
            aria-label="Phong cách thiệp"
          >
            {themes.map((t) => (
              <button
                key={t.id}
                aria-pressed={theme === t.id}
                onClick={() => onThemeChange(t.id)}
                title={t.name}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
        <button className="opening-skip" onClick={finish}>
          Bỏ qua mở thiệp
        </button>
      </div>
      <div
        className={`opening-stage ${folded ? "is-unfolding" : ""} phase-${phase}`}
        onWheel={(event) => {
          if (event.deltaY > 12) gesture();
        }}
        onTouchStart={(event) => {
          touchStart.current = event.touches[0].clientY;
        }}
        onTouchEnd={(event) => {
          if (
            touchStart.current !== null &&
            touchStart.current - event.changedTouches[0].clientY > 35
          )
            gesture();
          touchStart.current = null;
        }}
      >
        <div className="opening-paper">
          <div className="opening-paper-border" />
          <div
            className="opening-slide opening-slide-welcome"
            aria-hidden={phase !== "welcome"}
          >
            <Botanical />
            <p className="opening-kicker">TRÂN TRỌNG KÍNH MỜI</p>
            <p className="opening-guest">{guest}</p>
            <span className="opening-fine-line" />
            <p className="opening-copy">
              Cùng chúng mình viết nên
              <br />
              một ngày thật đẹp.
            </p>
          </div>
          <div
            className="opening-slide opening-slide-names"
            aria-hidden={phase !== "names"}
          >
            <p className="opening-kicker">CHÚNG MÌNH SẮP KẾT HÔN</p>
            <p className="opening-couple">
              <span>{wedding.groom}</span>
              <i>&</i>
              <span>{wedding.bride}</span>
            </p>
            <span className="opening-fine-line" />
            <p className="opening-date">{wedding.dateLabel}</p>
          </div>
          <div
            className="opening-slide opening-slide-portrait"
            aria-hidden={phase !== "portrait"}
          >
            <div className="opening-photo-arch">
              <img
                src="/photos/NHV04979.webp"
                srcSet="/photos/NHV04979-small.webp 600w, /photos/NHV04979.webp 1333w"
                sizes="(max-width:700px) 80vw, 400px"
                width="1333"
                height="2000"
                alt="Việt Anh và Vân Anh nắm tay nhau trong khu vườn"
                fetchPriority="high"
              />
            </div>
            <p className="opening-kicker">HẸN BẠN TRONG NGÀY HẠNH PHÚC</p>
            <p className="opening-portrait-names">
              {wedding.groom} <i>&</i> {wedding.bride}
            </p>
            <p className="opening-date">
              {wedding.dateLabel} · {wedding.time}
            </p>
            <p className="opening-venue">{wedding.venue}</p>
            <p className="opening-portrait-guest">Kính mời {guest}</p>
          </div>
        </div>
        <div className="opening-folds" aria-hidden="true">
          {["top", "bottom", "right", "left"].map((side) => (
            <EnvelopeLeaf key={side} side={side} uid={uid} />
          ))}
        </div>
        {phase === "sealed" && (
          <button
            ref={sealRef}
            className="opening-seal-button"
            aria-label="Chạm dấu sáp để mở thiệp mời cưới"
            onClick={advance}
          >
            <span className="sr-only">Mở lời mời của chúng mình</span>
          </button>
        )}
      </div>
      <div className="opening-controls">
        <p className="opening-hint" role="status">
          {phase === "sealed"
            ? "Chạm dấu sáp · Cuộn để mở thiệp"
            : phase === "folding"
              ? "Một lời mời đang mở…"
              : phase === "portrait"
                ? "Ngày vui sẽ trọn vẹn hơn khi có bạn."
                : "Một lời mời dành riêng cho bạn."}
          <span className="sr-only">
            {phase === "welcome"
              ? ` Trân trọng kính mời ${guest}.`
              : phase === "names"
                ? ` ${wedding.groom} và ${wedding.bride}, ${wedding.dateLabel}.`
                : ""}
          </span>
        </p>
        <div className="opening-steps" aria-hidden="true">
          {["welcome", "names", "portrait"].map((step) => (
            <span key={step} className={phase === step ? "active" : ""} />
          ))}
        </div>
        <button
          ref={nextRef}
          className="opening-next"
          hidden={phase === "sealed"}
          onClick={advance}
        >
          {phase === "portrait"
            ? "Khám phá ngày chung đôi"
            : phase === "folding"
              ? "Xem lời mời"
              : "Tiếp tục"}
        </button>
      </div>
    </section>
  );
}
