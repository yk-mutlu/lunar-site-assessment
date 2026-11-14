// ═══════════════════════════════════════════════════════════════════════
// WaypointSystem.ts
// Numbered Circular Waypoint Markers for 3D Lunar Terrain
// Procedural Canvas Textures, Score Coloring, Result Badges (✔ / ✖)
// ═══════════════════════════════════════════════════════════════════════

import * as THREE from 'three';
import type { CandidateSite } from '@/data/site-scoring-types';
import type { SimulationResult } from '@/components/Simulation/engine/config';

export class WaypointSystem {
  public group: THREE.Group;
  private markersMap: Map<string, { sprite: THREE.Sprite; site: CandidateSite; baseScale: number }>;
  private resultsMap: Record<string, SimulationResult> = {};
  private hoveredId: string | null = null;
  private selectedId: string | null = null;
  private time = 0;

  constructor() {
    this.group = new THREE.Group();
    this.markersMap = new Map();
  }

  // Generate circular badge texture with score color, rank number & optional simulation result badge
  private createWaypointTexture(
    rank: number,
    score: number,
    simResult?: SimulationResult
  ): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 160;
    const ctx = canvas.getContext('2d')!;

    // Score color mapping
    let color = '#34c759'; // green
    if (score < 5.5) color = '#d86c6c'; // red
    else if (score < 7.5) color = '#f59e0b'; // yellow/amber

    const cx = 80;
    const cy = 80;

    // 1. Outer subtle glowing ring
    ctx.beginPath();
    ctx.arc(cx, cy, 62, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.stroke();

    // 2. Semi-transparent backdrop fill
    ctx.beginPath();
    ctx.arc(cx, cy, 54, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20, 22, 28, 0.82)';
    ctx.fill();

    // 3. Inner accent border
    ctx.beginPath();
    ctx.arc(cx, cy, 54, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 4. Centered rank number
    ctx.fillStyle = '#f4f4f6';
    ctx.font = 'bold 50px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${rank}`, cx, cy + 3);

    // 5. Result Badge (✔ / ✖) on upper-right corner if simulated
    if (simResult) {
      const bx = 126;
      const by = 34;
      const brad = 24;

      ctx.beginPath();
      ctx.arc(bx, by, brad, 0, Math.PI * 2);
      ctx.fillStyle = simResult.success ? '#34c759' : '#d86c6c';
      ctx.fill();
      ctx.strokeStyle = '#181a20';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(simResult.success ? '✔' : '✖', bx, by + 1);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  public setSites(sites: CandidateSite[], scene: THREE.Scene) {
    this.clear();

    sites.forEach((site) => {
      const simResult = this.resultsMap[site.id];
      const texture = this.createWaypointTexture(site.rank, site.overallScore, simResult);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.94,
        depthTest: true,
        depthWrite: false,
      });

      const sprite = new THREE.Sprite(material);
      const baseScale = 9.0;
      sprite.scale.set(baseScale, baseScale, 1.0);
      sprite.position.set(site.worldPos.x, site.worldPos.y + 3.0, site.worldPos.z);
      sprite.userData = { siteId: site.id, site };

      this.group.add(sprite);
      this.markersMap.set(site.id, { sprite, site, baseScale });
    });

    if (this.group.parent !== scene) {
      scene.add(this.group);
    }
  }

  public setResults(results: Record<string, SimulationResult>) {
    this.resultsMap = { ...results };

    // Re-generate textures for markers that have simulation results
    this.markersMap.forEach(({ sprite, site }) => {
      const res = results[site.id];
      if (res) {
        const newTex = this.createWaypointTexture(site.rank, site.overallScore, res);
        const oldMat = sprite.material as THREE.SpriteMaterial;
        oldMat.map?.dispose();
        oldMat.map = newTex;
        oldMat.needsUpdate = true;
      }
    });
  }

  public setHovered(id: string | null) {
    this.hoveredId = id;
  }

  public setSelected(id: string | null) {
    this.selectedId = id;
  }

  public update(dt: number, cameraPosition: THREE.Vector3) {
    this.time += dt;

    this.markersMap.forEach(({ sprite, site, baseScale }, id) => {
      const dist = cameraPosition.distanceTo(sprite.position);
      const dynamicScale = Math.max(3.2, Math.min(24.0, (dist / 140.0) * baseScale));

      const isHovered = this.hoveredId === id;
      const isSelected = this.selectedId === id;

      const pulse = Math.sin(this.time * 4.5 + site.rank) * 0.08;
      const targetScale = isHovered
        ? dynamicScale * 1.35
        : isSelected
        ? dynamicScale * 1.25 + pulse
        : dynamicScale + pulse * 0.4;

      sprite.scale.set(targetScale, targetScale, 1.0);

      const mat = sprite.material as THREE.SpriteMaterial;
      if (this.selectedId && !isSelected) {
        mat.opacity = 0.35;
      } else {
        mat.opacity = isHovered ? 1.0 : 0.94;
      }
    });
  }

  public raycast(raycaster: THREE.Raycaster): CandidateSite | null {
    const sprites = Array.from(this.markersMap.values()).map((v) => v.sprite);
    const intersects = raycaster.intersectObjects(sprites, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Sprite;
      return hit.userData.site as CandidateSite;
    }
    return null;
  }

  public clear() {
    this.markersMap.forEach(({ sprite }) => {
      this.group.remove(sprite);
      (sprite.material as THREE.SpriteMaterial).map?.dispose();
      (sprite.material as THREE.Material).dispose();
    });
    this.markersMap.clear();
  }

  public dispose() {
    this.clear();
    this.group.parent?.remove(this.group);
  }
}
