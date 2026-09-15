(() => {
  "use strict";

  const views = [...document.querySelectorAll("[data-view]")];
  const navs = [...document.querySelectorAll("[data-nav]")];

  const navForView = {
    home: "home",
    diary: "diary",
    "nukinavi-create": "diary",
    "heaven-diary": "diary",
    "heaven-settings": "diary",
    "diary-edit": "diary",
    "post-prep": "diary",
    schedule: "schedule",
    "heaven-create": "schedule",
    shift: "shift",
    customers: "customers",
    "customer-detail": "customers",
    sales: "sales",
    database: "home",
    placeholder: "koppy",
  };

  function showView(name) {
    const target = views.find(
      view => view.dataset.view === name
    );

    if (!target) return;

    views.forEach(view => {
      const active = view === target;
      view.hidden = !active;
      view.classList.toggle("is-active", active);
    });

    const activeNav = navForView[name] || "home";

    navs.forEach(nav => {
      nav.classList.toggle(
        "is-active",
        nav.dataset.nav === activeNav
      );
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  document.addEventListener("click", event => {
    const nav = event.target.closest("[data-nav]");

    if (nav) {
      showView(
        nav.dataset.nav === "koppy"
          ? "placeholder"
          : nav.dataset.nav
      );
      return;
    }

    const direct = event.target.closest("[data-next-view]");

    if (direct) {
      showView(direct.dataset.nextView);
    }
  });

  window.KohakuWorkNext = {
    phase: 1,
    showView,
    apiConnected: false,
    verificationDatabase: false,
    productionWriteEnabled: false,
  };
})();
