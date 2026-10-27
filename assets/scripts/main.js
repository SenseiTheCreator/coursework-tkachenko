const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

/* Mobile menu */
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
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 1152) setMenu(false);
  });
  return setMenu;
}

const closeMenu = initMenu();

/* Modal windows */
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
}

initModals(closeMenu);

/* validations form */
function getError(field) {
  const { validity } = field;
  if (validity.valid) return "";
  if (validity.valueMissing) {
    return field.type === "checkbox" ? "Потрібна ваша згода" : "Заповніть це поле";
  }
  if (validity.typeMismatch) {
    return field.type === "email" ? "Введіть коректний email" : "Невірне значення";
  }
  if (validity.tooShort) return `Мінімум ${field.minLength} символів`;
  if (validity.rangeUnderflow) return `Мінімум ${field.min}`;
  if (validity.rangeOverflow) return `Максимум ${field.max}`;
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

function showStatus(form, text) {
  let status = qs(".form-status", form);
  if (!status) {
    status = document.createElement("p");
    status.className = "form-status";
    status.setAttribute("role", "status");
    form.append(status);
  }
  status.textContent = text;
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

    form.addEventListener("submit", (e) => {
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
      form.reset();
      showStatus(form, form.dataset.success || "Дякуємо! Дані надіслано.");
    });
  });
}

initFormValidation();

/* tablist */
function initTabs() {
  qsa('[role="tablist"]').forEach((list) => {
    const tabs = qsa('[role="tab"]', list);

    const activate = (active) => {
      tabs.forEach((tab) => {
        const isActive = tab === active;
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-selected", String(isActive));
        tab.tabIndex = isActive ? 0 : -1;
        const panel = document.getElementById(tab.getAttribute("aria-controls"));
        if (panel) panel.hidden = !isActive;
      });
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => activate(tab));
      tab.addEventListener("keydown", (e) => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!step) return;
        const next = tabs[(index + step + tabs.length) % tabs.length];
        activate(next);
        next.focus();
      });
    });
  });
}

initTabs();

/* Tour gallery */
function initGallery() {
  const mainImage = qs(".tour-photo img");
  const caption = qs(".tour-photo-label");
  const thumbs = qsa(".tour-thumb");
  if (!mainImage || !thumbs.length) return;

  thumbs.forEach((thumb) =>
    thumb.addEventListener("click", () => {
      const image = qs("img", thumb);
      mainImage.src = image.src;
      mainImage.alt = image.alt;
      if (caption) caption.textContent = qs(".tour-thumb-label", thumb)?.textContent ?? "";
      thumbs.forEach((t) => t.classList.toggle("is-active", t === thumb));
    }),
  );
}

initGallery();

/* Accordion */
function initAccordion() {
  qsa(".faq").forEach((faq) => {
    const items = qsa("details", faq);
    items.forEach((item) =>
      item.addEventListener("toggle", () => {
        if (!item.open) return;
        items.filter((other) => other !== item).forEach((other) => (other.open = false));
      }),
    );
  });
}

initAccordion();

/* Sliders */
function initSliders() {
  if (typeof Swiper === "undefined") return;

  const make = (selector, name, options) => {
    if (!qs(selector)) return;
    new Swiper(selector, {
      spaceBetween: 32,
      navigation: {
        prevEl: `.swiper-btn-prev-${name}`,
        nextEl: `.swiper-btn-next-${name}`,
        uniqueNavElements: false,
      },
      a11y: { prevSlideMessage: "Попередній слайд", nextSlideMessage: "Наступний слайд" },
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

/* Favorites */
const FAV_KEY = "travellian-favorites";

function readFavorites() {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAV_KEY)) || []);
  } catch {
    return new Set();
  }
}

function toggleFavorite(id) {
  const favorites = readFavorites();
  if (favorites.has(id)) favorites.delete(id);
  else favorites.add(id);
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify([...favorites]));
  } catch {
    // storage is unavailable: the button still toggles for this visit
  }
  return favorites.has(id);
}

function paintFavorite(button, isFav) {
  button.setAttribute("aria-pressed", String(isFav));
  button.classList.toggle("is-active", isFav);
  const icon = qs("i", button);
  icon?.classList.toggle("fa-solid", isFav);
  icon?.classList.toggle("fa-regular", !isFav);
}

function initFavoriteButtons() {
  const favorites = readFavorites();
  qsa(".fav-toggle[data-fav]").forEach((button) => {
    const id = Number(button.dataset.fav);
    paintFavorite(button, favorites.has(id));
    button.addEventListener("click", () => paintFavorite(button, toggleFavorite(id)));
  });
}

initFavoriteButtons();

