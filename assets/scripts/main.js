import { db } from "./app.js";
const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function createImage(src, alt, width, height) {
  const img = createElement("img");
  Object.assign(img, { src, alt, width, height });
  return img;
}

function plural(n, [one, few, many]) {
  const mod10 = n % 10,
    mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
    return `${n} ${few}`;
  return `${n} ${many}`;
}
const daysLabel = (n) => plural(n, ["день", "дні", "днів"]);
const nightsLabel = (n) => plural(n, ["ніч", "ночі", "ночей"]);

const LOAD_ERROR = "Перевірте з'єднання з інтернетом і оновіть сторінку.";

function normalizeTour(row) {
  return {
    ...row,
    country: row.countries?.name ?? "",
    alt: row.image_alt,
    rating: Number(row.rating),
  };
}

function initMenu() {
  const toggle = qs("#iconBlock");
  const menu = qs("#mainMenu");
  if (!toggle || !menu) return null;

  const setMenu = (open) => {
    menu.classList.toggle("menu-open", open);
    qs("#iconOpen")?.classList.toggle("d-none", open);
    qs("#iconClose")?.classList.toggle("d-none", !open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Закрити меню" : "Відкрити меню");
  };

  toggle.addEventListener("click", () =>
    setMenu(!menu.classList.contains("menu-open")),
  );
  menu.addEventListener("click", (e) => {
    if (e.target.closest("a")) setMenu(false);
  });
  matchMedia("(min-width: 1152px)").addEventListener("change", (e) => {
    if (e.matches) setMenu(false);
  });
  return setMenu;
}

const closeMenu = initMenu();

function initModals(setMenu) {
  const modals = qsa(".modal-overlay");
  let lastFocus = null;

  const close = (modal) => {
    if (modal.classList.contains("d-none")) return;
    modal.classList.add("d-none");
    if (!qs(".modal-overlay:not(.d-none)")) {
      document.body.classList.remove("no-scroll");
      lastFocus?.focus();
    }
  };
  const open = (id) => {
    const modal = document.getElementById(id);
    if (!modal) return;
    if (!qs(".modal-overlay:not(.d-none)")) lastFocus = document.activeElement;
    modals.forEach(close);
    setMenu?.(false);
    modal.classList.remove("d-none");
    document.body.classList.add("no-scroll");
    qs("input", modal)?.focus();
  };
  const on = (selector, handler) =>
    qsa(selector).forEach((el) => el.addEventListener("click", handler));

  on("#loginBtn, .mobile-login, #toLogin", () => open("loginModal"));
  on("#signupBtn, .mobile-signup, #toSignUp", () => open("signupModal"));
  on("[data-modal]", (e) => open(e.currentTarget.dataset.modal));
  on(".modal-close", (e) => close(e.currentTarget.closest(".modal-overlay")));

  modals.forEach((modal) =>
    modal.addEventListener("click", (e) => {
      if (e.target === modal) close(modal);
    }),
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") modals.forEach(close);
  });

  return { open, close };
}

const modals = initModals(closeMenu);

function getError(field) {
  const { validity } = field;
  if (validity.valid) return "";
  if (validity.valueMissing) {
    return field.type === "checkbox"
      ? "Потрібна ваша згода"
      : "Заповніть це поле";
  }
  if (validity.typeMismatch) {
    return field.type === "email"
      ? "Введіть коректний email"
      : "Невірне значення";
  }
  if (validity.tooShort) return `Мінімум ${field.minLength} символів`;
  if (validity.rangeUnderflow) return `Мінімум ${field.min}`;
  if (validity.rangeOverflow) return `Максимум ${field.max}`;
  if (validity.stepMismatch) return `Крок значення — ${field.step}`;
  if (validity.patternMismatch) return field.dataset.error || "Невірний формат";
  return field.validationMessage;
}

function setFieldError(field, message) {
  const key = field.id || field.name;
  const anchor = field.closest("label") || field;
  let box = anchor.nextElementSibling;
  if (!box?.classList.contains("field-error")) {
    box = document.createElement("p");
    box.className = "field-error";
    box.id = `${key}-error`;
    anchor.after(box);
  }
  box.textContent = message;
  field.setAttribute("aria-invalid", String(Boolean(message)));
  if (message) field.setAttribute("aria-describedby", box.id);
  else field.removeAttribute("aria-describedby");
}

function showStatus(form, text, isError = false) {
  let status = qs(".form-status", form);
  if (!status) {
    status = document.createElement("p");
    status.className = "form-status";
    status.setAttribute("role", "status");
    form.append(status);
  }
  status.textContent = text;
  status.classList.toggle("form-status--error", isError);
}

