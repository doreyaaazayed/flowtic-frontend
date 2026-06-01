import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, type ThreeEvent, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { StagePosition } from './stagePosition';
import { buildSeat3DInstances, stage3DPosition, type Seat3DInstance, type SeatMap3DSection } from './seatMap3dLayout';

type Props = {
  sections: SeatMap3DSection[];
  stagePosition: StagePosition;
  sectionVisible?: boolean[];
  selectedSeatIds: number[];
  currency?: string;
  onToggleSeat: (seatId: number, available: boolean) => void;
};

function PitchCenter() {
  return (
    <group position={[0, 0.06, 0]}>
      <mesh receiveShadow>
        <boxGeometry args={[7.5, 0.12, 11]} />
        <meshStandardMaterial color="#1a5c2e" roughness={0.85} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6.8, 10.2]} />
        <meshStandardMaterial color="#22c55e" roughness={0.9} />
      </mesh>
    </group>
  );
}

function StageBlock({ position, center }: { position: [number, number, number]; center?: boolean }) {
  if (center) return <PitchCenter />;
  return (
    <mesh position={position} receiveShadow>
      <boxGeometry args={[12, 0.15, 2.4]} />
      <meshStandardMaterial color="#4c1d95" emissive="#6366f1" emissiveIntensity={0.2} />
    </mesh>
  );
}

function SeatInstances({
  instances,
  selectedSeatIds,
  onToggleSeat,
}: {
  instances: Seat3DInstance[];
  selectedSeatIds: number[];
  onToggleSeat: (seatId: number, available: boolean) => void;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geom = useMemo(() => new THREE.BoxGeometry(0.42, 0.2, 0.42), []);
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        metalness: 0.1,
        roughness: 0.55,
        vertexColors: true,
      }),
    [],
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || !instances.length) return;
    const dummy = new THREE.Object3D();
    const c = new THREE.Color();
    for (let i = 0; i < instances.length; i++) {
      const inst = instances[i];
      const selected = selectedSeatIds.includes(inst.seatId);
      dummy.position.set(inst.position.x, inst.position.y, inst.position.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (!inst.available) c.set('#64748b');
      else if (selected) c.set('#6366f1');
      else c.set(inst.colorHex);
      mesh.setColorAt(i, c);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.count = instances.length;
  }, [instances, selectedSeatIds]);

  useEffect(() => {
    return () => {
      geom.dispose();
      mat.dispose();
    };
  }, [geom, mat]);

  const onPointerDown = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId == null) return;
    const inst = instances[e.instanceId];
    if (inst?.available) onToggleSeat(inst.seatId, true);
  };

  return (
    <instancedMesh
      ref={meshRef}
      args={[geom, mat, Math.max(instances.length, 1)]}
      castShadow
      onPointerDown={onPointerDown}
      frustumCulled={false}
    />
  );
}

function CameraRig({ stagePosition }: { stagePosition: StagePosition }) {
  const { camera } = useThree();
  useEffect(() => {
    const y = stagePosition === 'center' ? 22 : 18;
    const z = stagePosition === 'center' ? 22 : 18;
    camera.position.set(0, y, z);
    camera.lookAt(0, 0, 0);
  }, [camera, stagePosition]);
  return null;
}

function Scene({
  instances,
  stagePosition,
  selectedSeatIds,
  onToggleSeat,
}: {
  instances: Seat3DInstance[];
  stagePosition: StagePosition;
  selectedSeatIds: number[];
  onToggleSeat: (seatId: number, available: boolean) => void;
}) {
  const stagePos = stage3DPosition(stagePosition);
  const isCenter = stagePosition === 'center';

  return (
    <>
      <CameraRig stagePosition={stagePosition} />
      <color attach="background" args={['#0f1419']} />
      <fog attach="fog" args={['#0f1419', 35, 90]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[16, 24, 12]} intensity={1.05} castShadow />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[42, 64]} />
        <meshStandardMaterial color="#1a1f2e" roughness={0.92} />
      </mesh>
      {stagePosition !== 'none' && (
        <StageBlock position={stagePos} center={isCenter} />
      )}
      <SeatInstances
        instances={instances}
        selectedSeatIds={selectedSeatIds}
        onToggleSeat={onToggleSeat}
      />
      <ContactShadows position={[0, 0.02, 0]} opacity={0.4} scale={50} blur={2.5} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={8}
        maxDistance={70}
        maxPolarAngle={Math.PI / 2.08}
        target={[0, 0, 0]}
      />
    </>
  );
}

export function SeatMap3D({
  sections,
  stagePosition,
  sectionVisible,
  selectedSeatIds,
  onToggleSeat,
}: Props) {
  const instances = useMemo(
    () => buildSeat3DInstances(sections, stagePosition, sectionVisible),
    [sections, stagePosition, sectionVisible],
  );

  return (
    <div className="relative w-full">
      <p className="text-xs font-medium text-muted-foreground mb-2">
        3D venue — drag to rotate • scroll to zoom • click seats to select
      </p>
      <div className="relative h-[min(56vh,520px)] min-h-[320px] w-full rounded-xl overflow-hidden ring-1 ring-black/10 dark:ring-white/10 bg-[#0f1419]">
        <Canvas shadows camera={{ position: [0, 22, 22], fov: 42, near: 0.1, far: 200 }}>
          <Suspense fallback={null}>
            <Scene
              instances={instances}
              stagePosition={stagePosition}
              selectedSeatIds={selectedSeatIds}
              onToggleSeat={onToggleSeat}
            />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
