const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Microsoft 365 用户创建</title>
  <style>
    :root {
      --bg: #f4f1ea;
      --panel: rgba(255, 252, 245, 0.88);
      --panel-strong: #fffaf0;
      --line: rgba(100, 76, 38, 0.16);
      --text: #2a241d;
      --muted: #6b5f50;
      --accent: #b55d32;
      --accent-2: #d6a24a;
      --success: #217346;
      --error: #a33b2d;
      --shadow: 0 24px 60px rgba(66, 40, 13, 0.12);
      --radius: 22px;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      color: var(--text);
      background:
        radial-gradient(circle at top left, rgba(214, 162, 74, 0.28), transparent 28%),
        radial-gradient(circle at top right, rgba(181, 93, 50, 0.18), transparent 26%),
        linear-gradient(145deg, #f3eee5 0%, #efe4d1 45%, #f7f2eb 100%);
      min-height: 100vh;
    }

    .wrap {
      width: min(980px, calc(100vw - 32px));
      margin: 32px auto;
      display: grid;
      gap: 20px;
    }

    .hero, .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      backdrop-filter: blur(14px);
    }

    .hero {
      padding: 28px;
      overflow: hidden;
      position: relative;
    }

    .hero::after {
      content: "";
      position: absolute;
      width: 240px;
      height: 240px;
      right: -60px;
      top: -80px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(214, 162, 74, 0.38), transparent 70%);
    }

    h1 {
      margin: 0 0 8px;
      font-size: clamp(30px, 5vw, 48px);
      line-height: 1.02;
      letter-spacing: -0.03em;
    }

    .hero p {
      max-width: 680px;
      margin: 0;
      color: var(--muted);
      line-height: 1.7;
      font-size: 15px;
    }

    .panel {
      padding: 24px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }

    .field {
      display: grid;
      gap: 8px;
    }

    .field.full {
      grid-column: 1 / -1;
    }

    label {
      font-size: 13px;
      color: var(--muted);
      font-weight: 600;
    }

    input, select, textarea, button {
      font: inherit;
    }

    input, select, textarea {
      width: 100%;
      padding: 14px 16px;
      border-radius: 16px;
      border: 1px solid rgba(92, 70, 36, 0.14);
      background: rgba(255, 250, 240, 0.94);
      color: var(--text);
      outline: none;
      transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
    }

    input:focus, select:focus, textarea:focus {
      border-color: rgba(181, 93, 50, 0.5);
      box-shadow: 0 0 0 4px rgba(181, 93, 50, 0.12);
      transform: translateY(-1px);
    }

    textarea {
      min-height: 104px;
      resize: vertical;
    }

    .hint {
      font-size: 12px;
      color: var(--muted);
    }

    .actions {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
      margin-top: 8px;
    }

    button {
      border: 0;
      padding: 14px 20px;
      border-radius: 999px;
      background: linear-gradient(135deg, var(--accent), #c87434);
      color: white;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 16px 30px rgba(181, 93, 50, 0.28);
      transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
    }

    button:hover {
      transform: translateY(-1px);
      box-shadow: 0 20px 36px rgba(181, 93, 50, 0.32);
    }

    button.secondary {
      background: linear-gradient(135deg, #7c6a50, #94795a);
      box-shadow: none;
    }

    button:disabled {
      opacity: 0.7;
      cursor: wait;
      transform: none;
    }

    .status {
      padding: 14px 16px;
      border-radius: 16px;
      display: none;
      white-space: pre-wrap;
      line-height: 1.6;
      font-size: 14px;
    }

    .status.show { display: block; }
    .status.success {
      background: rgba(33, 115, 70, 0.1);
      border: 1px solid rgba(33, 115, 70, 0.2);
      color: var(--success);
    }

    .status.error {
      background: rgba(163, 59, 45, 0.08);
      border: 1px solid rgba(163, 59, 45, 0.16);
      color: var(--error);
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 12px;
    }

    .chip {
      padding: 10px 14px;
      border-radius: 999px;
      background: rgba(214, 162, 74, 0.12);
      border: 1px solid rgba(214, 162, 74, 0.24);
      color: #715114;
      font-size: 12px;
    }

    .footer-note {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.6;
    }

    @media (max-width: 760px) {
      .wrap { margin: 16px auto; }
      .hero, .panel { padding: 18px; }
      .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <h1>Microsoft 365<br />用户自动创建</h1>
    </section>

    <section class="panel">
      <div id="status" class="status"></div>
      <form id="user-form">
        <div class="grid">
          <div class="field full">
            <label for="appPassword">访问密码</label>
            <input id="appPassword" name="appPassword" type="password" placeholder="输入页面访问密码" required />
          </div>

          <div class="field">
            <label for="displayName">显示名称</label>
            <input id="displayName" name="displayName" type="text" placeholder="例如 张三" required />
          </div>

          <div class="field">
            <label for="userName">邮箱账号</label>
            <input id="userName" name="userName" type="text" placeholder="例如 zhangsan" required />
            <div class="hint">系统会自动创建为 @republicofmayo.com 邮箱。</div>
          </div>

          <div class="field">
            <label for="mailNickname">邮件别名</label>
            <input id="mailNickname" name="mailNickname" type="text" placeholder="默认自动取 @ 前面的部分" />
          </div>

          <div class="field">
            <label for="password">初始密码</label>
            <input id="password" name="password" type="text" placeholder="例如 StrongPass!2026" required />
          </div>

          <div class="field">
            <label for="forceChangePasswordNextSignIn">首次登录改密</label>
            <select id="forceChangePasswordNextSignIn" name="forceChangePasswordNextSignIn">
              <option value="true" selected>是</option>
              <option value="false">否</option>
            </select>
          </div>
        </div>

        <div class="actions">
          <button id="submitButton" type="submit">创建用户并分配 Outlook 授权</button>
        </div>

        <div class="field full" style="margin-top: 16px;">
          <div
            class="h-captcha"
            data-sitekey="__HCAPTCHA_SITE_KEY__"
          ></div>
        </div>
      </form>
    </section>
  </div>

  <script src="https://js.hcaptcha.com/1/api.js" async defer></script>
  <script>
    const statusEl = document.getElementById("status");
    const form = document.getElementById("user-form");
    const submitButton = document.getElementById("submitButton");

    function setStatus(type, message) {
      statusEl.className = "status show " + type;
      statusEl.textContent = message;
    }

    function clearStatus() {
      statusEl.className = "status";
      statusEl.textContent = "";
    }

    function setBusy(busy) {
      submitButton.disabled = busy;
      submitButton.textContent = busy ? "处理中..." : "创建用户并分配 Outlook 授权";
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearStatus();
      setBusy(true);

      const formData = new FormData(form);
      const payload = {
        appPassword: String(formData.get("appPassword") || "").trim(),
        displayName: String(formData.get("displayName") || "").trim(),
        userName: String(formData.get("userName") || "").trim(),
        mailNickname: String(formData.get("mailNickname") || "").trim(),
        password: String(formData.get("password") || "").trim(),
        hCaptchaToken: String(formData.get("h-captcha-response") || "").trim(),
        forceChangePasswordNextSignIn: String(formData.get("forceChangePasswordNextSignIn")) === "true"
      };

      try {
        const response = await fetch("/api/create-user", {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) {
          if (data.partial && data.user) {
            throw new Error(
              [
                data.error || "许可证分配失败",
                "邮箱: " + data.user.userPrincipalName,
                "密码: " + payload.password
              ].join("\\n")
            );
          }
          throw new Error(data.error || "创建失败");
        }

        setStatus(
          "success",
          [
            "创建成功",
            "邮箱: " + data.user.email,
            "密码: " + data.user.password
          ].join("\\n")
        );
      } catch (error) {
        setStatus("error", error.message);
      } finally {
        if (window.hcaptcha) {
          window.hcaptcha.reset();
        }
        setBusy(false);
      }
    });
  </script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (request.method === "GET" && url.pathname === "/") {
        return htmlResponse(renderHtmlPage(env));
      }

      if (url.pathname.startsWith("/api/")) {
        await verifyAppPassword(request, env);
      }

      if (request.method === "POST" && url.pathname === "/api/create-user") {
        const body = await request.json();
        validateCreatePayload(body, env);
        await verifyHCaptcha(body.hCaptchaToken, request, env);

        const token = await getGraphToken(env);
        const mailDomain = getMailDomain(env);
        const userPrincipalName = buildUserPrincipalName(body.userName, mailDomain);
        const usageLocation = (env.DEFAULT_USAGE_LOCATION || "").trim().toUpperCase();
        const availableLicenses = await listAvailableLicenses(token);
        const selectedLicense = availableLicenses[0];
        if (!selectedLicense) {
          throw createError("当前租户中没有可分配的 Exchange 许可证", 400);
        }

        const user = await createGraphUser(token, {
          displayName: body.displayName.trim(),
          userPrincipalName,
          mailNickname: (body.mailNickname || body.userName).trim(),
          password: body.password,
          usageLocation,
          forceChangePasswordNextSignIn: Boolean(body.forceChangePasswordNextSignIn)
        });

        try {
          const license = await assignGraphLicense(token, user.id, {
            skuId: selectedLicense.skuId,
            disabledPlans: selectedLicense.disabledPlans,
            keptPlans: selectedLicense.keptPlans
          });

          return jsonResponse({
            ok: true,
            user: {
              email: user.userPrincipalName,
              password: body.password
            }
          });
        } catch (error) {
          return jsonResponse(
            {
              error: "用户已创建，但许可证分配失败: " + formatError(error),
              partial: true,
              user: {
                id: user.id,
                displayName: user.displayName,
                userPrincipalName: user.userPrincipalName
              }
            },
            error.statusCode || 502
          );
        }
      }

      return jsonResponse({ error: "Not found" }, 404);
    } catch (error) {
      return jsonResponse({ error: formatError(error) }, error.statusCode || 500);
    }
  }
};

