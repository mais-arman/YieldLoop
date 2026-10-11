import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Move, RotateCcw, RotateCw, ZoomIn, ZoomOut, ChevronUp, ChevronDown, MonitorX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { bounds, type Panel } from '@/lib/packaging-geometry';
import { useFt } from '@/lib/feature-i18n';

const COLORS: Record<Panel['group'], number> = { base: 0xc9a46b, wall: 0xd8b77f, top: 0xe2c592, lid: 0x5aa39a };

interface Api { reset: () => void; rotate: (az: number, pol: number) => void; zoom: (f: number) => void; pan: (x: number, y: number) => void }

export default function ConceptViewer({ panels }: { panels: Panel[] }) {
  const ft = useFt();
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<Api | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = host.current; if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { setFailed(true); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xf4f1ea, 0x6b7a8f, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(1, 2, 1.3); scene.add(sun);

    const group = new THREE.Group(); const disposables: { dispose: () => void }[] = [];
    const b = bounds(panels);
    const cx = (b.min[0] + b.max[0]) / 2, cy = (b.min[1] + b.max[1]) / 2, cz = (b.min[2] + b.max[2]) / 2;
    const span = Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]) || 1;
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.55 }); disposables.push(edgeMat);
    for (const p of panels) {
      const geo = new THREE.BoxGeometry(...p.size);
      const mat = new THREE.MeshStandardMaterial({ color: COLORS[p.group], roughness: 0.85, metalness: 0 });
      const mesh = new THREE.Mesh(geo, mat); mesh.position.set(p.center[0] - cx, p.center[1] - cy, p.center[2] - cz);
      const eg = new THREE.EdgesGeometry(geo); const lines = new THREE.LineSegments(eg, edgeMat); mesh.add(lines);
      group.add(mesh); disposables.push(geo, mat, eg);
    }
    scene.add(group);
    const grid = new THREE.GridHelper(span * 3, 12, 0x94a3b8, 0xcbd5e1); grid.position.y = b.min[1] - cy - 0.01;
    scene.add(grid); disposables.push(grid.geometry, grid.material as THREE.Material);

    const camera = new THREE.PerspectiveCamera(35, 1, span / 100, span * 50);
    const home = new THREE.Vector3(span * 1.5, span * 1.1, span * 1.7);
    camera.position.copy(home);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false; controls.minDistance = span * 0.3; controls.maxDistance = span * 10;
    controls.listenToKeyEvents(el); controls.keyPanSpeed = 20;
    const render = () => renderer.render(scene, camera);
    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight || 1;
      renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); render();
    };
    controls.addEventListener('change', render);
    const ro = new ResizeObserver(resize); ro.observe(el); resize();

    api.current = {
      reset: () => { camera.position.copy(home); controls.target.set(0, 0, 0); controls.update(); },
      rotate: (az, pol) => {
        const off = camera.position.clone().sub(controls.target); const s = new THREE.Spherical().setFromVector3(off);
        s.theta += az; s.phi = Math.min(Math.PI - 0.05, Math.max(0.05, s.phi + pol));
        camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s)); controls.update();
      },
      zoom: (f) => {
        const off = camera.position.clone().sub(controls.target);
        const len = Math.min(controls.maxDistance, Math.max(controls.minDistance, off.length() * f));
        camera.position.copy(controls.target).add(off.setLength(len)); controls.update();
      },
      pan: (x, y) => {
        const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0).multiplyScalar(x * span * 0.1);
        const up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1).multiplyScalar(y * span * 0.1);
        camera.position.add(right).add(up); controls.target.add(right).add(up); controls.update();
      },
    };
    return () => {
      api.current = null; ro.disconnect(); controls.dispose(); disposables.forEach((d) => d.dispose());
      renderer.dispose(); renderer.domElement.remove();
    };
  }, [panels]);

  if (failed) {
    return (
      <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/40 p-6 text-center" role="status" data-testid="viewer-no-webgl">
        <MonitorX className="h-6 w-6 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">{ft('v_noWebgl')}</p>
        <p className="max-w-xs text-xs text-muted-foreground">{ft('v_noWebglDesc')}</p>
      </div>
    );
  }
  const r = 0.26, btn = (label: string, Icon: typeof ZoomIn, fn: () => void, id: string) => (
    <Button key={id} type="button" variant="outline" size="icon" className="h-8 w-8 bg-card/90" onClick={fn} aria-label={label} title={label} data-testid={`button-view-${id}`}>
      <Icon className="h-4 w-4" aria-hidden />
    </Button>
  );
  return (
    <div className="space-y-2">
      <div ref={host} tabIndex={0} role="img" aria-label={ft('v_title')}
        className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border bg-[linear-gradient(180deg,hsl(210_40%_97%),hsl(214_32%_91%))] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-testid="viewer-canvas" />
      <div className="flex flex-wrap items-center gap-1.5" dir="ltr">
        {btn(ft('v_rotL'), RotateCcw, () => api.current?.rotate(-r, 0), 'rot-left')}
        {btn(ft('v_rotR'), RotateCw, () => api.current?.rotate(r, 0), 'rot-right')}
        {btn(ft('v_rotU'), ChevronUp, () => api.current?.rotate(0, -r), 'rot-up')}
        {btn(ft('v_rotD'), ChevronDown, () => api.current?.rotate(0, r), 'rot-down')}
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        {btn(ft('v_zoomIn'), ZoomIn, () => api.current?.zoom(0.8), 'zoom-in')}
        {btn(ft('v_zoomOut'), ZoomOut, () => api.current?.zoom(1.25), 'zoom-out')}
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <Move className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        {btn(ft('v_panL'), ArrowLeft, () => api.current?.pan(-1, 0), 'pan-left')}
        {btn(ft('v_panR'), ArrowRight, () => api.current?.pan(1, 0), 'pan-right')}
        {btn(ft('v_panU'), ArrowUp, () => api.current?.pan(0, 1), 'pan-up')}
        {btn(ft('v_panD'), ArrowDown, () => api.current?.pan(0, -1), 'pan-down')}
        <Button type="button" variant="ghost" size="sm" className="ms-auto h-8" onClick={() => api.current?.reset()} data-testid="button-view-reset">{ft('v_reset')}</Button>
      </div>
      <p className="text-xs text-muted-foreground">{ft('v_hint')}</p>
    </div>
  );
}
