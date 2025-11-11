const baseHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
} as const;

const allowedOrigins = ((): string[] => {
  const origins = Deno.env.get("ALLOWED_ORIGINS") ?? Deno.env.get("APP_URL") ?? "*";
  return origins
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
})();

const defaultOrigin = allowedOrigins[0] ?? "*";

const resolveOrigin = (requestOrigin: string | null): string => {
  if (!requestOrigin || requestOrigin.length === 0) {
    return allowedOrigins.includes("*") ? "*" : defaultOrigin;
  }

  if (allowedOrigins.includes("*") || allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  return defaultOrigin;
};

export const corsHeaders = (
  req: Request,
  extra?: Record<string, string>,
): Record<string, string> => {
  const origin = resolveOrigin(req.headers.get("origin"));

  return {
    ...baseHeaders,
    "Access-Control-Allow-Origin": origin,
    ...extra,
  };
};

export const jsonResponse = (
  req: Request,
  data: unknown,
  status = 200,
  extraHeaders?: Record<string, string>,
): Response => {
  const headers = corsHeaders(req, extraHeaders);
  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
};

export const parseJson = async <T>(req: Request): Promise<T> => {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("Unsupported content type");
  }

  try {
    return (await req.json()) as T;
  } catch {
    throw new Error("Invalid JSON payload");
  }
};
