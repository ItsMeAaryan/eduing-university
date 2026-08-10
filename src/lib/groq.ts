/**
 * Groq AI Client Helper Module
 * Model: llama-3.1-8b-instant
 */

export async function callGroqAI<T>(prompt: string, systemPrompt?: string): Promise<T | null> {
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY || ''

  const defaultSystemPrompt = `You are an AI assistant for a university admissions and administration portal.
Always respond in valid JSON format according to the requested schema. Do not output markdown, code blocks, or extra text.`

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt || defaultSystemPrompt },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      })
    })

    if (!res.ok) {
      console.error(`Groq API returned error status ${res.status}`)
      return null
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) return null

    // Safe JSON parse
    try {
      const parsed = JSON.parse(content)
      return parsed as T
    } catch (parseErr) {
      console.error('Failed to parse JSON response from Groq:', parseErr, content)
      return null
    }
  } catch (err) {
    console.error('Error calling Groq AI:', err)
    return null
  }
}