function initFormValidation() {
  qsa("form[data-validate]").forEach((form) => {
    form.noValidate = true;
    const fields = qsa("input, select, textarea", form);

    fields.forEach((field) => {
      field.addEventListener("input", () => {
        if (field.getAttribute("aria-invalid") === "true") {
          setFieldError(field, getError(field));
        }
      });
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      let firstInvalid = null;
      fields.forEach((field) => {
        const message = getError(field);
        setFieldError(field, message);
        if (message && !firstInvalid) firstInvalid = field;
      });
      if (firstInvalid) {
        qs(".form-status", form)?.remove();
        firstInvalid.focus();
        return;
      }

      const formAction = getFormAction(form);
      if (formAction) {
        const button = qs('[type="submit"]', form);
        button.disabled = true;
        qs(".form-status", form)?.remove();
        try {
          await formAction(form);
        } catch (error) {
          console.error("Помилка запиту:", error);
          showStatus(form, describeError(error), true);
        } finally {
          button.disabled = false;
        }
        return;
      }

      form.reset();
      showStatus(form, form.dataset.success || "Дякуємо! Дані надіслано.");
    });
  });
}

initFormValidation();

const ERROR_MESSAGES = {
  invalid_credentials: "Неправильний email або пароль.",
  user_already_exists: "Користувач із таким email уже зареєстрований.",
  email_exists: "Користувач із таким email уже зареєстрований.",
  weak_password: "Пароль надто простий. Використайте щонайменше 8 символів.",
  email_not_confirmed: "Спершу підтвердьте email за посиланням у листі.",
  over_request_rate_limit:
    "Забагато спроб. Зачекайте хвилину й спробуйте ще раз.",
  over_email_send_rate_limit:
    "Забагато спроб. Зачекайте хвилину й спробуйте ще раз.",
  42501: "Недостатньо прав. Увійдіть як адміністратор.",
  23503: "Цей запис пов'язаний з іншими даними, тому його не можна змінити.",
  23514: "Перевірте значення полів: деякі з них поза допустимими межами.",
  "22P02": "Невірний формат даних.",
};

function describeError(error) {
  return (
    ERROR_MESSAGES[error?.code] ??
    "Не вдалося виконати запит. Перевірте інтернет і спробуйте ще раз."
  );
}

function getFormAction(form) {
  if (form.closest("#loginModal")) return logIn;
  if (form.closest("#signupModal")) return signUp;
  if (form.matches("#tourForm")) return saveTour;
  if (form.matches("#bookingForm")) return sendBooking;
  return null;
}

async function getUserRole() {
  const {
    data: { session },
  } = await db.auth.getSession();
  if (!session) return null;
  const { data, error } = await db
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();
  if (error) throw error;
  return data?.role ?? null;
}

function closeModalOf(form) {
  qs(".modal-close", form.closest(".modal-overlay"))?.click();
}

async function logIn(form) {
  const { email, password } = Object.fromEntries(new FormData(form));
  const { error } = await db.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  form.reset();
  closeModalOf(form);
}

async function signUp(form) {
  const { name, surname, email, password } = Object.fromEntries(
    new FormData(form),
  );
  const { data, error } = await db.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { name: `${name.trim()} ${surname.trim()}` } },
  });
  if (error) throw error;
  form.reset();
  if (!data.session) {
    showStatus(form, "Майже готово! Підтвердіть email за посиланням у листі.");
    return;
  }
  closeModalOf(form);
}

const API_URL = "https://travellian-worldwide.onrender.com";

function fillBookingDates() {
  const select = qs("#booking-date");
  if (!select) return;
  const date = new Date();
  date.setDate(date.getDate() + 7 + ((6 - date.getDay() + 7) % 7));
  const pad = (n) => String(n).padStart(2, "0");
  for (let i = 0; i < 6; i++) {
    const [y, m, d] = [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
    ];
    select.append(new Option(`${d}.${m}.${y}`, `${y}-${m}-${d}`));
    date.setDate(date.getDate() + 7);
  }
}

async function sendBooking(form) {
  const { name, phone, email, date, guests, comment } = Object.fromEntries(
    new FormData(form),
  );
  showStatus(form, "Надсилаємо заявку… Перший запит може тривати до хвилини.");

  const response = await fetch(`${API_URL}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tourId: Number(form.dataset.tourId),
      name,
      phone,
      email,
      date,
      guests: Number(guests),
      comment,
    }),
    signal: AbortSignal.timeout(70000),
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    Object.entries(result.fields ?? {}).forEach(([key, message]) => {
      const field = form.elements[key];
      if (field) setFieldError(field, message);
    });
    showStatus(
      form,
      result.error || "Не вдалося надіслати заявку. Спробуйте ще раз.",
      true,
    );
    return;
  }

  form.reset();
  showStatus(
    form,
    `Заявку №${result.id} на тур «${result.tour}» надіслано! Менеджер зв'яжеться з вами протягом години.`,
  );
}

