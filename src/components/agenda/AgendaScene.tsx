"use client";
import { KIND_PRIORITY, WEEKDAYS_SHORT, eventsOn, type AgendaEvent, type AgendaKind, type Cell } from "@/lib/agendaData";
import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Kültür Ajandası 3B sahnesi: ay, 42 günlük bir "tahta" olarak çizilir.
 *  - Her gün kalın bir karo; kayıt olan günler kategori renginde, yüzen bir işaretçi taşır.
 *  - Dokun/tıkla: günü seç. Üzerine gel: karo yükselir. Yatay kaydır: ay değiştir. Ok tuşları: gün/ay gezin.
 *  - Renkler sitenin tema değişkenlerinden (--card, --ink, --coral …) okunur; tema değişince sahne de değişir.
 *  - Görünmezken (sekme gizli / ekran dışı) çizim durur; "hareketi azalt" tercihinde yalnızca gerektiğinde çizer.
 */

export type SceneProps = {
  monthKey: string;
  cells: Cell[];
  events: AgendaEvent[];
  selected: string | null;
  today: string;
  label: string;
  onSelect: (key: string) => void;
  onSwipe: (dir: -1 | 1) => void;
  onMove: (deltaDays: number) => void;
  onUnsupported: () => void;
};

type RGB = { r: number; g: number; b: number };
type ColorName = "foam" | "card" | "ink" | "sea" | "sea2" | "deep" | "tide" | "sun" | "coral" | "sky";
type Pal = Record<ColorName, RGB> & { font: string };

const KIND_COLOR: Record<AgendaKind, ColorName> = { tatil: "coral", ozel: "sun", sinav: "tide", akademik: "sky", kisisel: "ink" };
const FALLBACK: Pal = {
  foam: { r: 243, g: 248, b: 250 }, card: { r: 255, g: 255, b: 255 }, ink: { r: 14, g: 58, b: 91 }, sea: { r: 14, g: 58, b: 91 },
  sea2: { r: 29, g: 106, b: 147 }, deep: { r: 7, g: 38, b: 56 }, tide: { r: 44, g: 196, b: 181 }, sun: { r: 255, g: 184, b: 77 },
  coral: { r: 255, g: 107, b: 87 }, sky: { r: 191, g: 230, b: 242 }, font: "Baloo 2, sans-serif",
};

function readPalette(): Pal {
  const cs = getComputedStyle(document.documentElement);
  const pal = { ...FALLBACK };
  (Object.keys(FALLBACK) as (keyof Pal)[]).forEach((n) => {
    if (n === "font") return;
    const m = cs.getPropertyValue(`--${n}`).match(/[\d.]+/g);
    if (m && m.length >= 3) (pal as Record<string, RGB | string>)[n] = { r: +m[0], g: +m[1], b: +m[2] };
  });
  const f = cs.getPropertyValue("--f-display").trim();
  pal.font = f ? `${f}, sans-serif` : FALLBACK.font;
  return pal;
}

const css = (c: RGB, a = 1) => `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${a})`;
const mix = (a: RGB, b: RGB, t: number): RGB => ({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t });
const setCol = (c: THREE.Color, v: RGB) => c.setRGB(v.r / 255, v.g / 255, v.b / 255, THREE.SRGBColorSpace);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const easeOutBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const smooth = (x: number) => x * x * (3 - 2 * x);

function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/* ───── Yerleşim ───── */
const PITCH = 1.12;
const TILE_TOP = 0.24;
const COLS = 7;
const ROWS = 6;
const TEX = 160;

type Tile = {
  idx: number;
  group: THREE.Group;
  body: THREE.Mesh;
  bodyMat: THREE.MeshStandardMaterial;
  topMat: THREE.MeshBasicMaterial;
  ctx: CanvasRenderingContext2D;
  tex: THREE.CanvasTexture;
  marker: THREE.Mesh;
  cell: Cell | null;
  evs: AgendaEvent[];
  topKind: AgendaKind | null;
  markerKind: AgendaKind | null;
  sig: string;
  wasSel: boolean;
  h: number;
  hover: number;
  sel: number;
  pop: number;
  t: number;
  dir: 1 | -1;
  delay: number;
};

