"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment } from "@react-three/drei";
import { useRef } from "react";
import type { Mesh } from "three";

function Wave({ y, color }: { y: number; color: string }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.4 + y) * 0.08; });
  return <mesh ref={ref} position={[0, y, 0]} rotation={[-1.2, 0, 0]}><torusGeometry args={[2.2, 0.08, 16, 64]} /><meshStandardMaterial color={color} /></mesh>;
}
export default function Hero3D() {
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 6], fov: 45 }} className="!absolute inset-0">
      <ambientLight intensity={0.8} /><directionalLight position={[3, 4, 2]} intensity={1.2} />
      <Float speed={2} floatIntensity={1.5}>
        <mesh><icosahedronGeometry args={[1.3, 1]} /><meshStandardMaterial color="#f2a541" flatShading /></mesh>
      </Float>
      <Wave y={-1.2} color="#0b3d5c" /><Wave y={-1.6} color="#7a9a3b" />
      <Environment preset="city" />
    </Canvas>
  );
}
