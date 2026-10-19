const iconBlock = document.getElementById(`iconBlock`);
const iconOpen = document.getElementById(`iconOpen`);
const iconClose = document.getElementById(`iconClose`);
const mainMenu = document.getElementById(`mainMenu`);

iconBlock.addEventListener("click", () => {
  iconOpen.classList.toggle("d-none");
  iconClose.classList.toggle("d-none");
  mainMenu.classList.toggle("menu-open");
});

const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const loginModal = document.getElementById("loginModal");
const signupModal = document.getElementById("signupModal");

loginBtn.addEventListener("click", () => loginModal.classList.remove("d-none"));
signupBtn.addEventListener("click", () =>
  signupModal.classList.remove("d-none"),
);

document
  .getElementById("closeLogin")
  .addEventListener("click", () => loginModal.classList.add("d-none"));
document
  .getElementById("closeSignup")
  .addEventListener("click", () => signupModal.classList.add("d-none"));

// Перемикання між модалками
document.getElementById("toSignUp").addEventListener("click", () => {
  loginModal.classList.add("d-none");
  signupModal.classList.remove("d-none");
});

document.getElementById("toLogin").addEventListener("click", () => {
  signupModal.classList.add("d-none");
  loginModal.classList.remove("d-none");
});

document.querySelector(".mobile-login").addEventListener("click", () => {
  mainMenu.classList.remove("menu-open");
  iconOpen.classList.remove("d-none");
  iconClose.classList.add("d-none");
  loginModal.classList.remove("d-none");
});

document.querySelector(".mobile-signup").addEventListener("click", () => {
  mainMenu.classList.remove("menu-open");
  iconOpen.classList.remove("d-none");
  iconClose.classList.add("d-none");
  signupModal.classList.remove("d-none");
});

// Закриття при кліку на фон
[loginModal, signupModal].forEach((modal) => {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.add("d-none");
  });
});

// SWIPER — destinations
const destSwiper = new Swiper(".destinations-swiper", {
  slidesPerView: 1,
  spaceBetween: 32,
  navigation: {
    prevEl: "#dest-prev",
    nextEl: "#dest-next",
  },
  breakpoints: {
    1152: { slidesPerView: 2.1 },
    1440: { slidesPerView: 2.6 },
    1920: { slidesPerView: 3.1 },
  },
});

// SWIPER — offer
const offerSwiper = new Swiper(".offer-swiper", {
  slidesPerView: 1,
  spaceBetween: 32,
  navigation: {
    prevEl: "#offer-prev",
    nextEl: "#offer-next",
  },
  breakpoints: {
    1152: { slidesPerView: 3 },
    1440: { slidesPerView: 3 },
    1920: { slidesPerView: 3 },
  },
});

// SWIPER — gallery
const gallerySwiper = new Swiper(".gallery-swiper", {
  slidesPerView: 1,
  spaceBetween: 20,
  navigation: {
    prevEl: "#gallery-prev",
    nextEl: "#gallery-next",
  },
});

// SWIPER — experiences
new Swiper(".experiences-swiper", {
  slidesPerView: 1.1,
  spaceBetween: 32,
  navigation: {
    prevEl: ".swiper-btn-prev-exp",
    nextEl: ".swiper-btn-next-exp",
  },
  breakpoints: {
    320: { slidesPerView: 1 },
    768: { slidesPerView: 1.4 },
    1152: { slidesPerView: 2.1 },
    1440: { slidesPerView: 2.3 },
  },
});

// mobile clicks
document
  .getElementById("dest-prev-mob")
  .addEventListener("click", () => destSwiper.slidePrev());
document
  .getElementById("dest-next-mob")
  .addEventListener("click", () => destSwiper.slideNext());
document
  .getElementById("offer-prev-mob")
  .addEventListener("click", () => offerSwiper.slidePrev());
document
  .getElementById("offer-next-mob")
  .addEventListener("click", () => offerSwiper.slideNext());
document
  .getElementById("gallery-prev-mob")
  .addEventListener("click", () => gallerySwiper.slidePrev());
document
  .getElementById("gallery-next-mob")
  .addEventListener("click", () => gallerySwiper.slideNext());
