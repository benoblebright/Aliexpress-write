
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Genkit AI 설정을 초기화합니다.
 * v1.x 표준 문법을 사용하며, googleAI 플러그인을 활성화합니다.
 */
export const ai = genkit({
  plugins: [googleAI()],
});