async function verifyAppPassword(request, env) {
  if (!env.APP_PASSWORD) {
    throw createError("缺少 APP_PASSWORD 配置", 500);
  }

  let candidate = request.headers.get("x-app-password");

  if (!candidate && request.method !== "GET") {
    try {
      const clone = request.clone();
      const body = await clone.json();
      candidate = body.appPassword;
    } catch {
      candidate = "";
    }
  }

  if (!candidate || candidate !== env.APP_PASSWORD) {
    throw createError("访问密码错误", 401);
  }
}

function validateCreatePayload(body, env) {
  const requiredFields = ["displayName", "userName", "password", "hCaptchaToken"];
  for (const field of requiredFields) {
    if (!body?.[field] || typeof body[field] !== "string" || !body[field].trim()) {
      throw createError("缺少必填字段: " + field, 400);
    }
  }

  if (body.userName.includes("@")) {
    throw createError("userName 只需要填写 @ 前面的账号部分", 400);
  }

  const usageLocation = (env.DEFAULT_USAGE_LOCATION || "").trim();
  if (!usageLocation) {
    throw createError("必须在 Worker 环境变量中配置 DEFAULT_USAGE_LOCATION", 400);
  }

  getMailDomain(env);
  validateBlockedUserName(body.userName, env);
}