function initAuthUI() {
  const actions = qs(".nav-actions");
  const menu = qs("#mainMenu");
  if (!actions || !menu) return;

  const userName = createElement("span", "nav-user");
  const adminLink = createElement("a", "btn btn-outline", "Адмін-панель");
  adminLink.href = "admin.html";
  const logoutBtn = createElement("button", "btn btn-outline", "Вийти");
  logoutBtn.type = "button";
  actions.append(userName, adminLink, logoutBtn);

  const mobileUser = createElement("li", "menu-mobile-btn menu-user");
  const mobileAdmin = createElement("li", "menu-mobile-btn");
  const mobileAdminLink = createElement("a", "", "Адмін-панель");
  mobileAdminLink.href = "admin.html";
  mobileAdmin.append(mobileAdminLink);
  const mobileItem = createElement("li", "menu-mobile-btn");
  const mobileLogout = createElement(
    "button",
    "btn btn-outline mobile-logout",
    "Вийти",
  );
  mobileLogout.type = "button";
  mobileItem.append(mobileLogout);
  menu.append(mobileUser, mobileAdmin, mobileItem);

  const guestOnly = qsa(
    "#loginBtn, #signupBtn, .mobile-login, .mobile-signup",
  ).map((button) => button.closest(".menu-mobile-btn") ?? button);
  const userOnly = [userName, logoutBtn, mobileUser, mobileItem];
  const adminOnly = [adminLink, mobileAdmin];

  const showAdminLinks = async () => {
    const role = await getUserRole().catch(() => null);
    adminOnly.forEach((element) => (element.hidden = role !== "admin"));
  };

  const render = (user) => {
    guestOnly.forEach((element) => (element.hidden = Boolean(user)));
    userOnly.forEach((element) => (element.hidden = !user));
    adminOnly.forEach((element) => (element.hidden = true));
    if (!user) return;
    setTimeout(showAdminLinks);
    const name = user.user_metadata?.name || user.email;
    userName.textContent = name;
    mobileUser.textContent = name;
  };

  const logOut = async () => {
    const { error } = await db.auth.signOut();
    if (error) console.error("Помилка виходу:", error);
  };
  logoutBtn.addEventListener("click", logOut);
  mobileLogout.addEventListener("click", logOut);

  render(null);
  db.auth.onAuthStateChange((_event, session) => render(session?.user ?? null));
}

initAuthUI();

function initTabs() {
  qsa('[role="tablist"]').forEach((list) => {
    const tabs = qsa('[role="tab"]', list);

    const activate = (active) => {
      tabs.forEach((tab) => {
        const isActive = tab === active;
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-selected", String(isActive));
        tab.tabIndex = isActive ? 0 : -1;
        const panel = document.getElementById(
          tab.getAttribute("aria-controls"),
        );
        if (panel) panel.hidden = !isActive;
      });
    };

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => activate(tab));
      tab.addEventListener("keydown", (e) => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!step) return;
        const visible = tabs.filter((t) => !t.hidden);
        const index = visible.indexOf(tab);
        const next = visible[(index + step + visible.length) % visible.length];
        activate(next);
        next.focus();
      });
    });
  });
}

initTabs();

function initGallery() {
  const photo = qs(".tour-photo");
  const thumbs = qs(".tour-thumbs");
  if (!photo || !thumbs) return;

  thumbs.addEventListener("click", (e) => {
    const thumb = e.target.closest(".tour-thumb");
    if (!thumb) return;
    const image = qs("img", thumb);
    const mainImage = qs("img", photo);
    mainImage.src = image.src;
    mainImage.alt = image.alt;
    qs(".tour-photo-label", photo).textContent = qs(
      ".tour-thumb-label",
      thumb,
    ).textContent;
    qsa(".tour-thumb", thumbs).forEach((t) =>
      t.classList.toggle("is-active", t === thumb),
    );
  });
}

initGallery();

function initAccordion() {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const duration = reduceMotion ? 0 : 350;
  const easing = "ease";

  const isOpen = (item) => item.open && !item.classList.contains("is-closing");

  const toggleItem = (item, open) => {
    const summary = qs("summary", item);
    const start = item.offsetHeight;
    item.getAnimations().forEach((animation) => animation.cancel());

    let end;
    if (open) {
      item.classList.remove("is-closing");
      item.open = true;
      end = item.offsetHeight;
      qs(".faq-answer", item)?.animate(
        { opacity: [0, 1] },
        { duration, easing },
      );
    } else {
      item.classList.add("is-closing");
      end = summary.offsetHeight + (item.offsetHeight - item.clientHeight);
    }

    item.style.overflow = "hidden";
    const animation = item.animate(
      { height: [`${start}px`, `${end}px`] },
      { duration, easing },
    );
    animation.onfinish = () => {
      if (!open) item.open = false;
      item.classList.remove("is-closing");
      item.style.overflow = "";
    };
  };

  qsa(".faq").forEach((faq) => {
    const items = qsa("details", faq);
    items.forEach((item) => {
      qs("summary", item).addEventListener("click", (e) => {
        e.preventDefault();
        const willOpen = !isOpen(item);
        if (willOpen) {
          items
            .filter((other) => other !== item && isOpen(other))
            .forEach((other) => toggleItem(other, false));
        }
        toggleItem(item, willOpen);
      });
    });
  });
}

initAccordion();

