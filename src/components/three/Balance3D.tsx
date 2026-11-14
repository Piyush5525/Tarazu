"use client";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, Sparkles } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * The Balance: Tarazu's signature object.
 * `tilt` is the target lean, -1 (left pan heavy) .. +1 (right pan heavy). The beam is a damped spring,
 * so every change swings, overshoots a little and settles: level means both books agree.
 */
export type BalanceProps = {
  tilt?: number;
  leftBeads?: number;
  rightBeads?: number;
  onPan?: (side: "left" | "right") => void;
  className?: string;
  sparkles?: boolean;
  alert?: boolean; // paints the right pan terracotta (a dispute)
};

const GOLD = "#d9b45a";
const ARM = 2.15, DROP = 1.55, PAN_R = 0.72;

function beadSpots(n: number) {
  // deterministic little heap
  const out: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const ring = i < 5 ? 0 : 1, k = ring ? i - 5 : i, count = ring ? 4 : 5;
    const a = (k / count) * Math.PI * 2 + ring * 0.6, r = ring ? 0.14 : 0.3;
    out.push([Math.cos(a) * r, -0.07 + ring * 0.16 + (i > 8 ? 0.15 : 0), Math.sin(a) * r]);
  }
  return out;
}

function Pan({ beads, alert, onClick }: { beads: number; alert?: boolean; onClick?: (e: ThreeEvent<PointerEvent>) => void }) {
  const spots = useMemo(() => beadSpots(Math.min(beads, 12)), [beads]);
  const strings = useMemo(() => [0, 1, 2].map((i) => {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const from = new THREE.Vector3(0, DROP, 0), to = new THREE.Vector3(Math.cos(a) * PAN_R, 0, Math.sin(a) * PAN_R);
    const mid = from.clone().add(to).multiplyScalar(0.5), dir = to.clone().sub(from);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { mid, len: dir.length(), q };
  }), []);
  return (
    <group onPointerDown={onClick}>
      {strings.map((s, i) => (
        <mesh key={i} position={s.mid} quaternion={s.q}>
          <cylinderGeometry args={[0.012, 0.012, s.len, 6]} />
          <meshStandardMaterial color="#2a251c" roughness={0.6} metalness={0.4} />
        </mesh>
      ))}
      {/* hammered bowl */}
      <mesh rotation={[Math.PI, 0, 0]} scale={[1, 0.55, 1]} castShadow>
        <sphereGeometry args={[PAN_R, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={alert ? "#d98a6a" : GOLD} metalness={1} roughness={0.24} side={THREE.DoubleSide} envMapIntensity={1.25} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[PAN_R, 0.028, 12, 64]} />
        <meshStandardMaterial color="#f0d587" metalness={1} roughness={0.18} />
      </mesh>
      {spots.map((p, i) => (
        <mesh key={i} position={p} castShadow>
          <sphereGeometry args={[0.105, 20, 20]} />
          <meshStandardMaterial color="#f3d98c" metalness={1} roughness={0.12} envMapIntensity={1.5} />
        </mesh>
      ))}
      {/* generous invisible hit area for thumbs */}
      {onClick && (
        <mesh position={[0, 0.3, 0]} visible={false}>
          <cylinderGeometry args={[PAN_R * 1.35, PAN_R * 1.35, DROP * 1.5, 12]} />
          <meshBasicMaterial />
        </mesh>
      )}
    </group>
  );
}

function Scale({ tilt = 0, leftBeads = 5, rightBeads = 5, onPan, alert }: BalanceProps) {
  const root = useRef<THREE.Group>(null!);
  const beam = useRef<THREE.Group>(null!);
  const left = useRef<THREE.Group>(null!);
  const right = useRef<THREE.Group>(null!);
  const spring = useRef({ a: -0.22, v: 0 });
  const { camera, size } = useThree();

  // Pull the camera back on narrow (phone) canvases so both pans always fit.
  useEffect(() => {
    camera.position.z = Math.max(8.6, 10.6 / (size.width / size.height));
    camera.updateProjectionMatrix();
  }, [camera, size]);

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05), s = spring.current;
    const target = THREE.MathUtils.clamp(tilt, -1, 1) * -0.3; // +tilt = right heavy = clockwise
    s.v += (target - s.a) * 26 * d;
    s.v *= Math.exp(-2.6 * d);
    s.a += s.v * d;
    beam.current.rotation.z = s.a;
    const sway = Math.sin(state.clock.elapsedTime * 1.3) * 0.02 + s.v * 0.05;
    left.current.position.set(-Math.cos(s.a) * ARM, -Math.sin(s.a) * ARM - DROP, 0);
    right.current.position.set(Math.cos(s.a) * ARM, Math.sin(s.a) * ARM - DROP, 0);
    left.current.rotation.z = sway; right.current.rotation.z = -sway;
    // the whole instrument leans a little toward the pointer / finger
    root.current.rotation.y = THREE.MathUtils.lerp(root.current.rotation.y, state.pointer.x * 0.45, 0.06);
    root.current.rotation.x = THREE.MathUtils.lerp(root.current.rotation.x, -state.pointer.y * 0.12, 0.06);
  });

  const tap = (side: "left" | "right") => (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); onPan?.(side); };

  return (
    <group ref={root} position={[0, 0.35, 0]}>
      {/* base + post */}
      <mesh position={[0, -2.55, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.78, 0.2, 48]} />
        <meshStandardMaterial color="#1a1712" roughness={0.35} metalness={0.7} />
      </mesh>
      <mesh position={[0, -2.44, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.56, 0.03, 12, 64]} />
        <meshStandardMaterial color={GOLD} metalness={1} roughness={0.2} />
      </mesh>
      <mesh position={[0, -0.95, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 3, 24]} />
        <meshStandardMaterial color="#1a1712" roughness={0.3} metalness={0.8} />
      </mesh>
      {/* pivot */}
      <group position={[0, 0.6, 0]}>
        <mesh>
          <sphereGeometry args={[0.24, 32, 32]} />
          <meshStandardMaterial color={GOLD} metalness={1} roughness={0.15} envMapIntensity={1.4} />
        </mesh>
        <mesh position={[0, 0.34, 0]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.13, 0.03, 12, 32]} />
          <meshStandardMaterial color={GOLD} metalness={1} roughness={0.2} />
        </mesh>
        <group ref={beam}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.045, 0.045, ARM * 2, 16]} />
            <meshStandardMaterial color={GOLD} metalness={1} roughness={0.2} envMapIntensity={1.3} />
          </mesh>
          {[-ARM, ARM].map((x) => (
            <mesh key={x} position={[x, 0, 0]}>
              <sphereGeometry args={[0.085, 20, 20]} />
              <meshStandardMaterial color="#f0d587" metalness={1} roughness={0.15} />
            </mesh>
          ))}
        </group>
        <group ref={left}><Pan beads={leftBeads} onClick={onPan ? tap("left") : undefined} /></group>
        <group ref={right}><Pan beads={rightBeads} alert={alert} onClick={onPan ? tap("right") : undefined} /></group>
      </group>
    </group>
  );
}

