"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * The hash chain as real links. Each FINAL event is a gold link locked into the one before it.
 * A link whose contents no longer match its hash turns red and hangs open; everything after it greys out.
 */
export type Link3D = { id: string; legacy?: boolean };

function Link({ i, n, state, isNew }: { i: number; n: number; state: "ok" | "broken" | "after" | "legacy"; isNew: boolean }) {
  const ref = useRef<THREE.Mesh>(null!);
  const born = useRef(isNew ? 0 : 1);
  const x = (i - (n - 1) / 2) * 1.02;
  useFrame((s, dt) => {
    born.current = Math.min(1, born.current + dt * 1.6);
    const k = 1 - Math.pow(1 - born.current, 3);
    const t = s.clock.elapsedTime;
    ref.current.position.set(x + (1 - k) * 2.2, Math.sin(t * 1.4 + i * 0.7) * 0.05 + (state === "broken" ? -0.28 : 0) + (1 - k) * 1.4, 0);
    ref.current.rotation.set(i % 2 ? Math.PI / 2 : 0, state === "broken" ? 0.5 : 0, state === "broken" ? Math.sin(t * 5) * 0.12 + 0.5 : Math.sin(t * 0.9 + i) * 0.05);
    ref.current.scale.setScalar(0.6 + 0.4 * k);
  });
  const color = state === "broken" ? "#c4553b" : state === "after" ? "#9a958a" : state === "legacy" ? "#b9a27a" : "#dcb65c";
  return (
    <mesh ref={ref}>
      <torusGeometry args={[0.42, 0.115, 18, 40, state === "broken" ? Math.PI * 1.55 : Math.PI * 2]} />
      <meshStandardMaterial color={color} metalness={state === "after" ? 0.6 : 1} roughness={state === "broken" ? 0.4 : 0.2} envMapIntensity={1.3} />
    </mesh>
  );
}

function Fit({ n }: { n: number }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height;
    camera.position.z = Math.max(3.4, (n * 1.02 + 1) / (2 * Math.tan((34 * Math.PI) / 360) * aspect));
    camera.updateProjectionMatrix();
  }, [camera, size, n]);
  return null;
}

export default function Chain3D({ links, brokenAt, newest, className }: { links: Link3D[]; brokenAt: number | null; newest?: string | null; className?: string }) {
  return (
    <div className={className ?? "h-[150px] w-full"} aria-hidden>
      <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0, 6], fov: 34 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 5, 4]} intensity={2} />
        <Environment resolution={128}>
          <color attach="background" args={["#f1e6cc"]} />
          <Lightformer intensity={5} position={[0, 4, -2]} scale={[14, 3, 1]} color="#fff3d1" />
          <Lightformer intensity={3} position={[-6, 0, 2]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} color="#ffe2a0" />
          <Lightformer intensity={2} position={[0, 0, 5]} scale={[10, 1, 1]} color="#ffffff" />
          <Lightformer intensity={1} position={[0, -4, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} color="#7a5a1c" />
        </Environment>
        <Fit n={links.length} />
        {links.map((l, i) => (
          <Link key={l.id} i={i} n={links.length} isNew={l.id === newest}
            state={brokenAt !== null && i === brokenAt ? "broken" : brokenAt !== null && i > brokenAt ? "after" : l.legacy ? "legacy" : "ok"} />
        ))}
      </Canvas>
    </div>
  );
}
