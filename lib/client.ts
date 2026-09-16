export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** JSON fetch wrapper for the browser: throws ApiError with the server's message on failure. */
export async function api<T = unknown>(url: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const hasBody = init.body !== undefined;
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? (hasBody ? 'POST' : 'GET'),
      headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
      body: hasBody ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError('Keine Verbindung zum Server', 0);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error || `Anfrage fehlgeschlagen (${res.status})`, res.status);
  return data as T;
}

export const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Unbekannter Fehler');
