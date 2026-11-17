/**
 * Firebase setup for the BuildHybridAI storybook.
 *
 * Verified against the official docs (fetched 2026-11-17):
 * - Get started (Web): https://firebase.google.com/docs/ai-logic/get-started
 *   `npm install firebase`; `import { initializeApp } from "firebase/app"`;
 *   `import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai"`;
 *   `const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() })`.
 * - Hybrid inference (Web):
 *   https://firebase.google.com/docs/ai-logic/hybrid-on-device-inference
 *   `import { InferenceMode } from "firebase/ai"`; modes
 *   PREFER_ON_DEVICE / ONLY_ON_DEVICE / PREFER_IN_CLOUD / ONLY_IN_CLOUD;
 *   `model.initializeDeviceModel(cb)` must be called after a user
 *   interaction and before any generateContent() call; on-device needs
 *   Chrome Desktop 139+ and Firebase AI Logic SDK v12.5.0+ (we use 13.4.0).
 * - Config options:
 *   https://firebase.google.com/docs/ai-logic/hybrid/web/configuration-options
 *   Default cloud fallback model is `gemini-3.5-flash-lite` (JS SDK v13+);
 *   `inCloudParams: { model, generationConfig }`,
 *   `onDeviceParams: { createOptions: { expectedInputs, expectedOutputs,
 *   initialPrompts } }`; `result.response.inferenceSource` is
 *   `ON_DEVICE` or `IN_CLOUD` (JS SDK v12.5.0+).
 * - App Check debug (Web): set `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true`
 *   before initializeAppCheck; the token printed in the console must be
 *   registered in the Firebase console (Security > App Check > Apps >
 *   Manage debug tokens).
 * - Pricing: https://firebase.google.com/docs/ai-logic/pricing
 *   Firebase AI Logic itself is free-of-charge. The Gemini Developer API
 *   "free tier" needs no billing account, so the Firebase project stays on
 *   the no-cost Spark plan. (Some models — especially preview and
 *   media-generating models — might require billing; the image hook below
 *   stays disabled until the quota account arrives.)
 * - Image generation: Imagen shut down 2026-08-17; use Gemini Nano Banana:
 *   https://firebase.google.com/docs/ai-logic/generate-images-gemini
 *   `getGenerativeModel(ai, { model: "gemini-3.1-flash-image",
 *   generationConfig: { responseModalities: [ResponseModality.TEXT,
 *   ResponseModality.IMAGE] } })`, then `generateContent(prompt)`.
 *
 * ---------------------------------------------------------------------------
 * CONFIG — the Firebase project does not exist yet. The quota account for
 * Sprint 2 is expected Nov 19, 2026. Until then, fill in .env (see
 * .env.example) with the Firebase web config from the console. With no
 * config present, `isFirebaseConfigured()` is false and every AI feature
 * degrades gracefully to a clear "not configured yet" state — the story
 * itself always works.
 * ---------------------------------------------------------------------------
 */
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  ResponseModality,
  type GenerativeModel,
} from 'firebase/ai';

/** Flip to true after the quota account arrives (Nov 19) and the Firebase
 *  project is connected. Image generation uses the Nano Banana model, which
 *  the pricing docs flag as possibly needing billing — the quota account
 *  covers it. */
export const IMAGE_GENERATION_ENABLED = false;

/** Cloud fallback model for hybrid inference (the documented default). */
export const CLOUD_MODEL = 'gemini-3.5-flash-lite';
/** Image model for the (currently disabled) illustration hook. */
export const IMAGE_MODEL = 'gemini-3.1-flash-image';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

const PLACEHOLDER = 'YOUR_FIREBASE_API_KEY';

/** True only when a real Firebase web config is present. */
export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.apiKey !== PLACEHOLDER &&
      firebaseConfig.projectId,
  );
}

let app: FirebaseApp | null = null;
let appCheckReady = false;

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;
  if (app) return app;
  app = initializeApp(firebaseConfig as Record<string, string>);
  initAppCheck(app);
  return app;
}