function initSliders() {
  if (typeof Swiper === "undefined") return;

  const make = (selector, name, options) => {
    if (!qs(selector)) return;
    new Swiper(selector, {
      spaceBetween: 32,
      uniqueNavElements: false,
      navigation: {
        prevEl: `.swiper-btn-prev-${name}`,
        nextEl: `.swiper-btn-next-${name}`,
      },
      a11y: {
        prevSlideMessage: "Попередній слайд",
        nextSlideMessage: "Наступний слайд",
      },
      ...options,
    });
  };

  make(".destinations-swiper", "dest", {
    slidesPerView: 1,
    breakpoints: {
      1152: { slidesPerView: 2.1 },
      1440: { slidesPerView: 2.6 },
      1920: { slidesPerView: 3.1 },
    },
  });
  make(".offer-swiper", "offer", {
    slidesPerView: 1,
    breakpoints: { 1152: { slidesPerView: 3 } },
  });
  make(".gallery-swiper", "gallery", { slidesPerView: 1, spaceBetween: 20 });
  make(".experiences-swiper", "exp", {
    slidesPerView: 1,
    breakpoints: {
      768: { slidesPerView: 1.4 },
      1152: { slidesPerView: 2.1 },
      1440: { slidesPerView: 2.3 },
    },
  });
}

initSliders();

const FAV_KEY = "travellian-favorites";
let favoriteIds = new Set();
let favoritesUserId = null;

function readLocalFavorites() {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAV_KEY)) || []);
  } catch {
    return new Set();
  }
}

function saveLocalFavorites() {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify([...favoriteIds]));
  } catch {
    console.error("Не вдалося зберегти обране в localStorage");
  }
}

async function loadFavorites() {
  const {
    data: { session },
  } = await db.auth.getSession();
  favoritesUserId = session?.user.id ?? null;
  if (!favoritesUserId) {
    favoriteIds = readLocalFavorites();
    return;
  }
  const { data, error } = await db.from("favorites").select("tour_id");
  if (error) throw error;
  favoriteIds = new Set(data.map((row) => row.tour_id));
}

async function toggleFavorite(id) {
  const add = !favoriteIds.has(id);
  if (favoritesUserId) {
    const { error } = add
      ? await db
          .from("favorites")
          .insert({ user_id: favoritesUserId, tour_id: id })
      : await db
          .from("favorites")
          .delete()
          .eq("user_id", favoritesUserId)
          .eq("tour_id", id);
    if (error) throw error;
  }
  if (add) favoriteIds.add(id);
  else favoriteIds.delete(id);
  if (!favoritesUserId) saveLocalFavorites();
}

function paintFavorite(button, isFav) {
  button.setAttribute("aria-pressed", String(isFav));
  button.classList.toggle("is-active", isFav);
  const icon = qs("i", button);
  icon?.classList.toggle("fa-solid", isFav);
  icon?.classList.toggle("fa-regular", !isFav);
}

function repaintFavorites() {
  qsa("[data-fav]").forEach((button) =>
    paintFavorite(button, favoriteIds.has(Number(button.dataset.fav))),
  );
}

function showToast(text) {
  const toast = createElement("p", "toast", text);
  toast.setAttribute("role", "status");
  document.body.append(toast);
  setTimeout(() => toast.remove(), 4000);
}

function bindFavoriteButton(button) {
  const id = Number(button.dataset.fav);
  paintFavorite(button, favoriteIds.has(id));
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await toggleFavorite(id);
      repaintFavorites();
    } catch (error) {
      console.error("Помилка зміни обраного:", error);
      showToast(
        "Не вдалося змінити обране. Перевірте інтернет і спробуйте ще раз.",
      );
    } finally {
      button.disabled = false;
    }
  });
}

const favoritesReady = loadFavorites().catch((error) =>
  console.error("Помилка завантаження обраного:", error),
);

db.auth.onAuthStateChange((event) => {
  if (event !== "SIGNED_IN" && event !== "SIGNED_OUT") return;
  setTimeout(() =>
    loadFavorites()
      .then(repaintFavorites)
      .catch((error) => console.error("Помилка завантаження обраного:", error)),
  );
});

async function fetchTours() {
  const { data, error } = await db
    .from("tours")
    .select(
      "id, title, days, price, rating, image, image_alt, description, countries(name)",
    )
    .order("id");
  if (error) throw error;
  return data.map(normalizeTour);
}

const PAGE_SIZE = 6;

function createTourCard(tour) {
  const card = qs("#tourCardTpl").content.firstElementChild.cloneNode(true);
  const img = createImage(tour.image, tour.alt, 400, 300);
  img.loading = "lazy";
  img.addEventListener("error", () => card.classList.add("tour-card--no-img"), {
    once: true,
  });
  qs(".card-img", card).prepend(img);

  qs(".card-tag", card).textContent = tour.country;
  qs(".tour-card-title", card).textContent = tour.title;
  qs(".tour-card-score", card).textContent = tour.rating.toFixed(1);
  qs(".tour-card-days", card).textContent = daysLabel(tour.days);
  qs(".tour-card-price", card).textContent = `€${tour.price}`;
  qs(".btn-sm", card).href = `tour.html?id=${tour.id}`;

  const fav = qs(".fav-btn", card);
  fav.setAttribute("aria-label", `Додати «${tour.title}» в обране`);
  fav.dataset.fav = tour.id;
  bindFavoriteButton(fav);
  return card;
}

