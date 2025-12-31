import {
	ACESFilmicToneMapping,
	Clock,
	Group,
	Mesh,
	MeshStandardNodeMaterial,
	PerspectiveCamera,
	Scene,
	SphereGeometry,
	SRGBColorSpace,
	TextureLoader,
	Vector3,
	WebGPURenderer
} from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { texture } from 'three/tsl';

type StatusHandler = (message: string) => void;

const makeSolidTextureDataUrl = (hex: string) => {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="${hex}"/></svg>`;
	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const placeholderAlbedoUrl = makeSolidTextureDataUrl('#1e5aa8');

export const initEarth = async (container: HTMLElement, setStatus: StatusHandler) => {
	if (!('gpu' in navigator)) {
		setStatus('WebGPU is not available in this browser.');
		return () => undefined;
	}

	setStatus('Initializing WebGPU renderer...');

	const renderer = new WebGPURenderer({ antialias: true, alpha: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.toneMapping = ACESFilmicToneMapping;
	renderer.outputColorSpace = SRGBColorSpace;

	container.appendChild(renderer.domElement);
	await renderer.init();

	const scene = new Scene();
	const camera = new PerspectiveCamera(45, 1, 0.1, 100);
	camera.position.set(0, 0, 3);

	const controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.autoRotate = true;
	controls.autoRotateSpeed = 0.4;
	controls.enablePan = false;

	const loader = new TextureLoader();
	const albedo = await loader.loadAsync(placeholderAlbedoUrl);
	albedo.colorSpace = SRGBColorSpace;

	const earthGroup = new Group();
	scene.add(earthGroup);

	const geometry = new SphereGeometry(1, 64, 64);
	const material = new MeshStandardNodeMaterial();
	material.colorNode = texture(albedo);

	const earthMesh = new Mesh(geometry, material);
	earthGroup.add(earthMesh);

	const clock = new Clock();
	let frameId = 0;

	const resize = () => {
		const { width, height } = container.getBoundingClientRect();
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		renderer.setSize(width, height, false);
	};

	const onFrame = () => {
		const delta = clock.getDelta();
		earthGroup.rotation.y += delta * 0.2;
		controls.update();
		renderer.render(scene, camera);
		frameId = requestAnimationFrame(onFrame);
	};

	const resizeObserver = new ResizeObserver(resize);
	resizeObserver.observe(container);
	resize();
	setStatus('');
	onFrame();

	return () => {
		cancelAnimationFrame(frameId);
		resizeObserver.disconnect();
		controls.dispose();
		geometry.dispose();
		material.dispose();
		albedo.dispose();
		renderer.dispose();
		container.removeChild(renderer.domElement);
	};
};
