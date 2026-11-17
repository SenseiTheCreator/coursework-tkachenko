import { db } from "./app.js";
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

/* Tour gallery */
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
    qs(".tour-photo-label", photo).textContent = qs(".tour-thumb-label", thumb).textContent;
    qsa(".tour-thumb", thumbs).forEach((t) => t.classList.toggle("is-active", t === thumb));
  });
}

initGallery();

/* Accordion */
function initAccordion() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
      qs(".faq-answer", item)?.animate({ opacity: [0, 1] }, { duration, easing });
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

/* Sliders */
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

function bindFavoriteButton(button) {
  const id = Number(button.dataset.fav);
  paintFavorite(button, readFavorites().has(id));
  button.addEventListener("click", () => paintFavorite(button, toggleFavorite(id)));
}

function initFavoriteButtons() {
  qsa(".fav-toggle[data-fav]").forEach(bindFavoriteButton);
}

initFavoriteButtons();

/* Tour catalog */
async function fetchTours() {
  const { data, error } = await db
    .from("tours")
    .select("id, title, days, price, rating, image, image_alt, description, countries(name)")
    .order("id");
  if (error) throw error;

  return data.map((tour) => ({
    id: tour.id,
    title: tour.title,
    country: tour.countries.name,
    days: tour.days,
    price: tour.price,
    rating: Number(tour.rating),
    image: tour.image,
    alt: tour.image_alt,
    description: tour.description,
  }));
}

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

  function showStatus(text) {
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

  async function load() {
    showStatus("Завантаження турів…");
    try {
      tours = await fetchTours();
      render();
    } catch (error) {
      console.error("Помилка завантаження турів:", error);
      showStatus("Не вдалося завантажити тури. Перевірте з'єднання з інтернетом і оновіть сторінку.");
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

/* Tour page */
function nightsLabel(nights) {
  if (nights % 10 === 1 && nights % 100 !== 11) return `${nights} ніч`;
  if ([2, 3, 4].includes(nights % 10) && ![12, 13, 14].includes(nights % 100)) return `${nights} ночі`;
  return `${nights} ночей`;
}

function createImage(src, alt, width, height) {
  const img = document.createElement("img");
  img.src = src;
  img.alt = alt;
  img.width = width;
  img.height = height;
  return img;
}

function renderGallery(tour) {
  const photos = tour.gallery?.length
    ? tour.gallery
    : [{ image: tour.image, alt: tour.image_alt, label: "" }];

  const photo = qs(".tour-photo");
  const mainImage = createImage(photos[0].image, photos[0].alt, 800, 500);
  mainImage.addEventListener("error", () => photo.classList.add("tour-photo--no-img"));
  mainImage.addEventListener("load", () => photo.classList.remove("tour-photo--no-img"));
  photo.prepend(mainImage);
  qs(".tour-photo-label", photo).textContent = photos[0].label;

  const thumbs = qs(".tour-thumbs");
  thumbs.hidden = photos.length < 2;
  thumbs.replaceChildren(
    ...photos.map((item, index) => {
      const thumb = document.createElement("button");
      thumb.type = "button";
      thumb.className = "tour-thumb";
      thumb.classList.toggle("is-active", index === 0);
      const img = createImage(item.image, item.alt, 200, 150);
      img.loading = "lazy";
      const label = document.createElement("span");
      label.className = "tour-thumb-label";
      label.textContent = item.label;
      thumb.append(img, label);
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
      const item = document.createElement("li");
      const day = document.createElement("h3");
      day.className = "program-day";
      day.textContent = `День ${index + 1}`;
      const description = document.createElement("p");
      description.className = "tour-text";
      description.textContent = text;
      item.append(day, description);
      return item;
    }),
  );
}

function renderTour(tour) {
  const country = tour.countries.name;
  const duration = tour.days > 1
    ? `${daysLabel(tour.days)} / ${nightsLabel(tour.days - 1)}`
    : daysLabel(tour.days);

  document.title = `Тур «${tour.title}»: ${daysLabel(tour.days)}, від €${tour.price} | Travellian`;
  qs("#tourTitle").textContent = `Тур «${tour.title}»`;
  qs("#tourCountry").textContent = country;
  qs("#tourRating").textContent = Number(tour.rating).toFixed(1);
  qs("#tourDuration").textContent = duration;
  qs("#tourMeta").hidden = false;

  qs("#tourPrice").textContent = `€${tour.price}`;
  qs("#tourCountryFact").textContent = country;
  qs("#tourDays").textContent = daysLabel(tour.days);
  qs("#tourDescription").textContent = tour.description || "Опис туру з'явиться найближчим часом.";
  qs("#bookingSummary").textContent = `${tour.title} · ${daysLabel(tour.days)} · €${tour.price} за особу`;

  const fav = qs("#tourFav");
  fav.dataset.fav = tour.id;
  bindFavoriteButton(fav);

  renderGallery(tour);
  renderProgram(tour.program);
}

function createSimilarCard(tour) {
  const card = document.createElement("a");
  card.className = "similar-card";
  card.href = `tour.html?id=${tour.id}`;

  const imageBox = document.createElement("div");
  imageBox.className = "similar-card-img";
  const img = createImage(tour.image, tour.image_alt, 400, 250);
  img.loading = "lazy";
  const label = document.createElement("span");
  label.className = "similar-card-label";
  label.textContent = tour.countries.name;
  imageBox.append(img, label);

  const title = document.createElement("h3");
  title.className = "similar-card-title";
  title.textContent = tour.title;
  const meta = document.createElement("p");
  meta.className = "similar-card-meta";
  meta.textContent = `${daysLabel(tour.days)} · від €${tour.price}`;

  card.append(imageBox, title, meta);
  return card;
}

async function fetchSimilarTours(tour, limit = 3) {
  const query = (count) =>
    db
      .from("tours")
      .select("id, title, days, price, image, image_alt, countries(name)")
      .neq("id", tour.id)
      .order("rating", { ascending: false })
      .limit(count);

  const same = await query(limit).eq("country_id", tour.country_id);
  if (same.error) throw same.error;
  if (same.data.length >= limit) return same.data;

  const other = await query(limit - same.data.length).neq("country_id", tour.country_id);
  if (other.error) throw other.error;
  return [...same.data, ...other.data];
}

async function loadSimilarTours(tour) {
  const section = qs(".similar-section");
  try {
    const similar = await fetchSimilarTours(tour);
    qs(".similar-grid", section).replaceChildren(...similar.map(createSimilarCard));
    section.hidden = similar.length === 0;
  } catch (error) {
    console.error("Помилка завантаження схожих турів:", error);
    section.hidden = true;
  }
}

async function initTourPage() {
  const page = qs("#tourPage");
  if (!page) return;

  const showStatus = (text) => {
    qs("#tourStatusText").textContent = text;
    qs("#tourStatusLink").hidden = false;
    qs("#tourStatus").hidden = false;
    page.hidden = true;
  };

  const id = Number(new URLSearchParams(location.search).get("id"));
  if (!Number.isInteger(id) || id < 1) {
    showStatus("Тур не обрано. Оберіть подорож у каталозі.");
    return;
  }

  try {
    const { data: tour, error } = await db
      .from("tours")
      .select("id, title, days, price, rating, image, image_alt, description, program, gallery, country_id, countries(name)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!tour) {
      showStatus("Такого туру немає. Можливо, його прибрали з каталогу.");
      return;
    }

    renderTour(tour);
    qs("#tourStatus").hidden = true;
    page.hidden = false;
    loadSimilarTours(tour);
  } catch (error) {
    console.error("Помилка завантаження туру:", error);
    showStatus("Не вдалося завантажити тур. Перевірте з'єднання з інтернетом і оновіть сторінку.");
  }
}

initTourPage();

/* Home page tours */
function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

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
  const img = createElement("img", "offer-card-img");
  img.src = tour.image;
  img.alt = tour.alt;
  img.loading = "lazy";

  const price = createElement("div", "offer-card-price");
  price.append(createElement("span", "offer-card-from", "Від"), createElement("span", "offer-card-amount", `€${tour.price}`));
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
  const img = createElement("img", "trip-card-img");
  img.src = tour.image;
  img.alt = tour.alt;
  img.loading = "lazy";
  const imgWrap = createElement("a", "trip-card-img-wrap");
  imgWrap.href = `tour.html?id=${tour.id}`;
  imgWrap.append(img);

  const top = createElement("div", "trip-card-top");
  top.append(createElement("span", "trip-card-type", tour.country), createElement("span", "trip-card-price", `від €${tour.price}`));

  const link = createElement("a", "", tour.title);
  link.href = `tour.html?id=${tour.id}`;
  const title = createElement("h3", "trip-card-title");
  title.append(link);

  const bottom = createElement("div", "trip-card-bottom");
  bottom.append(createStars(tour.rating, "trip-card-stars"), createElement("span", "trip-card-days", `Тур ${daysLabel(tour.days)}`));

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
    const message = "Не вдалося завантажити тури. Перевірте з'єднання з інтернетом і оновіть сторінку.";
    qs("#offersStatus").textContent = message;
    qs("#tripsStatus").textContent = message;
    qs(".offer-swiper").hidden = true;
    qs(".trip-swiper").hidden = true;
  }
}

initHomeTours();

/* Scroll reveal */
function initReveal() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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