// Fallback embedding algorithm (128-dim normalized term-frequency L2 vector)
function generateLocalEmbeddingVector(text: string, dim = 128): number[] {
  const vector = new Array(dim).fill(0);
  const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const words = clean.split(/\s+/).filter(Boolean);

  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dim;
    vector[idx] += 1;
  }

  // L2 normalization
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return vector;
  return vector.map(val => Number((val / magnitude).toFixed(6)));
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: {
            parts: [{ text: text.slice(0, 2048) }]
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const embeddingValues = data.embedding?.values;
        if (Array.isArray(embeddingValues) && embeddingValues.length > 0) {
          return embeddingValues;
        }
      }
    } catch (err) {
      console.warn('Gemini embedding call failed, using vector fallback:', err);
    }
  }

  return generateLocalEmbeddingVector(text);
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (const text of texts) {
    const vec = await generateEmbedding(text);
    results.push(vec);
  }
  return results;
}

export async function generateQueryEmbedding(query: string): Promise<number[]> {
  return generateEmbedding(query);
}
