# Microsoft 365 用户创建 Worker

这个项目是一个基于 Cloudflare Workers 的管理小工具。

它提供一个简单的网页表单，管理员填写信息后，Worker 会在服务端调用 Microsoft Graph，自动完成下面两件事：

1. 创建一个新的 Microsoft 365 / Microsoft Entra ID 用户
2. 为该用户分配一个包含 `EXCHANGE*` 服务计划的许可证，并禁用同一 SKU 中其他非 Exchange 服务

这个项目适合下面这种场景：

- 你希望快速创建邮箱用户
- 你只想启用 Exchange / Outlook 相关能力
- 你不希望手工在 Microsoft 365 后台逐项勾选服务计划

## 项目结构

- `src/index.js`
  Worker 主程序，包含前端页面、表单提交逻辑、后端 API、Graph 调用与许可证分配逻辑
- `wrangler.toml`
  Cloudflare Workers 配置文件
- `package.json`
  项目依赖与运行脚本

## 工作原理

用户打开 Worker 首页后，会看到一个表单，需要填写：

- 页面访问密码
- 显示名称
- 邮箱前缀
- 邮件别名（可选）
- 初始密码
- 是否首次登录强制改密
- hCaptcha 验证

表单提交后，程序会按下面的顺序执行：

1. 校验 hCaptcha
2. 校验访问密码 `APP_PASSWORD`
3. 使用 Azure 应用凭据向 Microsoft 身份平台获取 Graph access token
4. 读取当前租户可用的订阅 SKU
5. 自动挑选一个包含 `EXCHANGE*` 服务计划的可用许可证
6. 创建 Microsoft 365 用户
7. 调用 `assignLicense`，只保留 Exchange 相关服务计划，禁用其余服务计划

如果用户创建成功，但许可证分配失败，Worker 会尝试自动删除刚创建的用户，并返回“部分成功 / 已回滚”结果，方便管理员确认后重新处理。

## 前置条件

在使用这个 Worker 之前，你需要准备：

### 1. 一个 Cloudflare Workers 环境

你需要能够部署并运行 Cloudflare Worker。

### 2. 一个 Microsoft Entra 应用注册

这个 Worker 通过应用身份调用 Microsoft Graph，因此你需要在 Microsoft Entra 管理中心创建一个应用注册，并为它授予足够的应用权限。

至少需要考虑下面这些 Graph `Application permissions`：

- `User.ReadWrite.All`
- `LicenseAssignment.ReadWrite.All`
- `Organization.Read.All`

授予权限后，还需要执行管理员同意（Grant admin consent）。

### 3. hCaptcha

这个项目在创建用户前要求完成 hCaptcha 验证，因此你需要准备：

- `HCAPTCHA_SITE_KEY`
- `HCAPTCHA_SECRET`

## 环境变量

这个项目依赖多项环境变量。它们不会写死在代码里，而是在 Worker 运行时由 Cloudflare 注入。

### 必填变量

- `AZURE_TENANT_ID`
  Microsoft Entra 租户 ID，用于获取 Graph token

- `AZURE_CLIENT_ID`
  应用注册的 Client ID

- `AZURE_CLIENT_SECRET`
  应用注册的 Client Secret

- `APP_PASSWORD`
  访问页面时使用的管理密码。前端会要求输入，后端会校验它是否正确

- `DEFAULT_USAGE_LOCATION`
  新建用户的 `usageLocation`，必须是两位国家/地区代码，例如 `US`、`CN`、`HK`

- `HCAPTCHA_SITE_KEY`
  hCaptcha 站点公钥。这个值会被渲染到前端页面中，属于可公开信息

- `HCAPTCHA_SECRET`
  hCaptcha 私钥，只能保存在服务端

### 可选变量

- `MAIL_DOMAIN`
  用户邮箱域名。默认值为 `republicofmayo.com`
  域名必须是有效的 DNS 域名格式，例如 `contoso.com`

  例如：
  如果填写的用户名是 `zhangsan`，而 `MAIL_DOMAIN` 是 `contoso.com`，最终邮箱会是 `zhangsan@contoso.com`

