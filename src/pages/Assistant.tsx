import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link } from "react-router";
import { Icon } from "../components/Icon";
import { Markdown } from "../components/tutor/Markdown";
import { WavyProgress } from "../components/WavyProgress";
import { loadChat, saveChat, type Message } from "../lib/assistant";
import { useOffline } from "../lib/offline";
import { buildChatMessages } from "../lib/tutor/prompt";
import { assistantModelsFor, mbLabel, sizeTier, type Device, type SizeTier } from "../lib/tutor/registry";
import { useModelChoice } from "../lib/tutor/storage";
import { useTutorEngine, type TutorEngine } from "../lib/tutor/useEngine";
import "../styles/assistant.css";
import "../styles/tutor.css";

const TIERS: { tier: SizeTier; title: string; blurb: string }[] = [
  { tier: "compact", title: "Compact", blurb: "Small downloads that start fast. Good for quick questions and simple writing." },
  { tier: "standard", title: "Standard", blurb: "Noticeably better answers. Needs a laptop or desktop with a real graphics chip." },
  { tier: "large", title: "Large", blurb: "The closest to a full assistant that runs in a browser. Big download, and it needs a recent graphics chip with plenty of memory." },
];

const STARTERS = ["Explain a tricky idea in plain words", "Help me draft a polite email", "Check my code for bugs", "Give me a study plan for next week"];

const gb = (mb: number) => `${(mb / 1000).toFixed(1)} GB`;
const mbOf = (bytes: number) => Math.round(bytes / 1e6);

