# TODOs

## Milestone 1: The Marble
- [x] Initialize Vite + Three.js project.
- [x] Configure `WebGPURenderer` with `await renderer.init()`.
- [x] Render a basic sphere with the Day Albedo texture.
- [x] Implement `OrbitControls` with auto-rotation.

## Milestone 2: The Wet Planet
- [x] Apply the Normal map for mountains/trenches.
- [x] Apply the Specular map to `roughnessNode`.
- [x] Set roughness: ocean 0.2, land 0.9.
- [x] Add a strong `DirectionalLight` for the sun.

## Milestone 3: The Living Planet
- [x] Add TSL day/night mixing for the night lights.
- [x] Add a clouds sphere with faster rotation than Earth.
- [ ] Add cloud shadows on Earth (optional).

## Milestone 4: The Cinematic Polish
- [x] Add Fresnel atmosphere glow using TSL.
- [x] Add WebGPU post-processing with ACESFilmic tone mapping.

## Assets
- [ ] Download NASA Visible Earth maps (albedo, specular, normal/bump, night, clouds).