function initCatalog() {
  const grid = qs("#tourGrid");
  const form = qs("#tourFilters");
  if (!grid || !form) return;

  const sortBar = qs(".catalog-bar [role='group']");
  const status = qs("#toursStatus");
  const params = new URLSearchParams(location.search);
  const state = { country: "all", sort: "rating", limit: PAGE_SIZE };
  const sorters = {
    rating: (a, b) => b.rating - a.rating,
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
  };
  let tours = null;

  const setChips = (container, attr, value) =>
    qsa(`[${attr}]`, container).forEach((chip) => {
      const isActive = chip.getAttribute(attr) === value;
      chip.classList.toggle("is-active", isActive);
      chip.setAttribute("aria-pressed", String(isActive));
    });

  function showPageStatus(text) {
    status.textContent = text;
    status.hidden = false;
    grid.replaceChildren();
    qs("#tourCount").textContent = "—";
    qs("#toursEmpty").hidden = true;
    qs("#loadMore").hidden = true;
  }

  function render() {
    if (!tours) return;
    status.hidden = true;

    const data = new FormData(form);
    const query = data.get("query").trim().toLowerCase();
    const min = Number(data.get("priceMin")) || 0;
    const max = Number(data.get("priceMax")) || Infinity;
    const ranges = data
      .getAll("duration")
      .map((range) => range.split("-").map(Number));

    const list = tours
      .filter((t) => state.country === "all" || t.country === state.country)
      .filter(
        (t) =>
          !query || `${t.title} ${t.country}`.toLowerCase().includes(query),
      )
      .filter((t) => t.price >= min && t.price <= max)
      .filter(
        (t) =>
          !ranges.length ||
          ranges.some(([from, to]) => t.days >= from && t.days <= to),
      )
      .sort(sorters[state.sort]);

    grid.replaceChildren(...list.slice(0, state.limit).map(createTourCard));
    qs("#tourCount").textContent = list.length;
    qs("#toursEmpty").hidden = list.length > 0;
    qs("#loadMore").hidden = list.length <= state.limit;
  }

  async function load() {
    showPageStatus("Завантаження турів…");
    try {
      [tours] = await Promise.all([fetchTours(), favoritesReady]);
      render();
    } catch (error) {
      console.error("Помилка завантаження турів:", error);
      showPageStatus(`Не вдалося завантажити тури. ${LOAD_ERROR}`);
    }
  }

  if (params.get("query")) form.elements.query.value = params.get("query");
  const country = params.get("country");
  if (country && qs(`[data-country="${CSS.escape(country)}"]`, form)) {
    state.country = country;
    setChips(form, "data-country", country);
  }

  form.addEventListener("submit", (e) => e.preventDefault());
  form.addEventListener("input", () => {
    state.limit = PAGE_SIZE;
    render();
  });
  form.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-country]");
    if (!chip) return;
    state.country = chip.dataset.country;
    state.limit = PAGE_SIZE;
    setChips(form, "data-country", state.country);
    render();
  });
  form.addEventListener("reset", () =>
    setTimeout(() => {
      state.country = "all";
      state.limit = PAGE_SIZE;
      setChips(form, "data-country", "all");
      render();
    }),
  );
  sortBar.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-sort]");
    if (!chip) return;
    state.sort = chip.dataset.sort;
    setChips(sortBar, "data-sort", state.sort);
    render();
  });
  qs("#loadMore").addEventListener("click", () => {
    state.limit += PAGE_SIZE;
    render();
  });

  load();
}

initCatalog();

function renderGallery(tour) {
  const photos = tour.gallery?.length
    ? tour.gallery
    : [{ image: tour.image, alt: tour.alt, label: "" }];

  const photo = qs(".tour-photo");
  const mainImage = createImage(photos[0].image, photos[0].alt, 800, 500);
  mainImage.addEventListener("error", () =>
    photo.classList.add("tour-photo--no-img"),
  );
  mainImage.addEventListener("load", () =>
    photo.classList.remove("tour-photo--no-img"),
  );
  photo.prepend(mainImage);
  qs(".tour-photo-label", photo).textContent = photos[0].label;

  const thumbs = qs(".tour-thumbs");
  thumbs.hidden = photos.length < 2;
  thumbs.replaceChildren(
    ...photos.map((item, index) => {
      const thumb = createElement("button", "tour-thumb");
      thumb.type = "button";
      thumb.classList.toggle("is-active", index === 0);
      const img = createImage(item.image, item.alt, 200, 150);
      img.loading = "lazy";
      thumb.append(img, createElement("span", "tour-thumb-label", item.label));
      return thumb;
    }),
  );
}

function renderProgram(program) {
  const hasProgram = Array.isArray(program) && program.length > 0;
  qs("#tab-program").hidden = !hasProgram;
  if (!hasProgram) return;

  qs("#tourProgram").replaceChildren(
    ...program.map((text, index) => {
      const item = createElement("li");
      item.append(
        createElement("h3", "program-day", `День ${index + 1}`),
        createElement("p", "tour-text", text),
      );
      return item;
    }),
  );
}

