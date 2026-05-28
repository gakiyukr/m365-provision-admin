import { env } from "@/lib/env";

type GraphTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

export async function getGraphToken(fetchImpl: typeof fetch = fetch): Promise<string> {
  const response = await fetchImpl(
    `https://login.microsoftonline.com/${encodeURIComponent(env.AZURE_TENANT_ID)}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: env.AZURE_CLIENT_ID,
        client_secret: env.AZURE_CLIENT_SECRET,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    },
  );

  const data = (await response.json().catch(() => null)) as GraphTokenResponse | null;

  if (!response.ok) {
    throw new Error(data?.error_description || data?.error || "Failed to load Graph token");
  }

  if (!data?.access_token) {
    throw new Error("Failed to load Graph token");
  }

  return data.access_token;
}
