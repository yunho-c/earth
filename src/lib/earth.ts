import {
	ACESFilmicToneMapping,
	AdditiveBlending,
	BackSide,
	Clock,
	DirectionalLight,
	FrontSide,
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
	abs,
	cameraPosition,
	color,
	dot,
	float,
	mix,
	normalMap,
	normalWorld,
	normalWorldGeometry,
	normalize,
	oneMinus,
	pass,
	positionWorld,
	pow,
	smoothstep,
	saturate,
	uv,
	texture,
	uniform,
	vec2,
	vec3,
	vec4,
	luminance,
	length
} from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { rgbShift } from 'three/addons/tsl/display/RGBShiftNode.js';
import { film } from 'three/addons/tsl/display/FilmNode.js';

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
const placeholderStarsUrl = makeSolidTextureDataUrl('#05070d');
const assetUrls = {
	albedo: '/textures/earth_albedo.jpg',
	specular: '/textures/earth_specular.jpg',
	normal: '/textures/earth_normal.jpg',
	lights: '/textures/earth_lights.jpg',
	clouds: '/textures/earth_clouds.jpg',
	stars: '/textures/stars.jpg'
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
	const [albedo, specular, normal, lights, clouds, stars] = await Promise.all([
		loadTexture(loader, assetUrls.albedo, placeholderAlbedoUrl),
		loadTexture(loader, assetUrls.specular, placeholderSpecularUrl),
		loadTexture(loader, assetUrls.normal, placeholderNormalUrl),
		loadTexture(loader, assetUrls.lights, placeholderLightsUrl),
		loadTexture(loader, assetUrls.clouds, placeholderCloudsUrl),
		loadTexture(loader, assetUrls.stars, placeholderStarsUrl)
	]);
	albedo.colorSpace = SRGBColorSpace;
	specular.colorSpace = NoColorSpace;
	normal.colorSpace = NoColorSpace;
	lights.colorSpace = SRGBColorSpace;
	clouds.colorSpace = NoColorSpace;
	stars.colorSpace = SRGBColorSpace;

	const earthGroup = new Group();
	scene.add(earthGroup);

	const starGeometry = new SphereGeometry(60, 64, 64);
	const starMaterial = new MeshBasicNodeMaterial({ side: BackSide, depthWrite: false });
	starMaterial.colorNode = texture(stars);
	const starMesh = new Mesh(starGeometry, starMaterial);
	scene.add(starMesh);

	const geometry = new SphereGeometry(1, 64, 64);
	const material = new MeshStandardNodeMaterial();
	const sunDirection = uniform(new Vector3(1, 0, 0));
	const dayColor = texture(albedo);
	const nightColor = texture(lights);
	const sunDot = dot(normalWorldGeometry, sunDirection);
	const dayFactor = smoothstep(float(-0.1), float(0.1), sunDot);
	const nightFactor = oneMinus(dayFactor);

	material.colorNode = dayColor.mul(dayFactor);
	material.emissiveNode = nightColor.mul(nightFactor);
	material.emissiveIntensity = 1.2;
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

	const viewDir = normalize(cameraPosition.sub(positionWorld));
	const ndotv = dot(normalWorld, viewDir);
	const rim = oneMinus(abs(ndotv));
	const rimSoft = smoothstep(float(0.0), float(0.9), rim);
	const rimBand = smoothstep(float(0.25), float(0.9), rim).mul(oneMinus(smoothstep(float(0.88), float(1.0), rim)));
	const rimGlow = pow(rimSoft, float(2.2));
	const horizonHaze = smoothstep(float(0.0), float(0.6), ndotv).mul(float(0.065));
	const dayScatter = smoothstep(float(-0.2), float(0.6), sunDot);

	const atmosphereInnerGeometry = new SphereGeometry(1.02, 64, 64);
	const atmosphereInnerMaterial = new MeshBasicNodeMaterial({
		transparent: true,
		blending: AdditiveBlending,
		depthWrite: false,
		side: FrontSide
	});
	const innerDensity = rimGlow.mul(float(0.25)).add(horizonHaze);
	const innerRimTint = mix(color(0x2f6ac4), color(0xb6e1ff), rimSoft);
	const innerDayTint = mix(color(0x1b3f8a), color(0x86c4ff), dayScatter);
	const innerTint = mix(innerDayTint, innerRimTint, rimSoft);
	atmosphereInnerMaterial.colorNode = innerTint.mul(innerDensity);
	atmosphereInnerMaterial.opacityNode = innerDensity.mul(dayScatter);
	const atmosphereInnerMesh = new Mesh(atmosphereInnerGeometry, atmosphereInnerMaterial);
	earthGroup.add(atmosphereInnerMesh);

	const atmosphereOuterGeometry = new SphereGeometry(1.045, 64, 64);
	const atmosphereOuterMaterial = new MeshBasicNodeMaterial({
		transparent: true,
		blending: AdditiveBlending,
		depthWrite: false,
		side: BackSide
	});
	const outerGlow = pow(rimBand, float(1.7));
	const outerDensity = outerGlow.mul(float(0.33));
	const outerTint = mix(color(0x204a99), color(0x6fb3ff), rimBand);
	atmosphereOuterMaterial.colorNode = outerTint.mul(outerDensity);
	atmosphereOuterMaterial.opacityNode = outerDensity.mul(dayScatter);
	const atmosphereOuterMesh = new Mesh(atmosphereOuterGeometry, atmosphereOuterMaterial);
	earthGroup.add(atmosphereOuterMesh);

	const sun = new DirectionalLight(0xffffff, 1.2);
	sun.position.set(5, 3, 5);
	scene.add(sun);

	const postProcessing = new PostProcessing(renderer);
	const scenePass = pass(scene, camera);
	const sceneColor = scenePass.getTextureNode('output');
	const bloomPass = bloom(sceneColor, 0.55, 0.25, 0.85);
	const glarePass = bloom(sceneColor, 0.9, 0.6, 1.1).mul(vec4(0.65, 0.8, 1.05, 1.0));
	const composite = sceneColor.add(bloomPass).add(glarePass);

	const midtone = mix(vec3(0.5), composite.rgb, float(1.08));
	const tinted = midtone.mul(vec3(0.98, 1.03, 1.06));
	const gammaCurve = pow(saturate(tinted), vec3(0.97));
	const vignette = oneMinus(smoothstep(float(0.35), float(0.8), length(uv().sub(vec2(0.5)))));
	const graded = vec4(gammaCurve.mul(vignette), composite.a);
	const filmGrain = film(graded, float(0.05));
	const lensShift = rgbShift(filmGrain, 0.0016, 0.6);

	postProcessing.outputNode = lensShift;

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
		stars.dispose();
		cloudGeometry.dispose();
		cloudMaterial.dispose();
		starGeometry.dispose();
		starMaterial.dispose();
		atmosphereInnerGeometry.dispose();
		atmosphereInnerMaterial.dispose();
		atmosphereOuterGeometry.dispose();
		atmosphereOuterMaterial.dispose();
		renderer.dispose();
		container.removeChild(renderer.domElement);
	};
};