function renderTour(tour) {
  const { country } = tour;
  const duration =
    tour.days > 1
      ? `${daysLabel(tour.days)} / ${nightsLabel(tour.days - 1)}`
      : daysLabel(tour.days);

  document.title = `Тур «${tour.title}»: ${daysLabel(tour.days)}, від €${tour.price} | Travellian`;
  qs("#tourTitle").textContent = `Тур «${tour.title}»`;
  qs("#tourCountry").textContent = country;
  qs("#tourRating").textContent = tour.rating.toFixed(1);
  qs("#tourDuration").textContent = duration;
  qs("#tourMeta").hidden = false;

  qs("#tourPrice").textContent = `€${tour.price}`;
  qs("#tourCountryFact").textContent = country;
  qs("#tourDays").textContent = daysLabel(tour.days);
  qs("#tourDescription").textContent =
    tour.description || "Опис туру з'явиться найближчим часом.";
  qs("#bookingSummary").textContent =
    `${tour.title} · ${daysLabel(tour.days)} · €${tour.price} за особу`;

  const fav = qs("#tourFav");
  fav.dataset.fav = tour.id;
  bindFavoriteButton(fav);

  renderGallery(tour);
  renderProgram(tour.program);
}

function createSimilarCard(tour) {
  const card = createElement("a", "similar-card");
  card.href = `tour.html?id=${tour.id}`;

  const imageBox = createElement("div", "similar-card-img");
  const img = createImage(tour.image, tour.alt, 400, 250);
  img.loading = "lazy";
  imageBox.append(
    img,
    createElement("span", "similar-card-label", tour.country),
  );

  card.append(
    imageBox,
    createElement("h3", "similar-card-title", tour.title),
    createElement(
      "p",
      "similar-card-meta",
      `${daysLabel(tour.days)} · від €${tour.price}`,
    ),
  );
  return card;
}

async function fetchSimilarTours(tour, limit = 3) {
  const { data, error } = await db
    .from("tours")
    .select(
      "id, title, days, price, image, image_alt, country_id, countries(name)",
    )
    .neq("id", tour.id)
    .order("rating", { ascending: false })
    .order("id");
  if (error) throw error;
  const same = data.filter((t) => t.country_id === tour.country_id);
  const other = data.filter((t) => t.country_id !== tour.country_id);
  return [...same, ...other].slice(0, limit).map(normalizeTour);
}

async function loadSimilarTours(tour) {
  const section = qs(".similar-section");
  try {
    const similar = await fetchSimilarTours(tour);
    qs(".similar-grid", section).replaceChildren(
      ...similar.map(createSimilarCard),
    );
    section.hidden = similar.length === 0;
  } catch (error) {
    console.error("Помилка завантаження схожих турів:", error);
    section.hidden = true;
  }
}

async function initTourPage() {
  const page = qs("#tourPage");
  if (!page) return;
  fetch(`${API_URL}/api/health`).catch(() => {});

  const showPageStatus = (text) => {
    qs("#tourStatusText").textContent = text;
    qs("#tourStatusLink").hidden = false;
    qs("#tourStatus").hidden = false;
    page.hidden = true;
  };

  const id = Number(new URLSearchParams(location.search).get("id"));
  if (!Number.isInteger(id) || id < 1) {
    showPageStatus("Тур не обрано. Оберіть подорож у каталозі.");
    return;
  }

  try {
    const [{ data: row, error }] = await Promise.all([
      db
        .from("tours")
        .select(
          "id, title, days, price, rating, image, image_alt, description, program, gallery, country_id, countries(name)",
        )
        .eq("id", id)
        .maybeSingle(),
      favoritesReady,
    ]);
    if (error) throw error;
    if (!row) {
      showPageStatus("Такого туру немає. Можливо, його прибрали з каталогу.");
      return;
    }

    const tour = normalizeTour(row);
    renderTour(tour);
    qs("#bookingForm").dataset.tourId = tour.id;
    fillBookingDates();
    qs("#tourStatus").hidden = true;
    page.hidden = false;
    loadSimilarTours(tour);
  } catch (error) {
    console.error("Помилка завантаження туру:", error);
    showPageStatus(`Не вдалося завантажити тур. ${LOAD_ERROR}`);
  }
}

initTourPage();

function createStars(rating, className) {
  const stars = createElement("div", className);
  stars.setAttribute("role", "img");
  stars.setAttribute("aria-label", `Оцінка ${rating.toFixed(1)} з 5`);
  for (let i = 0; i < Math.round(rating); i += 1) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "19");
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "assets/images/icons/sprite.svg#star");
    svg.append(use);
    stars.append(svg);
  }
  return stars;
}

