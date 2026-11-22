/**
 * File: app/play/page.tsx
 * Purpose: The game: a full-viewport three.js first-person world with the HUD, the Fall pop-up,
 *          level overlays, the browser panel and the pause menu layered over it.
 * Author: manasa
 * Date: 2026-11-21
 */
import CarbonChase from "@/components/CarbonChase";
import BrowserPanel from "@/components/BrowserPanel";
import FallPopup from "@/components/FallPopup";
import Hud from "@/components/Hud";
import LevelOverlay from "@/components/LevelOverlay";
import PauseMenu from "@/components/PauseMenu";
import RabbitBubble from "@/components/RabbitBubble";
import RabbitChat from "@/components/RabbitChat";
import RewindEffect from "@/components/RewindEffect";
import DevPanel from "@/components/DevPanel";
import WorldCanvas from "@/components/WorldCanvas";
import { SCENE_FALL } from "@/lib/constants";

export default function PlayPage() {
  return (
    <main>
      <WorldCanvas startZone={SCENE_FALL} />
      <Hud />
      <BrowserPanel />
      <LevelOverlay />
      <RabbitBubble />
      <RabbitChat />
      <FallPopup />
      <PauseMenu />
      <RewindEffect />
      <DevPanel />
      <CarbonChase />
    </main>
  );
}
