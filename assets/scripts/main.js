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