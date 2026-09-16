(() => {
  "use strict";

  const S = window.KohakuWorkNextSchedule;
  const drawer = document.getElementById("nextScheduleDetailDrawer");
  const body = document.getElementById("nextScheduleDetailBody");

  if (!S || !drawer || !body) {
    console.error("Kohaku Work NEXT progress jump: required UI missing.");
    return;
  }

  const TARGETS = {
    "顧客": "customer",
    "日記": "diary",
    "売上": "sales",
  };

  function upgradeProgress() {
    const states = Array.from(
      body.querySelectorAll(
        ".next-schedule-detail-progress .next-schedule-detail-state:not([data-next-progress-jump])"
      )
    );

    states.forEach(state => {
      const label = state.querySelector("span")?.textContent?.trim() || "";
      const target = TARGETS[label];
      if (!target) return;

      const button = document.createElement("button");
      button.type = "button";
      button.className = `${state.className} is-action`;
      button.dataset.nextProgressJump = target;
      button.innerHTML = state.innerHTML + `<small class="next-progress-open">開く</small>`;
      state.replaceWith(button);
    });
  }

  function findDetailSection(label) {
    const complete = body.querySelector("[data-next-complete-detail]");
    if (!complete) return null;

    return Array.from(
      complete.querySelectorAll(".next-schedule-detail-section-label")
    ).find(node => node.textContent.trim() === label) || null;
  }

  function flash(node) {
    if (!node) return;
    node.classList.add("is-next-progress-target");
    window.setTimeout(() => node.classList.remove("is-next-progress-target"), 1500);
  }

  function scrollTarget(node) {
    if (!node) return;
    node.scrollIntoView({ block: "start", behavior: "smooth" });
    flash(node);
    flash(node.nextElementSibling);
  }

  function openCustomer() {
    const visitId = Number(drawer.dataset.visitId || 0);
    const visit = S.state?.visits?.find(item => Number(item.id) === visitId) || null;

    if (visit?.customer_id) {
      const open = body.querySelector("[data-next-customer-profile-open]");
      if (open && !open.disabled) {
        open.click();
        window.setTimeout(() => {
          scrollTarget(document.getElementById("nextCustomerProfileEditor"));
        }, 30);
        return;
      }
    }

    const identity = document.querySelector("[data-ncil-open]");
    if (identity) {
      identity.click();
      window.setTimeout(() => {
        scrollTarget(body.querySelector("[data-ncil-panel]"));
      }, 30);
    }
  }

  function openDiary() {
    const visitId = Number(drawer.dataset.visitId || 0);
    const visit = S.state?.visits?.find(
      item => Number(item.id) === visitId
    ) || null;

    const diary =
      window.KohakuWorkNextHeavenCreate;

    if (
      !visit
      || !diary
      || typeof diary.open !== "function"
    ) {
      window.alert(
        "お礼日記画面を開けませんでした。"
      );
      return;
    }

    diary.open(visit);
  }

  function jump(target) {
    if (target === "customer") {
      openCustomer();
      return;
    }
    if (target === "diary") {
      openDiary();
      return;
    }
    if (target === "sales") {
      scrollTarget(findDetailSection("SALES"));
    }
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-next-progress-jump]");
    if (!button) return;
    event.preventDefault();
    jump(button.dataset.nextProgressJump);
  });

  const observer = new MutationObserver(() => queueMicrotask(upgradeProgress));
  observer.observe(body, { childList: true, subtree: true });
  queueMicrotask(upgradeProgress);

  window.KohakuWorkNextScheduleProgressJump = {
    enabled: true,
    productionWriteEnabled: false,
  };
})();
