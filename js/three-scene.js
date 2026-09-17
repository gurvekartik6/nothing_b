/* three-scene.js - Three.js 3D scenes */

const ThreeScenes = (() => {

  // ── Loading Screen Scene ──────────────────────────────────────
  let loadingScene, loadingCamera, loadingRenderer, loadingMesh, loadingAnimId;

  function initLoadingScene(canvas) {
    loadingScene = new THREE.Scene();
    loadingCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    loadingCamera.position.z = 3.5;

    loadingRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    loadingRenderer.setSize(200, 200);
    loadingRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    loadingRenderer.setClearColor(0x000000, 0);

    const geom = new THREE.TorusKnotGeometry(1, 0.3, 128, 16);
    const mat = new THREE.MeshPhongMaterial({
      color: 0x7c3aed,
      emissive: 0x3b0764,
      wireframe: false,
      shininess: 100,
    });

    loadingMesh = new THREE.Mesh(geom, mat);
    loadingScene.add(loadingMesh);

    const wireGeom = new THREE.TorusKnotGeometry(1, 0.3, 128, 16);
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true, transparent: true, opacity: 0.25 });
    const wireMesh = new THREE.Mesh(wireGeom, wireMat);
    loadingScene.add(wireMesh);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    loadingScene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xa78bfa, 2, 10);
    pointLight.position.set(2, 2, 2);
    loadingScene.add(pointLight);
    const pointLight2 = new THREE.PointLight(0x22d3ee, 1.5, 10);
    pointLight2.position.set(-2, -2, 1);
    loadingScene.add(pointLight2);

    function animate() {
      loadingAnimId = requestAnimationFrame(animate);
      if (loadingMesh) {
        loadingMesh.rotation.x += 0.012;
        loadingMesh.rotation.y += 0.018;
        wireMesh.rotation.x -= 0.008;
        wireMesh.rotation.y -= 0.014;
      }
      loadingRenderer.render(loadingScene, loadingCamera);
    }
    animate();
  }

  function stopLoadingScene() {
    if (loadingAnimId) cancelAnimationFrame(loadingAnimId);
    if (loadingRenderer) loadingRenderer.dispose();
  }

  // ── Hero Scene ────────────────────────────────────────────────
  let heroScene, heroCamera, heroRenderer, heroAnimId;
  let heroObjects = [];
  let particles;
  let mouse = { x: 0, y: 0 };

  function initHeroScene(canvas, isDark) {
    heroScene = new THREE.Scene();
    heroCamera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    heroCamera.position.z = 18;

    heroRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    heroRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    heroRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    heroRenderer.setClearColor(0x000000, 0);

    // Colors based on theme
    const baseColor = isDark ? 0xa78bfa : 0x7c3aed;
    const accentColor = isDark ? 0x22d3ee : 0x0891b2;

    // Floating geometric shapes
    const shapes = [
      { geom: new THREE.IcosahedronGeometry(1.2, 0), pos: [-6, 3, -5] },
      { geom: new THREE.OctahedronGeometry(0.9, 0), pos: [7, -2, -8] },
      { geom: new THREE.TetrahedronGeometry(1.1, 0), pos: [-9, -4, -6] },
      { geom: new THREE.DodecahedronGeometry(0.8, 0), pos: [5, 5, -10] },
      { geom: new THREE.IcosahedronGeometry(0.7, 0), pos: [10, -1, -4] },
      { geom: new THREE.OctahedronGeometry(1.3, 0), pos: [-4, 6, -12] },
    ];

    shapes.forEach((s, i) => {
      // Solid mesh
      const mat = new THREE.MeshPhongMaterial({
        color: i % 2 === 0 ? baseColor : accentColor,
        emissive: i % 2 === 0 ? 0x2d0f6e : 0x0a3d4f,
        shininess: 80,
        transparent: true,
        opacity: 0.75,
      });
      const mesh = new THREE.Mesh(s.geom, mat);
      mesh.position.set(...s.pos);
      mesh.userData.speed = { x: (Math.random() - 0.5) * 0.003, y: (Math.random() - 0.5) * 0.004, z: 0 };
      mesh.userData.rotSpeed = { x: Math.random() * 0.01, y: Math.random() * 0.012 };
      mesh.userData.floatAmp = Math.random() * 0.5 + 0.3;
      mesh.userData.floatPhase = Math.random() * Math.PI * 2;
      heroScene.add(mesh);

      // Wire overlay
      const wireMat = new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? baseColor : accentColor, wireframe: true, transparent: true, opacity: 0.18 });
      const wireMesh = new THREE.Mesh(s.geom.clone(), wireMat);
      wireMesh.position.set(...s.pos);
      heroScene.add(wireMesh);

      heroObjects.push({ solid: mesh, wire: wireMesh });
    });

    // Particle system
    const particleCount = window.innerWidth < 768 ? 300 : 700;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30 - 5;
    }
    const particleGeom = new THREE.BufferGeometry();
    particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: baseColor,
      size: 0.08,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
    });
    particles = new THREE.Points(particleGeom, particleMat);
    heroScene.add(particles);

    // Lights
    heroScene.add(new THREE.AmbientLight(0xffffff, isDark ? 0.3 : 0.5));
    const pLight1 = new THREE.PointLight(baseColor, 2, 30);
    pLight1.position.set(5, 8, 5);
    heroScene.add(pLight1);
    const pLight2 = new THREE.PointLight(accentColor, 1.5, 25);
    pLight2.position.set(-8, -5, 3);
    heroScene.add(pLight2);

    // Mouse move
    window.addEventListener('mousemove', (e) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    });

    // Resize
    window.addEventListener('resize', () => {
      heroCamera.aspect = canvas.clientWidth / canvas.clientHeight;
      heroCamera.updateProjectionMatrix();
      heroRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    });

    let t = 0;
    function animate() {
      heroAnimId = requestAnimationFrame(animate);
      t += 0.01;

      // Rotate + float objects
      heroObjects.forEach((obj, i) => {
        const d = obj.solid.userData;
        obj.solid.rotation.x += d.rotSpeed.x;
        obj.solid.rotation.y += d.rotSpeed.y;
        obj.wire.rotation.x += d.rotSpeed.x * 0.8;
        obj.wire.rotation.y += d.rotSpeed.y * 0.8;

        // Float
        obj.solid.position.y += Math.sin(t + d.floatPhase) * d.floatAmp * 0.005;
        obj.wire.position.y = obj.solid.position.y;

        // Mouse parallax
        obj.solid.position.x += (mouse.x * (i + 1) * 0.04 - obj.solid.position.x * 0.01) * 0.02;
        obj.wire.position.x = obj.solid.position.x;
      });

      // Particle drift
      particles.rotation.y += 0.0008;
      particles.rotation.x += 0.0003;

      // Camera subtle move
      heroCamera.position.x += (mouse.x * 1.5 - heroCamera.position.x) * 0.04;
      heroCamera.position.y += (mouse.y * 1.0 - heroCamera.position.y) * 0.04;
      heroCamera.lookAt(0, 0, 0);

      heroRenderer.render(heroScene, heroCamera);
    }
    animate();
  }

  function updateHeroTheme(isDark) {
    if (!heroScene) return;
    const baseColor = isDark ? 0xa78bfa : 0x7c3aed;
    const accentColor = isDark ? 0x22d3ee : 0x0891b2;
    heroObjects.forEach((obj, i) => {
      obj.solid.material.color.set(i % 2 === 0 ? baseColor : accentColor);
      obj.wire.material.color.set(i % 2 === 0 ? baseColor : accentColor);
    });
    if (particles) particles.material.color.set(baseColor);
  }

  function stopHeroScene() {
    if (heroAnimId) cancelAnimationFrame(heroAnimId);
    if (heroRenderer) heroRenderer.dispose();
    heroObjects = [];
  }

  return { initLoadingScene, stopLoadingScene, initHeroScene, updateHeroTheme, stopHeroScene };
})();
