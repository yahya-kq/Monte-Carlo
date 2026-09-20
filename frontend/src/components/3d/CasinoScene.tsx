'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const CasinoScene: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera & Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 11);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // 2. Studio Lighting for High-End Monaco Light Theme
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    scene.add(ambientLight);

    // Warm Sun Key Light
    const keyLight = new THREE.DirectionalLight(0xfffbeb, 2.6);
    keyLight.position.set(6, 10, 8);
    scene.add(keyLight);

    // Golden Rim Fill Light
    const goldFill = new THREE.PointLight(0xf59e0b, 3.5, 25);
    goldFill.position.set(-7, 4, 6);
    scene.add(goldFill);

    // Crisp Cool Specular Accent Light
    const coolRim = new THREE.PointLight(0x38bdf8, 2.0, 20);
    coolRim.position.set(7, -5, 5);
    scene.add(coolRim);

    // Master Group for All Full-Page 3D Elements
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Texture Generator Helpers (Procedural High-Res Canvas)
    const disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];

    // Helper: Create Authentic Casino Chip Texture
    const createChipTexture = (
      baseColor: string,
      accentColor: string,
      denomination: string,
      tierName: string
    ): THREE.CanvasTexture => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;

      // Background disc
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.arc(256, 256, 250, 0, Math.PI * 2);
      ctx.fill();

      // Outer serrated edge notches (12 casino stripes)
      const notches = 12;
      for (let i = 0; i < notches; i++) {
        const angle = (i / notches) * Math.PI * 2;
        ctx.save();
        ctx.translate(256, 256);
        ctx.rotate(angle);
        ctx.fillStyle = i % 2 === 0 ? accentColor : '#ffffff';
        ctx.fillRect(205, -16, 45, 32);
        ctx.restore();
      }

      // Metallic Gold Outer Ring
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(256, 256, 195, 0, Math.PI * 2);
      ctx.stroke();

      // Inner Cream Inlay
      ctx.fillStyle = '#fafaf9';
      ctx.beginPath();
      ctx.arc(256, 256, 175, 0, Math.PI * 2);
      ctx.fill();

      // Subtle Inlay Gold Filigree Border
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(256, 256, 160, 0, Math.PI * 2);
      ctx.stroke();

      // Star Accents
      ctx.fillStyle = '#d97706';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★  MONTE CARLO  ★', 256, 145);

      // Denomination (Auto-scaled for USD & PKR denominations like $10k, PKR 500k, PKR 1M)
      ctx.fillStyle = '#78350f';
      const denomLength = denomination.length;
      const denomFontSize = denomLength > 7 ? 44 : denomLength > 5 ? 52 : 64;
      ctx.font = `900 ${denomFontSize}px sans-serif`;
      ctx.fillText(denomination, 256, 235);

      // Sub-label
      ctx.fillStyle = '#92400e';
      const tierFontSize = tierName.length > 14 ? 16 : 19;
      ctx.font = `bold ${tierFontSize}px sans-serif`;
      ctx.fillText(tierName, 256, 315);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      disposables.push(texture);
      return texture;
    };

    // Helper: Create Casino Chip Edge Texture
    const createChipEdgeTexture = (baseColor: string, accentColor: string): THREE.CanvasTexture => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, 1024, 64);

      const stripes = 24;
      const stripeWidth = 1024 / stripes;
      for (let i = 0; i < stripes; i++) {
        if (i % 2 === 0) {
          ctx.fillStyle = accentColor;
          ctx.fillRect(i * stripeWidth, 0, stripeWidth * 0.5, 64);
        }
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      disposables.push(texture);
      return texture;
    };

    // Helper: Create Playing Card Texture
    const createCardTexture = (suit: '♠' | '♥' | '♦' | '♣', value: string): THREE.CanvasTexture => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 768;
      const ctx = canvas.getContext('2d')!;

      // Crisp card background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 512, 768);

      // Outer gold filigree border
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 10;
      ctx.strokeRect(20, 20, 472, 728);

      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 4;
      ctx.strokeRect(34, 34, 444, 700);

      const isRed = suit === '♥' || suit === '♦';
      ctx.fillStyle = isRed ? '#dc2626' : '#0f172a';

      // Corner index (top-left)
      ctx.font = '900 68px serif';
      ctx.textAlign = 'left';
      ctx.fillText(value, 55, 100);
      ctx.font = '54px serif';
      ctx.fillText(suit, 55, 160);

      // Center giant suit
      ctx.font = '190px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(suit, 256, 384);

      // Corner index (bottom-right rotated)
      ctx.save();
      ctx.translate(512 - 55, 768 - 100);
      ctx.rotate(Math.PI);
      ctx.font = '900 68px serif';
      ctx.textAlign = 'left';
      ctx.fillText(value, 0, 0);
      ctx.font = '54px serif';
      ctx.fillText(suit, 0, 60);
      ctx.restore();

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      disposables.push(texture);
      return texture;
    };

    // Helper: Create Translucent Dice Face Texture with Engraved Pips
    const createDiceFaceTexture = (pips: number, isRuby: boolean): THREE.CanvasTexture => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;

      // Acrylic base color
      ctx.fillStyle = isRuby ? '#dc2626' : '#d97706';
      ctx.fillRect(0, 0, 256, 256);

      // Inner border
      ctx.strokeStyle = isRuby ? '#ef4444' : '#f59e0b';
      ctx.lineWidth = 12;
      ctx.strokeRect(8, 8, 240, 240);

      // Engraved pip coordinates
      const pipMap: Record<number, [number, number][]> = {
        1: [[128, 128]],
        2: [[68, 68], [188, 188]],
        3: [[68, 68], [128, 128], [188, 188]],
        4: [[68, 68], [188, 68], [68, 188], [188, 188]],
        5: [[68, 68], [188, 68], [128, 128], [68, 188], [188, 188]],
        6: [[68, 68], [188, 68], [68, 128], [188, 128], [68, 188], [188, 188]],
      };

      ctx.fillStyle = '#ffffff';
      const coords = pipMap[pips] || [];
      coords.forEach(([px, py]) => {
        ctx.beginPath();
        ctx.arc(px, py, 22, 0, Math.PI * 2);
        ctx.fill();

        // Pip depth bevel
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 3;
        ctx.stroke();
      });

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      disposables.push(texture);
      return texture;
    };

    // 3. Build Floating 3D Casino Chips Across the Viewport
    const chipGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.16, 48);
    disposables.push(chipGeo);

    interface FloatingItem {
      mesh: THREE.Object3D;
      rotSpeed: { x: number; y: number; z: number };
      floatSpeed: number;
      floatAmplitude: number;
      baseY: number;
      phase: number;
    }

    const animatedItems: FloatingItem[] = [];

    const chipConfigs = [
      {
        baseColor: '#b91c1c',
        accentColor: '#f59e0b',
        denom: '$10k',
        tier: 'US EQUITIES (USD)',
        pos: [-5.0, 2.3, 0.5],
        rot: [0.6, 0.4, 0.3],
        scale: 1.15,
      },
      {
        baseColor: '#047857',
        accentColor: '#fbbf24',
        denom: 'PKR 500k',
        tier: 'PSX PAKISTAN (PKR)',
        pos: [5.2, 2.1, 0.8],
        rot: [-0.5, 0.8, -0.4],
        scale: 1.15,
      },
      {
        baseColor: '#1d4ed8',
        accentColor: '#fde047',
        denom: '$25k',
        tier: 'WALL STREET',
        pos: [-5.3, -2.1, 1.2],
        rot: [0.7, -0.5, 0.2],
        scale: 1.2,
      },
      {
        baseColor: '#1e293b',
        accentColor: '#d97706',
        denom: 'PKR 1M',
        tier: 'PSX TITANS',
        pos: [5.1, -2.2, 0.4],
        rot: [-0.6, -0.6, 0.5],
        scale: 1.15,
      },
      {
        baseColor: '#b45309',
        accentColor: '#ffffff',
        denom: '$100k',
        tier: 'HIGH ROLLER (USD)',
        pos: [0.0, -3.4, 1.5],
        rot: [1.1, 0.2, 0.4],
        scale: 1.0,
      },
      {
        baseColor: '#0f766e',
        accentColor: '#fed7aa',
        denom: 'PKR 100k',
        tier: 'KARACHI 100',
        pos: [-2.8, 3.2, -1.0],
        rot: [0.4, 0.9, -0.2],
        scale: 0.9,
      },
      {
        baseColor: '#475569',
        accentColor: '#f8fafc',
        denom: '$5,000',
        tier: 'NASDAQ TECH',
        pos: [3.2, 3.1, -1.2],
        rot: [-0.3, 0.6, 0.3],
        scale: 0.9,
      },
    ];

    chipConfigs.forEach((cfg, idx) => {
      const faceTex = createChipTexture(cfg.baseColor, cfg.accentColor, cfg.denom, cfg.tier);
      const edgeTex = createChipEdgeTexture(cfg.baseColor, cfg.accentColor);

      const sideMat = new THREE.MeshStandardMaterial({
        map: edgeTex,
        metalness: 0.6,
        roughness: 0.3,
      });
      const faceMat = new THREE.MeshStandardMaterial({
        map: faceTex,
        metalness: 0.5,
        roughness: 0.25,
      });

      disposables.push(sideMat, faceMat);

      // Cylinder materials: [side, top, bottom]
      const chipMesh = new THREE.Mesh(chipGeo, [sideMat, faceMat, faceMat]);
      chipMesh.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
      chipMesh.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
      chipMesh.scale.setScalar(cfg.scale);

      rootGroup.add(chipMesh);

      animatedItems.push({
        mesh: chipMesh,
        rotSpeed: {
          x: 0.004 * (idx % 2 === 0 ? 1 : -1),
          y: 0.007 * (idx % 2 === 0 ? 1 : -1),
          z: 0.003 * (idx % 3 === 0 ? 1 : -1),
        },
        floatSpeed: 1.2 + (idx % 3) * 0.3,
        floatAmplitude: 0.12 + (idx % 2) * 0.08,
        baseY: cfg.pos[1],
        phase: idx * 1.3,
      });
    });

    // 4. Build Tumbling Translucent Acrylic Casino Dice
    const diceGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    disposables.push(diceGeo);

    const makeDiceMesh = (isRuby: boolean) => {
      const mats: THREE.MeshStandardMaterial[] = [];
      for (let f = 1; f <= 6; f++) {
        const tex = createDiceFaceTexture(f, isRuby);
        const mat = new THREE.MeshStandardMaterial({
          map: tex,
          metalness: 0.3,
          roughness: 0.15,
          transparent: true,
          opacity: 0.92,
        });
        mats.push(mat);
        disposables.push(mat);
      }
      return new THREE.Mesh(diceGeo, mats);
    };

    const diceConfigs = [
      { pos: [3.2, 0.4, 2.0], rot: [0.8, 0.5, 0.2], ruby: true, scale: 0.9 },
      { pos: [3.9, 0.9, 1.8], rot: [1.2, 0.9, 0.4], ruby: true, scale: 0.85 },
      { pos: [-3.4, -0.6, 2.2], rot: [0.5, 1.1, 0.7], ruby: false, scale: 0.9 },
      { pos: [-4.1, -0.1, 1.9], rot: [0.9, 0.4, 1.3], ruby: false, scale: 0.85 },
    ];

    diceConfigs.forEach((dcfg, idx) => {
      const dieMesh = makeDiceMesh(dcfg.ruby);
      dieMesh.position.set(dcfg.pos[0], dcfg.pos[1], dcfg.pos[2]);
      dieMesh.rotation.set(dcfg.rot[0], dcfg.rot[1], dcfg.rot[2]);
      dieMesh.scale.setScalar(dcfg.scale);

      rootGroup.add(dieMesh);

      animatedItems.push({
        mesh: dieMesh,
        rotSpeed: {
          x: 0.012 * (idx % 2 === 0 ? 1 : -1),
          y: 0.015 * (idx % 2 === 0 ? 1 : -1),
          z: 0.009 * (idx % 3 === 0 ? 1 : -1),
        },
        floatSpeed: 1.5 + idx * 0.2,
        floatAmplitude: 0.18,
        baseY: dcfg.pos[1],
        phase: idx * 2.1,
      });
    });

    // 5. Build Floating 3D Playing Cards (Aces)
    const cardGeo = new THREE.PlaneGeometry(1.4, 2.1);
    disposables.push(cardGeo);

    const cardConfigs: { suit: '♠' | '♥' | '♦' | '♣'; val: string; pos: [number, number, number]; rot: [number, number, number] }[] = [
      { suit: '♠', val: 'A', pos: [2.5, -1.8, 0.6], rot: [0.3, -0.5, 0.15] },
      { suit: '♦', val: 'A', pos: [-2.6, 1.8, 0.8], rot: [-0.4, 0.4, -0.2] },
      { suit: '♥', val: 'K', pos: [-1.8, -2.8, -0.8], rot: [0.5, 0.3, 0.4] },
      { suit: '♣', val: 'A', pos: [2.2, 2.6, -0.9], rot: [-0.2, -0.6, -0.1] },
    ];

    cardConfigs.forEach((ccfg, idx) => {
      const cardTex = createCardTexture(ccfg.suit, ccfg.val);
      const cardMat = new THREE.MeshStandardMaterial({
        map: cardTex,
        side: THREE.DoubleSide,
        metalness: 0.2,
        roughness: 0.2,
        transparent: true,
        opacity: 0.95,
      });
      disposables.push(cardMat);

      const cardMesh = new THREE.Mesh(cardGeo, cardMat);
      cardMesh.position.set(ccfg.pos[0], ccfg.pos[1], ccfg.pos[2]);
      cardMesh.rotation.set(ccfg.rot[0], ccfg.rot[1], ccfg.rot[2]);

      rootGroup.add(cardMesh);

      animatedItems.push({
        mesh: cardMesh,
        rotSpeed: {
          x: 0.003 * (idx % 2 === 0 ? 1 : -1),
          y: 0.005 * (idx % 2 === 0 ? 1 : -1),
          z: 0.002 * (idx % 3 === 0 ? 1 : -1),
        },
        floatSpeed: 1.0 + idx * 0.2,
        floatAmplitude: 0.14,
        baseY: ccfg.pos[1],
        phase: idx * 1.7,
      });
    });

    // 6. Flowing Stochastic Monte Carlo Probability Wave Ribbons
    const ribbonPointsCount = 60;
    const ribbonCount = 3;
    const ribbonCurves: THREE.Line[] = [];

    for (let r = 0; r < ribbonCount; r++) {
      const positions = new Float32Array(ribbonPointsCount * 3);
      for (let i = 0; i < ribbonPointsCount; i++) {
        const x = -8 + (i / ribbonPointsCount) * 16;
        const y = Math.sin(x * 0.6 + r * 1.5) * 1.2 - 1.5 + r * 0.6;
        const z = -2.0 + r * 0.8;
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
      }

      const ribbonGeo = new THREE.BufferGeometry();
      ribbonGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      disposables.push(ribbonGeo);

      const ribbonMat = new THREE.LineBasicMaterial({
        color: r === 0 ? 0xd97706 : r === 1 ? 0x059669 : 0xf59e0b,
        transparent: true,
        opacity: 0.45 - r * 0.1,
        linewidth: 2,
      });
      disposables.push(ribbonMat);

      const ribbonLine = new THREE.Line(ribbonGeo, ribbonMat);
      rootGroup.add(ribbonLine);
      ribbonCurves.push(ribbonLine);
    }

    // 7. Sparkling Golden Brownian Particle Dust
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const goldColor = new THREE.Color(0xd97706);
    const champagneColor = new THREE.Color(0xf59e0b);
    const pearlColor = new THREE.Color(0x94a3b8);

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 18;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 8;

      const col = i % 3 === 0 ? goldColor : i % 3 === 1 ? champagneColor : pearlColor;
      particleColors[i * 3] = col.r;
      particleColors[i * 3 + 1] = col.g;
      particleColors[i * 3 + 2] = col.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    disposables.push(particleGeo);

    const particleMat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
    });
    disposables.push(particleMat);

    const particles = new THREE.Points(particleGeo, particleMat);
    rootGroup.add(particles);

    // 8. Full-Page Interactive Mouse Parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      mouseX = (event.clientX - halfW) * 0.0006;
      mouseY = (event.clientY - halfH) * 0.0006;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // 9. Animation Loop
    let animationFrameId: number;
    const startTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = (performance.now() - startTime) / 1000;

      // Smooth mouse camera parallax across the whole page
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      camera.position.x = targetX * 3.5;
      camera.position.y = -targetY * 2.5;
      camera.lookAt(0, 0, 0);

      // Animate floating chips, dice, and cards
      animatedItems.forEach((item) => {
        item.mesh.rotation.x += item.rotSpeed.x;
        item.mesh.rotation.y += item.rotSpeed.y;
        item.mesh.rotation.z += item.rotSpeed.z;
        item.mesh.position.y = item.baseY + Math.sin(elapsed * item.floatSpeed + item.phase) * item.floatAmplitude;
      });

      // Animate stochastic Brownian curves
      ribbonCurves.forEach((line, idx) => {
        const posAttr = line.geometry.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        for (let i = 0; i < ribbonPointsCount; i++) {
          const x = arr[i * 3];
          arr[i * 3 + 1] = Math.sin(x * 0.7 + elapsed * 1.2 + idx * 1.8) * 0.8 - 1.5 + idx * 0.5;
        }
        posAttr.needsUpdate = true;
      });

      // Ambient particle motion
      particles.rotation.y = elapsed * 0.02;
      particles.rotation.x = Math.sin(elapsed * 0.03) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);

      disposables.forEach((item) => item.dispose());

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden"
    />
  );
};