async function getGraphToken(env) {
  const tenantId = env.AZURE_TENANT_ID;
  const clientId = env.AZURE_CLIENT_ID;
  const clientSecret = env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw createError("缺少 Azure / Graph 配置，请设置 AZURE_TENANT_ID、AZURE_CLIENT_ID、AZURE_CLIENT_SECRET", 500);
  }

  const response = await fetch(
    "https://login.microsoftonline.com/" + encodeURIComponent(tenantId) + "/oauth2/v2.0/token",
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials"
      })
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw createError("获取 Graph Token 失败: " + (data.error_description || data.error || response.statusText), response.status);
  }

  return data.access_token;
}

async function listAvailableLicenses(token) {
  const data = await graphRequest(token, "https://graph.microsoft.com/v1.0/subscribedSkus?$select=skuId,skuPartNumber,consumedUnits,prepaidUnits,capabilityStatus,appliesTo,servicePlans");

  return (data.value || [])
    .filter((item) => item.capabilityStatus === "Enabled" && item.appliesTo === "User")
    .map((item) => {
      const enabledUnits = Number(item.prepaidUnits?.enabled || 0);
      const warningUnits = Number(item.prepaidUnits?.warning || 0);
      const consumedUnits = Number(item.consumedUnits || 0);
      const availableUnits = enabledUnits + warningUnits - consumedUnits;
      const servicePlans = Array.isArray(item.servicePlans) ? item.servicePlans : [];
      const keptPlans = servicePlans
        .filter((plan) => shouldKeepExchangePlan(plan.servicePlanName))
        .map((plan) => ({
          servicePlanId: plan.servicePlanId,
          servicePlanName: plan.servicePlanName
        }));
      const disabledPlans = servicePlans
        .filter((plan) => !shouldKeepExchangePlan(plan.servicePlanName))
        .map((plan) => plan.servicePlanId);

      return {
        skuId: item.skuId,
        skuPartNumber: item.skuPartNumber,
        availableUnits,
        keptPlans,
        disabledPlans,
        label: item.skuPartNumber + " | skuId: " + item.skuId + " | Outlook相关服务: " + keptPlans.map((plan) => plan.servicePlanName).join(", ") + " | 可用席位: " + availableUnits
      };
    })
    .filter((item) => item.keptPlans.length > 0)
    .sort((a, b) => b.availableUnits - a.availableUnits);
}

