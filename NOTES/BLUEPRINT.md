This is a comprehensive blueprint designed to be handed off to an AI coding agent (like Cline, Cursor, or a custom script). It explicitly enforces **WebGPU** and **TSL (Three Shading Language)** patterns to avoid legacy WebGL hallucinations.

---

# Project Blueprint: Photorealistic Earth (WebGPU/TSL)

## 1. Project Overview

**Objective:** Create a cinematic, photorealistic 3D Earth visualization using `Three.js` with the `WebGPURenderer`.
**Core Constraint:** Must use the **Node Material system (TSL)** for all custom shaders (Atmosphere, Day/Night blending). Do not use GLSL string injection.
**Performance Target:** 60fps on modern integrated graphics (M-series Mac / Intel Iris) via efficient texture management.

## 2. Asset Acquisition (Source of Truth)

The agent should download these assets first. Do not use random Google Image results; use NASA's **Visible Earth** catalogs.

* **Repository:** [NASA Visible Earth - Blue Marble](https://visibleearth.nasa.gov/collection/1484/blue-marble)
* **Required Maps (Recommended Resolution: 8192x4096 "8k"):**
1. **Albedo (Day):** *Blue Marble: Next Generation* (search for `world.200401.3x21600x10800.jpg` or similar).
2. **Specular/Water Mask:** A black/white mask where white = ocean, black = land. *Use this to drive Roughness (0.0 for water, 1.0 for land).*
3. **Normal/Bump:** *Topography* or *Bathymetry* maps converted to a Normal map (purple) or used as a displacement height map (grayscale).
4. **Night Lights:** *Earth at Night (Black Marble)*.
5. **Clouds:** *Blue Marble: Clouds* (grayscale).



## 3. Architecture & Scene Graph

The scene should be structured as follows to allow independent rotation of clouds and correct blending:

```text
Scene
├── Sun (DirectionalLight)
├── Camera (Perspective)
├── EarthGroup (Group)
│   ├── EarthMesh (SphereGeometry + MeshStandardNodeMaterial)
│   │   └── Logic: Albedo + Bump + Specular + NightLights mixing
│   ├── CloudMesh (SphereGeometry + MeshBasicNodeMaterial)
│   │   └── Logic: Alpha transparency, slightly larger scale (1.01x)
│   └── AtmosphereMesh (SphereGeometry + MeshBasicNodeMaterial)
│       └── Logic: Backside culling, larger scale (1.025x), TSL Fresnel
└── Stars/MilkyWay (Background Mesh or CubeMap)

```

## 4. Technical Implementation Guidelines (TSL)

**Critical for Agent:** All shader logic must use `three/tsl`.

* **Day/Night Cycle Logic:**
* Do not just layer textures.
* Calculate `sunDot = dot(normalWorld, sunDirection)`.
* Use `smoothstep` on `sunDot` to create a terminator line.
* `finalColor = mix(NightTexture, DayTexture, sunDot)`.


* **Atmosphere (The "Glow"):**
* Use a `fresnel` calculation: `pow(1.0 - dot(viewDirection, normalWorld), 3.0)`.
* Color should be strictly added (additive blending) or mixed based on alpha.



---

## 5. Development Milestones

### Milestone 1: The "Marble" (Basic Setup)

* Initialize Vite + Three.js project.
* Configure `WebGPURenderer` (handling the async `await renderer.init()` requirement).
* Render a basic sphere with the **Day Albedo** texture.
* Implement `OrbitControls` with auto-rotation.

### Milestone 2: The "Wet" Planet (PBR & Physics)

* Apply the **Normal Map** for mountains/trenches.
* Apply the **Specular Map** to the `roughnessNode`.
* *Logic:* If pixel is Ocean (White in mask) -> Roughness = 0.2. If Land (Black) -> Roughness = 0.9.


* Add a single strong `DirectionalLight` (The Sun).

### Milestone 3: The "Living" Planet (Shaders)

* **Night Lights:** Implement the TSL node logic to show the night texture *only* on the dark side of the terminator line.
* **Clouds:** Add the second sphere. Animate rotation on the Y-axis slightly faster than the Earth. Apply shadows from clouds onto the Earth (optional, but high impact).

### Milestone 4: The "Cinematic" Polish (Atmosphere)

* Implement the custom Fresnel Atmosphere sphere.
* Add a Post-Processing pass (using `PostProcessing` in WebGPU) for **Tone Mapping** (ACESFilmic) to prevent color blowout on bright clouds.

---

## 6. Actionable Agent TODO List

*Copy and paste the following block directly to your agent.*

```markdown
# TASK: Implement Photorealistic Earth in Three.js (WebGPU)

**Context:**
We are building a high-performance 3D Earth using Three.js and the new WebGPURenderer.
You must use `three/tsl` (Three Shading Language) for all materials. Do not write GLSL strings.

**Steps:**
1.  **Project Setup**
    - [ ] Create a generic Vite project with `three` installed.
    - [ ] Create `main.js`. Initialize `WebGPURenderer`. Ensure you `await` its initialization.
    - [ ] Set pixel ratio to `window.devicePixelRatio`.
    - [ ] Enable `renderer.toneMapping = THREE.ACESFilmicToneMapping`.

2.  **Asset Loading**
    - [ ] Create a `TextureLoader`.
    - [ ] Load placeholder textures (or download NASA assets if capable) for: `albedo`, `specular`, `normal`, `clouds`, `lights`.
    - [ ] Ensure textures are flipped Y if necessary (usually `texture.flipY = false` for glTF, but standard for spheres).

3.  **Earth Mesh (The Surface)**
    - [ ] Create `SphereGeometry(R, 64, 64)`.
    - [ ] Create `MeshStandardNodeMaterial`.
    - [ ] Assign `albedo` texture to `colorNode`.
    - [ ] Create a TSL logic block for Roughness:
          - Sample SpecularMap.
          - Invert it (if Water is White).
          - Assign to `roughnessNode`.
    - [ ] Assign `normal` texture to `normalNode`.

4.  **Day/Night Logic (Advanced TSL)**
    - [ ] Import `mix`, `dot`, `normalWorld`, `positionWorld` from `three/tsl`.
    - [ ] Define a `uniform` for Sun Direction.
    - [ ] Calculate blending factor: `dayFactor = smoothstep(-0.1, 0.1, dot(normalWorld, sunDirection))`.
    - [ ] Mix `NightLights` texture and `DayAlbedo` texture using `dayFactor`.
    - [ ] Assign this mix to `colorNode` (replacing the simple albedo from Step 3).

5.  **Atmosphere (The Glow)**
    - [ ] Create a slightly larger sphere (1.02 scale).
    - [ ] Create `MeshBasicNodeMaterial` with `transparent: true` and `side: THREE.BackSide`.
    - [ ] Use TSL to calculate Fresnel:
          - `viewDir = normalize(cameraPosition - positionWorld)`
          - `rim = 1.0 - dot(viewDir, normalWorld)`
          - `rimPower = pow(rim, 3.0)`
    - [ ] Set `colorNode` to a generic blue (`0x3a92ff`) multiplied by `rimPower`.

6.  **Lighting & Scene**
    - [ ] Add `DirectionalLight` at position (5, 3, 5).
    - [ ] Add `OrbitControls`.
    - [ ] Create the animation loop.

```

### Next Step

Would you like me to simulate the "Agent's" first pass and generate the **`main.js`** file for Milestone 1 and 2 right now, so you have a working skeleton to start with?
