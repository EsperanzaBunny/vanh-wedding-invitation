import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
export class HttpError extends Error {
  constructor(status, message, code = "RSVP_REQUEST_FAILED") {
    super(message);
    this.status = status;
    this.code = code;
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
  const rawUrl = env.SUPABASE_URL?.trim();
  let projectUrl;
  try {
    projectUrl = new URL(rawUrl);
  } catch {
    throw new HttpError(
      503,
      "SUPABASE_URL không hợp lệ. Hãy dùng URL dự án dạng https://<project-ref>.supabase.co.",
      "SUPABASE_URL_INVALID",
    );
  }
  if (
    !["https:", "http:"].includes(projectUrl.protocol) ||
    projectUrl.username ||
    projectUrl.password ||
    !["", "/"].includes(projectUrl.pathname) ||
    projectUrl.search ||
    projectUrl.hash
  ) {
    throw new HttpError(
      503,
      "SUPABASE_URL phải là URL gốc của dự án dạng https://<project-ref>.supabase.co. Sao chép Project URL từ phần Connect/API của Supabase.",
      "SUPABASE_URL_INVALID",
    );
  }
  const base = projectUrl.origin;
  const key =
    env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key || key.startsWith("sb_publishable_")) {
    throw new HttpError(
      503,
      "SUPABASE_SECRET_KEY cần dùng secret key bắt đầu bằng sb_secret_ hoặc service-role key cũ.",
      "SUPABASE_KEY_INVALID",
    );
  }
  async function db(query, options = {}) {
    let result;
    try {
      result = await fetcher(`${base}/rest/v1/invitations${query}`, {
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
    } catch (error) {
      if (["AbortError", "TimeoutError"].includes(error.name))
        throw new HttpError(
          504,
          "Supabase phản hồi quá chậm. Kiểm tra dự án đang hoạt động rồi thử lại.",
          "SUPABASE_TIMEOUT",
        );
      throw new HttpError(
        502,
        "Không kết nối được Supabase. Kiểm tra SUPABASE_URL là Project URL đúng và dự án Supabase đang hoạt động.",
        "SUPABASE_UNREACHABLE",
      );
    }
    if (!result.ok) {
      const body = await result.json().catch(() => null);
      let code = "SUPABASE_REQUEST_FAILED";
      let message = `Supabase trả về HTTP ${result.status}. Kiểm tra trạng thái dự án trong Supabase.`;
      if (result.status === 401) {
        code = "SUPABASE_KEY_REJECTED";
        message =
          "Supabase từ chối API key. Kiểm tra SUPABASE_SECRET_KEY là secret key thuộc cùng dự án với SUPABASE_URL.";
      } else if (["PGRST205", "42P01"].includes(body?.code)) {
        code = "INVITATIONS_TABLE_MISSING";
        message =
          "Chưa tìm thấy bảng invitations. Chạy toàn bộ tệp supabase/schema.sql trong SQL Editor của đúng dự án Supabase.";
      } else if (result.status === 403 || body?.code === "42501") {
        code = "SUPABASE_PERMISSION_DENIED";
        message =
          "Supabase từ chối quyền truy cập bảng invitations. Kiểm tra secret key và chạy lại supabase/schema.sql để cấp quyền cho service_role.";
      } else if (result.status === 404) {
        code = "SUPABASE_RESOURCE_NOT_FOUND";
        message =
          "Không tìm thấy dữ liệu khách mời. Kiểm tra SUPABASE_URL và chạy supabase/schema.sql trong đúng dự án.";
      }
      const failure = new HttpError(502, message, code);
      failure.upstreamStatus = result.status;
      throw failure;
    }
    let rows;
    try {
      rows = await result.json();
    } catch {
      throw new HttpError(
        502,
        "Supabase không trả về dữ liệu JSON. Kiểm tra SUPABASE_URL là Project URL, ví dụ https://<project-ref>.supabase.co.",
        "SUPABASE_INVALID_RESPONSE",
      );
    }
    if (!Array.isArray(rows))
      throw new HttpError(
        502,
        "Phản hồi Supabase không đúng định dạng danh sách khách. Kiểm tra Project URL và Data API.",
        "SUPABASE_INVALID_RESPONSE",
      );
    return rows;
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
export function createHandler({
  env = process.env,
  store,
  logger = console,
} = {}) {
  return async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    const send = (status, data) => res.status(status).json(data);
    let authenticatedHost = false;
    try {
      const url = new URL(req.url, "https://invitation.local");
      const action = url.searchParams.get("action");
      if (!["GET", "POST"].includes(req.method)) {
        res.setHeader("Allow", "GET, POST");
        return send(405, { error: "Phương thức không được hỗ trợ." });
      }
      // Only return known variable names, never credentials or environment values.
      const missing = [];
      if (!env.SUPABASE_URL) missing.push("SUPABASE_URL");
      if (!(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY))
        missing.push("SUPABASE_SECRET_KEY");
      if (!env.HOST_PASSWORD) missing.push("HOST_PASSWORD");
      const configured = missing.length === 0;
      if (req.method === "GET" && action === "status")
        return send(200, { configured, ...(!configured ? { missing } : {}) });
      if (!configured) fail(503, "Máy chủ RSVP chưa được cấu hình.");
      // Refuse cross-origin browser writes. Non-browser API clients still need a secret/token.
      const origin = req.headers.origin;
      if (req.method === "POST" && origin) {
        const host = req.headers["x-forwarded-host"] || req.headers.host;
        if (new URL(origin).host !== host) fail(403, "Yêu cầu không hợp lệ.");
      }
      if (action === "list" || action === "create") {
        if (!authorized(req.headers.authorization, env.HOST_PASSWORD))
          fail(401, "Mật khẩu chủ tiệc không đúng.");
        authenticatedHost = true;
        const db = store || makeStore(env);
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
      const db = store || makeStore(env);
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
      const known = error instanceof HttpError;
      const status = known ? error.status : 500;
      const code = known ? error.code : "INTERNAL_ERROR";
      if (status >= 500) {
        // Log classifications only; raw exceptions may contain URLs, tokens or keys.
        logger.error("RSVP_API_ERROR", {
          code,
          ...(Number.isInteger(error.upstreamStatus)
            ? { upstreamStatus: error.upstreamStatus }
            : {}),
        });
      }
      return send(status, {
        error: known
          ? error.message
          : "Kết nối gián đoạn. Vui lòng thử lại sau.",
        code,
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
