import assert from "node:assert/strict";
import test from "node:test";

import worker from "../src/index.js";

const baseEnv = {
  APP_PASSWORD: "correct-password",
  AZURE_CLIENT_ID: "client-id",
  AZURE_CLIENT_SECRET: "client-secret",
  AZURE_TENANT_ID: "tenant-id",
  DEFAULT_USAGE_LOCATION: "US",
  HCAPTCHA_SECRET: "captcha-secret",
  HCAPTCHA_SITE_KEY: "captcha-site-key"
};

function createRequest(payload) {
  return new Request("https://worker.example.com/api/create-user", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      appPassword: "correct-password",
      displayName: "Test User",
      userName: "testuser",
      mailNickname: "",
      password: "StrongPass!2026",
      hCaptchaToken: "captcha-token",
      forceChangePasswordNextSignIn: true,
      ...payload
    })
  });
}

function createGraphFetchMock({
  servicePlanName = "EXCHANGE_S_FOUNDATION",
  assignLicenseResponse = () => Response.json({}),
  onUserDelete = () => {}
} = {}) {
  return async (url, options = {}) => {
    const requestUrl = String(url);

    if (requestUrl === "https://api.hcaptcha.com/siteverify") {
      return Response.json({ success: true });
    }

    if (requestUrl.includes("/oauth2/v2.0/token")) {
      return Response.json({ access_token: "graph-token" });
    }

    if (requestUrl.startsWith("https://graph.microsoft.com/v1.0/subscribedSkus")) {
      return Response.json({
        value: [
          {
            skuId: "exchange-sku",
            skuPartNumber: "EXCHANGE_PRODUCT",
            consumedUnits: 0,
            prepaidUnits: {
              enabled: 1,
              warning: 0
            },
            capabilityStatus: "Enabled",
            appliesTo: "User",
            servicePlans: [
              {
                servicePlanId: "exchange-plan",
                servicePlanName
              },
              {
                servicePlanId: "non-exchange-plan",
                servicePlanName: "TEAMS1"
              }
            ]
          }
        ]
      });
    }

    if (requestUrl === "https://graph.microsoft.com/v1.0/users" && options.method === "POST") {
      return Response.json({
        id: "new-user-id",
        displayName: "Test User",
        userPrincipalName: "testuser@example.com"
      });
    }

    if (requestUrl.endsWith("/assignLicense") && options.method === "POST") {
      return assignLicenseResponse();
    }

    if (requestUrl === "https://graph.microsoft.com/v1.0/users/new-user-id" && options.method === "DELETE") {
      onUserDelete();
      return new Response(null, { status: 204 });
    }

    throw new Error("Unexpected fetch: " + requestUrl);
  };
}