export default function Balance3D(props: BalanceProps) {
  return (
    <div className={props.className ?? "h-[420px] w-full"} style={{ touchAction: "pan-y", cursor: props.onPan ? "pointer" : "default" }}>
      <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0.2, 8.6], fov: 34 }} shadows gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}>
        <ambientLight intensity={0.55} />
        <directionalLight position={[4, 7, 5]} intensity={2.1} castShadow shadow-mapSize={[1024, 1024]} />
        <pointLight position={[-4, 2, 3]} intensity={18} color="#ffd98a" />
        {/* a studio made of light panels: no HDR download, works offline on stage */}
        <Environment resolution={256}>
          <color attach="background" args={["#f1e6cc"]} />
          <Lightformer intensity={5} position={[0, 5, -3]} scale={[12, 3, 1]} color="#fff3d1" />
          <Lightformer intensity={3} position={[-5, 1, 2]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} color="#ffe2a0" />
          <Lightformer intensity={3} position={[5, 0, 2]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} color="#ffffff" />
          <Lightformer intensity={1.2} position={[0, -4, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} color="#7a5a1c" />
          <Lightformer intensity={2} position={[0, 0, 6]} scale={[6, 1.2, 1]} color="#8e1b1b" />
        </Environment>
        <Scale {...props} />
        {props.sparkles !== false && <Sparkles count={46} scale={[9, 5, 3]} size={3.2} speed={0.35} color="#d9a93a" opacity={0.7} />}
        <ContactShadows position={[0, -2.32, 0]} opacity={0.38} scale={9} blur={2.6} far={4} resolution={256} color="#3a2c0a" />
      </Canvas>
    </div>
  );
}