/**
 * App Check. The AI Logic setup workflow enforces App Check for AI Logic.
 * For local development, enable the debug provider: set
 * `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` before initializeAppCheck,
 * then register the printed debug token in the Firebase console
 * (Security > App Check > Apps > Manage debug tokens).
 * A reCAPTCHA v3 site key is only needed for the production provider;
 * without one, App Check init is skipped (and AI calls will fail with a
 * clear error until it is set up — the story still works).
 */
function initAppCheck(firebaseApp: FirebaseApp): void {
  if (appCheckReady) return;
  try {
    if (import.meta.env.DEV) {
      (self as unknown as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    const siteKey = import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY as string | undefined;
    if (siteKey) {
      initializeAppCheck(firebaseApp, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
      appCheckReady = true;
    } else {
      console.warn(
        '[storybook] No VITE_RECAPTCHA_V3_SITE_KEY set — App Check not initialized. ' +
          'AI calls will fail until App Check is configured; the story itself still works.',
      );
    }
  } catch (err) {
    console.warn('[storybook] App Check init failed (non-fatal):', err);
  }
}

let hybridModel: GenerativeModel | null = null;
let deviceModelInitStarted = false;

/**
 * The hybrid model: on-device Gemini Nano when available, cloud fallback
 * otherwise. Single-turn text generation only (on-device does not support
 * chat) — which is exactly what "Continue the story" needs.
 */
export function getHybridModel(): GenerativeModel | null {
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  if (hybridModel) return hybridModel;
  const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
  hybridModel = getGenerativeModel(ai, {
    mode: InferenceMode.PREFER_ON_DEVICE,
    inCloudParams: {
      model: CLOUD_MODEL,
      generationConfig: { maxOutputTokens: 200, temperature: 0.8 },
      systemInstruction:
        'You are a warm, gentle storyteller for a 5-year-old. Continue the Little Red Riding Hood story in 2-3 short, simple sentences. Keep it kind and safe: nobody gets hurt, nobody is scary, and the wolf only wants cake. End with a soft question or a small sound, never with a new choice.',
    },
    onDeviceParams: {
      createOptions: {
        expectedInputs: [{ type: 'text', languages: ['en'] }],
        expectedOutputs: [{ type: 'text', languages: ['en'] }],
        initialPrompts: [
          {
            role: 'system',
            content: [
              {
                type: 'text',
                value:
                  'You are a warm, gentle storyteller for a 5-year-old. Continue the Little Red Riding Hood story in 2-3 short, simple sentences. Keep it kind and safe: nobody gets hurt, nobody is scary, and the wolf only wants cake.',
              },
            ],
          },
        ],
      },
    },
  });
  return hybridModel;
}

/**
 * Must be called after a user interaction (e.g. tapping "Continue the
 * story") and before the first generateContent() call. Starts the
 * on-device model download in the background if needed; safe to call
 * repeatedly (only the first call does anything).
 */
export function ensureDeviceModel(): void {
  if (deviceModelInitStarted) return;
  const model = getHybridModel();
  if (!model) return;
  deviceModelInitStarted = true;
  try {
    model.initializeDeviceModel((progress: number) => {
      console.log(`[storybook] On-device model download: ${Math.round(progress * 10000) / 100}%`);
    });
  } catch (err) {
    console.warn('[storybook] initializeDeviceModel failed (will fall back to cloud):', err);
  }
}

let imageModel: GenerativeModel | null = null;

/** Nano Banana image model — disabled until the quota account arrives. */
export function getImageModel(): GenerativeModel | null {
  if (!IMAGE_GENERATION_ENABLED) return null;
  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) return null;
  if (imageModel) return imageModel;
  const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
  imageModel = getGenerativeModel(ai, {
    model: IMAGE_MODEL,
    generationConfig: {
      responseModalities: [ResponseModality.TEXT, ResponseModality.IMAGE],
    },
  });
  return imageModel;
}
