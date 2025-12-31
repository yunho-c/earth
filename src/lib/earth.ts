import {
	ACESFilmicToneMapping,
	Clock,
	DirectionalLight,
	Group,
	Mesh,
	MeshStandardNodeMaterial,
	NoColorSpace,
	PerspectiveCamera,
	Scene,
	SphereGeometry,
	SRGBColorSpace,
	TextureLoader,
	Vector3,
	WebGPURenderer
} from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { float, mix, normalMap, texture } from 'three/tsl';

type StatusHandler = (message: string) => void;

const makeSolidTextureDataUrl = (hex: string) => {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="${hex}"/></svg>`;
	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const makeTwoToneTextureDataUrl = (left: string, right: string) => {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4" height="2"><rect width="2" height="2" fill="${left}"/><rect x="2" width="2" height="2" fill="${right}"/></svg>`;
	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const placeholderAlbedoUrl = makeSolidTextureDataUrl('#1e5aa8');
const placeholderSpecularUrl = makeTwoToneTextureDataUrl('#ffffff', '#000000');
const placeholderNormalUrl = makeSolidTextureDataUrl('#8080ff');

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
	const [albedo, specular, normal] = await Promise.all([
		loader.loadAsync(placeholderAlbedoUrl),
		loader.loadAsync(placeholderSpecularUrl),
		loader.loadAsync(placeholderNormalUrl)
	]);
	albedo.colorSpace = SRGBColorSpace;
	specular.colorSpace = NoColorSpace;
	normal.colorSpace = NoColorSpace;

	const earthGroup = new Group();
	scene.add(earthGroup);

	const geometry = new SphereGeometry(1, 64, 64);
	const material = new MeshStandardNodeMaterial();
	material.colorNode = texture(albedo);
	material.roughnessNode = mix(float(0.9), float(0.2), texture(specular).r);
	material.normalNode = normalMap(texture(normal));
	material.metalness = 0;

	const earthMesh = new Mesh(geometry, material);
	earthGroup.add(earthMesh);

	const sun = new DirectionalLight(0xffffff, 1.2);
	sun.position.set(5, 3, 5);
	scene.add(sun);

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
		specular.dispose();
		normal.dispose();
		renderer.dispose();
		container.removeChild(renderer.domElement);
	};
};
