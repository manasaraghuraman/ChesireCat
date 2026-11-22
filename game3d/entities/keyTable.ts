/**
 * File: game3d/entities/keyTable.ts
 * Purpose: The glass table in the Hall of Doors holding the Golden Key slot. Four sockets show which
 *          key pieces are earned (gold) or missing (empty). Earned pieces float gently. Reads only.
 * Date: 2026-11-21
 */
import * as THREE from "three";
import { KEY_PIECES } from "../../lib/constants";
import type { KeyPieceType } from "../../lib/schemas";
import { flatMaterial } from "../scenery";
import { KEY_HEIGHT } from "../sizing";

const TABLE_WIDTH = 1.6;
const TABLE_DEPTH = 1.0;
const TOP_THICKNESS = 0.05;
const LEG = 0.06;
const SOCKET_SPACING = 0.32;
const BOB_HEIGHT = 0.03;

export interface KeyTable {
  readonly group: THREE.Group;
  setEarned(keys: readonly KeyPieceType[]): void;
  update(elapsed: number, reducedMotion: boolean): void;
}

export function createKeyTable(position: readonly [number, number, number]): KeyTable {
  const group = new THREE.Group();
  group.position.set(position[0], 0, position[2]);
  const topY = KEY_HEIGHT - 0.075; // the key slot sits exactly at KEY_HEIGHT

  const glass = flatMaterial(0xbfe6ff, { transparent: true, opacity: 0.35, roughness: 0.05 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(TABLE_WIDTH, TOP_THICKNESS, TABLE_DEPTH), glass);
  top.position.y = topY;
  group.add(top);
  const legGeometry = new THREE.BoxGeometry(LEG, topY, LEG);
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      const leg = new THREE.Mesh(legGeometry, glass);
      leg.position.set((x * (TABLE_WIDTH - LEG)) / 2, topY / 2, (z * (TABLE_DEPTH - LEG)) / 2);
      group.add(leg);
    }
  }

  const emptyMaterial = flatMaterial(0x3a3346);
  const goldMaterial = flatMaterial(0xffc83d, { emissive: 0x7a5200, metalness: 0.4, roughness: 0.4 });
  const socketGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.03, 16);
  const pieceGeometry = new THREE.TorusGeometry(0.07, 0.025, 8, 16);
  const pieces = new Map<KeyPieceType, THREE.Mesh>();
  KEY_PIECES.forEach((piece, index) => {
    const x = (index - (KEY_PIECES.length - 1) / 2) * SOCKET_SPACING;
    const socket = new THREE.Mesh(socketGeometry, emptyMaterial);
    socket.position.set(x, topY + TOP_THICKNESS / 2 + 0.015, 0);
    group.add(socket);
    const mesh = new THREE.Mesh(pieceGeometry, goldMaterial);
    mesh.position.set(x, KEY_HEIGHT, 0);
    mesh.visible = false;
    group.add(mesh);
    pieces.set(piece, mesh);
  });

  return {
    group,
    setEarned(keys) {
      pieces.forEach((mesh, piece) => (mesh.visible = keys.includes(piece)));
    },
    update(elapsed, reducedMotion) {
      if (reducedMotion) return;
      let i = 0;
      pieces.forEach((mesh) => {
        mesh.position.y = KEY_HEIGHT + Math.sin(elapsed * 2 + i++) * BOB_HEIGHT;
        mesh.rotation.y = elapsed;
      });
    },
  };
}
