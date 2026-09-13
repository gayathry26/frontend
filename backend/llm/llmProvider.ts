/**
 * Multi-Model LLM Provider Abstraction
 * Supports Gemini 1.5/2.0, OpenAI, and smart fallback heuristics.
 */

export interface LLMCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  responseFormat?: 'json' | 'text';
}

export class LLMProvider {
  /**
   * Calls Google Gemini AI (using GEMINI_API_KEY from environment)
   */
  static async callGemini(prompt: string, options: LLMCompletionOptions = {}): Promise<string | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    try {
      // Use currently supported gemini-1.5-flash model
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      
      const body: any = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options.temperature ?? 0.3,
          maxOutputTokens: options.maxTokens ?? 2048,
        }
      };

      if (options.responseFormat === 'json') {
        body.generationConfig.responseMimeType = 'application/json';
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        console.warn(`Gemini API returned status ${res.status}: ${res.statusText}`);
        return null;
      }

      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (err) {
      console.warn('Gemini API call failed:', err);
      return null;
    }
  }

  /**
   * Calls OpenAI if OPENAI_API_KEY is configured
   */
  static async callOpenAI(prompt: string, options: LLMCompletionOptions = {}): Promise<string | null> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
            { role: 'user', content: prompt }
          ],
          temperature: options.temperature ?? 0.3,
          max_tokens: options.maxTokens ?? 2048,
          response_format: options.responseFormat === 'json' ? { type: 'json_object' } : undefined,
        })
      });

      if (!res.ok) return null;
      const data = await res.json();
      return data.choices?.[0]?.message?.content || null;
    } catch {
      return null;
    }
  }

  /**
   * Unified JSON completion method with automatic model fallback
   */
  static async completeJson<T = any>(prompt: string, options: LLMCompletionOptions = {}): Promise<T | null> {
    const opts: LLMCompletionOptions = { ...options, responseFormat: 'json' };

    // Try Gemini first (primary configured provider in workspace)
    let raw = await this.callGemini(prompt, opts);

    // Fallback to OpenAI if Gemini fails or is not available
    if (!raw) {
      raw = await this.callOpenAI(prompt, opts);
    }

    if (!raw) return null;

    try {
      const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(clean) as T;
    } catch (e) {
      console.warn('Failed to parse LLM JSON response:', e);
      return null;
    }
  }
}
