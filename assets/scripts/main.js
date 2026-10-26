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

  const close = (modal) => {
    modal.classList.add("d-none");
    if (!qs(".modal-overlay:not(.d-none)")) {
      document.body.classList.remove("no-scroll");
    }
  };
  const open = (id) => {
    const modal = document.getElementById(id);
    if (!modal) return;
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