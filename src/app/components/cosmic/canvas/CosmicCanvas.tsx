import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, MeshDistortMaterial } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

import { useLenisScrollProgress } from '../../../cinematic/lenis/LenisProvider';

function starCount() {
  if (typeof window === 'undefined') return 2000;
  return window.matchMedia('(max-width: 767px)').matches ? 480 : 2400;
}

function useSkipHeavyPost() {
  return useMemo(() => {
    if (typeof window === 'undefined') return false;
    const cores = navigator.hardwareConcurrency ?? 8;
    if (cores <= 4) return true;
    if (window.matchMedia('(pointer: coarse)').matches) return true;
    return false;
  }, []);
}

function FloatingOrbs({ scroll }: { scroll: number }) {
  const group = useRef<THREE.Group>(null);

  const orbs = useMemo(
    () =>
      Array.from({ length: typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches ? 3 : 4 }, (_, i) => ({
        position: new THREE.Vector3((Math.random() - 0.5) * 28, (Math.random() - 0.5) * 18, (Math.random() - 0.5) * 10 - 4),
        scale: 0.35 + Math.random() * 1.1,
        speed: 0.2 + Math.random() * 0.35,
        offset: Math.random() * Math.PI * 2,
        hue: ['#FF3CAC', '#784BA0', '#2B86C5', '#00F5A0'][i % 4]!,
      })),
    [],
  );

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.children.forEach((child, i) => {
      const orb = orbs[i];
      if (!orb || !child) return;
      child.position.y = orb.position.y + Math.sin(t * orb.speed + orb.offset) * 1.4;
      child.position.x = orb.position.x + Math.cos(t * orb.speed * 0.72 + orb.offset) * 0.75;
      child.rotation.x = t * 0.09 * orb.speed;
      child.rotation.y = t * 0.12 * orb.speed;
    });
    group.current.rotation.y = scroll * Math.PI * 0.48;
    group.current.rotation.z = scroll * 0.08;
  });

  return (
    <group ref={group}>
      {orbs.map((orb, i) => (
        <mesh key={i} position={orb.position} scale={orb.scale}>
          {i % 3 === 0 && <icosahedronGeometry args={[1, 1]} />}
          {i % 3 === 1 && <octahedronGeometry args={[1, 0]} />}
          {i % 3 === 2 && <torusGeometry args={[0.75, 0.18, 8, 24]} />}
          <meshStandardMaterial
            color={orb.hue}
            wireframe
            transparent
            opacity={0.08 + scroll * 0.06}
            emissive={orb.hue}
            emissiveIntensity={0.45}
          />
        </mesh>
      ))}
    </group>
  );
}

function NebulaBackdrop() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.z = s.clock.elapsedTime * 0.018;
  });
  return (
    <mesh ref={ref} position={[0, 0, -18]} scale={[42, 42, 1]}>
      <planeGeometry args={[1, 1, 64, 64]} />
      <MeshDistortMaterial
        color="#2b1f4d"
        speed={2.4}
        distort={0.35}
        radius={0.9}
        opacity={0.35}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

function Effects() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={0.95}
        luminanceThreshold={0.12}
        luminanceSmoothing={0.9}
        blendFunction={BlendFunction.ADD}
      />
      <Vignette darkness={0.62} eskil={false} offset={0.12} />
    </EffectComposer>
  );
}

function Scene({ scroll, skipHeavyPost }: { scroll: number; skipHeavyPost: boolean }) {
  const count = useMemo(() => starCount(), []);

  return (
    <>
      <color attach="background" args={['#000008']} />
      <ambientLight intensity={0.06} />
      <pointLight position={[6, 6, 6]} intensity={0.55} color="#FF3CAC" />
      <pointLight position={[-6, -4, 4]} intensity={0.45} color="#2B86C5" />

      <Stars radius={140} depth={70} count={count} factor={4.2} saturation={0} fade speed={0.35} />
      <NebulaBackdrop />
      <FloatingOrbs scroll={scroll} />

      {!skipHeavyPost && (
        <Suspense fallback={null}>
          <Effects />
        </Suspense>
      )}
    </>
  );
}

/**
 * Fixed full-window R3F scene: stars, nebula distort, orbit wire meshes, bloom.
 */
export function CosmicCanvas() {
  const scroll = useLenisScrollProgress();
  const skipHeavyPost = useSkipHeavyPost();
  const dprCap =
    typeof window !== 'undefined' ? Math.min(window.devicePixelRatio ?? 1, 1.2) : 1;

  return (
    <div
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 'var(--z-canvas)', background: '#000008' }}
      aria-hidden
    >
      <Canvas
        camera={{ position: [0, 0, 9], fov: 72 }}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
        }}
        dpr={[1, dprCap]}
      >
        <Scene scroll={scroll} skipHeavyPost={skipHeavyPost} />
      </Canvas>
    </div>
  );
}