export default function AgendaScene(props: SceneProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cb = useRef(props);
  cb.current = props;
  const sync = useRef<((p: SceneProps) => void) | null>(null);

  /* ───── Kurulum (bir kez) ───── */
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      cb.current.onUnsupported();
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 1.5);
    const dir = new THREE.DirectionalLight(0xffffff, 2.1);
    dir.position.set(4, 10, 6);
    scene.add(hemi, dir, new THREE.AmbientLight(0xffffff, 0.25));

    let pal = readPalette();
    let palVersion = 0;
    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(o: T): T => (disposables.push(o), o);

    /* — Deniz: dalgalanan noktalar — */
    const N = 64;
    const SPAN = 32;
    const pos = new Float32Array(N * N * 3);
    for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++) {
        const k = (i * N + j) * 3;
        pos[k] = (i / (N - 1) - 0.5) * SPAN;
        pos[k + 1] = 0;
        pos[k + 2] = (j / (N - 1) - 0.5) * SPAN;
      }
    const seaGeo = track(new THREE.BufferGeometry());
    seaGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const seaMat = track(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uTime: { value: 0 }, uScale: { value: 40 }, uColor: { value: new THREE.Vector3(0.17, 0.77, 0.71) } },
        vertexShader: `
          uniform float uTime; uniform float uScale; varying float vA;
          void main(){
            vec3 p = position;
            float w = sin(p.x*.55+uTime*1.1)*.35 + cos(p.z*.5+uTime*.9)*.3 + sin((p.x+p.z)*.3+uTime*.6)*.25;
            p.y = -0.9 + w;
            vec4 mv = modelViewMatrix * vec4(p,1.0);
            gl_PointSize = uScale * (1.0 + w*.5) / -mv.z;
            vA = smoothstep(17.0, 3.0, length(p.xz)) * (.3 + .7*(w+.9)/1.8);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `
          uniform vec3 uColor; varying float vA;
          void main(){
            float r = length(gl_PointCoord - .5);
            if (r > .5) discard;
            gl_FragColor = vec4(uColor, vA * smoothstep(.5, .12, r));
          }`,
      }),
    );
    scene.add(new THREE.Points(seaGeo, seaMat));

    /* — Gün karoları — */
    const shape = new THREE.Shape();
    {
      const w = 0.5;
      const r = 0.16;
      shape.moveTo(-w + r, -w);
      shape.lineTo(w - r, -w);
      shape.absarc(w - r, -w + r, r, -Math.PI / 2, 0, false);
      shape.lineTo(w, w - r);
      shape.absarc(w - r, w - r, r, 0, Math.PI / 2, false);
      shape.lineTo(-w + r, w);
      shape.absarc(-w + r, w - r, r, Math.PI / 2, Math.PI, false);
      shape.lineTo(-w, -w + r);
      shape.absarc(-w + r, -w + r, r, Math.PI, Math.PI * 1.5, false);
    }
    const bodyGeo = track(
      new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 6 }),
    );
    bodyGeo.rotateX(-Math.PI / 2);
    bodyGeo.translate(0, 0.02, 0);
    const topGeo = track(new THREE.PlaneGeometry(1, 1));
    topGeo.rotateX(-Math.PI / 2);

    const markerGeo: Record<AgendaKind, THREE.BufferGeometry> = {
      tatil: track(new THREE.ConeGeometry(0.2, 0.46, 18)),
      ozel: track(new THREE.OctahedronGeometry(0.26)),
      sinav: track(new THREE.BoxGeometry(0.36, 0.46, 0.06)),
      akademik: track(new THREE.TorusGeometry(0.18, 0.065, 10, 24)),
      kisisel: track(new THREE.IcosahedronGeometry(0.23)),
    };
    const markerMat: Record<AgendaKind, THREE.MeshStandardMaterial> = {
      tatil: track(new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.1 })),
      ozel: track(new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.1 })),
      sinav: track(new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.1 })),
      akademik: track(new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.1 })),
      kisisel: track(new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.1 })),
    };

    const board = new THREE.Group();
    scene.add(board);
    const tiles: Tile[] = [];
    for (let i = 0; i < COLS * ROWS; i++) {
      const canvasEl = document.createElement("canvas");
      canvasEl.width = canvasEl.height = TEX;
      const ctx = canvasEl.getContext("2d")!;
      const tex = track(new THREE.CanvasTexture(canvasEl));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      const bodyMat = track(new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.05 }));
      const topMat = track(new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.y = TILE_TOP + 0.003;
      const marker = new THREE.Mesh(markerGeo.sinav, markerMat.sinav);
      marker.visible = false;
      marker.scale.setScalar(0.7);
      marker.position.set(0.26, TILE_TOP + 0.36, -0.24);
      const group = new THREE.Group();
      group.add(body, top, marker);
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      group.position.set((col - 3) * PITCH, 0, (row - 2.5) * PITCH);
      board.add(group);
      tiles.push({
        idx: i, group, body, bodyMat, topMat, ctx, tex, marker, cell: null, evs: [], topKind: null, markerKind: null, sig: "", wasSel: false,
        h: 0, hover: 0, sel: 0, pop: 0, t: 0, dir: 1, delay: 0,
      });
    }
    const bodies = tiles.map((t) => t.body);

    /* — Hafta günleri şeridi — */
    const stripCanvas = document.createElement("canvas");
    stripCanvas.width = 1120;
    stripCanvas.height = 80;
    const stripTex = track(new THREE.CanvasTexture(stripCanvas));
    stripTex.colorSpace = THREE.SRGBColorSpace;
    const stripMat = track(new THREE.MeshBasicMaterial({ map: stripTex, transparent: true, toneMapped: false }));
    const stripGeo = track(new THREE.PlaneGeometry(COLS * PITCH - 0.12, 0.5));
    stripGeo.rotateX(-Math.PI / 2);
    const strip = new THREE.Mesh(stripGeo, stripMat);
    strip.position.set(0, 0.02, -3.65);
    board.add(strip);
    const paintStrip = () => {
      const c = stripCanvas.getContext("2d")!;
      c.clearRect(0, 0, 1120, 80);
      c.font = `800 38px ${pal.font}`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      WEEKDAYS_SHORT.forEach((d, i) => {
        c.fillStyle = i >= 5 ? css(pal.sun) : "rgba(255,255,255,.78)";
        c.fillText(d.toLocaleUpperCase("tr"), 80 + i * 160, 42);
      });
      stripTex.needsUpdate = true;
    };

    /* — Bugün halkası — */
    const ringGeo = track(new THREE.RingGeometry(0.57, 0.64, 48));
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = track(new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false }));
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.visible = false;
    board.add(ring);

    /* — Çizim: karo yüzeyi — */
    const paintTile = (t: Tile, selected: boolean, isToday: boolean) => {
      const c = t.ctx;
      const cell = t.cell;
      c.clearRect(0, 0, TEX, TEX);
      if (!cell) return;
      const top = t.topKind;
      const topEv = top ? t.evs.find((e) => e.kind === top)! : null;
      let fill = cell.weekend ? mix(pal.card, pal.sky, 0.22) : pal.card;
      let text = pal.ink;
      if (top && topEv) {
        const strength = topEv.half ? 0.55 : topEv.start === topEv.end ? 1 : 0.82;
        fill = mix(pal.card, pal[KIND_COLOR[top]], strength);
        text = top === "kisisel" ? pal.card : pal.deep;
      }
      c.save();
      c.globalAlpha = cell.inMonth ? 1 : 0.42;
      rr(c, 2, 2, TEX - 4, TEX - 4, 28);
      c.fillStyle = css(fill);
      c.fill();
      if (isToday && !selected) {
        c.lineWidth = 9;
        c.strokeStyle = css(pal.sun);
        rr(c, 7, 7, TEX - 14, TEX - 14, 24);
        c.stroke();
      }
      if (selected) {
        c.lineWidth = 13;
        c.strokeStyle = css(pal.ink);
        rr(c, 8, 8, TEX - 16, TEX - 16, 22);
        c.stroke();
        c.lineWidth = 4;
        c.strokeStyle = css(pal.card);
        rr(c, 16, 16, TEX - 32, TEX - 32, 16);
        c.stroke();
      }
      c.fillStyle = css(text);
      c.font = `800 ${top ? 74 : 70}px ${pal.font}`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(String(cell.day), TEX / 2, 70);
      const kinds = KIND_PRIORITY.filter((k) => t.evs.some((e) => e.kind === k)).slice(0, 4);
      kinds.forEach((k, i) => {
        const x = TEX / 2 + (i - (kinds.length - 1) / 2) * 24;
        c.beginPath();
        c.arc(x, 128, 9, 0, Math.PI * 2);
        c.fillStyle = css(pal[KIND_COLOR[k]]);
        c.fill();
        c.lineWidth = 3.5;
        c.strokeStyle = css(top ? text : pal.ink, top ? 0.9 : 0.35);
        c.stroke();
      });
      c.restore();
      t.tex.needsUpdate = true;
    };

    const recolorStatic = () => {
      setCol(hemi.color, mix(pal.sky, { r: 255, g: 255, b: 255 }, 0.5));
      setCol(hemi.groundColor, pal.deep);
      seaMat.uniforms.uColor.value.set(pal.tide.r / 255, pal.tide.g / 255, pal.tide.b / 255);
      setCol(ringMat.color, pal.sun);
      (Object.keys(markerMat) as AgendaKind[]).forEach((k) => {
        // Kişisel işaretçi, ink dolgulu karonun üzerinde seçilsin diye kart renginde
        const base = k === "kisisel" ? pal.card : pal[KIND_COLOR[k]];
        setCol(markerMat[k].color, base);
        setCol(markerMat[k].emissive, mix({ r: 0, g: 0, b: 0 }, base, 0.28));
      });
      paintStrip();
    };
    recolorStatic();

    /* — Veri → karolar — */
    let props = cb.current;
    let cur: string | null = null;
    let pending: SceneProps | null = null;
    let phase: "idle" | "out" | "in" = "idle";
    let dirty = true;

    const evsFor = (cell: Cell, p: SceneProps) => eventsOn(p.events, cell.key);
    const markerOf = (cell: Cell, evs: AgendaEvent[], firstKey: string): AgendaKind | null => {
      for (const k of KIND_PRIORITY) if (evs.some((e) => e.kind === k && (e.start === cell.key || cell.key === firstKey))) return k;
      return null;
    };

    const refresh = (p: SceneProps) => {
      const firstKey = p.cells[0].key;
      tiles.forEach((t, i) => {
        const cell = p.cells[i];
        const evs = evsFor(cell, p);
        const isSel = p.selected === cell.key;
        const isToday = p.today === cell.key;
        const sig = `${palVersion}|${cell.key}|${cell.inMonth}|${isSel}|${isToday}|${evs.map((e) => e.id).join(",")}`;
        t.cell = cell;
        t.evs = evs;
        t.topKind = KIND_PRIORITY.find((k) => evs.some((e) => e.kind === k)) ?? null;
        t.markerKind = markerOf(cell, evs, firstKey);
        if (t.markerKind) {
          t.marker.geometry = markerGeo[t.markerKind];
          t.marker.material = markerMat[t.markerKind];
        }
        if (sig !== t.sig) {
          if (isSel && !t.wasSel) t.pop = 1;
          t.wasSel = isSel;
          t.sig = sig;
          paintTile(t, isSel, isToday);
          const topEv = t.topKind ? evs.find((e) => e.kind === t.topKind)! : null;
          const fill = !cell.inMonth
            ? mix(pal.sea, pal.card, 0.3)
            : topEv
              ? mix(mix(pal.card, pal[KIND_COLOR[t.topKind!]], topEv.half ? 0.55 : 1), pal.deep, 0.22)
              : mix(pal.card, pal.deep, 0.2);
          setCol(t.bodyMat.color, fill);
        }
      });
      const todayTile = tiles.find((t) => t.cell?.key === p.today && t.cell.inMonth);
      ring.userData.tile = todayTile ?? null;
      dirty = true;
    };

    const applyMonth = (p: SceneProps) => {
      cur = p.monthKey;
      props = p;
      tiles.forEach((t) => {
        t.sig = "";
        t.dir = 1;
        t.t = reduce ? 1 : 0;
        t.delay = reduce ? 0 : ((t.idx % COLS) + Math.floor(t.idx / COLS)) * 0.04;
      });
      refresh(p);
      tiles.forEach((t) => {
        t.sel = t.cell?.key === p.selected ? 1 : 0;
        t.h = reduce ? 0 : -0.3;
      });
      phase = reduce ? "idle" : "in";
    };

    sync.current = (p: SceneProps) => {
      props = p;
      if (cur === null) return applyMonth(p);
      if (cur !== p.monthKey) {
        pending = p;
        if (phase !== "out") {
          phase = "out";
          tiles.forEach((t) => {
            t.dir = -1;
            t.delay = reduce ? 0 : ((t.idx % COLS) + Math.floor(t.idx / COLS)) * 0.012;
            if (reduce) t.t = 0;
          });
        }
        dirty = true;
        return;
      }
      if (phase === "out") {
        pending = p;
        return;
      }
      refresh(p);
    };

    /* — Kamera — */
    const target = new THREE.Vector3(0, 0, -0.35);
    const BASE_EL = 0.98;
    const view = { az: 0, el: BASE_EL, azT: 0, elT: BASE_EL, R: 14 };
    const place = (R: number, az: number, el: number) => {
      camera.position.set(target.x + R * Math.sin(az) * Math.cos(el), target.y + R * Math.sin(el), target.z + R * Math.cos(az) * Math.cos(el));
      camera.lookAt(target);
      camera.updateMatrixWorld();
    };
    const corners: THREE.Vector3[] = [];
    for (const x of [-3.95, 3.95]) for (const z of [-4.2, 3.4]) for (const y of [0, 1.1]) corners.push(new THREE.Vector3(x, y, z));
    const fit = () => {
      let R = 8;
      for (; R < 70; R += 0.4) {
        place(R, 0, BASE_EL);
        camera.updateProjectionMatrix();
        const ok = corners.every((v) => {
          const q = v.clone().project(camera);
          return Math.abs(q.x) < 0.95 && Math.abs(q.y) < 0.93;
        });
        if (ok) break;
      }
      view.R = R;
    };

    const resize = () => {
      const w = Math.max(1, wrap.clientWidth);
      const h = Math.max(1, wrap.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      seaMat.uniforms.uScale.value = 62 * dpr * (h / 600);
      fit();
      dirty = true;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    /* — Etkileşim — */
    const ndc = new THREE.Vector2();
    const ray = new THREE.Raycaster();
    let hoverIdx = -1;
    let hoverDirty = false;
    const pick = (): number => {
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(bodies, false)[0];
      if (!hit) return -1;
      const i = bodies.indexOf(hit.object as THREE.Mesh);
      return i >= 0 && tiles[i].t > 0.7 ? i : -1;
    };
    const setNdc = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    };
    let down: { x: number; y: number; t: number; id: number } | null = null;

    const onMove = (e: PointerEvent) => {
      setNdc(e);
      if (down) {
        view.azT = clamp((e.clientX - down.x) / 320, -0.32, 0.32);
      } else if (e.pointerType === "mouse") {
        view.azT = ndc.x * 0.14;
        view.elT = BASE_EL + ndc.y * 0.05;
        hoverDirty = true;
      }
      dirty = true;
    };
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {}
    };
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      const dt = performance.now() - down.t;
      down = null;
      view.azT = 0;
      if (Math.abs(dx) > 56 && Math.abs(dy) < 56 && dt < 800) {
        cb.current.onSwipe(dx < 0 ? 1 : -1);
      } else if (Math.hypot(dx, dy) < 12) {
        setNdc(e);
        const i = pick();
        if (i >= 0 && tiles[i].cell) cb.current.onSelect(tiles[i].cell!.key);
      }
      dirty = true;
    };
    const onCancel = () => {
      down = null;
      view.azT = 0;
      dirty = true;
    };
    const onLeave = () => {
      if (down) return;
      hoverIdx = -1;
      view.azT = 0;
      view.elT = BASE_EL;
      wrap.style.cursor = "";
      dirty = true;
    };
    const onKey = (e: KeyboardEvent) => {
      const m: Record<string, () => void> = {
        ArrowLeft: () => cb.current.onMove(-1),
        ArrowRight: () => cb.current.onMove(1),
        ArrowUp: () => cb.current.onMove(-7),
        ArrowDown: () => cb.current.onMove(7),
        PageUp: () => cb.current.onSwipe(-1),
        PageDown: () => cb.current.onSwipe(1),
      };
      if (m[e.key]) {
        e.preventDefault();
        m[e.key]();
      }
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onCancel);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("keydown", onKey);

    /* — Tema / yazı tipi değişimi — */
    const repaintAll = () => {
      pal = readPalette();
      palVersion++;
      recolorStatic();
      if (cur !== null) refresh(props);
    };
    const mo = new MutationObserver(repaintAll);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    document.fonts?.ready.then(repaintAll).catch(() => {});

    /* — Görünürlük — */
    let visible = true;
    const io = new IntersectionObserver((en) => {
      visible = en[0]?.isIntersecting ?? true;
      if (visible) dirty = true;
    });
    io.observe(wrap);

    /* — Döngü — */
    let raf = 0;
    let last = performance.now();
    let clock = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) {
        last = now;
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduce) clock += dt;
      const kk = (rate: number) => (reduce ? 1 : 1 - Math.exp(-rate * dt));
      let moving = false;

      if (hoverDirty) {
        hoverDirty = false;
        const i = pick();
        if (i !== hoverIdx) {
          hoverIdx = i;
          wrap.style.cursor = i >= 0 ? "pointer" : "";
        }
      }

      let allOut = true;
      let allIn = true;
      for (const t of tiles) {
        // Giriş / çıkış animasyonu
        if (t.delay > 0) {
          t.delay -= dt;
          moving = true;
        } else {
          const nt = clamp(t.t + (t.dir * dt) / 0.45, 0, 1);
          if (nt !== t.t) moving = true;
          t.t = nt;
        }
        if (t.t > 0.001) allOut = false;
        if (t.t < 0.999) allIn = false;
        const e = t.dir > 0 ? easeOutBack(t.t) : smooth(t.t);

        const selT = t.cell && props.selected === t.cell.key ? 1 : 0;
        const hovT = t.idx === hoverIdx ? 1 : 0;
        t.hover += (hovT - t.hover) * kk(16);
        t.sel += (selT - t.sel) * kk(12);
        t.pop = Math.max(0, t.pop - dt / 0.5);
        const baseH = (t.topKind ? 0.07 : 0) + (t.cell && !t.cell.inMonth ? -0.06 : 0);
        const targetH = baseH + t.hover * 0.2 + t.sel * 0.34;
        const prevH = t.h;
        t.h += (targetH - t.h) * kk(14);
        if (Math.abs(t.h - prevH) > 0.0005 || Math.abs(t.hover - hovT) > 0.01 || Math.abs(t.sel - selT) > 0.01 || t.pop > 0) moving = true;

        const s = Math.max(0.001, e) * (1 + Math.sin(t.pop * Math.PI) * 0.12);
        t.group.scale.setScalar(s);
        t.group.rotation.x = (1 - clamp(e, 0, 1)) * 0.9 * (t.dir > 0 ? 1 : -1);
        t.group.position.y = t.h;

        const showMarker = !!t.markerKind && t.t > 0.6 && !!t.cell?.inMonth;
        t.marker.visible = showMarker;
        if (showMarker) {
          const bob = reduce ? 0 : Math.sin(clock * 2.2 + t.idx) * 0.06;
          t.marker.position.y = TILE_TOP + 0.36 + bob + t.sel * 0.06;
          t.marker.rotation.y = reduce ? 0.6 : clock * 1.4 + t.idx;
          t.marker.rotation.x = t.markerKind === "akademik" ? Math.PI / 2.4 : 0;
          t.marker.rotation.z = t.markerKind === "sinav" ? 0.18 : 0;
          if (!reduce) moving = true;
        }
      }

      if (phase === "out" && allOut && pending) {
        const p = pending;
        pending = null;
        applyMonth(p);
        moving = true;
      } else if (phase === "in" && allIn) {
        phase = "idle";
      }
      if (phase !== "idle") moving = true;

      // Bugün halkası
      const tt = ring.userData.tile as Tile | null;
      if (tt && tt.t > 0.9) {
        ring.visible = true;
        ring.position.set(tt.group.position.x, tt.h + TILE_TOP + 0.01, tt.group.position.z);
        const pulse = reduce ? 0 : Math.sin(clock * 3);
        ring.scale.setScalar(1 + pulse * 0.06);
        ringMat.opacity = reduce ? 0.9 : 0.65 + pulse * 0.3;
        if (!reduce) moving = true;
      } else ring.visible = false;

      // Kamera
      view.az += (view.azT - view.az) * kk(7);
      view.el += (view.elT - view.el) * kk(7);
      if (Math.abs(view.az - view.azT) > 0.001 || Math.abs(view.el - view.elT) > 0.001) moving = true;
      place(view.R, view.az, view.el);

      seaMat.uniforms.uTime.value = clock;
      if (reduce && !moving && !dirty) return;
      dirty = false;
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      sync.current = null;
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onCancel);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("keydown", onKey);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
    };
  }, []);

  /* ───── Veri değişince sahneyi eşitle ───── */
  useEffect(() => {
    sync.current?.(props);
  }, [props.monthKey, props.cells, props.events, props.selected, props.today]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="application"
        aria-label={props.label}
        aria-roledescription="3 boyutlu ajanda"
        className="block h-full w-full rounded-[inherit] outline-offset-[-4px]"
        style={{ touchAction: "pan-y" }}
      />
    </div>
  );
}
