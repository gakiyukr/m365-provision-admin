export type GraphServicePlan = {
  servicePlanId?: string;
  servicePlanName?: string;
  provisioningStatus?: string | null;
  appliesTo?: string | null;
  [key: string]: unknown;
};

export type GraphSubscribedSku = {
  skuId?: string;
  skuPartNumber?: string;
  capabilityStatus?: string;
  appliesTo?: string;
  consumedUnits?: number;
  prepaidUnits?: {
    enabled?: number;
    warning?: number;
    [key: string]: unknown;
  };
  servicePlans?: GraphServicePlan[];
  [key: string]: unknown;
};

type GraphCollectionResponse<TItem> = {
  value?: TItem[];
  error?: {
    message?: string;
  };
};

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function graphRequest<TResponse>(
  token: string,
  path: string,
  fetchImpl: typeof fetch = fetch,
  init: RequestInit = {},
): Promise<TResponse> {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);

  const response = await fetchImpl(`https://graph.microsoft.com/v1.0${path}`, {
    ...init,
    headers,
  });

  const text = await response.text();
  const data = text ? (safeJsonParse(text) as GraphCollectionResponse<unknown> | null) : null;

  if (!response.ok) {
    throw new Error(data?.error?.message || response.statusText || "Graph request failed");
  }

  if (!text) {
    throw new Error("Graph request returned an empty response");
  }

  if (!data || typeof data !== "object") {
    throw new Error("Graph request returned malformed JSON");
  }

  return data as TResponse;
}

export async function listGraphSubscribedSkus(
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GraphSubscribedSku[]> {
  const searchParams = new URLSearchParams({
    $select: "skuId,skuPartNumber,consumedUnits,prepaidUnits,capabilityStatus,appliesTo,servicePlans",
  });

  const data = await graphRequest<GraphCollectionResponse<GraphSubscribedSku>>(
    token,
    `/subscribedSkus?${searchParams.toString()}`,
    fetchImpl,
  );

  if (!Array.isArray(data.value)) {
    throw new Error("Graph subscribedSkus response was malformed");
  }

  return data.value;
}
