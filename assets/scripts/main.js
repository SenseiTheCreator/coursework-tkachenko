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
      // // Тут пізніше буде запит до Supabase
      // showStatus(form, "Дякуємо! Дані пройшли перевірку.");
      // form.reset();
    });
  });
}

initFormValidation();