export function vertexUrl(projectId: string, location: string, model: string): string {
  return `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;
}

// Vertex AI supports API key auth via x-goog-api-key header (no service account needed)
export function vertexAuthHeaders(apiKey: string): Record<string, string> {
  return { "Content-Type": "application/json", "x-goog-api-key": apiKey };
}
