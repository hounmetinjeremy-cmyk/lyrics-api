export interface Env {
  AI: any
}

export async function transcribeWithWhisper(audio: File, env: Env): Promise<string> {
  const arrayBuffer = await audio.arrayBuffer()
  const uint8 = new Uint8Array(arrayBuffer)

  if (uint8.length > 10 * 1024 * 1024) {
    throw new Error('Audio file too large. Max 10 MB on the free Workers AI plan.')
  }

  const result = (await env.AI.run('@cf/openai/whisper', {
    audio: Array.from(uint8),
    task: 'transcribe',
  })) as { text?: string; transcription?: string } | string

  if (typeof result === 'string') return result
  return result.text ?? result.transcription ?? JSON.stringify(result)
}