async function createGraphUser(token, payload) {
  return graphRequest(token, "https://graph.microsoft.com/v1.0/users", {
    method: "POST",
    body: {
      accountEnabled: true,
      displayName: payload.displayName,
      mailNickname: payload.mailNickname,
      userPrincipalName: payload.userPrincipalName,
      usageLocation: payload.usageLocation,
      passwordProfile: {
        forceChangePasswordNextSignIn: payload.forceChangePasswordNextSignIn,
        password: payload.password
      }
    }
  });
}

async function assignGraphLicense(token, userId, payload) {
  return graphRequest(
    token,
    "https://graph.microsoft.com/v1.0/users/" + encodeURIComponent(userId) + "/assignLicense",
    {
      method: "POST",
      body: {
        addLicenses: [
          {
            skuId: payload.skuId,
            disabledPlans: payload.disabledPlans
          }
        ],
        removeLicenses: []
      }
    }
  );
}

async function graphRequest(token, url, options = {}) {
  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      authorization: "Bearer " + token,
      "content-type": "application/json"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  const data = text ? safeJsonParse(text) : {};
  if (!response.ok) {
    const graphMessage = data?.error?.message || response.statusText || "Graph API 请求失败";
    throw createError(graphMessage, response.status);
  }

  return data;
}

async function verifyHCaptcha(token, request, env) {
  if (!env.HCAPTCHA_SECRET) {
    throw createError("缺少 HCAPTCHA_SECRET 配置", 500);
  }

  if (!env.HCAPTCHA_SITE_KEY) {
    throw createError("缺少 HCAPTCHA_SITE_KEY 配置", 500);
  }

  const remoteIp =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("x-forwarded-for") ||
    "";

  const response = await fetch("https://api.hcaptcha.com/siteverify", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      secret: env.HCAPTCHA_SECRET,
      response: token,
      remoteip: remoteIp
    })
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw createError("人机验证失败，请重试", 400);
  }
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function shouldKeepExchangePlan(servicePlanName) {
  if (!servicePlanName || typeof servicePlanName !== "string") {
    return false;
  }

  return servicePlanName.startsWith("EXCHANGE");
}

function renderHtmlPage(env) {
  if (!env.HCAPTCHA_SITE_KEY) {
    throw createError("缺少 HCAPTCHA_SITE_KEY 配置", 500);
  }

  return HTML_TEMPLATE.replaceAll("__HCAPTCHA_SITE_KEY__", escapeHtml(env.HCAPTCHA_SITE_KEY));
}

function getMailDomain(env) {
  const domain = (env.MAIL_DOMAIN || "republicofmayo.com").trim().toLowerCase();
  if (!domain || !domain.includes(".")) {
    throw createError("MAIL_DOMAIN 配置不正确", 500);
  }

  return domain;
}

function buildUserPrincipalName(userName, domain) {
  const normalizedUserName = String(userName || "").trim().toLowerCase();
  if (!/^[a-z0-9._-]+$/.test(normalizedUserName)) {
    throw createError("邮箱账号只能包含字母、数字、点、下划线或短横线", 400);
  }

  return normalizedUserName + "@" + domain;
}

function validateBlockedUserName(userName, env) {
  const normalizedUserName = String(userName || "").trim().toLowerCase();
  const blockedPrefixes = getBlockedUserPrefixes(env);

  if (blockedPrefixes.includes(normalizedUserName)) {
    throw createError("该邮箱前缀不允许使用", 400);
  }
}

function getBlockedUserPrefixes(env) {
  const defaultBlockedPrefixes = [
    "admin",
    "administrator",
    "root",
    "system",
    "support",
    "help",
    "info",
    "contact",
    "sales",
    "hr",
    "finance",
    "billing",
    "it",
    "postmaster",
    "abuse",
    "security"
  ];

  const customBlockedPrefixes = String(env.BLOCKED_USER_PREFIXES || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return [...new Set([...defaultBlockedPrefixes, ...customBlockedPrefixes])];
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function htmlResponse(html) {
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function formatError(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
