export const DEMO_KEY = "vanh-invitations-v1";
export function readDemo() {
  try {
    const rows = JSON.parse(localStorage.getItem(DEMO_KEY) || "[]");
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}
export function writeDemo(rows) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(rows));
}
export function inviteUrl(token, style, demoGuest) {
  const url = new URL("/", window.location.origin);
  url.searchParams.set("style", style);
  if (demoGuest) url.searchParams.set("guest", demoGuest);
  else url.searchParams.set("invite", token);
  return url.href;
}
export async function request(path, { password, ...options } = {}) {
  const response = await fetch(`/api/invitations${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(password ? { Authorization: `Bearer ${password}` } : {}),
      ...options.headers,
    },
  });
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error("Máy chủ RSVP chưa được cấu hình.");
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error || "Không thể kết nối. Vui lòng thử lại.");
  return body;
}
export function csv(rows) {
  const escape = (v) =>
    '"' +
    String(v ?? "")
      .replace(/"/g, '""')
      .replace(/^[=+@\-\t\r]/, "'$&") +
    '"';
  return (
    "\uFEFF" +
    [
      ["Tên khách", "Trạng thái", "Số người", "Lời nhắn", "Cập nhật"],
      ...rows.map((r) => [
        r.name,
        r.attending === true
          ? "Tham dự"
          : r.attending === false
            ? "Vắng mặt"
            : "Chưa trả lời",
        r.party_size || "",
        r.message || "",
        r.responded_at || "",
      ]),
    ]
      .map((row) => row.map(escape).join(","))
      .join("\r\n")
  );
}
