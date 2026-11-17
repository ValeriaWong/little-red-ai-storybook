/**
 * AI features for the storybook.
 *
 * - "Continue the story with AI": single-turn text generation through the
 *   hybrid model (PREFER_ON_DEVICE, cloud fallback). The response's
 *   `inferenceSource` (ON_DEVICE | IN_CLOUD) drives the chip shown in the UI.
 * - "Draw a new picture": cloud image generation via the Nano Banana model.
 *   Disabled until the quota account arrives (see IMAGE_GENERATION_ENABLED
 *   in firebase.ts).
 *
 * Every function degrades gracefully: with no Firebase config it returns a
 * NOT_CONFIGURED result instead of throwing, so the story never crashes.
 */
import {
  ensureDeviceModel,
  getHybridModel,
  getImageModel,
  IMAGE_GENERATION_ENABLED,
  isFirebaseConfigured,
} from './firebase';
import type { StoryState } from './story/story';

export type InferenceSource = 'ON_DEVICE' | 'IN_CLOUD' | 'NOT_CONFIGURED' | 'DISABLED' | 'ERROR';

export interface ContinueResult {
  text: string;
  source: InferenceSource;
  error?: string;
}

export interface ImageResult {
  imageUrl: string | null;
  source: InferenceSource;
  error?: string;
}

function storySoFar(state: StoryState): string {
  const bits: string[] = [];
  if (state.gift === 'flowers') bits.push('Red picked three daisies for Grandma.');
  if (state.gift === 'greeting') bits.push('Red practised a sweet hello for Grandma.');
  if (state.toldWolf === true) bits.push('Red told the wolf where Grandma lives.');
  if (state.toldWolf === false) bits.push('Red kept Grandma\'s address secret from the wolf.');
  if (state.route === 'bridge') bits.push('Red took the bridge road and found big footprints.');
  if (state.route === 'flowerbed') bits.push('Red took the flower-bed road and found a tuft of grey fur.');
  if (state.c2 === 1) bits.push('At the door, Red heard the wolf mutter his plan.');
  if (state.c2 === 0) bits.push('At the door, Red felt something was strange but did not know what.');
  if (state.r === 1) bits.push('The nightcap slipped off and the wolf\'s grey ears popped up.');
  if (state.help === 'shout') bits.push('Red shouted for the hunter.');
  if (state.help === 'bell') bits.push('Red rang the little bell.');
  if (state.ending) bits.push(`This run ends with "${state.ending}".`);
  return bits.length > 0 ? bits.join(' ') : 'The story has just begun.';
}

/** Continue the story from the current scene. Single-turn text only. */
export async function continueStory(
  state: StoryState,
  sceneTitle: string,
  sceneText: string,
): Promise<ContinueResult> {
  if (!isFirebaseConfigured()) {
    return {
      text: '',
      source: 'NOT_CONFIGURED',
      error:
        'Firebase is not connected yet. The storybook will get its AI voice when the Firebase project is connected (expected Nov 19, when the quota account arrives). The story itself works without it.',
    };
  }
  const model = getHybridModel();
  if (!model) {
    return { text: '', source: 'ERROR', error: 'Could not create the AI model.' };
  }
  // User activation requirement: initialize the on-device model on the tap.
  ensureDeviceModel();
  const prompt =
    `Story so far: ${storySoFar(state)}\n` +
    `Current scene — ${sceneTitle}: ${sceneText}\n` +
    `Continue the story from here in 2-3 short, simple sentences for a 5-year-old. ` +
    `Stay in this scene; do not jump ahead to the ending.`;
  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();
    const raw = (response as unknown as { inferenceSource?: string }).inferenceSource;
    const source: InferenceSource = raw === 'ON_DEVICE' || raw === 'IN_CLOUD' ? raw : 'IN_CLOUD';
    return { text, source };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { text: '', source: 'ERROR', error: `The storyteller could not answer right now. (${message})` };
  }
}

/** Generate a new illustration for the current scene (cloud, Nano Banana). */
export async function generateSceneImage(
  sceneTitle: string,
  sceneText: string,
): Promise<ImageResult> {
  if (!IMAGE_GENERATION_ENABLED) {
    return {
      imageUrl: null,
      source: 'DISABLED',
      error:
        'Drawing new pictures is switched off until the quota account arrives (Nov 19). The storybook already has its keyframe illustrations — this button will draw a fresh one for the current scene once the account is connected.',
    };
  }
  if (!isFirebaseConfigured()) {
    return { imageUrl: null, source: 'NOT_CONFIGURED', error: 'Firebase is not connected yet.' };
  }
  const model = getImageModel();
  if (!model) {
    return { imageUrl: null, source: 'ERROR', error: 'Could not create the image model.' };
  }
  const prompt =
    `Children's picture-book illustration, soft watercolour, warm and gentle, ` +
    `Little Red Riding Hood (a little girl in a red hooded cape) — scene: ${sceneTitle}. ` +
    `${sceneText} Vertical 9:16 composition, no text, no words in the image.`;
  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const parts =
      (response as unknown as { candidates?: Array<{ content?: { parts?: Array<Record<string, unknown>> } }> })
        .candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      const inline = part.inlineData as { data?: string; mimeType?: string } | undefined;
      if (inline?.data && inline.mimeType?.startsWith('image/')) {
        return { imageUrl: `data:${inline.mimeType};base64,${inline.data}`, source: 'IN_CLOUD' };
      }
    }
    return { imageUrl: null, source: 'ERROR', error: 'The model answered, but no picture came back. Try again.' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { imageUrl: null, source: 'ERROR', error: `Could not draw a picture right now. (${message})` };
  }
}
