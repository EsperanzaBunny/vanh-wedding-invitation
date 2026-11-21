import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { wedding, themes, photos } from "./config";
import { readDemo, writeDemo, inviteUrl, request, csv } from "./data";
import "./styles.css";
import "./typography.css";
import EnvelopeOpening from "./EnvelopeOpening";

function Icon({ name, size = 20, ...props }) {
  const paths = {
    heart:
      "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z",
    calendar: "M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z",
    pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
    close: "m6 6 12 12M6 18 18 6",
    check: "m5 12 4 4L19 6",
    copy: "M9 9h12v12H9z M15 5V3H3v12h2",
    chevron: "m8 4 8 8-8 8",
    down: "m6 9 6 6 6-6",
    sun: "M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
    flower: "M12 9c-8-12-14 3-5 4-8 6 4 15 6 6 7 7 14-5 5-7 8-7-5-14-6-3Z",
    mail: "M3 5h18v14H3z m0 0 9 8 9-8",
    download: "M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] || paths.heart} />
    </svg>
  );
}
function Photo({ id, alt, className = "", ...props }) {
  return (
    <img
      className={className}
      src={`/photos/${id}.webp`}
      srcSet={`/photos/${id}-small.webp 600w, /photos/${id}.webp 1333w`}
      sizes="(max-width: 700px) 90vw, 45vw"
      alt={alt}
      width="1333"
      height="2000"
      {...props}
    />
  );
}
function Flourish() {
  return (
    <svg
      className="flourish"
      viewBox="0 0 180 40"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1 20h49c28 0 28-18 40-18s12 18 40 18h49M90 2c-4 13-11 26-28 29m28-29c4 13 11 26 28 29M50 20c10-12 21-13 26-8M130 20c-10-12-21-13-26-8"
        stroke="currentColor"
        strokeWidth=".8"
      />
      <path d="m90 25 4 5-4 5-4-5Z" fill="currentColor" />
    </svg>
  );
}
function App() {
  const params = new URLSearchParams(location.search);
  const [theme, setTheme] = useState(
    themes.some((t) => t.id === params.get("style"))
      ? params.get("style")
      : "glass",
  );
  const [opened, setOpened] = useState(params.has("host"));
  const [introVisible, setIntroVisible] = useState(!params.has("host"));
  const [mode, setMode] = useState("loading");
  const [guest, setGuest] = useState(
    (!params.has("invite") && params.get("guest")?.slice(0, 120)) ||
      "Bạn cùng người thương",
  );
  const [invite, setInvite] = useState(null);
  const [invalid, setInvalid] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [toast, setToast] = useState("");
  const [host, setHost] = useState(params.has("host"));
  const detailRef = useRef(null);
  const token = params.get("invite");
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const u = new URL(location.href);
    u.searchParams.set("style", theme);
    history.replaceState(null, "", u);
  }, [theme]);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const status = await request("?action=status");
        if (!active) return;
        setMode(status.configured ? "live" : "demo");
        if (token) {
          if (!status.configured) {
            setInvalid(
              "Liên kết này cần máy chủ RSVP. Vui lòng liên hệ cô dâu, chú rể.",
            );
            return;
          }
          try {
            const row = await request(`?token=${encodeURIComponent(token)}`);
            if (active) {
              setInvite(row);
              setGuest(row.name);
              setTheme(
                themes.some((t) => t.id === row.style) ? row.style : "glass",
              );
            }
          } catch (err) {
            if (active) setInvalid(err.message);
          }
        }
      } catch (err) {
        if (active) {
          setMode("demo");
          if (token)
            setInvalid(
              "Chưa thể tải thiệp cá nhân. Vui lòng kiểm tra liên kết hoặc thử lại sau.",
            );
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);
  useEffect(() => {
    if (!opened || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.08 },
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [opened]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  const reducedMotion = () =>
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const open = (scroll = false) => {
    setOpened(true);
    if (scroll)
      requestAnimationFrame(() =>
        detailRef.current?.scrollIntoView({
          behavior: reducedMotion() ? "auto" : "smooth",
        }),
      );
  };
  const go = (id) => {
    setOpened(true);
    requestAnimationFrame(() =>
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth" }),
    );
  };
  const finishOpening = () => {
    setOpened(true);
    setIntroVisible(false);
    requestAnimationFrame(() => {
      window.scrollTo?.({ top: 0, behavior: "instant" });
      document.getElementById("main")?.focus({ preventScroll: true });
    });
  };
  useEffect(() => {
    document.title = `${wedding.groom} & ${wedding.bride} · Thiệp cưới`;
  }, []);
  return (
    <>
      <div
        className="invitation-app"
        inert={introVisible ? true : undefined}
        aria-hidden={introVisible ? true : undefined}
      >
        <a className="skip" href="#main">
          Đến nội dung
        </a>
        <header className="header">
          <a className="monogram" href="/" aria-label="Trang chủ">
            {wedding.monogram[0]}
            <i>&</i>
            {wedding.monogram[1]}
            <span>THE WEDDING</span>
          </a>
          <nav aria-label="Điều hướng">
            <button onClick={() => go("story")}>Chuyện chúng mình</button>
            <button onClick={() => go("celebration")}>Ngày chung đôi</button>
            <button className="nav-rsvp" onClick={() => go("rsvp")}>
              Gửi lời hồi đáp <Icon name="mail" size={17} />
            </button>
          </nav>
          <button className="mobile-rsvp" onClick={() => go("rsvp")}>
            RSVP <Icon name="mail" size={17} />
          </button>
        </header>
        {!token && (
          <div className="style-bar">
            <span className="style-caption">CHỌN MỘT CẢM XÚC</span>
            <div className="theme-switch" aria-label="Phong cách thiệp">
              {themes.map((t, i) => (
                <button
                  key={t.id}
                  aria-pressed={theme === t.id}
                  title={t.name}
                  onClick={() => setTheme(t.id)}
                >
                  <span className={`theme-dot ${t.id}`} />
                  <span>{t.label}</span>
                  <span className="theme-technical">{t.name}</span>
                </button>
              ))}
            </div>
            <span className="edition">
              {wedding.isSample
                ? "BẢN MẪU · THÔNG TIN MINH HỌA"
                : "MỘT LỜI MỜI TỪ TRÁI TIM"}
            </span>
          </div>
        )}
        <main id="main" tabIndex="-1">
          <section
            className={`hero ${opened ? "is-open" : ""}`}
            aria-label="Thiệp mời cưới"
          >
            <div className="hero-copy">
              <div className="eyebrow">
                <span /> WE’RE GETTING MARRIED
              </div>
              <h1>
                Một đời,
                <br />
                <em>một người.</em>
              </h1>
              <p className="hero-description">
                Giữa bao điều đẹp đẽ trên đời, thật may vì chúng mình tìm thấy
                nhau.
              </p>
              <div className="couple-names">
                <span className="person-name">{wedding.groom}</span>
                <span className="ampersand">&</span>
                <span className="person-name">{wedding.bride}</span>
              </div>
              <div className="hero-date">
                <span className="date-line" />
                {wedding.dateLabel}
                <span className="date-line" />
              </div>
              <div className="guest-intro">
                <span>TRÂN TRỌNG KÍNH MỜI</span>
                <p>{guest}</p>
              </div>
              {invalid ? (
                <p className="error" role="alert">
                  {invalid}
                </p>
              ) : (
                <button
                  className="primary open-button"
                  aria-haspopup="dialog"
                  onClick={() => setIntroVisible(true)}
                >
                  <Icon name="mail" />
                  Xem lại khoảnh khắc mở thiệp
                  <span className="button-spark">✧</span>
                </button>
              )}
              <p className="interaction-hint">Một lời mời dành riêng cho bạn</p>
            </div>
            <div className="hero-art">
              <div className="arch-outline" />
              <div className="hero-image">
                <Photo id="NHV04979" alt={photos[0].alt} fetchPriority="high" />
                <div className="image-shade" />
                <span className="photo-note">
                  together is a beautiful place to be.
                </span>
              </div>
              <div className="vertical-note">
                A LITTLE PROMISE. A LIFETIME OF LOVE.
              </div>
              <span className="art-star">✧</span>
            </div>
            <div className="hero-bottom">
              <span>MỘT KHỞI ĐẦU MỚI, CÙNG NHAU.</span>
              <button
                onClick={() => open(true)}
                aria-label="Mở thiệp và xem tiếp"
              >
                <Icon name="down" />
              </button>
              <span>
                {themes.find((t) => t.id === theme).name.toUpperCase()} EDITION
              </span>
            </div>
          </section>
          <div
            ref={detailRef}
            id="invitation"
            className={`invitation-body ${opened ? "opened" : ""}`}
            hidden={!opened}
          >
            <section className="intro-section reveal">
              <Flourish />
              <p className="eyebrow">THE BEGINNING OF FOREVER</p>
              <h2>
                Ngày vui sẽ trọn vẹn hơn
                <br />
                <em>khi có bạn.</em>
              </h2>
              <p>
                Chúng mình sắp bắt đầu một hành trình mới.
                <br />
                Và sẽ thật hạnh phúc khi có bạn ở bên,
                <br />
                cùng nâng ly và lưu giữ ngày đặc biệt này.
              </p>
              <span className="signature">
                {wedding.groom} & {wedding.bride}
              </span>
              {wedding.families && (
                <div className="families">
                  <div>
                    <span>NHÀ TRAI</span>
                    {wedding.families.groom.map((name) => (
                      <p key={name}>{name}</p>
                    ))}
                  </div>
                  <div>
                    <span>NHÀ GÁI</span>
                    {wedding.families.bride.map((name) => (
                      <p key={name}>{name}</p>
                    ))}
                  </div>
                </div>
              )}
            </section>
            <section className="story-section section-wrap" id="story">
              <div className="story-photo reveal">
                <Photo id="NHV05847" alt={photos[5].alt} loading="lazy" />
                <span className="photo-script">our kind of forever</span>
              </div>
              <div className="story-copy reveal">
                <p className="eyebrow">CHUYỆN CHÚNG MÌNH</p>
                <h2>
                  Hạnh phúc là
                  <br />
                  <em>có nhau.</em>
                </h2>
                <p>
                  Có những khoảnh khắc chẳng cần nói thành lời. Một ánh nhìn,
                  một bàn tay nắm lấy, một người luôn ở đó.
                </p>
                <p>
                  Chúng mình chọn cùng nhau đi qua những ngày bình thường nhất,
                  để mỗi ngày đều trở thành một điều đặc biệt.
                </p>
                <div className="story-divider">
                  <span />
                  <Icon name="heart" />
                  <span />
                </div>
                <p className="small-note">
                  Và hôm nay, chúng mình chọn mãi mãi.
                </p>
              </div>
            </section>
            <section className="celebration section-wrap" id="celebration">
              <div className="section-heading reveal">
                <p className="eyebrow">SAVE OUR DATE</p>
                <h2>
                  Hẹn bạn ở <em>ngày chung đôi.</em>
                </h2>
                <p>Một ngày để yêu thương, sẻ chia và cùng nhau chúc phúc.</p>
              </div>
              <div className="event-card surface reveal">
                <div className="event-date">
                  <span>
                    THÁNG{" "}
                    {new Intl.DateTimeFormat("vi", {
                      month: "numeric",
                      timeZone: "Asia/Ho_Chi_Minh",
                    }).format(new Date(wedding.date))}
                  </span>
                  <strong>
                    {new Intl.DateTimeFormat("vi", {
                      day: "numeric",
                      timeZone: "Asia/Ho_Chi_Minh",
                    }).format(new Date(wedding.date))}
                  </strong>
                  <span>{new Date(wedding.date).getFullYear()}</span>
                  <Flourish />
                  <p>{wedding.dayLabel}</p>
                  {wedding.lunarDate && (
                    <p className="lunar-date">{wedding.lunarDate}</p>
                  )}
                  <button
                    className="text-button"
                    onClick={() => downloadCalendar(setToast)}
                  >
                    <Icon name="calendar" size={18} />
                    Lưu vào lịch
                  </button>
                </div>
                <div className="event-venue">
                  <p className="eyebrow">LỄ THÀNH HÔN & TIỆC CƯỚI</p>
                  <h3>{wedding.venue}</h3>
                  <p>{wedding.address}</p>
                  <div className="event-time">
                    <Icon name="calendar" />
                    <span>
                      Đón khách lúc <strong>{wedding.arrivalTime}</strong>
                      <br />
                      Cử hành hôn lễ lúc <strong>{wedding.time}</strong>
                    </span>
                  </div>
                  {wedding.mapUrl ? (
                    <a
                      className="secondary"
                      href={wedding.mapUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icon name="pin" />
                      Xem chỉ đường
                    </a>
                  ) : (
                    <p className="helper">
                      Địa chỉ và bản đồ sẽ có trên thiệp chính thức.
                    </p>
                  )}
                </div>
              </div>
              {wedding.venueDiagram && (
                <details className="venue-diagram reveal">
                  <summary>
                    <Icon name="pin" size={18} />
                    Xem sơ đồ địa điểm <Icon name="down" size={18} />
                  </summary>
                  <img
                    src={wedding.venueDiagram}
                    width="939"
                    height="1280"
                    loading="lazy"
                    alt="Sơ đồ Cung Văn hoá Hữu nghị Việt Xô: lối vào chính từ Trần Hưng Đạo, chỗ gửi ô tô và xe máy bên trái; các lối vào khác từ Trần Bình Trọng, Trần Quốc Toản và Yết Kiêu."
                  />
                </details>
              )}
              <div className="timeline reveal">
                {wedding.events.map((event, i) => (
                  <div key={event.time}>
                    <span className="timeline-icon">
                      <Icon name={["flower", "heart", "sun"][i]} />
                    </span>
                    <time>{event.time}</time>
                    <h3>{event.title}</h3>
                    <p>{event.description}</p>
                  </div>
                ))}
              </div>
            </section>
            <section className="gallery-section section-wrap" id="gallery">
              <div className="section-heading reveal">
                <p className="eyebrow">LITTLE MOMENTS, BIG LOVE</p>
                <h2>
                  Những điều <em>mình thương.</em>
                </h2>
                <p>Một chút chúng mình, qua những khung hình.</p>
              </div>
              <div className="gallery-grid">
                {[photos[3], photos[1], photos[4], photos[2]].map(
                  (photo, i) => (
                    <button
                      key={photo.id}
                      className={`gallery-item reveal gallery-${i}`}
                      onClick={() => setLightbox(photo)}
                      aria-label={`Phóng to: ${photo.alt}`}
                    >
                      <Photo id={photo.id} alt={photo.alt} loading="lazy" />
                      <span>{photo.caption}</span>
                    </button>
                  ),
                )}
              </div>
            </section>
            <Rsvp
              mode={mode}
              guest={guest}
              invite={invite}
              token={token}
              invalid={invalid}
              setToast={setToast}
            />
            <section className="closing reveal">
              <Photo id="NHV05629" alt={photos[3].alt} loading="lazy" />
              <div>
                <p className="eyebrow">CAN’T WAIT TO CELEBRATE WITH YOU</p>
                <h2>
                  Hẹn gặp bạn,
                  <br />
                  <em>trong ngày hạnh phúc.</em>
                </h2>
                <Flourish />
                <p>
                  {wedding.groom} & {wedding.bride}
                </p>
              </div>
            </section>
          </div>
        </main>
        <footer>
          <span>
            {wedding.groom} & {wedding.bride} · {wedding.dateLabel}
          </span>
          <span>Được viết bằng tất cả yêu thương.</span>
          <button onClick={() => setHost(true)}>Dành cho chủ tiệc</button>
        </footer>
      </div>
      {introVisible && (
        <EnvelopeOpening
          guest={guest}
          theme={theme}
          onThemeChange={token ? null : setTheme}
          onComplete={finishOpening}
        />
      )}
      {host && (
        <Host
          mode={mode}
          theme={theme}
          onClose={() => {
            setHost(false);
            const url = new URL(location.href);
            url.searchParams.delete("host");
            history.replaceState(null, "", url);
          }}
          setToast={setToast}
        />
      )}
      {lightbox && (
        <Lightbox photo={lightbox} onClose={() => setLightbox(null)} />
      )}
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" />
          {toast}
        </div>
      )}
    </>
  );
}
function downloadCalendar(setToast) {
  const start = new Date(wedding.date);
  const end = new Date(start.getTime() + 4 * 3600000);
  const format = (d) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const escape = (s) =>
    s
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  const text = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//VAnh//Wedding//VI",
    "BEGIN:VEVENT",
    "UID:vanh-wedding-2026@invitation",
    "DTSTAMP:" + format(new Date()),
    "DTSTART:" + format(start),
    "DTEND:" + format(end),
    "SUMMARY:" +
      escape(
        `Đám cưới ${wedding.groom} & ${wedding.bride}${wedding.isSample ? " (BẢN MẪU)" : ""}`,
      ),
    "LOCATION:" + escape(wedding.venue + ", " + wedding.address),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  download(text, "wedding.ics", "text/calendar");
  setToast("Đã tải tệp lịch. Mở tệp để thêm vào lịch của bạn.");
}
function download(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Rsvp({ mode, guest, invite, token, invalid, setToast }) {
  const [name, setName] = useState(guest),
    [attending, setAttending] = useState("yes"),
    [size, setSize] = useState("1"),
    [message, setMessage] = useState(""),
    [state, setState] = useState("idle"),
    [error, setError] = useState("");
  useEffect(() => {
    setName(guest);
    if (invite?.responded_at) {
      setAttending(invite.attending ? "yes" : "no");
      setSize(String(invite.party_size || 1));
      setMessage(invite.message || "");
    }
  }, [guest, invite]);
  const limit = invite?.max_party || 4;
  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Bạn vui lòng điền tên để chúng mình nhận ra bạn nhé.");
      document.getElementById("guest-name").focus();
      return;
    }
    setState("sending");
    try {
      if (mode === "live") {
        if (!token)
          throw new Error(
            "Bạn cần mở liên kết mời cá nhân từ cô dâu, chú rể để gửi hồi đáp.",
          );
        await request("", {
          method: "POST",
          body: JSON.stringify({
            token,
            attending: attending === "yes",
            party_size: attending === "yes" ? Number(size) : 0,
            message,
          }),
        });
      } else {
        const rows = readDemo();
        const idx = rows.findIndex((r) => r.name === name.trim());
        const row = {
          ...(rows[idx] || { id: crypto.randomUUID() }),
          name: name.trim(),
          attending: attending === "yes",
          party_size: attending === "yes" ? Number(size) : 0,
          message,
          responded_at: new Date().toISOString(),
        };
        if (idx >= 0) rows[idx] = row;
        else rows.push(row);
        writeDemo(rows);
      }
      setState("success");
    } catch (err) {
      setError(err.message);
      setState("idle");
    }
  }
  return (
    <section className="rsvp-section section-wrap" id="rsvp">
      <div className="rsvp-copy reveal">
        <p className="eyebrow">A LITTLE NOTE FROM YOU</p>
        <h2>
          Bạn sẽ đến
          <br />
          <em>chung vui chứ?</em>
        </h2>
        <p>
          Một lời hồi đáp nhỏ sẽ giúp chúng mình
          <br />
          chuẩn bị đón bạn thật chu đáo.
        </p>
        {wedding.deadline ? (
          <p className="rsvp-deadline">
            Vui lòng hồi đáp trước <strong>{wedding.deadline}</strong>
          </p>
        ) : (
          <p className="rsvp-deadline">
            Mong sớm nhận được lời hồi đáp từ bạn.
          </p>
        )}
        <Flourish />
        <p className="handwritten">
          Sự hiện diện của bạn
          <br />
          là món quà tuyệt vời nhất.
        </p>
      </div>
      <div className="surface rsvp-card reveal">
        {state === "success" ? (
          <div className="rsvp-success" role="status">
            <span className="success-icon">
              <Icon name="heart" size={32} />
            </span>
            <h3>Cảm ơn {name}!</h3>
            <p>
              {attending === "yes"
                ? "Thật vui vì có bạn cùng chung vui. Hẹn gặp bạn trong ngày đặc biệt!"
                : "Chúng mình đã nhận lời hồi đáp và những yêu thương của bạn."}
            </p>
            {mode !== "live" && (
              <p className="mode-note">
                Bản xem thử: hồi đáp chỉ được lưu trong trình duyệt này, chưa
                gửi đến chủ tiệc.
              </p>
            )}
            <button className="secondary" onClick={() => setState("idle")}>
              Sửa lời hồi đáp
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h3>Gửi một lời hẹn</h3>
            {mode !== "live" && (
              <p className="mode-note">
                {mode === "loading"
                  ? "Đang kiểm tra kết nối RSVP…"
                  : "Chế độ xem thử · Hồi đáp được lưu trên thiết bị này."}
              </p>
            )}
            {mode === "live" && !token && (
              <p className="mode-note">
                Hãy mở liên kết mời cá nhân để gửi hồi đáp.
              </p>
            )}
            <label htmlFor="guest-name">Tên của bạn</label>
            <input
              id="guest-name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              readOnly={Boolean(invite)}
              maxLength={120}
              required
            />
            <fieldset>
              <legend>Bạn có thể tham dự không?</legend>
              <div className="attendance">
                <label className={attending === "yes" ? "selected" : ""}>
                  <input
                    type="radio"
                    name="attending"
                    value="yes"
                    checked={attending === "yes"}
                    onChange={() => setAttending("yes")}
                  />
                  <Icon name="heart" size={18} />
                  Mình sẽ đến
                </label>
                <label className={attending === "no" ? "selected" : ""}>
                  <input
                    type="radio"
                    name="attending"
                    value="no"
                    checked={attending === "no"}
                    onChange={() => setAttending("no")}
                  />
                  Tiếc là mình vắng
                </label>
              </div>
            </fieldset>
            {attending === "yes" && (
              <>
                <label htmlFor="party-size">
                  Số người tham dự <span>(bao gồm bạn)</span>
                </label>
                <select
                  id="party-size"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                >
                  {Array.from({ length: limit }, (_, i) => (
                    <option key={i} value={i + 1}>
                      {i + 1} người
                    </option>
                  ))}
                </select>
              </>
            )}
            <label htmlFor="message">
              Một lời nhắn yêu thương <span>(không bắt buộc)</span>
            </label>
            <textarea
              id="message"
              rows="3"
              placeholder="Gửi đến chúng mình…"
              value={message}
              maxLength={1000}
              onChange={(e) => setMessage(e.target.value)}
            />
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {invalid && (
              <p className="error" role="alert">
                {invalid}
              </p>
            )}
            <button
              className="primary"
              disabled={
                state === "sending" ||
                mode === "loading" ||
                Boolean(invalid) ||
                (mode === "live" && !token)
              }
            >
              <Icon name="mail" size={18} />
              {state === "sending"
                ? "Đang gửi…"
                : mode === "demo"
                  ? "Lưu hồi đáp xem thử"
                  : "Gửi lời hồi đáp"}
            </button>
            <p className="privacy-note">
              Lời hồi đáp và lời nhắn chỉ dành cho cô dâu, chú rể.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
function useDialog(ref, onClose) {
  useEffect(() => {
    const previous = document.activeElement;
    const scroll = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = [
          ...ref.current.querySelectorAll(
            "button,input,select,textarea,a[href]",
          ),
        ].filter((n) => !n.disabled && n.offsetParent !== null);
        const first = nodes[0],
          last = nodes.at(-1);
        if (!nodes.length) {
          e.preventDefault();
          return;
        }
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          last.focus();
          e.preventDefault();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last ||
            document.activeElement === ref.current)
        ) {
          first.focus();
          e.preventDefault();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = scroll;
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, []);
}
function Lightbox({ photo, onClose }) {
  const ref = useRef();
  useDialog(ref, onClose);
  return (
    <div
      className="modal-backdrop lightbox"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        aria-label={photo.alt}
      >
        <button
          className="icon-button close-button"
          onClick={onClose}
          aria-label="Đóng ảnh"
        >
          <Icon name="close" />
        </button>
        <Photo id={photo.id} alt={photo.alt} />
        <p>{photo.caption}</p>
      </div>
    </div>
  );
}
function Host({ mode, theme, onClose, setToast }) {
  const ref = useRef();
  useDialog(ref, onClose);
  const [password, setPassword] = useState(""),
    [authenticated, setAuthenticated] = useState(false),
    [rows, setRows] = useState(mode === "demo" ? readDemo() : []),
    [name, setName] = useState(""),
    [maxParty, setMaxParty] = useState("2"),
    [style, setStyle] = useState(theme),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [generated, setGenerated] = useState(""),
    [query, setQuery] = useState("");
  useEffect(() => {
    if (mode === "demo") setRows(readDemo());
  }, [mode]);
  const refresh = async () => {
    const body = await request("?action=list", { password });
    setRows(body);
  };
  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await refresh();
      setAuthenticated(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function create(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      let row;
      if (mode === "live") {
        row = await request("?action=create", {
          method: "POST",
          password,
          body: JSON.stringify({
            name: name.trim(),
            max_party: Number(maxParty),
            style,
          }),
        });
        await refresh();
      } else {
        row = {
          id: crypto.randomUUID(),
          token: crypto.randomUUID(),
          name: name.trim(),
          max_party: Number(maxParty),
          style,
        };
        const next = [row, ...readDemo()];
        writeDemo(next);
        setRows(next);
      }
      setGenerated(
        inviteUrl(row.token, style, mode === "demo" ? row.name : null),
      );
      setName("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function copy(value) {
    try {
      await navigator.clipboard.writeText(value);
      setToast("Đã sao chép liên kết mời.");
    } catch {
      setGenerated(value);
      setToast("Chọn và sao chép liên kết trong ô bên dưới.");
    }
  }
  const responded = rows.filter((r) => r.responded_at).length,
    coming = rows.reduce((n, r) => n + (r.attending ? r.party_size : 0), 0);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="host-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="host-title"
        tabIndex="-1"
        ref={ref}
      >
        <button
          className="icon-button close-button"
          onClick={onClose}
          aria-label="Đóng quản lý khách"
        >
          <Icon name="close" />
        </button>
        <p className="eyebrow">DÀNH CHO CHỦ TIỆC</p>
        <h2 id="host-title">
          Gửi thiệp, <em>gửi yêu thương.</em>
        </h2>
        <p>Tạo thiệp có tên riêng và theo dõi lời hồi đáp của từng khách.</p>
        {mode === "loading" ? (
          <p role="status">Đang kiểm tra máy chủ…</p>
        ) : mode === "live" && !authenticated ? (
          <form onSubmit={login} className="host-login">
            <label htmlFor="host-password">Mật khẩu chủ tiệc</label>
            <input
              id="host-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button className="primary" disabled={busy}>
              {busy ? "Đang đăng nhập…" : "Mở danh sách khách"}
            </button>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </form>
        ) : (
          <>
            <div className="mode-note">
              {mode === "demo"
                ? "BẢN XEM THỬ · Danh sách và hồi đáp chỉ có trong trình duyệt này. Liên kết xem thử hiển thị tên khách nhưng không xác thực danh tính. Kết nối máy chủ để nhận hồi đáp từ thiết bị khác."
                : "ĐÃ KẾT NỐI · Thiệp dùng liên kết bí mật riêng cho từng khách. Giữ liên kết riêng tư; người có liên kết có thể hồi đáp."}
            </div>
            <div className="host-stats">
              <div>
                <strong>{rows.length}</strong>
                <span>Thiệp đã tạo</span>
              </div>
              <div>
                <strong>{responded}</strong>
                <span>Đã hồi đáp</span>
              </div>
              <div>
                <strong>{coming}</strong>
                <span>Người tham dự</span>
              </div>
            </div>
            <form className="create-form" onSubmit={create}>
              <div>
                <label htmlFor="new-name">Tên hiển thị trên thiệp</label>
                <input
                  id="new-name"
                  placeholder="Ví dụ: Anh Tuấn & Chị Hà"
                  value={name}
                  maxLength={120}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="max-party">Số khách tối đa</label>
                <select
                  id="max-party"
                  value={maxParty}
                  onChange={(e) => setMaxParty(e.target.value)}
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="invite-style">Phong cách thiệp</label>
                <select
                  id="invite-style"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                >
                  {themes.map((t) => (
                    <option value={t.id} key={t.id}>
                      {t.label} · {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <button className="primary" disabled={busy}>
                {busy ? "Đang tạo…" : "Tạo liên kết mời"}
              </button>
            </form>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            {generated && (
              <div className="generated-link">
                <label htmlFor="generated">Liên kết mời vừa tạo</label>
                <div>
                  <input
                    id="generated"
                    readOnly
                    value={generated}
                    onFocus={(e) => e.target.select()}
                  />
                  <button className="secondary" onClick={() => copy(generated)}>
                    <Icon name="copy" />
                    Sao chép
                  </button>
                </div>
                <a href={generated} target="_blank" rel="noreferrer">
                  Xem thiệp trong tab mới
                </a>
              </div>
            )}
            <div className="guest-table-header">
              <div>
                <label className="sr-only" htmlFor="search-guests">
                  Tìm khách mời
                </label>
                <input
                  id="search-guests"
                  type="search"
                  placeholder="Tìm tên khách mời…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <button
                className="secondary"
                onClick={() =>
                  download(csv(rows), "khach-moi.csv", "text/csv;charset=utf-8")
                }
              >
                <Icon name="download" />
                Xuất CSV
              </button>
              {mode === "live" && (
                <button
                  className="secondary"
                  onClick={() =>
                    refresh().catch((err) => setError(err.message))
                  }
                >
                  Làm mới
                </button>
              )}
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Khách mời</th>
                    <th>Hồi đáp</th>
                    <th>Số người</th>
                    <th>Lời nhắn</th>
                    <th>Thiệp</th>
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .filter((r) =>
                      r.name
                        .toLocaleLowerCase("vi")
                        .includes(query.toLocaleLowerCase("vi")),
                    )
                    .map((r) => (
                      <tr key={r.id}>
                        <td>{r.name}</td>
                        <td>
                          <span
                            className={`status ${r.responded_at ? (r.attending ? "yes" : "no") : "pending"}`}
                          >
                            {r.responded_at
                              ? r.attending
                                ? "Sẽ tham dự"
                                : "Vắng mặt"
                              : "Chưa hồi đáp"}
                          </span>
                        </td>
                        <td>{r.party_size ?? "—"}</td>
                        <td>{r.message || "—"}</td>
                        <td>
                          <button
                            className="icon-button"
                            aria-label={`Sao chép thiệp của ${r.name}`}
                            onClick={() =>
                              copy(
                                inviteUrl(
                                  r.token,
                                  r.style || theme,
                                  mode === "demo" ? r.name : null,
                                ),
                              )
                            }
                          >
                            <Icon name="copy" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {rows.length === 0 && (
                <p className="empty-state">
                  Chưa có khách mời. Tạo lời mời đầu tiên ở phía trên.
                </p>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
