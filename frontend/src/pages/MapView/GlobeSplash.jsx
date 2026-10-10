/**
 * GlobeSplash.jsx — interactive 3-D Earth globe built with Three.js.
 *
 * Features:
 *   • Realistic dark-mode Earth sphere (procedural shader, no texture CDN)
 *   • Soft blue atmosphere glow ring
 *   • Star-field background (1 500 random points)
 *   • Pulsing Delhi flood marker at 28.61°N 77.21°E
 *   • Auto-rotation that stops on user drag
 *   • Full mouse + touch drag-to-rotate
 *   • Scroll/pinch to zoom
 *   • "Enter map →" button fades the splash out and calls onDismiss()
 *
 * Props:
 *   onDismiss   () => void   called when user enters the map
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Waves } from 'lucide-react';
import styles from './GlobeSplash.module.css';

// Delhi lat/lng → 3-D unit sphere point
function latLngToVec3(lat, lng, r = 1) {
  const phi   = (90 - lat)  * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  );
}

export function GlobeSplash({ onDismiss }) {
  const canvasRef   = useRef(null);
  const stateRef    = useRef({});   // mutable scene state — no re-renders
  const [visible, setVisible] = useState(true);

  // ── Build scene ────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ── Renderer ────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setClearColor(0x000000, 0);

    // ── Scene / camera ───────────────────────────────────────────────────────
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      100,
    );
    camera.position.z = 2.6;

    // ── Star field ───────────────────────────────────────────────────────────
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(1500 * 3);
    for (let i = 0; i < 1500 * 3; i++) starPos[i] = (Math.random() - 0.5) * 80;
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, sizeAttenuation: true }),
    );
    scene.add(stars);

    // ── Globe sphere (custom shader — no texture required) ────────────────
    const globeGeo = new THREE.SphereGeometry(1, 64, 64);
    const globeMat = new THREE.ShaderMaterial({
      vertexShader: /* glsl */`
        varying vec3 vNormal;
        varying vec2 vUv;
        varying vec3 vPosition;
        void main() {
          vNormal   = normalize(normalMatrix * normal);
          vUv       = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        varying vec3 vNormal;
        varying vec2 vUv;
        varying vec3 vPosition;

        // Simple hash noise for continent-like pattern
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        float noise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p);
          float a = hash(i), b = hash(i + vec2(1,0)),
                c = hash(i + vec2(0,1)), d = hash(i + vec2(1,1));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
        }
        float fbm(vec2 p) {
          float v = 0.0, a = 0.5;
          for (int i = 0; i < 5; i++) {
            v += a * noise(p); p *= 2.1; a *= 0.5;
          }
          return v;
        }

        void main() {
          // Latitude/longitude from sphere position
          vec3 n = normalize(vPosition);
          float lat = asin(n.y) / 3.14159;         // -0.5 to 0.5
          float lng = atan(n.z, n.x) / 3.14159;    // -1 to 1

          vec2 coord = vec2(lng * 4.0, lat * 8.0);
          float land = fbm(coord + vec2(2.3, 1.7));
          float ocean = smoothstep(0.42, 0.58, land);

          vec3 oceanColor = vec3(0.04, 0.12, 0.28);
          vec3 landColor  = vec3(0.10, 0.22, 0.14);
          vec3 base = mix(oceanColor, landColor, ocean);

          // Specular highlight
          vec3 lightDir = normalize(vec3(2.0, 1.5, 3.0));
          float diff = max(dot(vNormal, lightDir), 0.0);
          float spec = pow(max(dot(reflect(-lightDir, vNormal), vec3(0,0,1)), 0.0), 40.0);

          // Grid lines
          vec2 grid = fract(vec2(lng * 12.0, lat * 8.0));
          float gridLine = step(0.96, max(grid.x, grid.y));

          vec3 col = base * (0.3 + 0.7 * diff) + vec3(0.3, 0.6, 1.0) * spec * 0.4;
          col = mix(col, vec3(0.15, 0.35, 0.5), gridLine * 0.4);

          // Fresnel rim
          float rim = pow(1.0 - abs(dot(vNormal, vec3(0,0,1))), 3.0);
          col += vec3(0.1, 0.35, 0.9) * rim * 0.5;

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const globe = new THREE.Mesh(globeGeo, globeMat);
    scene.add(globe);

    // ── Atmosphere glow ──────────────────────────────────────────────────────
    const atmGeo = new THREE.SphereGeometry(1.12, 64, 64);
    const atmMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      vertexShader: /* glsl */`
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0,0,1)), 2.5);
          gl_FragColor = vec4(0.15, 0.5, 1.0, intensity * 0.7);
        }
      `,
    });
    scene.add(new THREE.Mesh(atmGeo, atmMat));

    // ── Delhi pulse marker ───────────────────────────────────────────────────
    const delhiPos = latLngToVec3(28.6139, 77.209, 1.01);

    // Core dot
    const dotGeo = new THREE.SphereGeometry(0.018, 16, 16);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const dot    = new THREE.Mesh(dotGeo, dotMat);
    dot.position.copy(delhiPos);
    globe.add(dot);

    // Pulse ring (scales in shader via uniforms)
    const ringGeo = new THREE.RingGeometry(0.02, 0.028, 32);
    const ringMat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      uniforms: { uPulse: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `
        uniform float uPulse;
        varying vec2 vUv;
        void main(){
          float a = 1.0 - uPulse;
          gl_FragColor = vec4(0.94, 0.27, 0.27, a * 0.8);
        }
      `,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(delhiPos);
    // Orient ring to face outward from sphere surface
    ring.lookAt(delhiPos.clone().multiplyScalar(2));
    globe.add(ring);

    // ── Drag state ───────────────────────────────────────────────────────────
    const s = stateRef.current;
    s.autoRotate  = true;
    s.isDragging  = false;
    s.prevMouse   = { x: 0, y: 0 };
    s.rotation    = { x: 0, y: 0 };
    s.velocity    = { x: 0, y: 0 };
    s.zoomTarget  = camera.position.z;

    // ── Interaction ──────────────────────────────────────────────────────────
    function getXY(e) {
      if (e.touches) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      return { x: e.clientX, y: e.clientY };
    }

    function onDown(e) {
      s.isDragging  = true;
      s.autoRotate  = false;
      s.prevMouse   = getXY(e);
      s.velocity    = { x: 0, y: 0 };
    }
    function onMove(e) {
      if (!s.isDragging) return;
      const { x, y } = getXY(e);
      const dx = x - s.prevMouse.x;
      const dy = y - s.prevMouse.y;
      s.velocity   = { x: dx * 0.003, y: dy * 0.003 };
      s.rotation.y += dx * 0.004;
      s.rotation.x += dy * 0.004;
      s.rotation.x  = Math.max(-1.2, Math.min(1.2, s.rotation.x));
      s.prevMouse   = { x, y };
    }
    function onUp() { s.isDragging = false; }
    function onWheel(e) {
      s.zoomTarget = Math.max(1.5, Math.min(4.5, s.zoomTarget + e.deltaY * 0.003));
    }
    // Pinch zoom
    let lastPinchDist = 0;
    function onTouchMove(e) {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        if (lastPinchDist) s.zoomTarget = Math.max(1.5, Math.min(4.5, s.zoomTarget - (dist - lastPinchDist) * 0.01));
        lastPinchDist = dist;
      } else { onMove(e); }
    }
    function onTouchEnd() { lastPinchDist = 0; onUp(); }

    canvas.addEventListener('mousedown',  onDown);
    canvas.addEventListener('mousemove',  onMove);
    canvas.addEventListener('mouseup',    onUp);
    canvas.addEventListener('mouseleave', onUp);
    canvas.addEventListener('wheel',      onWheel, { passive: true });
    canvas.addEventListener('touchstart', onDown,     { passive: true });
    canvas.addEventListener('touchmove',  onTouchMove, { passive: true });
    canvas.addEventListener('touchend',   onTouchEnd);

    // ── Resize ───────────────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(canvas);

    // ── Render loop ──────────────────────────────────────────────────────────
    let rafId;
    let pulseT = 0;
    function animate() {
      rafId = requestAnimationFrame(animate);

      // Auto-rotate
      if (s.autoRotate) {
        s.rotation.y += 0.0015;
      } else if (!s.isDragging) {
        // Inertia decay
        s.velocity.x *= 0.92;
        s.velocity.y *= 0.92;
        s.rotation.y += s.velocity.x;
        s.rotation.x += s.velocity.y;
      }

      globe.rotation.y = s.rotation.y;
      globe.rotation.x = s.rotation.x;

      // Smooth zoom
      camera.position.z += (s.zoomTarget - camera.position.z) * 0.08;

      // Pulse animation
      pulseT = (pulseT + 0.025) % 1;
      ringMat.uniforms.uPulse.value = pulseT;
      const scale = 1 + pulseT * 2.5;
      ring.scale.setScalar(scale);

      // Slow star drift
      stars.rotation.y += 0.0001;

      renderer.render(scene, camera);
    }
    animate();

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      canvas.removeEventListener('mousedown',  onDown);
      canvas.removeEventListener('mousemove',  onMove);
      canvas.removeEventListener('mouseup',    onUp);
      canvas.removeEventListener('mouseleave', onUp);
      canvas.removeEventListener('wheel',      onWheel);
      canvas.removeEventListener('touchstart', onDown);
      canvas.removeEventListener('touchmove',  onTouchMove);
      canvas.removeEventListener('touchend',   onTouchEnd);
      renderer.dispose();
    };
  }, []);

  function handleEnter() {
    setVisible(false);
    setTimeout(onDismiss, 500); // wait for fade-out transition
  }

  return (
    <div className={`${styles.splash} ${!visible ? styles.splashOut : ''}`}>
      {/* Three.js canvas fills the whole backdrop */}
      <canvas ref={canvasRef} className={styles.canvas} />

      {/* Vignette overlay */}
      <div className={styles.vignette} />

      {/* Top wordmark */}
      <div className={styles.wordmark}>
        <span className={styles.wordmarkIcon}><Waves size={20} color="#3CC8E6" /></span>
        <span className={styles.wordmarkLockup}>
          <span className={styles.wordmarkText}>PARVAT</span>
          <span className={styles.wordmarkTagline}>
            Predictive Analytics for Risk, Vulnerability and Terrain
          </span>
        </span>
      </div>

      {/* Hero text */}
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>Delhi Flood Intelligence</h1>
        <p className={styles.heroSub}>
          Real-time monitoring · 290 wards · AI flood assessment
        </p>
      </div>

      {/* CTA */}
      <div className={styles.cta}>
        <p className={styles.dragHint}>Drag · Scroll to zoom · Click to enter</p>
        <button className={styles.enterBtn} onClick={handleEnter}>
          Enter live map →
        </button>
      </div>

      {/* Delhi label */}
      <div className={styles.delhiLabel}>
        <span className={styles.delhiDot} />
        Delhi
      </div>
    </div>
  );
}