/* Tour catalog */
const tours = [
  { id: 1, title: "Вічний Рим", country: "Італія", days: 7, price: 820, rating: 4.9, image: "assets/images/tours/tours-rome.webp", alt: "Вид на Колізей у Римі" },
  { id: 2, title: "Париж за 5 днів", country: "Франція", days: 5, price: 690, rating: 4.8, image: "assets/images/tours/tours-paris.webp", alt: "Ейфелева вежа в Парижі" },
  { id: 3, title: "Венеціанський карнавал", country: "Італія", days: 4, price: 720, rating: 4.8, image: "assets/images/tours/tours-italy-carnaval.webp", alt: "Маски венеціанського карнавалу" },
  { id: 4, title: "Дубровник і Адріатика", country: "Хорватія", days: 7, price: 780, rating: 4.8, image: "assets/images/tours/tours-croatia-dubrovnik.webp", alt: "Старе місто Дубровника над морем" },
  { id: 5, title: "Барселона Гауді", country: "Іспанія", days: 6, price: 750, rating: 4.7, image: "assets/images/tours/tours-spain-barcelona.webp", alt: "Саграда Фамілія в Барселоні" },
  { id: 6, title: "Лісабон і Сінтра", country: "Португалія", days: 6, price: 600, rating: 4.7, image: "assets/images/tours/tours-portugal.webp", alt: "Кольорові вулиці Лісабона" },
  { id: 7, title: "Мадрид і Толедо", country: "Іспанія", days: 5, price: 640, rating: 4.6, image: "assets/images/tours/tours-spain-madrid.webp", alt: "Центр Мадрида" },
  { id: 8, title: "Спліт і острів Хвар", country: "Хорватія", days: 5, price: 590, rating: 4.6, image: "assets/images/tours/tours-croatia-split.webp", alt: "Набережна Спліта" },
  { id: 9, title: "Афіни та острови", country: "Греція", days: 5, price: 650, rating: 4.5, image: "assets/images/tours/tours-greece.webp", alt: "Білі будинки грецького острова" },
];

const PAGE_SIZE = 6;

function daysLabel(days) {
  if (days % 10 === 1 && days % 100 !== 11) return `${days} день`;
  if ([2, 3, 4].includes(days % 10) && ![12, 13, 14].includes(days % 100)) return `${days} дні`;
  return `${days} днів`;
}

function createTourCard(tour, favorites) {
  const card = qs("#tourCardTpl").content.firstElementChild.cloneNode(true);
  const img = qs("img", card);
  img.src = tour.image;
  img.alt = tour.alt;
  // a missing photo must not break the card
  img.addEventListener("error", () => card.classList.add("tour-card--no-img"), { once: true });

  qs(".card-tag", card).textContent = tour.country;
  qs(".tour-card-title", card).textContent = tour.title;
  qs(".tour-card-score", card).textContent = tour.rating.toFixed(1);
  qs(".tour-card-days", card).textContent = daysLabel(tour.days);
  qs(".tour-card-price", card).textContent = `€${tour.price}`;
  qs(".btn-sm", card).href = `tour.html?id=${tour.id}`;

  const fav = qs(".fav-btn", card);
  fav.setAttribute("aria-label", `Додати «${tour.title}» в обране`);
  paintFavorite(fav, favorites.has(tour.id));
  fav.addEventListener("click", () => paintFavorite(fav, toggleFavorite(tour.id)));
  return card;
}

function initCatalog() {
  const grid = qs("#tourGrid");
  const form = qs("#tourFilters");
  if (!grid || !form) return;

  const sortBar = qs(".catalog-bar [role='group']");
  const params = new URLSearchParams(location.search);
  const state = { country: "all", sort: "rating", limit: PAGE_SIZE };
  const sorters = {
    rating: (a, b) => b.rating - a.rating,
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
  };

  const setChips = (container, attr, value) =>
    qsa(`[${attr}]`, container).forEach((chip) => {
      const isActive = chip.getAttribute(attr) === value;
      chip.classList.toggle("is-active", isActive);
      chip.setAttribute("aria-pressed", String(isActive));
    });

  function render() {
    const data = new FormData(form);
    const query = data.get("query").trim().toLowerCase();
    const min = Number(data.get("priceMin")) || 0;
    const max = Number(data.get("priceMax")) || Infinity;
    const ranges = data.getAll("duration").map((range) => range.split("-").map(Number));

    const list = tours
      .filter((t) => state.country === "all" || t.country === state.country)
      .filter((t) => !query || `${t.title} ${t.country}`.toLowerCase().includes(query))
      .filter((t) => t.price >= min && t.price <= max)
      .filter((t) => !ranges.length || ranges.some(([from, to]) => t.days >= from && t.days <= to))
      .sort(sorters[state.sort]);

    const favorites = readFavorites();
    grid.replaceChildren(...list.slice(0, state.limit).map((tour) => createTourCard(tour, favorites)));
    qs("#tourCount").textContent = list.length;
    qs("#toursEmpty").hidden = list.length > 0;
    qs("#loadMore").hidden = list.length <= state.limit;
  }

  // filters passed from the search form on the home page
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
  // "reset" fires before the fields are cleared, so render on the next tick
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

  render();
}

initCatalog();
