/**
 * Read-aloud for the story, using the browser's built-in speech synthesis.
 * No network, no API key, no cost — the voice lives in the browser.
 * (The v5 script's narration is voice-led; this is the scaffold's stand-in
 * until recorded narration exists.)
 */

let speaking = false;

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function isSpeaking(): boolean {
  return speaking;
}

export function stopSpeaking(): void {
  if (!speechSupported()) return;
  window.speechSynthesis.cancel();
  speaking = false;
}

/** Speak the given lines, one after another. Calls onEnd when finished. */
export function speakLines(lines: string[], onEnd?: () => void): void {
  if (!speechSupported()) return;
  stopSpeaking();
  const text = lines.join(' ');
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'en-US';
  utter.rate = 0.9;
  utter.pitch = 1.05;
  utter.onend = () => {
    speaking = false;
    onEnd?.();
  };
  utter.onerror = () => {
    speaking = false;
    onEnd?.();
  };
  speaking = true;
  window.speechSynthesis.speak(utter);
}
