import { getGraphToken } from "@/lib/graph/token";

type GraphUserPayload = {
  displayName: string;
  mailNickname: string;
  userPrincipalName: string;
  usageLocation: string;
  password: string;
  forceChangePasswordNextSignIn: boolean;
};

type GraphObjectResponse = {
  [key: string]: unknown;
};

type GraphUserResponse = GraphObjectResponse & {
  id?: string;
};

type GraphErrorResponse = {
  error?: {
    message?: string;
  };
};

function getGraphErrorMessage(data: unknown) {
  if (!data || typeof data !== "object" || !("error" in data)) {
    return null;
  }

  const error = data.error;
  if (!error || typeof error !== "object" || !("message" in error)) {
    return null;
  }

  return typeof error.message === "string" ? error.message : null;
}

function parseJson(text: string) {
  try {
    return JSON.parse(text) as Record<string, unknown> | GraphErrorResponse;
  } catch {
    return null;
  }
}

async function readGraphResponse<TResponse extends GraphObjectResponse>(response: Response, fallbackMessage: string) {
  const text = await response.text();
  const data = text ? parseJson(text) : null;

  if (!response.ok) {
    throw new Error(getGraphErrorMessage(data) || response.statusText || fallbackMessage);
  }

  if (!data || typeof data !== "object") {
    throw new Error(fallbackMessage);
  }

  return data as TResponse;
}

export async function createGraphUser(
  payload: GraphUserPayload,
  fetchImpl: typeof fetch = fetch,
): Promise<GraphUserResponse> {
  const token = await getGraphToken(fetchImpl);
  const response = await fetchImpl("https://graph.microsoft.com/v1.0/users", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      accountEnabled: true,
      displayName: payload.displayName,
      mailNickname: payload.mailNickname,
      userPrincipalName: payload.userPrincipalName,
      usageLocation: payload.usageLocation,
      passwordProfile: {
        forceChangePasswordNextSignIn: payload.forceChangePasswordNextSignIn,
        password: payload.password,
      },
    }),
  });

  return readGraphResponse<GraphUserResponse>(response, "Failed to create Graph user");
}

export async function assignGraphLicense(
  userId: string,
  skuId: string,
  disabledPlans: string[],
  fetchImpl: typeof fetch = fetch,
): Promise<GraphObjectResponse> {
  const token = await getGraphToken(fetchImpl);
  const response = await fetchImpl(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userId)}/assignLicense`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        addLicenses: [{ skuId, disabledPlans }],
        removeLicenses: [],
      }),
    },
  );

  return readGraphResponse<GraphObjectResponse>(response, "Failed to assign Graph license");
}
