import { useEffect, useRef, useState } from "react";
import { MODELS, mbLabel, modelsFor, type Device } from "../../lib/tutor/registry";
import { useModelChoice } from "../../lib/tutor/storage";
import { Icon } from "../Icon";
import { WavyProgress } from "../WavyProgress";
import { useTutor } from "./context";

const mb = (bytes: number) => Math.round(bytes / 1e6);

/** Choosing, downloading and managing the on-device model. Never a gate: every screen has a way out. */
export function Setup() {
  const { engine, setView } = useTutor();
  const { phase, capability } = engine;
  const choice = useModelChoice();
  const [device, setDevice] = useState<Device>(capability?.device ?? "webgpu");
  const [pick, setPick] = useState(engine.suggested);
  const [wasmOk, setWasmOk] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (capability) setDevice(capability.device);
  }, [capability]);
  useEffect(() => {
    if (phase.name === "ready") setPick(phase.model.id);
  }, [phase]);
  useEffect(() => heading.current?.focus({ preventScroll: true }), []);

  if (!capability) return <p className="body-m muted t-pad">Checking what this device can run…</p>;

  const busy = phase.name === "loading" || phase.name === "compiling";
  const options = modelsFor(device);
  const selected = options.find((m) => m.id === pick) ?? options[0];
  const size = selected?.variants[device]?.mb ?? 0;
  const noGpu = capability.device === "wasm";

  if (busy) {
    const pct = phase.name === "loading" ? phase.loaded / Math.max(1, phase.total) : 1;
    return (
      <div className="t-setup">
        <h3 ref={heading} tabIndex={-1} className="headline-s">
          {phase.fromCache ? "Loading the model" : "Downloading the model"}
        </h3>
        <div className="t-card t-download" role="group" aria-label="Download progress">
          <p className="title-m">{phase.model.name}</p>
          <WavyProgress value={pct} label="Download progress" />
          <p className="body-m t-bytes">
            {phase.name === "compiling" ? (
              phase.device === "webgpu" ? (
                "Preparing it for your graphics chip. This takes a few seconds the first time."
              ) : (
                "Preparing it for your processor."
              )
            ) : (
              <>
                <strong>{mb(phase.loaded)} MB</strong> of {mb(phase.total)} MB
                {phase.file && <span className="muted t-file"> {phase.file.split("/").pop()}</span>}
              </>
            )}
          </p>
          <p className="body-s muted">
            {phase.fromCache
              ? "Reading the copy saved in your browser. Nothing is downloaded."
              : "You can keep using the site and the quests while this downloads. It's saved in your browser, so this happens once."}
          </p>
          <div className="t-actions">
            <button type="button" className="btn outlined sm state" onClick={engine.cancel}>
              Cancel
            </button>
            <button type="button" className="btn text sm state" onClick={() => setView({ name: "home" })}>
              Back to quests
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase.name === "ready") {
    return (
      <div className="t-setup">
        <h3 ref={heading} tabIndex={-1} className="headline-s">
          The tutor is ready
        </h3>
        <div className="t-card">
          <p className="title-m">{phase.model.name}</p>
          <p className="body-m">
            Running on {phase.device === "webgpu" ? "your graphics chip (WebGPU)" : "your processor (WASM)"}. Nothing you type leaves your browser.
          </p>
          <div className="t-actions">
            <button type="button" className="btn filled sm state" onClick={() => setView({ name: "home" })}>
              Start learning
            </button>
            <button type="button" className="btn text sm state" onClick={() => void engine.remove()}>
              Remove downloaded model
            </button>
          </div>
        </div>
        <p className="body-s muted t-pad">To switch models, remove this one first. Each model is a separate download.</p>
      </div>
    );
  }

  return (
    <div className="t-setup">
      <h3 ref={heading} tabIndex={-1} className="headline-s">
        Download a tutor model
      </h3>
      <p className="body-m muted">Optional. Quests, the path guide, the tool finder and navigation all work without it.</p>

      <ul className="t-facts body-m">
        <li>
          <Icon name="lock" />
          <span>Runs entirely on your device. Nothing you type leaves your browser.</span>
        </li>
        <li>
          <Icon name="save" />
          <span>Downloads once and is saved in your browser for next time. You can remove it from the tutor's settings menu.</span>
        </li>
        <li>
          <Icon name="battery_charging_full" />
          <span>Uses your {device === "webgpu" ? "graphics chip" : "processor"} and battery while it answers. Small models can be wrong.</span>
        </li>
      </ul>

      {phase.name === "error" && (
        <p className="t-alert error body-m" role="alert">
          <Icon name="error" />
          <span>{phase.message}</span>
        </p>
      )}
      {noGpu && (
        <div className="t-alert body-m">
          <Icon name="memory" />
          <span>
            <strong>{capability.reason}</strong> You can still run the smallest model on your processor. It works, but it's slow: expect several seconds
            before each answer starts.
          </span>
        </div>
      )}
      {capability.lowMemory && (
        <p className="t-alert body-m">
          <Icon name="warning" />
          <span>This device reports {capability.memoryGb} GB of memory. The model may not load, or may slow other apps. The smallest model is safest.</span>
        </p>
      )}
      {capability.metered && (
        <p className="t-alert body-m">
          <Icon name="signal_cellular_alt" />
          <span>You seem to be on mobile data or Data Saver. The download is {mbLabel(size)}; consider waiting for Wi-Fi.</span>
        </p>
      )}

      <fieldset className="t-models">
        <legend className="title-s">Choose a model</legend>
        {options.map((m) => {
          const v = m.variants[device]!;
          return (
            <label key={m.id} className={`t-model state ${pick === m.id ? "picked" : ""}`}>
              <input type="radio" name="tutor-model" checked={pick === m.id} onChange={() => setPick(m.id)} />
              <span className="grow">
                <span className="t-model-name">
                  <span className="title-s">{m.name}</span>
                  {m.recommended && device === "webgpu" && <span className="t-tag label-m">Recommended</span>}
                </span>
                <span className="body-s muted">{m.blurb}</span>
              </span>
              <span className="label-l t-size">{mbLabel(v.mb)}</span>
            </label>
          );
        })}
        {noGpu && MODELS.length > options.length && (
          <p className="body-s muted">The other models need WebGPU. Chrome and Edge on a recent laptop or desktop support it.</p>
        )}
      </fieldset>

      {noGpu && (
        <label className="t-consent body-m">
          <input type="checkbox" checked={wasmOk} onChange={(e) => setWasmOk(e.target.checked)} />
          <span>I understand it will be slow on this device.</span>
        </label>
      )}

      <div className="t-actions">
        <button
          type="button"
          className="btn filled state"
          disabled={!selected || (noGpu && !wasmOk)}
          onClick={() => selected && engine.download(selected.id, device)}
        >
          <Icon name="download" />
          Download {mbLabel(size)}
        </button>
        <button
          type="button"
          className="btn text state"
          onClick={() => {
            if (choice.status !== "downloaded") engine.decline();
            setView({ name: "home" });
          }}
        >
          {noGpu ? "Continue without a model" : "Not now"}
        </button>
      </div>
    </div>
  );
}
