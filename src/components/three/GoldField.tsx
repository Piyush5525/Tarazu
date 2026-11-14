"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { rng } from "@/lib/ledger/units";

/** A slow field of gold beads and rings behind the page. It drifts with the scroll and leans to the pointer. */
function Beads({ count }: { count: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const rings = useRef<THREE.Group>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(() => {
    const r = rng(7);
    return Array.from({ length: count }, () => ({ x: (r() - 0.5) * 16, y: (r() - 0.5) * 22, z: -2 - r() * 9, s: 0.06 + r() * 0.2, p: r() * 6.28, v: 0.15 + r() * 0.35 }));
  }, [count]);
  const ringSeeds = useMemo(() => {
    const r = rng(11);
    return Array.from({ length: 5 }, () => ({ x: (r() - 0.5) * 12, y: (r() - 0.5) * 18, z: -4 - r() * 5, s: 0.5 + r() * 0.7, p: r() * 6.28 }));
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const scroll = typeof window !== "undefined" ? window.scrollY / Math.max(window.innerHeight, 1) : 0;
    seeds.forEach((b, i) => {
      // wrap vertically so the field never runs out while scrolling
      const y = ((((b.y + scroll * (1.2 + b.v * 2) + Math.sin(t * b.v + b.p) * 0.5 + 11) % 22) + 22) % 22) - 11;
      dummy.position.set(b.x + Math.cos(t * b.v * 0.6 + b.p) * 0.4 + state.pointer.x * (b.z + 12) * 0.05, y, b.z);
      dummy.scale.setScalar(b.s);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    rings.current.children.forEach((c, i) => {
      const s = ringSeeds[i];
      c.rotation.x = t * 0.25 + s.p; c.rotation.y = t * 0.18 + s.p * 2;
      c.position.y = ((((s.y + scroll * 2 + 9) % 18) + 18) % 18) - 9;
    });
  });

  return (
    <>
      <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 18, 18]} />
        <meshStandardMaterial color="#e2bd62" metalness={1} roughness={0.2} envMapIntensity={1.4} />
      </instancedMesh>
      <group ref={rings}>
        {ringSeeds.map((s, i) => (
          <mesh key={i} position={[s.x, s.y, s.z]} scale={s.s}>
            <torusGeometry args={[1, 0.14, 16, 48]} />
            <meshStandardMaterial color="#d2a94e" metalness={1} roughness={0.22} />
          </mesh>
        ))}
      </group>
    </>
  );
}

export default function GoldField() {
  const small = typeof window !== "undefined" && window.innerWidth < 720;
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 opacity-70" aria-hidden>
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 6], fov: 50 }} gl={{ antialias: !small, alpha: true, powerPreference: "low-power" }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 5, 4]} intensity={1.6} />
        <Environment resolution={128}>
          <color attach="background" args={["#f3e8cf"]} />
          <Lightformer intensity={4} position={[0, 5, -2]} scale={[12, 3, 1]} color="#fff4d6" />
          <Lightformer intensity={2.5} position={[-5, 0, 2]} rotation-y={Math.PI / 2} scale={[8, 4, 1]} color="#ffdf9a" />
          <Lightformer intensity={1} position={[0, -4, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} color="#8a6418" />
        </Environment>
        <fog attach="fog" args={["#f6f1e7", 6, 16]} />
        <Beads count={small ? 26 : 54} />
      </Canvas>
    </div>
  );
}