test("checks hCaptcha before rejecting an incorrect app password", async () => {
  const originalFetch = globalThis.fetch;
  let hCaptchaCalls = 0;

  globalThis.fetch = async (url) => {
    if (String(url) === "https://api.hcaptcha.com/siteverify") {
      hCaptchaCalls += 1;
      return Response.json({ success: false });
    }

    throw new Error("Unexpected fetch: " + url);
  };

  try {
    const response = await worker.fetch(
      createRequest({
        appPassword: "wrong-password"
      }),
      baseEnv
    );

    assert.equal(response.status, 400);
    assert.equal(hCaptchaCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not create a user when every Exchange license has zero available seats", async () => {
  const originalFetch = globalThis.fetch;
  let userCreateCalls = 0;

  globalThis.fetch = async (url, options = {}) => {
    const requestUrl = String(url);

    if (requestUrl === "https://api.hcaptcha.com/siteverify") {
      return Response.json({ success: true });
    }

    if (requestUrl.includes("/oauth2/v2.0/token")) {
      return Response.json({ access_token: "graph-token" });
    }

    if (requestUrl.startsWith("https://graph.microsoft.com/v1.0/subscribedSkus")) {
      return Response.json({
        value: [
          {
            skuId: "exchange-sku",
            skuPartNumber: "EXCHANGE_PRODUCT",
            consumedUnits: 1,
            prepaidUnits: {
              enabled: 1,
              warning: 0
            },
            capabilityStatus: "Enabled",
            appliesTo: "User",
            servicePlans: [
              {
                servicePlanId: "exchange-plan",
                servicePlanName: "EXCHANGE_S_FOUNDATION"
              }
            ]
          }
        ]
      });
    }

    if (requestUrl === "https://graph.microsoft.com/v1.0/users" && options.method === "POST") {
      userCreateCalls += 1;
      return Response.json({
        id: "new-user-id",
        displayName: "Test User",
        userPrincipalName: "testuser@example.com"
      });
    }

    throw new Error("Unexpected fetch: " + requestUrl);
  };

  try {
    const response = await worker.fetch(createRequest(), {
      ...baseEnv,
      MAIL_DOMAIN: "example.com"
    });

    assert.equal(response.status, 400);
    assert.equal(userCreateCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects an invalid mail nickname before creating a user", async () => {
  const originalFetch = globalThis.fetch;
  let userCreateCalls = 0;

  globalThis.fetch = async (url, options = {}) => {
    const requestUrl = String(url);

    if (requestUrl === "https://api.hcaptcha.com/siteverify") {
      return Response.json({ success: true });
    }

    if (requestUrl.includes("/oauth2/v2.0/token")) {
      return Response.json({ access_token: "graph-token" });
    }

    if (requestUrl.startsWith("https://graph.microsoft.com/v1.0/subscribedSkus")) {
      return Response.json({
        value: [
          {
            skuId: "exchange-sku",
            skuPartNumber: "EXCHANGE_PRODUCT",
            consumedUnits: 0,
            prepaidUnits: {
              enabled: 1,
              warning: 0
            },
            capabilityStatus: "Enabled",
            appliesTo: "User",
            servicePlans: [
              {
                servicePlanId: "exchange-plan",
                servicePlanName: "EXCHANGE_S_FOUNDATION"
              }
            ]
          }
        ]
      });
    }

    if (requestUrl === "https://graph.microsoft.com/v1.0/users" && options.method === "POST") {
      userCreateCalls += 1;
      return Response.json({
        id: "new-user-id",
        displayName: "Test User",
        userPrincipalName: "testuser@example.com"
      });
    }

    throw new Error("Unexpected fetch: " + requestUrl);
  };

  try {
    const response = await worker.fetch(
      createRequest({
        mailNickname: "bad nickname!"
      }),
      {
        ...baseEnv,
        MAIL_DOMAIN: "example.com"
      }
    );

    assert.equal(response.status, 400);
    assert.equal(userCreateCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects usernames that start with a blocked prefix", async () => {
  const originalFetch = globalThis.fetch;
  let externalCalls = 0;

  globalThis.fetch = async (url) => {
    externalCalls += 1;
    throw new Error("Unexpected fetch: " + url);
  };

  try {
    const response = await worker.fetch(
      createRequest({
        userName: "admin123"
      }),
      baseEnv
    );
    const data = await response.json();

    assert.equal(response.status, 400);
    assert.match(data.error, /邮箱前缀/);
    assert.equal(externalCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects non-boolean forceChangePasswordNextSignIn values", async () => {
  const originalFetch = globalThis.fetch;
  let externalCalls = 0;

  globalThis.fetch = async (url) => {
    externalCalls += 1;
    throw new Error("Unexpected fetch: " + url);
  };

  try {
    const response = await worker.fetch(
      createRequest({
        forceChangePasswordNextSignIn: "false"
      }),
      baseEnv
    );
    const data = await response.json();

    assert.equal(response.status, 400);
    assert.match(data.error, /forceChangePasswordNextSignIn/);
    assert.equal(externalCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("returns bad request for invalid JSON request bodies", async () => {
  const response = await worker.fetch(
    new Request("https://worker.example.com/api/create-user", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: "{"
    }),
    baseEnv
  );
  const data = await response.json();

  assert.equal(response.status, 400);
  assert.match(data.error, /JSON/);
});

test("renders the configured mail domain in the form hint", async () => {
  const response = await worker.fetch(new Request("https://worker.example.com/"), {
    ...baseEnv,
    MAIL_DOMAIN: "contoso.com"
  });
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /@contoso\.com/);
  assert.doesNotMatch(html, /@republicofmayo\.com/);
});

test("does not render or script password disclosure in the form page", async () => {
  const response = await worker.fetch(new Request("https://worker.example.com/"), baseEnv);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /<input id="password" name="password" type="password"/);
  assert.doesNotMatch(html, /密码: "\s*\+\s*data\.user\.password/);
  assert.doesNotMatch(html, /密码: "\s*\+\s*payload\.password/);
});

test("does not return the initial password after creating a user", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url, options = {}) => {
    const requestUrl = String(url);

    if (requestUrl === "https://api.hcaptcha.com/siteverify") {
      return Response.json({ success: true });
    }

    if (requestUrl.includes("/oauth2/v2.0/token")) {
      return Response.json({ access_token: "graph-token" });
    }

    if (requestUrl.startsWith("https://graph.microsoft.com/v1.0/subscribedSkus")) {
      return Response.json({
        value: [
          {
            skuId: "exchange-sku",
            skuPartNumber: "EXCHANGE_PRODUCT",
            consumedUnits: 0,
            prepaidUnits: {
              enabled: 1,
              warning: 0
            },
            capabilityStatus: "Enabled",
            appliesTo: "User",
            servicePlans: [
              {
                servicePlanId: "exchange-plan",
                servicePlanName: "EXCHANGE_S_FOUNDATION"
              },
              {
                servicePlanId: "non-exchange-plan",
                servicePlanName: "TEAMS1"
              }
            ]
          }
        ]
      });
    }

    if (requestUrl === "https://graph.microsoft.com/v1.0/users" && options.method === "POST") {
      return Response.json({
        id: "new-user-id",
        displayName: "Test User",
        userPrincipalName: "testuser@example.com"
      });
    }

    if (requestUrl.endsWith("/assignLicense") && options.method === "POST") {
      return Response.json({});
    }

    throw new Error("Unexpected fetch: " + requestUrl);
  };

  try {
    const response = await worker.fetch(createRequest(), {
      ...baseEnv,
      MAIL_DOMAIN: "example.com"
    });
    const data = await response.json();
    const responseText = JSON.stringify(data);

    assert.equal(response.status, 200);
    assert.equal(data.user.email, "testuser@example.com");
    assert.equal(data.user.password, undefined);
    assert.doesNotMatch(responseText, /StrongPass!2026/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rolls back the created user when license assignment fails", async () => {
  const originalFetch = globalThis.fetch;
  let deleteCalls = 0;

  globalThis.fetch = createGraphFetchMock({
    assignLicenseResponse: () =>
      Response.json(
        {
          error: {
            message: "license assignment failed"
          }
        },
        { status: 503 }
      ),
    onUserDelete: () => {
      deleteCalls += 1;
    }
  });

  try {
    const response = await worker.fetch(createRequest(), {
      ...baseEnv,
      MAIL_DOMAIN: "example.com"
    });
    const data = await response.json();

    assert.equal(response.status, 503);
    assert.equal(data.rolledBack, true);
    assert.equal(deleteCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects non-two-letter usage locations", async () => {
  const originalFetch = globalThis.fetch;
  let externalCalls = 0;

  globalThis.fetch = async (url) => {
    externalCalls += 1;
    throw new Error("Unexpected fetch: " + url);
  };

  try {
    const response = await worker.fetch(createRequest(), {
      ...baseEnv,
      DEFAULT_USAGE_LOCATION: "USA"
    });
    const data = await response.json();

    assert.equal(response.status, 400);
    assert.match(data.error, /DEFAULT_USAGE_LOCATION/);
    assert.equal(externalCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects invalid mail domains", async () => {
  const response = await worker.fetch(new Request("https://worker.example.com/"), {
    ...baseEnv,
    MAIL_DOMAIN: "bad domain.com"
  });
  const data = await response.json();

  assert.equal(response.status, 500);
  assert.match(data.error, /MAIL_DOMAIN/);
});

test("keeps Exchange service plans regardless of service plan name casing", async () => {
  const originalFetch = globalThis.fetch;
  let assignLicenseBody;

  globalThis.fetch = createGraphFetchMock({
    servicePlanName: "exchange_s_foundation",
    assignLicenseResponse: () => Response.json({})
  });

  const captureFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).endsWith("/assignLicense")) {
      assignLicenseBody = JSON.parse(options.body);
    }

    return captureFetch(url, options);
  };

  try {
    const response = await worker.fetch(createRequest(), {
      ...baseEnv,
      MAIL_DOMAIN: "example.com"
    });

    assert.equal(response.status, 200);
    assert.deepEqual(assignLicenseBody.addLicenses[0].disabledPlans, ["non-exchange-plan"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects usernames with invalid characters before contacting Graph", async () => {
  const originalFetch = globalThis.fetch;
  let externalCalls = 0;

  globalThis.fetch = async (url) => {
    externalCalls += 1;
    throw new Error("Unexpected fetch: " + url);
  };

  try {
    const response = await worker.fetch(
      createRequest({
        userName: "bad!name"
      }),
      baseEnv
    );
    const data = await response.json();

    assert.equal(response.status, 400);
    assert.match(data.error, /邮箱账号/);
    assert.equal(externalCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("uses only the first hop when falling back to x-forwarded-for", async () => {
  const originalFetch = globalThis.fetch;
  let observedRemoteIp;

  globalThis.fetch = async (url, options = {}) => {
    if (String(url) === "https://api.hcaptcha.com/siteverify") {
      const params = new URLSearchParams(options.body);
      observedRemoteIp = params.get("remoteip");
      return Response.json({ success: false });
    }

    throw new Error("Unexpected fetch: " + url);
  };

  try {
    const request = new Request("https://worker.example.com/api/create-user", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.7, 198.51.100.4, 10.0.0.1"
      },
      body: JSON.stringify({
        appPassword: "correct-password",
        displayName: "Test User",
        userName: "testuser",
        mailNickname: "",
        password: "StrongPass!2026",
        hCaptchaToken: "captcha-token",
        forceChangePasswordNextSignIn: true
      })
    });

    await worker.fetch(request, baseEnv);

    assert.equal(observedRemoteIp, "203.0.113.7");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("masks Graph 403 responses with a generic permission hint", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url) => {
    const requestUrl = String(url);

    if (requestUrl === "https://api.hcaptcha.com/siteverify") {
      return Response.json({ success: true });
    }

    if (requestUrl.includes("/oauth2/v2.0/token")) {
      return Response.json({ access_token: "graph-token" });
    }

    if (requestUrl.startsWith("https://graph.microsoft.com/v1.0/subscribedSkus")) {
      return Response.json(
        {
          error: { message: "Insufficient privileges to complete the operation." }
        },
        { status: 403 }
      );
    }

    throw new Error("Unexpected fetch: " + requestUrl);
  };

  try {
    const response = await worker.fetch(createRequest(), {
      ...baseEnv,
      MAIL_DOMAIN: "example.com"
    });
    const data = await response.json();

    assert.equal(response.status, 403);
    assert.doesNotMatch(data.error, /Insufficient privileges/);
    assert.match(data.error, /权限/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("reuses the cached Graph token across requests in the same isolate", async () => {
  const originalFetch = globalThis.fetch;
  let tokenCalls = 0;

  globalThis.fetch = async (url, options = {}) => {
    const requestUrl = String(url);

    if (requestUrl.includes("/oauth2/v2.0/token")) {
      tokenCalls += 1;
      return Response.json({ access_token: "graph-token", expires_in: 3600 });
    }

    return createGraphFetchMock()(url, options);
  };

  const env = {
    ...baseEnv,
    AZURE_TENANT_ID: "token-cache-tenant",
    MAIL_DOMAIN: "example.com"
  };

  try {
    const first = await worker.fetch(createRequest(), env);
    const second = await worker.fetch(createRequest(), env);

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(tokenCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("allows usernames that merely start with letters of a blocked prefix", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = createGraphFetchMock();

  try {
    const response = await worker.fetch(
      createRequest({
        userName: "italy"
      }),
      {
        ...baseEnv,
        MAIL_DOMAIN: "example.com"
      }
    );

    assert.equal(response.status, 200);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("still blocks usernames that start with a prefix followed by a non-letter", async () => {
  const originalFetch = globalThis.fetch;
  let externalCalls = 0;

  globalThis.fetch = async (url) => {
    externalCalls += 1;
    throw new Error("Unexpected fetch: " + url);
  };

  try {
    const response = await worker.fetch(
      createRequest({
        userName: "admin-1"
      }),
      baseEnv
    );

    assert.equal(response.status, 400);
    assert.equal(externalCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