/** Picking, downloading and loading a model. */
function ModelPicker({ engine }: { engine: TutorEngine }) {
  const { phase, capability } = engine;
  const choice = useModelChoice();
  const [device, setDevice] = useState<Device>(capability?.device ?? "webgpu");
  const [pick, setPick] = useState(engine.suggested);
  const [wasmOk, setWasmOk] = useState(false);

  useEffect(() => {
    if (capability) setDevice(capability.device);
  }, [capability]);

  const options = useMemo(() => assistantModelsFor(device), [device]);
  if (!capability) return <p className="body-m muted">Checking what this device can run…</p>;

  const busy = phase.name === "loading" || phase.name === "compiling";
  const noGpu = capability.device === "wasm";
  const selected = options.find((m) => m.id === pick) ?? options.find((m) => m.recommended) ?? options[0];
  const sel = selected?.variants[device];
  const lowOnMemory = !!(sel?.vramMb && capability.memoryGb !== null && sel.vramMb / 1024 > capability.memoryGb * 0.75);

  if (busy) {
    const pct = phase.name === "loading" ? phase.loaded / Math.max(1, phase.total) : 1;
    return (
      <section className="as-card card outlined" aria-label="Download progress">
        <h2 className="title-l">{phase.fromCache ? "Loading the model" : "Downloading the model"}</h2>
        <p className="title-m">{phase.model.name}</p>
        <WavyProgress value={pct} label="Download progress" />
        <p className="body-m">
          {phase.name === "compiling" ? (
            "Preparing it for your device. This takes a few seconds the first time."
          ) : (
            <>
              <strong>{mbOf(phase.loaded)} MB</strong> of {mbOf(phase.total)} MB
            </>
          )}
        </p>
        <p className="body-s muted">
          {phase.fromCache ? "Reading the copy saved in your browser. Nothing is downloaded." : "It's saved in your browser, so this happens once. Keep this tab open."}
        </p>
        <div className="as-actions">
          <button type="button" className="btn outlined sm state" onClick={engine.cancel}>
            Cancel
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="as-picker" aria-labelledby="as-pick">
      <h2 id="as-pick" className="headline-s">
        Choose a model
      </h2>
      <p className="body-m muted measure">
        The model is the assistant's brain. It downloads once, is saved in your browser, and runs on your device. Bigger models answer better but take longer to
        download and need more memory.
      </p>

      {phase.name === "off" && phase.missing && (
        <p className="as-alert body-m" role="alert">
          <Icon name="warning" />
          <span>The model you downloaded earlier isn't on this device any more. Your browser may have cleared it. Download it again to continue.</span>
        </p>
      )}
      {phase.name === "error" && (
        <p className="as-alert error body-m" role="alert">
          <Icon name="error" />
          <span>{phase.message}</span>
        </p>
      )}
      {noGpu && (
        <p className="as-alert body-m">
          <Icon name="memory" />
          <span>
            <strong>{capability.reason}</strong> The smallest model can still run on your processor, but it's slow and much less capable.
          </span>
        </p>
      )}
      {capability.metered && (
        <p className="as-alert body-m">
          <Icon name="signal_cellular_alt" />
          <span>You seem to be on mobile data or Data Saver. Wait for Wi-Fi before downloading.</span>
        </p>
      )}

      {TIERS.map(({ tier, title, blurb }) => {
        const inTier = options.filter((m) => sizeTier(m.variants[device]!.mb) === tier);
        if (!inTier.length) return null;
        return (
          <fieldset key={tier} className="as-tier">
            <legend className="title-m">{title}</legend>
            <p className="body-s muted">{blurb}</p>
            {inTier.map((m) => {
              const v = m.variants[device]!;
              return (
                <label key={m.id} className={`as-model state ${selected?.id === m.id ? "picked" : ""}`}>
                  <input type="radio" name="assistant-model" checked={selected?.id === m.id} onChange={() => setPick(m.id)} />
                  <span className="as-model-body">
                    <span className="as-model-name">
                      <span className="title-s">{m.name}</span>
                      {m.recommended && !noGpu && <span className="as-tag label-m">Recommended</span>}
                      {choice.status === "downloaded" && choice.model === m.id && <span className="as-tag label-m">On this device</span>}
                    </span>
                    <span className="body-s muted">{m.blurb}</span>
                    {v.vramMb && device !== "wasm" && <span className="body-s muted">Needs about {gb(v.vramMb)} of memory on your graphics chip.</span>}
                  </span>
                  <span className="label-l as-size">{mbLabel(v.mb)}</span>
                </label>
              );
            })}
          </fieldset>
        );
      })}

      {lowOnMemory && selected && (
        <p className="as-alert body-m">
          <Icon name="warning" />
          <span>
            This device reports {capability.memoryGb} GB of memory, and {selected.name} may not load or may slow other apps. A smaller model is safer.
          </span>
        </p>
      )}
      {noGpu && (
        <label className="as-consent body-m">
          <input type="checkbox" checked={wasmOk} onChange={(e) => setWasmOk(e.target.checked)} />
          <span>I understand it will be slow on this device.</span>
        </label>
      )}
      <div className="as-actions">
        <button
          type="button"
          className="btn filled state"
          disabled={!selected || (noGpu && !wasmOk)}
          onClick={() => selected && engine.download(selected.id, device)}
        >
          <Icon name="download" />
          Download {selected ? mbLabel(sel?.mb ?? 0) : ""}
        </button>
      </div>
    </section>
  );
}

/** The conversation. */
function Chat({ engine }: { engine: TutorEngine }) {
  const { phase } = engine;
  const [messages, setMessages] = useState<Message[]>(() => loadChat());
  const [draft, setDraft] = useState("");
  const [failed, setFailed] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const { busy } = engine;

  // Save when a question is asked (without the answer still being written) and again when it's done.
  // While an answer streams, `settled` stays null so this doesn't write on every word.
  const latest = useRef(messages);
  latest.current = messages;
  const settled = busy ? null : messages;
  useEffect(() => {
    const m = latest.current;
    saveChat(busy && m.at(-1)?.role === "assistant" ? m.slice(0, -1) : m);
  }, [busy, settled]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages]);

  if (phase.name !== "ready") return null;

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    setFailed(null);
    setDraft("");
    const history = messages;
    setMessages([...history, { role: "user", content: question }, { role: "assistant", content: "" }]);
    try {
      const result = await engine.generate(
        buildChatMessages(history, question),
        (t) => setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: t }]),
        undefined,
        "chat",
      );
      setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: result.text || (result.stopped ? "Stopped." : "") }]);
    } catch (err) {
      // Dropping the empty answer keeps the question, so it can be asked again.
      setMessages((m) => (m.at(-1)?.role === "assistant" && !m.at(-1)!.content ? m.slice(0, -1) : m));
      setFailed(err instanceof Error && err.name === "CancelledError" ? "Stopped." : "The model couldn't answer that. Try again, or ask something shorter.");
    }
    input.current?.focus();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(draft);
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(draft);
    }
  };

  return (
    <section className="as-chat" aria-label="Conversation">
      <div className="as-bar">
        <p className="label-l as-model-chip">
          <Icon name="psychology" size={20} />
          {phase.model.name}
          <span className="muted"> · {phase.device !== "wasm" ? "on your graphics chip" : "on your processor"}</span>
        </p>
        <div className="as-bar-actions">
          <button
            type="button"
            className="btn text sm state"
            disabled={busy || messages.length === 0}
            onClick={() => {
              setMessages([]);
              setFailed(null);
              input.current?.focus();
            }}
          >
            <Icon name="add_comment" />
            New chat
          </button>
          <button type="button" className="btn text sm state" disabled={busy} onClick={() => void engine.remove()} title="Removes the downloaded model so you can pick another">
            <Icon name="swap_horiz" />
            Change model
          </button>
        </div>
      </div>

      <div className="as-thread" role="log" aria-live="polite" aria-label="Messages">
        {messages.length === 0 && (
          <div className="as-empty">
            <p className="title-m">Ask anything</p>
            <p className="body-m muted measure">It runs on your device, so it works offline and nothing you type is sent anywhere.</p>
            <div className="as-starters">
              {STARTERS.map((s) => (
                <button key={s} type="button" className="btn tonal sm state" onClick={() => void send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => {
          const streaming = busy && i === messages.length - 1 && m.role === "assistant";
          return (
            <div key={i} className={`as-msg ${m.role}`}>
              {m.role === "user" ? (
                <p className="body-l as-bubble">{m.content}</p>
              ) : (
                <div className={`as-bubble ${streaming ? "t-streaming" : ""}`} aria-busy={streaming}>
                  {m.content ? <Markdown text={m.content} /> : <p className="body-m muted">Thinking…</p>}
                </div>
              )}
            </div>
          );
        })}
        {failed && (
          <p className="body-m as-error" role="alert">
            {failed}
          </p>
        )}
        <div ref={end} />
      </div>

      <form className="as-composer" onSubmit={onSubmit}>
        <label htmlFor="as-input" className="visually-hidden">
          Message the assistant
        </label>
        <textarea
          id="as-input"
          ref={input}
          rows={2}
          value={draft}
          placeholder="Message the assistant"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
        />
        {busy ? (
          <button type="button" className="btn tonal state" onClick={engine.stop}>
            <Icon name="stop_circle" />
            Stop
          </button>
        ) : (
          <button type="submit" className="btn filled state" disabled={!draft.trim()}>
            <Icon name="send" />
            Send
          </button>
        )}
      </form>
      <p className="body-s muted as-foot">Small models can be wrong, so check anything important. It can't look things up or browse.</p>
    </section>
  );
}

/** A general-purpose assistant that runs on the device and works offline. Not tied to the lessons. */
export function Assistant() {
  const engine = useTutorEngine();
  const off = useOffline();
  const choice = useModelChoice();
  const { capability, resume, phase } = engine;

  // A model downloaded earlier loads straight from the browser's copy.
  useEffect(() => {
    if (capability && choice.status === "downloaded") resume();
  }, [capability, choice.status, resume]);

  return (
    <>
      <header className="page-head">
        <Link to="/offline" className="crumb">
          <Icon name="arrow_back" />
          Offline mode
        </Link>
        <h1 className="display-s">Offline assistant</h1>
        <p className="body-l muted measure">
          A general-purpose AI assistant that runs on your own device. After a one-time download it works with no internet, and what you type never leaves your
          browser. It isn't tied to the lessons, so use it for writing, studying, coding or any question.
        </p>
        <p className={`as-net label-l ${off.online ? "online" : "offline"}`} role="status">
          <Icon name={off.online ? "wifi" : "wifi_off"} size={20} />
          {off.online ? "You're online" : "You're offline"}
        </p>
      </header>
      {phase.name === "ready" ? <Chat engine={engine} /> : <ModelPicker engine={engine} />}
    </>
  );
}
