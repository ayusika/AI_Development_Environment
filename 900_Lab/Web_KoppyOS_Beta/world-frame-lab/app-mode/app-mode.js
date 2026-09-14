(() => {
  "use strict";

  const modal =
    document.getElementById(
      "appLabModal"
    );

  const state =
    document.getElementById(
      "appLabState"
    );

  let oldOverflow = "";

  function result(name, passed) {
    const row =
      document.querySelector(
        `[data-check="${name}"]`
      );

    if (!row) {
      return passed;
    }

    row.classList.toggle(
      "ok",
      passed
    );

    row.classList.toggle(
      "fail",
      !passed
    );

    const value =
      row.querySelector(
        "strong"
      );

    if (value) {
      value.textContent =
        passed
          ? "PASS"
          : "FAIL";
    }

    return passed;
  }

  function diagnostics() {
    const app =
      document.getElementById(
        "wfApp"
      );

    const checks = [
      result(
        "profile",
        app?.dataset.theme ===
          "electric"
      ),

      result(
        "shell",
        !document.querySelector(
          "[data-wf-shell]"
        ) &&
        !document.querySelector(
          ".wf-shell-inner"
        )
      ),

      result(
        "document",
        document.documentElement
          .scrollHeight >
        window.innerHeight
      ),

      result(
        "sticky",
        getComputedStyle(
          document.querySelector(
            ".app-lab-header"
          )
        ).position ===
          "sticky"
      ),

      result(
        "fixed",
        getComputedStyle(
          document.querySelector(
            ".app-lab-bottom-nav"
          )
        ).position ===
          "fixed"
      ),

      result(
        "atmosphere",
        Boolean(
          document.querySelector(
            "[data-wf-atmosphere-host] > .wf-shell-atmosphere"
          )
        )
      )
    ];

    const passed =
      checks.every(Boolean);

    state.textContent =
      passed
        ? "ALL PASS"
        : "CHECK FAIL";

    state.className =
      passed
        ? "ok"
        : "fail";
  }

  function openModal() {
    oldOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    modal.hidden = false;
  }

  function closeModal() {
    modal.hidden = true;

    document.body.style.overflow =
      oldOverflow;
  }

  document.addEventListener(
    "click",
    event => {
      const action =
        event.target.closest(
          "[data-action]"
        )?.dataset.action;

      if (
        action ===
        "open-modal"
      ) {
        openModal();
      }

      if (
        action ===
        "close-modal"
      ) {
        closeModal();
      }
    }
  );

  window.addEventListener(
    "load",
    () => {
      setTimeout(
        diagnostics,
        150
      );
    },
    {
      once:true
    }
  );
})();
