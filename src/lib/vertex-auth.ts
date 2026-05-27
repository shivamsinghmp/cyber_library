export function vertexUrl(projectId: string, location: string, model: string): string {
  return `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;
}

// Google AI Studio (aistudio.google.com) endpoint — no project/location needed
export function geminiUrl(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

export function vertexAuthHeaders(apiKey: string): Record<string, string> {
  return { "Content-Type": "application/json", "x-goog-api-key": apiKey };
}
