import OpenAI from 'openai';

// Respan AI Gateway client configured for Google Gemini Carbon and other models
export const respan = new OpenAI({
  baseURL: 'https://gateway.respan.ai/v1',
  apiKey: import.meta.env.VITE_RESPAN_API_KEY || '',
  dangerouslyAllowBrowser: true,
});

export interface AIResponse {
  content: string | null;
  error?: string;
}

/**
 * Send a chat completion request through the Respan Gateway.
 * Supports Google Gemini Carbon ('gemini-4-carbon') or fallback models.
 */
export async function generateCompletion(
  prompt: string,
  model = 'gemini-4-carbon'
): Promise<AIResponse> {
  try {
    const response = await respan.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
    });
    return {
      content: response.choices[0]?.message?.content ?? '',
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Respan Gateway Error with model ${model}]:`, errorMsg);
    return {
      content: null,
      error: errorMsg,
    };
  }
}

