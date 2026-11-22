import * as T from "three";
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  HueSaturationEffect,
} from "postprocessing";
/** Keep the bloom target small; recompute its size only when the canvas changes. */
export function roomEffects(
  renderer: T.WebGLRenderer,
  scene: T.Scene,
  camera: T.Camera,
) {
  const composer = new EffectComposer(renderer, {
    frameBufferType: T.HalfFloatType,
  });
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(
    new EffectPass(
      camera,
      new BloomEffect({
        intensity: 0.4,
        luminanceThreshold: 1.08,
        mipmapBlur: true,
        resolutionScale: 0.4,
      }),
      new HueSaturationEffect({ saturation: 0.07 }),
    ),
  );
  let width = 0,
    height = 0;
  return () => {
    const canvas = renderer.domElement;
    if (width !== canvas.clientWidth || height !== canvas.clientHeight) {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      composer.setSize(width, height, false);
    }
    composer.render();
  };
}
