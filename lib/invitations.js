import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (status, message) => {
  throw new HttpError(status, message);
};
export function validateGuest(input) {
  if (
    !input ||
    typeof input.name !== "string" ||
    !input.name.trim() ||
    input.name.trim().length > 120
  )
    fail(400, "Tên khách phải có từ 1 đến 120 ký tự.");
  if (
    !Number.isInteger(input.max_party) ||
    input.max_party < 1 ||
    input.max_party > 10
  )
    fail(400, "Số khách tối đa phải từ 1 đến 10.");
  if (!["glass", "clay", "neu"].includes(input.style))
    fail(400, "Phong cách thiệp không hợp lệ.");
  return {
    name: input.name.trim(),
    max_party: input.max_party,
    style: input.style,
  };
}
export function validateToken(token) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))
    fail(400, "Liên kết mời không hợp lệ.");
  return token;
}
export function validateRsvp(input, guest) {
  if (typeof input.attending !== "boolean")
    fail(400, "Vui lòng chọn có tham dự hay không.");
  if (
    !Number.isInteger(input.party_size) ||
    input.party_size < 0 ||
    input.party_size > guest.max_party ||
    (input.attending && input.party_size < 1) ||
    (!input.attending && input.party_size !== 0)
  )
    fail(
      400,
      `Số người tham dự phải phù hợp với lời mời (tối đa ${guest.max_party}).`,
    );
  if (
    input.message !== undefined &&
    (typeof input.message !== "string" || input.message.length > 1000)
  )
    fail(400, "Lời nhắn tối đa 1.000 ký tự.");
  return {
    attending: input.attending,
    party_size: input.party_size,
    message: (input.message || "").trim(),
    responded_at: new Date().toISOString(),
  };
}
export function authorized(header, password) {
  if (!password || typeof header !== "string") return false;
  const hash = (value) => createHash("sha256").update(value).digest();
  return timingSafeEqual(hash(header), hash(`Bearer ${password}`));
}
export function makeStore(env, fetcher = fetch) {
  const base = env.SUPABASE_URL?.replace(/\/$/, "");
  const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  async function db(query, options = {}) {
    const result = await fetcher(`${base}/rest/v1/invitations${query}`, {
      ...options,
      signal: AbortSignal.timeout(10000),
      headers: {
        apikey: key,
        ...(key.startsWith("sb_secret_")
          ? {}
          : { Authorization: `Bearer ${key}` }),
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...options.headers,
      },
    });
    if (!result.ok)
      throw new HttpError(
        502,
        "Không thể lưu hoặc tải danh sách khách. Vui lòng thử lại.",
      );
    return result.json();
  }
  return {
    list: () => db("?select=*&order=created_at.desc&limit=10000"),
    find: async (token) =>
      (
        await db(
          `?token=eq.${token}&select=name,style,max_party,attending,party_size,message,responded_at&limit=1`,
        )
      )[0],
    create: async (guest) =>
      (
        await db("", {
          method: "POST",
          body: JSON.stringify({
            ...guest,
            token: randomBytes(32).toString("hex"),
          }),
        })
      )[0],
    respond: async (token, data) => {
      await db(`?token=eq.${token}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
  };
}
export function createHandler({ env = process.env, store } = {}) {
  return async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    const send = (status, data) => res.status(status).json(data);
    try {
      const url = new URL(req.url, "https://invitation.local");
      const action = url.searchParams.get("action");
      if (!["GET", "POST"].includes(req.method)) {
        res.setHeader("Allow", "GET, POST");
        return send(405, { error: "Phương thức không được hỗ trợ." });
      }
      const configured = Boolean(
        env.SUPABASE_URL &&
        (env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY) &&
        env.HOST_PASSWORD,
      );
      if (req.method === "GET" && action === "status")
        return send(200, { configured });
      if (!configured) fail(503, "Máy chủ RSVP chưa được cấu hình.");
      // Refuse cross-origin browser writes. Non-browser API clients still need a secret/token.
      const origin = req.headers.origin;
      if (req.method === "POST" && origin) {
        const host = req.headers["x-forwarded-host"] || req.headers.host;
        if (new URL(origin).host !== host) fail(403, "Yêu cầu không hợp lệ.");
      }
      const db = store || makeStore(env);
      if (action === "list" || action === "create") {
        if (!authorized(req.headers.authorization, env.HOST_PASSWORD))
          fail(401, "Mật khẩu chủ tiệc không đúng.");
        if (action === "list" && req.method === "GET")
          return send(200, await db.list());
        if (action === "create" && req.method === "POST") {
          const input = parseBody(req.body);
          return send(201, await db.create(validateGuest(input)));
        }
        fail(405, "Phương thức không được hỗ trợ.");
      }
      if (action) fail(400, "Thao tác không hợp lệ.");
      const input = req.method === "POST" ? parseBody(req.body) : null;
      const token = validateToken(
        req.method === "GET" ? url.searchParams.get("token") : input.token,
      );
      const guest = await db.find(token);
      if (!guest)
        fail(
          404,
          "Không tìm thấy lời mời. Vui lòng kiểm tra liên kết với cô dâu, chú rể.",
        );
      if (req.method === "GET") return send(200, guest);
      await db.respond(token, validateRsvp(input, guest));
      return send(200, { ok: true });
    } catch (error) {
      return send(error.status || 500, {
        error: error.status
          ? error.message
          : "Kết nối gián đoạn. Vui lòng thử lại sau.",
      });
    }
  };
}
function parseBody(body) {
  try {
    const value = typeof body === "string" ? JSON.parse(body) : body;
    if (!value || typeof value !== "object" || Array.isArray(value))
      fail(400, "Dữ liệu không hợp lệ.");
    return value;
  } catch {
    fail(400, "Dữ liệu không hợp lệ.");
  }
}
