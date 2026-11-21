import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createHandler,
  validateGuest,
  validateRsvp,
  authorized,
  makeStore,
} from "../lib/invitations.js";
import { csv } from "../src/data.js";
const token = "a".repeat(64);
const env = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "server-only",
  HOST_PASSWORD: "test-password",
};
async function call({
  method = "GET",
  url = "",
  body,
  headers = {},
  store,
  config = env,
} = {}) {
  let status, data;
  const res = {
    setHeader() {},
    status(s) {
      status = s;
      return this;
    },
    json(d) {
      data = d;
      return this;
    },
  };
  await createHandler({ env: config, store })(
    { method, url: "/api/invitations" + url, body, headers },
    res,
  );
  return { status, data };
}
test("status identifies demo without leaking settings", async () => {
  assert.deepEqual((await call({ url: "?action=status", config: {} })).data, {
    configured: false,
  });
  assert.equal((await call({ url: "?action=list", config: {} })).status, 503);
});
test("host roster requires authentication", async () => {
  let called = false;
  const store = {
    list: async () => {
      called = true;
      return [];
    },
  };
  assert.equal((await call({ url: "?action=list", store })).status, 401);
  assert.equal(called, false);
  assert.deepEqual(
    (
      await call({
        url: "?action=list",
        store,
        headers: { authorization: "Bearer test-password" },
      })
    ).data,
    [],
  );
});
test("names, themes and party limits are validated", () => {
  assert.deepEqual(
    validateGuest({ name: "  Anh Hà  ", max_party: 2, style: "clay" }),
    { name: "Anh Hà", max_party: 2, style: "clay" },
  );
  for (const value of [
    { name: "", max_party: 2, style: "glass" },
    { name: "A", max_party: 11, style: "glass" },
    { name: "A", max_party: 2, style: "bad" },
  ])
    assert.throws(() => validateGuest(value));
});
test("guest can only retrieve their invitation", async () => {
  let received;
  const store = {
    find: async (t) => {
      received = t;
      return { name: "Anh Hà", max_party: 2 };
    },
  };
  const result = await call({ url: `?token=${token}`, store });
  assert.equal(result.status, 200);
  assert.equal(received, token);
  assert.equal(result.data.name, "Anh Hà");
  assert.equal((await call({ url: "?token=other", store })).status, 400);
  assert.equal(
    (await call({ url: `?token=${token}`, store: { find: async () => null } }))
      .status,
    404,
  );
});
test("RSVP honors party maximum and updates existing invitation", async () => {
  let response;
  const store = {
    find: async () => ({ name: "A", max_party: 2 }),
    respond: async (t, r) => {
      response = { t, ...r };
    },
  };
  const body = { token, attending: true, party_size: 2, message: "Hẹn gặp!" };
  assert.equal((await call({ method: "POST", body, store })).status, 200);
  assert.equal(response.t, token);
  assert.equal(response.party_size, 2);
  assert.ok(response.responded_at);
  assert.equal(
    (await call({ method: "POST", body: { ...body, party_size: 3 }, store }))
      .status,
    400,
  );
  assert.equal(
    (
      await call({
        method: "POST",
        body: { ...body, attending: false, party_size: 0 },
        store,
      })
    ).status,
    200,
  );
  assert.equal(response.party_size, 0);
});
test("invalid submissions and cross-origin writes fail", async () => {
  assert.throws(() =>
    validateRsvp({ attending: "yes", party_size: 1 }, { max_party: 2 }),
  );
  assert.throws(() =>
    validateRsvp(
      { attending: true, party_size: 1, message: "a".repeat(1001) },
      { max_party: 2 },
    ),
  );
  assert.equal((await call({ method: "POST", body: "{broken" })).status, 400);
  assert.equal(
    (
      await call({
        method: "POST",
        body: {},
        headers: { origin: "https://evil.example", host: "invite.example" },
      })
    ).status,
    403,
  );
});
test("host creation produces long random tokens; password checks exact", async () => {
  let payload;
  const store = makeStore(env, async (url, opts) => {
    payload = JSON.parse(opts.body);
    return { ok: true, json: async () => [payload] };
  });
  await store.create({ name: "A", max_party: 2, style: "glass" });
  assert.match(payload.token, /^[a-f0-9]{64}$/);
  assert.ok(authorized("Bearer test-password", env.HOST_PASSWORD));
  assert.ok(!authorized("Bearer wrong", env.HOST_PASSWORD));
  assert.ok(!authorized("Bearer ", ""));
});
test("CSV escapes quotes, line breaks, and spreadsheet formulas", () => {
  const output = csv([
    { name: '=HYPERLINK("bad")', message: "A, B\nC", attending: false },
  ]);
  assert.ok(output.startsWith("\uFEFF"));
  assert.ok(output.includes('"\'=HYPERLINK(""bad"")"'));
  assert.ok(output.includes('"A, B\nC"'));
});

test("current Supabase secret keys use apikey without an invalid JWT bearer", async () => {
  const config = {
    SUPABASE_URL: env.SUPABASE_URL,
    SUPABASE_SECRET_KEY: "sb_secret_test",
    HOST_PASSWORD: env.HOST_PASSWORD,
  };
  assert.deepEqual((await call({ url: "?action=status", config })).data, {
    configured: true,
  });
  let requestedUrl, headers;
  const db = makeStore(config, async (url, options) => {
    requestedUrl = url;
    headers = options.headers;
    return {
      ok: true,
      json: async () => [{ name: "Anh Hà", style: "clay", max_party: 2 }],
    };
  });
  const row = await db.find(token);
  assert.equal(headers.apikey, "sb_secret_test");
  assert.equal(headers.Authorization, undefined);
  assert.equal(row.style, "clay");
  assert.match(requestedUrl, /select=name,style,max_party/);
});
