import {
	ACESFilmicToneMapping,
	AdditiveBlending,
	BackSide,
	Clock,
	DirectionalLight,
	Group,
	Mesh,
	MeshBasicNodeMaterial,
	MeshPhysicalNodeMaterial,
	MeshStandardNodeMaterial,
	NoColorSpace,
	PostProcessing,
	PerspectiveCamera,
	Scene,
	SphereGeometry,
	SRGBColorSpace,
	TextureLoader,
	Vector3,
	WebGPURenderer
} from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
	cameraPosition,
	color,
	dot,
	float,
	mix,
	normalMap,
	normalWorld,
	normalize,
	oneMinus,
	pass,
	positionWorld,
	pow,
	smoothstep,
	texture,
	uniform
} from 'three/tsl';

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
const placeholderLightsUrl = makeSolidTextureDataUrl('#f8c77c');
const placeholderCloudsUrl = makeTwoToneTextureDataUrl('#ffffff', '#3a3a3a');
const assetUrls = {
	albedo: '/textures/earth_albedo.jpg',
	specular: '/textures/earth_specular.jpg',
	normal: '/textures/earth_normal.jpg',
	lights: '/textures/earth_lights.jpg',
	clouds: '/textures/earth_clouds.jpg'
};

const loadTexture = async (loader: TextureLoader, url: string, fallbackUrl: string) => {
	try {
		return await loader.loadAsync(url);
	} catch {
		return await loader.loadAsync(fallbackUrl);
	}
};

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
	renderer.domElement.style.width = '100%';
	renderer.domElement.style.height = '100%';
	renderer.domElement.style.display = 'block';

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
	setStatus('Loading textures...');
	const [albedo, specular, normal, lights, clouds] = await Promise.all([
		loadTexture(loader, assetUrls.albedo, placeholderAlbedoUrl),
		loadTexture(loader, assetUrls.specular, placeholderSpecularUrl),
		loadTexture(loader, assetUrls.normal, placeholderNormalUrl),
		loadTexture(loader, assetUrls.lights, placeholderLightsUrl),
		loadTexture(loader, assetUrls.clouds, placeholderCloudsUrl)
	]);
	albedo.colorSpace = SRGBColorSpace;
	specular.colorSpace = NoColorSpace;
	normal.colorSpace = NoColorSpace;
	lights.colorSpace = SRGBColorSpace;
	clouds.colorSpace = NoColorSpace;

	const earthGroup = new Group();
	scene.add(earthGroup);

	const geometry = new SphereGeometry(1, 64, 64);
	const material = new MeshStandardNodeMaterial();
	const sunDirection = uniform(new Vector3(1, 0, 0));
	const dayColor = texture(albedo);
	const nightColor = texture(lights);
	const sunDot = dot(normalWorld, sunDirection);
	const dayFactor = smoothstep(float(-0.1), float(0.1), sunDot);

	material.colorNode = mix(nightColor, dayColor, dayFactor);
	material.roughnessNode = mix(float(0.9), float(0.2), texture(specular).r);
	material.normalNode = normalMap(texture(normal));
	material.metalness = 0;

	const earthMesh = new Mesh(geometry, material);
	earthGroup.add(earthMesh);

	const cloudGeometry = new SphereGeometry(1.01, 96, 96);
	const cloudMaterial = new MeshPhysicalNodeMaterial({ transparent: true, depthWrite: false });
	const cloudSample = texture(clouds).r;
	const cloudDensity = pow(cloudSample, float(0.6));
	const cloudMask = smoothstep(float(0.35), float(0.8), cloudDensity);
	cloudMaterial.colorNode = color(0xf8fbff).mul(mix(float(0.6), float(1.1), cloudDensity));
	cloudMaterial.opacityNode = cloudMask.mul(float(0.9));
	cloudMaterial.thicknessNode = mix(float(0.06), float(0.28), cloudDensity);
	cloudMaterial.transmission = 0.55;
	cloudMaterial.roughness = 0.9;
	cloudMaterial.metalness = 0;
	cloudMaterial.displacementMap = clouds;
	cloudMaterial.displacementScale = 0.015;

	const cloudMesh = new Mesh(cloudGeometry, cloudMaterial);
	earthGroup.add(cloudMesh);

	const atmosphereGeometry = new SphereGeometry(1.025, 64, 64);
	const atmosphereMaterial = new MeshBasicNodeMaterial({
		transparent: true,
		blending: AdditiveBlending,
		depthWrite: false,
		side: BackSide
	});
	const viewDir = normalize(cameraPosition.sub(positionWorld));
	const rim = oneMinus(dot(viewDir, normalWorld));
	const rimPower = pow(rim, float(3.0));
	atmosphereMaterial.colorNode = color(0x3a92ff).mul(rimPower);
	atmosphereMaterial.opacityNode = rimPower;

	const atmosphereMesh = new Mesh(atmosphereGeometry, atmosphereMaterial);
	earthGroup.add(atmosphereMesh);

	const sun = new DirectionalLight(0xffffff, 1.2);
	sun.position.set(5, 3, 5);
	scene.add(sun);

	const postProcessing = new PostProcessing(renderer);
	postProcessing.outputNode = pass(scene, camera);

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
		cloudMesh.rotation.y += delta * 0.26;
		sunDirection.value.copy(sun.position).normalize();
		controls.update();
		postProcessing.render();
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
		lights.dispose();
		clouds.dispose();
		cloudGeometry.dispose();
		cloudMaterial.dispose();
		atmosphereGeometry.dispose();
		atmosphereMaterial.dispose();
		renderer.dispose();
		container.removeChild(renderer.domElement);
	};
};
