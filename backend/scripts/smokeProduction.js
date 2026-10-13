const baseUrl = (process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

const checks = [];

const check = async (name, path, options = {}, expected = [200]) => {
  const started = Date.now();
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      redirect: "manual",
      ...options,
      headers: { Accept: "application/json", ...options.headers },
    });
    const ok = expected.includes(response.status);
    checks.push({ name, ok, status: response.status, ms: Date.now() - started });
    return response;
  } catch (error) {
    checks.push({ name, ok: false, status: "NETWORK", ms: Date.now() - started, detail: error.message });
    return null;
  }
};

const loginAndCheck = async (label, identifier, password, protectedPath) => {
  if (!identifier || !password) {
    checks.push({ name: `${label} authenticated workflow`, ok: true, status: "SKIPPED", ms: 0 });
    return;
  }

  const response = await check(
    `${label} login`,
    "/api/v1/users/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    },
  );
  if (!response?.ok) return;
  const payload = await response.json();
  const token = payload.token;
  if (!token) {
    checks.push({ name: `${label} token`, ok: false, status: "MISSING", ms: 0 });
    return;
  }
  await check(`${label} protected API`, protectedPath, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

await check("Liveness", "/health/liveness");
await check("Database and Redis readiness", "/health/readiness");
await check("React application", "/", { headers: { Accept: "text/html" } });
await check("Public fleet API", "/api/v1/vehicles?limit=1");
await check("Payment configuration", "/api/config");

await loginAndCheck("Customer", process.env.SMOKE_CUSTOMER_EMAIL, process.env.SMOKE_CUSTOMER_PASSWORD, "/api/v1/users/me");
await loginAndCheck("Company", process.env.SMOKE_COMPANY_EMAIL, process.env.SMOKE_COMPANY_PASSWORD, "/api/v1/companies/dashboard");
await loginAndCheck("Admin", process.env.SMOKE_ADMIN_EMAIL, process.env.SMOKE_ADMIN_PASSWORD, "/api/v1/admin/companies?limit=1");

for (const result of checks) {
  const marker = result.ok ? "PASS" : "FAIL";
  console.log(`${marker.padEnd(4)} ${result.name.padEnd(34)} ${String(result.status).padEnd(7)} ${result.ms}ms${result.detail ? ` — ${result.detail}` : ""}`);
}

const failed = checks.filter((result) => !result.ok);
if (failed.length > 0) {
  console.error(`\nSmoke test failed: ${failed.length} check(s) did not pass.`);
  process.exitCode = 1;
} else {
  console.log("\nSmoke test passed. Skipped role checks require SMOKE_* credentials for full certification.");
}
