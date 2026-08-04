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

/* ========================================
   無料体験レッスン申込みフォーム
======================================== */

const trialForm = document.querySelector("#trial-form");
const formStatus = document.querySelector("#form-status");
const contactSubmit = document.querySelector("#contact-submit");

if (trialForm && formStatus && contactSubmit) {
  trialForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!trialForm.checkValidity()) {
      trialForm.reportValidity();
      return;
    }

    const originalButtonText = contactSubmit.textContent;

    contactSubmit.disabled = true;
    contactSubmit.textContent = "送信中です…";

    formStatus.textContent = "お申し込み内容を送信しています。";
    formStatus.classList.remove("is-success", "is-error");

    try {
      const formData = new FormData(trialForm);

      const response = await fetch(trialForm.action, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("送信に失敗しました");
      }

      formStatus.textContent =
        "送信が完了しました。内容を確認後、メールでご連絡いたします。";

      formStatus.classList.add("is-success");

      trialForm.reset();
    } catch (error) {
      console.error("フォーム送信エラー:", error);

      formStatus.textContent =
        "送信できませんでした。時間をおいて、もう一度お試しください。";

      formStatus.classList.add("is-error");
    } finally {
      contactSubmit.disabled = false;
      contactSubmit.textContent = originalButtonText;
    }
  });
}