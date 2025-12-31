# TODOs

## Milestone 1: The Marble
- [ ] Initialize Vite + Three.js project.
- [ ] Configure `WebGPURenderer` with `await renderer.init()`.
- [ ] Render a basic sphere with the Day Albedo texture.
- [ ] Implement `OrbitControls` with auto-rotation.

## Milestone 2: The Wet Planet
- [ ] Apply the Normal map for mountains/trenches.
- [ ] Apply the Specular map to `roughnessNode`.
- [ ] Set roughness: ocean 0.2, land 0.9.
- [ ] Add a strong `DirectionalLight` for the sun.

## Milestone 3: The Living Planet
- [ ] Add TSL day/night mixing for the night lights.
- [ ] Add a clouds sphere with faster rotation than Earth.
- [ ] Add cloud shadows on Earth (optional).

## Milestone 4: The Cinematic Polish
- [ ] Add Fresnel atmosphere glow using TSL.
- [ ] Add WebGPU post-processing with ACESFilmic tone mapping.

## Assets
- [ ] Download NASA Visible Earth maps (albedo, specular, normal/bump, night, clouds).
