/** Grass, path, and yard dressing. Static — no game state. */
export default function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[16, 48]} />
        <meshStandardMaterial color="#7cb56b" />
      </mesh>

      {/* Front path */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 3.5]}>
        <planeGeometry args={[1.2, 4]} />
        <meshStandardMaterial color="#cbb994" />
      </mesh>

      {/* Bushes */}
      {[[-2.8, 0.4, 1.8], [2.8, 0.4, 1.8]].map((p, i) => (
        <mesh key={i} position={p} castShadow>
          <sphereGeometry args={[0.5, 12, 12]} />
          <meshStandardMaterial color="#4e8f45" flatShading />
        </mesh>
      ))}
    </group>
  )
}