function createOfferSlide(tour) {
  const img = createImage(tour.image, tour.alt);
  img.className = "offer-card-img";
  img.loading = "lazy";

  const price = createElement("div", "offer-card-price");
  price.append(
    createElement("span", "offer-card-from", "Від"),
    createElement("span", "offer-card-amount", `€${tour.price}`),
  );
  const link = createElement("a", "offer-card-btn", "Детальніше");
  link.href = `tour.html?id=${tour.id}`;
  const footer = createElement("div", "offer-card-footer");
  footer.append(price, link);

  const body = createElement("div", "offer-card-body");
  body.append(
    createElement("h3", "offer-card-title", `${tour.title}, ${tour.country}`),
    createStars(tour.rating, "offer-card-stars"),
    createElement("p", "offer-card-text", tour.description ?? ""),
    footer,
  );

  const card = createElement("article", "offer-card");
  card.append(img, body);
  const slide = createElement("div", "swiper-slide");
  slide.append(card);
  return slide;
}

function createTripCard(tour) {
  const img = createImage(tour.image, tour.alt);
  img.className = "trip-card-img";
  img.loading = "lazy";
  const imgWrap = createElement("a", "trip-card-img-wrap");
  imgWrap.href = `tour.html?id=${tour.id}`;
  imgWrap.append(img);

  const top = createElement("div", "trip-card-top");
  top.append(
    createElement("span", "trip-card-type", tour.country),
    createElement("span", "trip-card-price", `від €${tour.price}`),
  );

  const link = createElement("a", "", tour.title);
  link.href = `tour.html?id=${tour.id}`;
  const title = createElement("h3", "trip-card-title");
  title.append(link);

  const bottom = createElement("div", "trip-card-bottom");
  bottom.append(
    createStars(tour.rating, "trip-card-stars"),
    createElement("span", "trip-card-days", `Тур ${daysLabel(tour.days)}`),
  );

  const body = createElement("div", "trip-card-body");
  body.append(top, title, bottom);
  const card = createElement("article", "trip-card");
  card.append(imgWrap, body);
  return card;
}

async function initHomeTours() {
  const offerList = qs("#offerList");
  const tripList = qs("#tripList");
  if (!offerList || !tripList) return;

  try {
    const tours = await fetchTours();
    const offers = [...tours].sort((a, b) => a.price - b.price).slice(0, 5);
    const trips = tours
      .filter((tour) => !offers.includes(tour))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 4);

    offerList.replaceChildren(...offers.map(createOfferSlide));
    tripList.replaceChildren(...trips.map(createTripCard));
    qs(".offer-swiper").swiper?.update();
    qs("#offersStatus").hidden = true;
    qs("#tripsStatus").hidden = true;
  } catch (error) {
    console.error("Помилка завантаження турів для головної:", error);
    const message = `Не вдалося завантажити тури. ${LOAD_ERROR}`;
    qs("#offersStatus").textContent = message;
    qs("#tripsStatus").textContent = message;
    qs(".offer-swiper").hidden = true;
    qs(".trip-swiper").hidden = true;
  }
}

initHomeTours();

let adminTours = [];
let tourToDelete = null;

function clearFormMessages(form) {
  qs(".form-status", form)?.remove();
  qsa(".field-error", form).forEach((box) => (box.textContent = ""));
  qsa("[aria-invalid]", form).forEach((field) => {
    field.removeAttribute("aria-invalid");
    field.removeAttribute("aria-describedby");
  });
}

function createAdminRow(tour) {
  const row = document.createElement("tr");
  const title = createElement("th", "", tour.title);
  title.scope = "row";
  const cell = (label, text) => {
    const td = createElement("td", "", text);
    td.dataset.label = label;
    return td;
  };
  row.append(
    title,
    cell("Країна", tour.country),
    cell("Тривалість", daysLabel(tour.days)),
    cell("Ціна", `€${tour.price}`),
    cell("Рейтинг", tour.rating.toFixed(1)),
  );

  const actions = createElement("td");
  const box = createElement("div", "admin-actions");
  const edit = createElement("button", "btn-line", "Редагувати");
  edit.type = "button";
  edit.dataset.edit = tour.id;
  edit.setAttribute("aria-label", `Редагувати «${tour.title}»`);
  const remove = createElement("button", "btn-line admin-delete", "Видалити");
  remove.type = "button";
  remove.dataset.delete = tour.id;
  remove.setAttribute("aria-label", `Видалити «${tour.title}»`);
  box.append(edit, remove);
  actions.append(box);
  row.append(actions);
  return row;
}

async function loadAdminTours() {
  const { data, error } = await db
    .from("tours")
    .select(
      "id, title, country_id, days, price, rating, image, image_alt, description, program, countries(name)",
    )
    .order("id");
  if (error) throw error;
  adminTours = data.map(normalizeTour);
  qs("#adminTours").replaceChildren(...adminTours.map(createAdminRow));
  qs("#adminCount").textContent = data.length;
}

async function loadCountryOptions() {
  const { data, error } = await db
    .from("countries")
    .select("id, name")
    .order("name");
  if (error) throw error;
  const select = qs("#tour-country");
  const placeholder = select.options[0];
  select.replaceChildren(
    placeholder,
    ...data.map((country) => new Option(country.name, country.id)),
  );
}

