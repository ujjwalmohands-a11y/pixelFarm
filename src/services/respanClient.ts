export interface AIResponse {
  content: string | null;
  error?: string;
}

const STORAGE_KEY = 'RESPAN_API_KEY';

/**
 * Retrieve the active Respan API key from localStorage or Vite environment variable.
 */
export function getApiKey(): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const local = window.localStorage.getItem(STORAGE_KEY);
      if (local && local.trim()) return local.trim();
    }
  } catch {
    // Ignore localStorage access restrictions in sandboxed iframes
  }
  return import.meta.env.VITE_RESPAN_API_KEY || '';
}

/**
 * Save an API key into browser localStorage so the user can connect in-browser without rebuilding.
 */
export function setApiKey(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (key && key.trim()) {
        window.localStorage.setItem(STORAGE_KEY, key.trim());
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  } catch {
    // Ignore localStorage access restrictions
  }
}

/**
 * Resilient, zero-dependency chat completion request via Respan AI Gateway.
 * Fully safe for browser environments: never crashes on startup even if no API key is provided.
 */
export async function generateCompletion(
  prompt: string,
  model = 'gemini-4-carbon'
): Promise<AIResponse> {
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      content: null,
      error: 'No Respan API key configured. Provide an API key or use the built-in Valley Spirit lore.',
    };
  }

  try {
    const response = await fetch('https://gateway.respan.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let parsedError = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        parsedError = errorJson.error?.message || errorJson.detail || errorText;
      } catch {
        // Use raw text
      }
      console.warn(`[Respan Gateway HTTP ${response.status}]:`, parsedError);
      return {
        content: null,
        error: `Respan Gateway HTTP ${response.status}: ${parsedError}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? null;
    return {
      content,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[Respan Gateway Network Error]:`, errorMsg);
    return {
      content: null,
      error: errorMsg,
    };
  }
}
