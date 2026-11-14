"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Tara: a small 3D caricature. Big eyes, bun, bindi, gold jhumkas, bahi-red dupatta.
 * She breathes and blinks on her own, turns her head toward the pointer, tilts when she is listening,
 * and moves her mouth while she speaks.
 */
export type TaraMood = "idle" | "listening" | "speaking" | "thinking";

const SKIN = "#e9b78c", HAIR = "#1c120d", GOLD = "#e0b452", RED = "#8e1b1b";

function Gold({ rough = 0.22 }: { rough?: number }) {
  return <meshStandardMaterial color={GOLD} metalness={1} roughness={rough} envMapIntensity={1.4} />;
}

function Face({ mood, wave }: { mood: TaraMood; wave?: boolean }) {
  const hand = useRef<THREE.Group>(null!);
  const root = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Group>(null!);
  const lidL = useRef<THREE.Group>(null!);
  const lidR = useRef<THREE.Group>(null!);
  const mouth = useRef<THREE.Mesh>(null!);
  const smile = useRef<THREE.Mesh>(null!);
  const earL = useRef<THREE.Group>(null!);
  const earR = useRef<THREE.Group>(null!);
  const browL = useRef<THREE.Mesh>(null!);
  const browR = useRef<THREE.Mesh>(null!);
  const pointer = useRef({ x: 0, y: 0 });
  const blink = useRef({ next: 1.5, t: 0 });

  // The canvas is tiny, so follow the pointer anywhere on the page, not just over the avatar.
  useEffect(() => {
    const move = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime, d = Math.min(dt, 0.05);
    const listening = mood === "listening", speaking = mood === "speaking", thinking = mood === "thinking";
    // breathing bob + a happy bounce while speaking
    root.current.position.y = Math.sin(t * 1.6) * 0.035 + (speaking ? Math.abs(Math.sin(t * 5)) * 0.03 : 0);
    // look toward the pointer; tilt to one side while listening; look up while thinking
    const ty = THREE.MathUtils.clamp(pointer.current.x * 0.3 - 0.08, -0.38, 0.3) + (thinking ? Math.sin(t * 1.2) * 0.15 : 0);
    const tx = THREE.MathUtils.clamp(pointer.current.y * 0.25, -0.2, 0.3) + (thinking ? -0.22 : 0);
    head.current.rotation.y = THREE.MathUtils.lerp(head.current.rotation.y, ty, 0.08);
    head.current.rotation.x = THREE.MathUtils.lerp(head.current.rotation.x, tx, 0.08);
    head.current.rotation.z = THREE.MathUtils.lerp(head.current.rotation.z, listening ? 0.2 + Math.sin(t * 2) * 0.03 : Math.sin(t * 0.8) * 0.03, 0.08);
    // blink
    const b = blink.current;
    b.next -= d;
    if (b.next <= 0) { b.t = 0.16; b.next = 2 + Math.random() * 3; }
    b.t = Math.max(0, b.t - d);
    const closed = b.t > 0 ? Math.sin((b.t / 0.16) * Math.PI) : 0;
    lidL.current.scale.y = lidR.current.scale.y = 1 - closed * 0.92;
    // eyebrows lift when listening
    const lift = listening ? 0.06 : thinking ? 0.04 : 0;
    browL.current.position.y = browR.current.position.y = THREE.MathUtils.lerp(browL.current.position.y, 0.47 + lift, 0.15);
    // mouth: talk loop while speaking, small "o" while listening, smile otherwise
    const open = speaking ? 0.35 + Math.abs(Math.sin(t * 11) * Math.sin(t * 3.7)) * 0.9 : listening ? 0.45 : 0;
    mouth.current.scale.set(1 - open * 0.25, THREE.MathUtils.lerp(mouth.current.scale.y, open, 0.35), 1);
    mouth.current.visible = open > 0.04;
    smile.current.visible = !mouth.current.visible;
    // a little hand pops up and waves when she wants attention
    const hs = THREE.MathUtils.lerp(hand.current.scale.x, wave ? 1 : 0, 0.14);
    hand.current.scale.setScalar(hs);
    hand.current.rotation.z = -0.25 + Math.sin(t * 9) * 0.38 * hs;
    // jhumkas swing with the head
    const swing = Math.sin(t * 2.4) * 0.12 + head.current.rotation.z * 0.8;
    earL.current.rotation.z = swing; earR.current.rotation.z = swing;
  });

  const Eye = ({ x, lid }: { x: number; lid: React.RefObject<THREE.Group> }) => (
    <group position={[x, 0.18, 0.86]}>
      <group ref={lid}>
        <mesh scale={[1, 1.18, 0.5]}><sphereGeometry args={[0.2, 24, 24]} /><meshStandardMaterial color="#fffdf8" roughness={0.25} /></mesh>
        <mesh position={[0.012 * Math.sign(-x), -0.01, 0.085]} scale={[1, 1.1, 0.5]}><sphereGeometry args={[0.125, 20, 20]} /><meshStandardMaterial color="#2a1608" roughness={0.3} /></mesh>
        <mesh position={[0.05, 0.07, 0.15]}><sphereGeometry args={[0.04, 10, 10]} /><meshBasicMaterial color="#ffffff" /></mesh>
      </group>
    </group>
  );
  const Jhumka = ({ x, r }: { x: number; r: React.RefObject<THREE.Group> }) => (
    <group position={[x, -0.2, 0.05]} ref={r}>
      <mesh position={[0, -0.08, 0]}><sphereGeometry args={[0.07, 12, 12]} /><Gold /></mesh>
      <mesh position={[0, -0.27, 0]}><coneGeometry args={[0.16, 0.22, 20, 1, true]} /><Gold rough={0.3} /></mesh>
      <mesh position={[0, -0.42, 0]}><sphereGeometry args={[0.055, 10, 10]} /><Gold /></mesh>
    </group>
  );

  return (
    <group ref={root}>
      {/* shoulders, dupatta and necklace */}
      <mesh position={[0, -1.72, -0.05]} scale={[1.5, 0.95, 1]}><sphereGeometry args={[1, 32, 24]} /><meshStandardMaterial color={RED} roughness={0.55} /></mesh>
      <mesh position={[0, -1.02, 0.12]} rotation={[1.25, 0, 0]} scale={[1, 1, 0.7]}><torusGeometry args={[0.6, 0.06, 12, 40]} /><Gold /></mesh>
      <mesh position={[0, -1.3, 0.72]}><sphereGeometry args={[0.11, 14, 14]} /><Gold /></mesh>
      <mesh position={[0, -0.95, 0]}><cylinderGeometry args={[0.3, 0.36, 0.5, 20]} /><meshStandardMaterial color="#dca97c" roughness={0.6} /></mesh>

      {/* waving hand: palm, four fingers, thumb, two gold bangles */}
      <group ref={hand} position={[1.02, -1.3, 0.72]} scale={0}>
        <mesh position={[0, 0.34, 0]} scale={[1, 1.15, 0.5]}><sphereGeometry args={[0.22, 20, 20]} /><meshStandardMaterial color={SKIN} roughness={0.55} /></mesh>
        {[-0.14, -0.05, 0.05, 0.14].map((x, i) => <mesh key={i} position={[x, 0.62 + (i === 1 || i === 2 ? 0.04 : 0), 0]}><capsuleGeometry args={[0.042, 0.16, 4, 8]} /><meshStandardMaterial color={SKIN} roughness={0.55} /></mesh>)}
        <mesh position={[-0.24, 0.38, 0.02]} rotation={[0, 0, 0.9]}><capsuleGeometry args={[0.045, 0.12, 4, 8]} /><meshStandardMaterial color={SKIN} roughness={0.55} /></mesh>
        <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.12, 0.14, 0.3, 12]} /><meshStandardMaterial color={SKIN} roughness={0.55} /></mesh>
        {[0.06, -0.03].map((y) => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.15, 0.03, 8, 24]} /><Gold /></mesh>)}
      </group>

      <group ref={head}>
        <mesh scale={[1, 1.04, 0.98]}><sphereGeometry args={[1, 48, 48]} /><meshStandardMaterial color={SKIN} roughness={0.55} /></mesh>
        {/* hair: cap, side locks, bun */}
        <mesh position={[0, 0.1, -0.1]} rotation={[-0.62, 0, 0]}><sphereGeometry args={[1.06, 40, 28, 0, Math.PI * 2, 0, Math.PI * 0.46]} /><meshStandardMaterial color={HAIR} roughness={0.42} /></mesh>
        {[-1, 1].map((s) => <mesh key={s} position={[s * 0.86, -0.02, 0.18]} scale={[0.3, 0.72, 0.52]}><sphereGeometry args={[1, 20, 20]} /><meshStandardMaterial color={HAIR} roughness={0.42} /></mesh>)}
        <mesh position={[0, 0.98, -0.62]}><sphereGeometry args={[0.46, 24, 24]} /><meshStandardMaterial color={HAIR} roughness={0.4} /></mesh>
        <mesh position={[0, 0.98, -0.62]} rotation={[0.9, 0, 0]}><torusGeometry args={[0.42, 0.045, 10, 32]} /><Gold /></mesh>
        {/* maang tikka + bindi */}
        <mesh position={[0, 0.86, 0.6]} rotation={[-0.62, 0, 0]}><cylinderGeometry args={[0.018, 0.018, 0.5, 6]} /><Gold /></mesh>
        <mesh position={[0, 0.64, 0.82]}><sphereGeometry args={[0.075, 14, 14]} /><Gold /></mesh>
        <mesh position={[0, 0.46, 0.93]} scale={[1, 1, 0.4]}><sphereGeometry args={[0.055, 12, 12]} /><meshStandardMaterial color="#b3122a" roughness={0.3} /></mesh>
        {/* eyes, brows, nose, cheeks */}
        <Eye x={-0.34} lid={lidL} /><Eye x={0.34} lid={lidR} />
        <mesh ref={browL} position={[-0.35, 0.47, 0.9]} rotation={[0, 0, Math.PI / 2 - 0.14]} scale={[1, 1, 0.5]}><capsuleGeometry args={[0.028, 0.2, 4, 8]} /><meshStandardMaterial color={HAIR} /></mesh>
        <mesh ref={browR} position={[0.35, 0.47, 0.9]} rotation={[0, 0, Math.PI / 2 + 0.14]} scale={[1, 1, 0.5]}><capsuleGeometry args={[0.028, 0.2, 4, 8]} /><meshStandardMaterial color={HAIR} /></mesh>
        <mesh position={[0, -0.04, 1]}><sphereGeometry args={[0.075, 14, 14]} /><meshStandardMaterial color="#dfa77a" roughness={0.5} /></mesh>
        <mesh position={[0.1, -0.02, 0.985]}><sphereGeometry args={[0.022, 8, 8]} /><Gold /></mesh>
        {[-1, 1].map((s) => <mesh key={s} position={[s * 0.56, -0.14, 0.76]} scale={[1, 0.7, 0.35]}><sphereGeometry args={[0.17, 16, 16]} /><meshStandardMaterial color="#f08a7a" transparent opacity={0.55} roughness={0.8} /></mesh>)}
        {/* mouth */}
        <mesh ref={smile} position={[0, -0.33, 0.9]} rotation={[0.12, 0, Math.PI]}><torusGeometry args={[0.2, 0.034, 10, 24, Math.PI]} /><meshStandardMaterial color="#a8322f" roughness={0.4} /></mesh>
        <mesh ref={mouth} position={[0, -0.42, 0.9]} scale={[1, 0, 1]}><sphereGeometry args={[0.17, 20, 20]} /><meshStandardMaterial color="#6b1418" roughness={0.5} /></mesh>
        {/* ears + jhumkas */}
        <Jhumka x={-0.99} r={earL} /><Jhumka x={0.99} r={earR} />
      </group>
    </group>
  );
}

export default function TaraAvatar({ mood = "idle", wave = false, className = "" }: { mood?: TaraMood; wave?: boolean; className?: string }) {
  return (
    <div className={className} aria-hidden>
      <Canvas dpr={[1, 2]} camera={{ position: [0, -0.3, 7.6], fov: 30 }} gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}>
        <ambientLight intensity={0.85} />
        <directionalLight position={[3, 4, 5]} intensity={1.9} />
        <directionalLight position={[-4, 1, 2]} intensity={0.6} color="#ffd9a0" />
        <Environment resolution={64}>
          <color attach="background" args={["#f1e6cc"]} />
          <Lightformer intensity={4} position={[0, 4, 2]} scale={[8, 3, 1]} color="#fff3d1" />
          <Lightformer intensity={2.5} position={[-4, 0, 3]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} color="#ffe2a0" />
          <Lightformer intensity={1} position={[0, -3, 0]} rotation-x={Math.PI / 2} scale={[8, 8, 1]} color="#7a5a1c" />
        </Environment>
        <Face mood={mood} wave={wave} />
      </Canvas>
    </div>
  );
}
