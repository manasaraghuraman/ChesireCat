import type { Settings as Values } from "../save/localSave";
import { chime, enableAudio } from "../audio/cues";
interface Props {
  values: Values;
  change: (settings: Partial<Values>) => void;
}
export function Settings({ values, change }: Props) {
  return (
    <>
      <h2>Settings</h2>
      <label class="check">
        <input
          type="checkbox"
          checked={values.shake}
          onChange={(e) => change({ shake: e.currentTarget.checked })}
        />{" "}
        Screen shake
      </label>
      <label class="setting">
        Mouse sensitivity{" "}
        <output>{(values.sensitivity * 1000).toFixed(1)}</output>
        <input
          type="range"
          min=".0005"
          max=".008"
          step=".0001"
          value={values.sensitivity}
          onInput={(e) =>
            change({ sensitivity: e.currentTarget.valueAsNumber })
          }
        />
      </label>
      <label class="setting">
        Field of view <output>{values.fov}°</output>
        <input
          type="range"
          min="65"
          max="120"
          value={values.fov}
          onInput={(e) => change({ fov: e.currentTarget.valueAsNumber })}
        />
      </label>
      <label class="setting">
        Volume <output>{Math.round(values.volume * 100)}%</output>
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(values.volume * 100)}
          onInput={(e) => {
            enableAudio();
            change({ volume: e.currentTarget.valueAsNumber / 100 });
          }}
          onChange={() => chime(values.volume)}
        />
      </label>
      <label class="check">
        <input
          type="checkbox"
          checked={values.showGhost}
          onChange={(e) => change({ showGhost: e.currentTarget.checked })}
        />{" "}
        Show personal-best ghost
      </label>
      <label class="check">
        <input
          type="checkbox"
          checked={values.invertY}
          onChange={(e) => change({ invertY: e.currentTarget.checked })}
        />{" "}
        Invert vertical look
      </label>
    </>
  );
}
