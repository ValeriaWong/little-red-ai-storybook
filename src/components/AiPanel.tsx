import { useState } from 'react';
import { continueStory, generateSceneImage, type InferenceSource } from '../ai';
import { IMAGE_GENERATION_ENABLED, isFirebaseConfigured } from '../firebase';
import type { StoryState } from '../story/story';

function Chip({ source }: { source: InferenceSource }) {
  if (source === 'ON_DEVICE') {
    return <span className="chip chip-device">📱 On device</span>;
  }
  if (source === 'IN_CLOUD') {
    return <span className="chip chip-cloud">☁️ Cloud</span>;
  }
  return null;
}

interface AiPanelProps {
  state: StoryState;
  sceneTitle: string;
  sceneText: string;
}

export default function AiPanel({ state, sceneTitle, sceneText }: AiPanelProps) {
  const [busy, setBusy] = useState(false);
  const [aiText, setAiText] = useState<string | null>(null);
  const [source, setSource] = useState<InferenceSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [genImage, setGenImage] = useState<string | null>(null);
  const [imgBusy, setImgBusy] = useState(false);

  const configured = isFirebaseConfigured();

  async function onContinue() {
    setBusy(true);
    setError(null);
    setAiText(null);
    setSource(null);
    const res = await continueStory(state, sceneTitle, sceneText);
    setBusy(false);
    if (res.text) {
      setAiText(res.text);
      setSource(res.source);
    } else {
      setError(res.error ?? 'Something went wrong.');
      setSource(res.source);
    }
  }

  async function onDraw() {
    setImgBusy(true);
    setError(null);
    const res = await generateSceneImage(sceneTitle, sceneText);
    setImgBusy(false);
    if (res.imageUrl) {
      setGenImage(res.imageUrl);
    } else {
      setError(res.error ?? 'Something went wrong.');
    }
  }

  return (
    <section className="ai-panel" aria-label="Storyteller AI">
      <h2>✨ The storyteller</h2>
      {!configured && (
        <p className="ai-note">
          The storyteller is quiet for now — Firebase isn&apos;t connected yet. The AI
          voice arrives when the Firebase project is connected.
          The story itself works without it.
        </p>
      )}
      <div className="ai-actions">
        <button className="btn btn-ai" onClick={onContinue} disabled={busy || !configured}>
          {busy ? 'Listening…' : 'Continue the story with AI'}
        </button>
        <button
          className="btn btn-ai"
          onClick={onDraw}
          disabled={imgBusy || !configured || !IMAGE_GENERATION_ENABLED}
          title={
            !IMAGE_GENERATION_ENABLED
              ? 'Switched off until the quota account arrives'
              : undefined
          }
        >
          {imgBusy ? 'Drawing…' : 'Draw a new picture'}
        </button>
      </div>
      {!IMAGE_GENERATION_ENABLED && configured && (
        <p className="ai-note">
          Drawing new pictures is switched off until the quota account arrives.
        </p>
      )}
      {error && <p className="ai-error">{error}</p>}
      {aiText && (
        <figure className="ai-answer">
          <blockquote>{aiText}</blockquote>
          <figcaption>
            {source && <Chip source={source} />}
            <span className="ai-credit">
              {source === 'ON_DEVICE'
                ? 'Answered on this device, offline — Gemini Nano in Chrome.'
                : source === 'IN_CLOUD'
                  ? 'Answered in the cloud — Gemini.'
                  : ''}
            </span>
          </figcaption>
        </figure>
      )}
      {genImage && (
        <figure className="ai-image">
          <img src={genImage} alt={`A new picture for: ${sceneTitle}`} />
          <figcaption>
            <span className="chip chip-cloud">☁️ Cloud</span> Drawn for this scene.
          </figcaption>
        </figure>
      )}
    </section>
  );
}