function openTourForm(tour = null) {
  const form = qs("#tourForm");
  form.reset();
  clearFormMessages(form);
  const fields = form.elements;
  fields.id.value = tour?.id ?? "";
  if (tour) {
    fields.title.value = tour.title;
    fields.country_id.value = tour.country_id;
    fields.days.value = tour.days;
    fields.price.value = tour.price;
    fields.rating.value = tour.rating;
    fields.image.value = tour.image;
    fields.image_alt.value = tour.alt;
    fields.description.value = tour.description ?? "";
    fields.program.value = (tour.program ?? []).join("\n");
  }
  qs("#tourModalTitle").textContent = tour ? "Редагування туру" : "Новий тур";
  modals.open("tourModal");
}

async function saveTour(form) {
  const data = Object.fromEntries(new FormData(form));
  const program = data.program
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const values = {
    title: data.title.trim(),
    country_id: Number(data.country_id),
    days: Number(data.days),
    price: Number(data.price),
    rating: Number(data.rating),
    image: data.image.trim(),
    image_alt: data.image_alt.trim(),
    description: data.description.trim() || null,
    program: program.length ? program : null,
  };

  const query = data.id
    ? db.from("tours").update(values).eq("id", Number(data.id))
    : db.from("tours").insert(values);
  const { data: saved, error } = await query.select("id");
  if (error) throw error;
  if (!saved.length)
    throw Object.assign(new Error("Недостатньо прав"), { code: "42501" });

  closeModalOf(form);
  await loadAdminTours();
}

async function deleteTour() {
  const button = qs("#confirmDelete");
  const message = qs("#deleteError");
  button.disabled = true;
  message.hidden = true;
  try {
    const { data, error } = await db
      .from("tours")
      .delete()
      .eq("id", tourToDelete.id)
      .select("id");
    if (error) throw error;
    if (!data.length)
      throw Object.assign(new Error("Недостатньо прав"), { code: "42501" });
    modals.close(qs("#deleteModal"));
    await loadAdminTours();
  } catch (error) {
    console.error("Помилка видалення туру:", error);
    message.textContent = describeError(error);
    message.hidden = false;
  } finally {
    button.disabled = false;
  }
}

async function checkAdminAccess() {
  const status = qs("#adminStatus");
  const panel = qs("#adminPanel");
  const showPageStatus = (text, withLogin = false) => {
    qs("#adminStatusText").textContent = text;
    qs("#adminLogin").hidden = !withLogin;
    status.hidden = false;
    panel.hidden = true;
  };

  try {
    const role = await getUserRole();
    if (!role) {
      showPageStatus("Увійдіть як адміністратор, щоб керувати турами.", true);
      return;
    }
    if (role !== "admin") {
      showPageStatus("Ця сторінка доступна лише адміністраторам.");
      return;
    }
    await Promise.all([loadCountryOptions(), loadAdminTours()]);
    status.hidden = true;
    panel.hidden = false;
  } catch (error) {
    console.error("Помилка завантаження адмін-панелі:", error);
    showPageStatus(`Не вдалося завантажити дані. ${LOAD_ERROR}`);
  }
}

function initAdminPage() {
  if (!qs("#adminPanel")) return;

  qs("#addTourBtn").addEventListener("click", () => openTourForm());
  qs("#adminTours").addEventListener("click", (e) => {
    const editId = e.target.closest("[data-edit]")?.dataset.edit;
    const deleteId = e.target.closest("[data-delete]")?.dataset.delete;
    if (editId)
      openTourForm(adminTours.find((tour) => tour.id === Number(editId)));
    if (deleteId) {
      tourToDelete = adminTours.find((tour) => tour.id === Number(deleteId));
      qs("#deleteText").textContent =
        `Тур «${tourToDelete.title}» буде видалено з каталогу назавжди.`;
      qs("#deleteError").hidden = true;
      modals.open("deleteModal");
    }
  });
  qs("#confirmDelete").addEventListener("click", deleteTour);
  qs("#cancelDelete").addEventListener("click", () =>
    modals.close(qs("#deleteModal")),
  );

  db.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT")
      setTimeout(checkAdminAccess);
  });
  checkAdminAccess();
}

initAdminPage();

function initReveal() {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (reduceMotion || !("IntersectionObserver" in window)) return;

  const targets = qsa(
    [
      ".section-head",
      ".swiper",
      ".blog-card",
      ".about-values-grid > li",
      ".newsletter",
      ".tour-gallery",
      ".tour-aside",
      ".tour-content",
      ".similar-grid > *",
      ".contact-cards > li",
      ".contact-form",
      ".faq-item",
    ].join(", "),
    qs("main") ?? document,
  );
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -50px 0px" },
  );

  targets.forEach((el) => {
    const index = [...el.parentElement.children].indexOf(el);
    el.style.setProperty("--reveal-delay", `${Math.min(index, 5) * 0.08}s`);
    el.classList.add("reveal");
    observer.observe(el);
  });
}

initReveal();