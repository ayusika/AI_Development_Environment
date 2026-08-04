"use strict";

const menuButton = document.querySelector(".menu-button");
const navigation = document.querySelector(".global-navigation");

if (menuButton && navigation) {
  const closeMenu = () => {
    menuButton.classList.remove("is-open");
    navigation.classList.remove("is-open");

    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "メニューを開く");

    document.body.style.overflow = "";
  };

  const openMenu = () => {
    menuButton.classList.add("is-open");
    navigation.classList.add("is-open");

    menuButton.setAttribute("aria-expanded", "true");
    menuButton.setAttribute("aria-label", "メニューを閉じる");

    document.body.style.overflow = "hidden";
  };

  menuButton.addEventListener("click", () => {
    const isOpen =
      menuButton.getAttribute("aria-expanded") === "true";

    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  navigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 960) {
      closeMenu();
    }
  });
}