- `BLOCKED_USER_PREFIXES`
  额外禁止创建的邮箱前缀，多个值用英文逗号分隔

  例如：
  `ceo,test,service`

程序内置了一组默认禁止前缀，例如：

- `admin`
- `administrator`
- `root`
- `system`
- `support`
- `info`
- `finance`
- `billing`
- `security`

## 本地开发

先安装依赖：

```bash
npm install
```

启动本地开发环境：

```bash
npm run dev
```

启动后，Wrangler 会输出本地访问地址。打开该地址即可看到表单页面。

## 部署

安装依赖：

```bash
npm install
```

部署到 Cloudflare Workers：

```bash
npm run deploy
```

部署成功后，打开 Worker 对应地址即可使用。

## 如何配置密钥与变量

敏感信息建议使用 Wrangler secret 保存，例如：

```bash
npx wrangler secret put AZURE_TENANT_ID
npx wrangler secret put AZURE_CLIENT_ID
npx wrangler secret put AZURE_CLIENT_SECRET
npx wrangler secret put APP_PASSWORD
npx wrangler secret put DEFAULT_USAGE_LOCATION
npx wrangler secret put HCAPTCHA_SECRET
```

像 `HCAPTCHA_SITE_KEY`、`MAIL_DOMAIN` 这类不需要保密的值，也可以放在 `wrangler.toml` 的 `[vars]` 中维护。

## 接口说明

### `GET /`

返回用户创建页面。

### `POST /api/create-user`

创建用户并分配许可证。

请求体是 JSON，包含：

- `appPassword`
- `displayName`
- `userName`
- `mailNickname`
- `password`
- `hCaptchaToken`
- `forceChangePasswordNextSignIn`

其中：

- `userName` 只需要填写邮箱前缀，不要带 `@domain`
- `mailNickname` 可以留空，留空时会自动回退到 `userName`

## 许可证分配逻辑

这个项目不是让管理员手工选择许可证，而是自动处理：

1. 读取租户所有可分配给用户的订阅 SKU
2. 过滤出包含 `EXCHANGE*` 服务计划的 SKU
3. 按剩余可用席位排序
4. 选择第一个可用 SKU
5. 在分配许可证时保留 `EXCHANGE*` 服务计划，禁用其他服务计划

这意味着：

- 它更适合“只开邮箱”的自动化场景
- 它不会保留 Teams、SharePoint、Office 应用等非 Exchange 服务
- 如果租户中没有满足条件的许可证，创建流程会失败
- 如果用户已创建但许可证分配失败，Worker 会尝试删除刚创建的用户，避免留下未授权账号

## 安全注意事项

- 不要把这个页面直接公开给所有人使用
- 至少要启用 `APP_PASSWORD`
- 更推荐额外套一层 Cloudflare Access
- `AZURE_CLIENT_SECRET` 和 `HCAPTCHA_SECRET` 只能保存在服务端
- 页面和接口不会在创建完成后回显初始密码，管理员应通过安全渠道把初始密码交付给用户
- 如果开启了“首次登录强制改密”，用户第一次登录后必须更新密码

## 已知行为与限制

- 当前页面和后端逻辑都写在一个文件中：`src/index.js`
- 当前版本已有覆盖核心创建流程与安全回归场景的自动化测试
- 当前版本不会让管理员手工选择许可证 SKU
- 当前版本只保留名称以 `EXCHANGE` 开头的服务计划

## 参考文档

- Microsoft Graph: Create user
  https://learn.microsoft.com/en-us/graph/api/user-post-users?view=graph-rest-1.0
- Microsoft Graph: Assign license
  https://learn.microsoft.com/en-us/graph/api/user-assignlicense?view=graph-rest-1.0
- Microsoft identity platform: Client credentials flow
  https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-client-creds-grant-flow
- Microsoft Graph: List subscribed SKUs
  https://learn.microsoft.com/en-us/graph/api/subscribedsku-list?view=graph-rest-1.0
