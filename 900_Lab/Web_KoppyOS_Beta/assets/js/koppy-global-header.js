(() => {
  "use strict";

  if (
    window.KoppyGlobalHeader
    ?.mounted
  ) {
    return;
  }


  const STYLE_URL =
    "/assets/css/koppy-global-header.css";

  const LEGACY_WORLD_ORIGIN =
    "https://koppy.miki-piano.com";


  const ROUTES = [
    {
      id: "world",
      href: "/",
      label: "Koppy World",
      detail: "WORLD HOME"
    },
    {
      id: "work",
      href: "/work/",
      label: "Kohaku Work",
      detail: "WORK OS"
    },
    {
      id: "calendar",
      href: "/work/calendar/",
      label: "共有カレンダー",
      detail: "SHARED CALENDAR"
    },
    {
      id: "house",
      href: "/house/",
      label: "自宅",
      detail: "HOUSE"
    },
    {
      id: "brain",
      href: "/brain/",
      label: "GitHub Brain",
      detail: "BRAIN"
    },
    {
      id: "chat",
      href: "/chat/",
      label: "Koppy Chat",
      detail: "CHAT"
    },
    {
      id: "system",
      href: "/system/",
      label: "Local Development",
      detail: "SYSTEM"
    },
    {
      id: "writer",
      href:
        LEGACY_WORLD_ORIGIN
        + "/writer/",
      label: "GitHub Writer",
      detail: "RETIRED / LOLIPOP ARCHIVE",
      legacy: true,
      retired: true
    }
  ];


  const normalizePath = (
    value
  ) => {
    let path =
      String(
        value || "/"
      )
        .split("?")[0]
        .split("#")[0];

    if (!path.startsWith("/")) {
      path =
        "/" + path;
    }

    if (
      path.length > 1
      && path.endsWith("/")
    ) {
      path =
        path.slice(
          0,
          -1
        );
    }

    return path;
  };


  const currentPath =
    normalizePath(
      window.location.pathname
    );


  const isActive = (
    route
  ) => {
    if (
      route.id === "world"
    ) {
      return currentPath === "/";
    }

    if (
      route.id === "calendar"
    ) {
      return (
        currentPath
          === "/work/calendar"
        || currentPath.startsWith(
          "/work/calendar/"
        )
      );
    }

    if (
      route.id === "work"
    ) {
      return (
        (
          currentPath === "/work"
          || currentPath.startsWith(
            "/work/"
          )
        )
        && !(
          currentPath
            === "/work/calendar"
          || currentPath.startsWith(
            "/work/calendar/"
          )
        )
      );
    }


    const routePath =
      normalizePath(
        new URL(
          route.href,
          window.location.origin
        ).pathname
      );

    return (
      currentPath === routePath
      || currentPath.startsWith(
        routePath + "/"
      )
    );
  };


  const currentRoute =
    ROUTES.find(
      isActive
    )
    || null;


  const ensureStyle = () => {
    if (
      document.querySelector(
        "[data-koppy-global-header-style]"
      )
    ) {
      return;
    }


    const link =
      document.createElement(
        "link"
      );

    link.rel =
      "stylesheet";

    link.href =
      STYLE_URL;

    link.dataset
      .koppyGlobalHeaderStyle =
        "";

    document.head.appendChild(
      link
    );
  };


  const createLink = (
    route,
    className
  ) => {
    const link =
      document.createElement(
        "a"
      );

    link.href =
      route.href;

    link.className =
      className;


    if (isActive(route)) {
      link.classList.add(
        "is-active"
      );

      link.setAttribute(
        "aria-current",
        "page"
      );
    }


    return link;
  };


  const mount = () => {
    if (
      document.querySelector(
        "[data-koppy-global-header]"
      )
    ) {
      return;
    }


    ensureStyle();


    const header =
      document.createElement(
        "header"
      );

    header.className =
      "kgh-shell";

    header.dataset
      .koppyGlobalHeader =
        "";


    const inner =
      document.createElement(
        "div"
      );

    inner.className =
      "kgh-inner";


    const brand =
      document.createElement(
        "a"
      );

    brand.href =
      "/";

    brand.className =
      "kgh-brand";

    brand.setAttribute(
      "aria-label",
      "Koppy World ホーム"
    );


    const brandMark =
      document.createElement(
        "span"
      );

    brandMark.className =
      "kgh-brand-mark";

    brandMark.textContent =
      "◇K";


    const brandCopy =
      document.createElement(
        "span"
      );

    brandCopy.className =
      "kgh-brand-copy";


    const brandName =
      document.createElement(
        "strong"
      );

    brandName.textContent =
      "Koppy World";


    const screen =
      document.createElement(
        "small"
      );

    screen.textContent =
      currentRoute
        ?.detail
      || "PRIVATE OS";


    brandCopy.append(
      brandName,
      screen
    );


    brand.append(
      brandMark,
      brandCopy
    );


    const quick =
      document.createElement(
        "nav"
      );

    quick.className =
      "kgh-quick";

    quick.setAttribute(
      "aria-label",
      "クイックナビゲーション"
    );


    const workRoute =
      ROUTES.find(
        route =>
          route.id === "work"
      );

    const calendarRoute =
      ROUTES.find(
        route =>
          route.id === "calendar"
      );


    const work =
      createLink(
        workRoute,
        "kgh-quick-link "
        + "kgh-quick-link--work"
      );

    work.innerHTML =
      "<span>▤</span>"
      + "<strong>Kohaku Work</strong>";


    const calendar =
      createLink(
        calendarRoute,
        "kgh-quick-link "
        + "kgh-quick-link--calendar"
      );

    calendar.innerHTML =
      "<span>▦</span>"
      + "<strong>共有カレンダー</strong>";


    quick.append(
      work,
      calendar
    );


    const menuButton =
      document.createElement(
        "button"
      );

    menuButton.type =
      "button";

    menuButton.className =
      "kgh-menu-button";

    menuButton.dataset
      .kghMenuButton =
        "";

    menuButton.setAttribute(
      "aria-label",
      "Koppy World メニューを開く"
    );

    menuButton.setAttribute(
      "aria-expanded",
      "false"
    );

    menuButton.textContent =
      "☰";


    inner.append(
      brand,
      quick,
      menuButton
    );


    header.appendChild(
      inner
    );


    const backdrop =
      document.createElement(
        "div"
      );

    backdrop.className =
      "kgh-menu-backdrop";

    backdrop.dataset
      .kghMenuBackdrop =
        "";

    backdrop.hidden =
      true;


    const menu =
      document.createElement(
        "aside"
      );

    menu.className =
      "kgh-menu";

    menu.dataset
      .kghMenu =
        "";

    menu.hidden =
      true;

    menu.setAttribute(
      "aria-label",
      "Koppy World メニュー"
    );


    const menuHead =
      document.createElement(
        "div"
      );

    menuHead.className =
      "kgh-menu-head";


    const menuTitle =
      document.createElement(
        "div"
      );

    menuTitle.innerHTML =
      "<strong>Koppy World</strong>"
      + "<small>NAVIGATION</small>";


    const close =
      document.createElement(
        "button"
      );

    close.type =
      "button";

    close.className =
      "kgh-menu-close";

    close.setAttribute(
      "aria-label",
      "メニューを閉じる"
    );

    close.textContent =
      "×";


    menuHead.append(
      menuTitle,
      close
    );


    const list =
      document.createElement(
        "nav"
      );

    list.className =
      "kgh-menu-list";


    let retiredDividerAdded =
      false;


    ROUTES.forEach(
      route => {

        if (
          route.retired === true
          && !retiredDividerAdded
        ) {
          const divider =
            document.createElement(
              "div"
            );

          divider.className =
            "kgh-menu-section";

          divider.innerHTML =
            "<strong>RETIRED</strong>"
            + "<small>ARCHIVE / 旧機能</small>";

          list.appendChild(
            divider
          );

          retiredDividerAdded =
            true;
        }


        const link =
          createLink(
            route,
            "kgh-menu-link"
          );


        if (
          route.retired === true
        ) {
          link.classList.add(
            "is-retired"
          );
        }


        const text =
          document.createElement(
            "span"
          );

        text.innerHTML =
          `<strong>${
            route.label
          }</strong>`
          + `<small>${
            route.detail
          }</small>`;


        const arrow =
          document.createElement(
            "span"
          );

        arrow.className =
          "kgh-menu-arrow";

        arrow.textContent =
          route.legacy
            ? "↗"
            : "→";


        link.append(
          text,
          arrow
        );


        list.appendChild(
          link
        );
      }
    );


    menu.append(
      menuHead,
      list
    );


    const setOpen = (
      open
    ) => {
      const next =
        open === true;


      menu.hidden =
        !next;

      backdrop.hidden =
        !next;


      menuButton.setAttribute(
        "aria-expanded",
        next
          ? "true"
          : "false"
      );


      document.body
        .classList.toggle(
          "kgh-menu-open",
          next
        );


      if (next) {
        close.focus();
      }
    };


    menuButton.addEventListener(
      "click",
      () => {
        setOpen(
          menu.hidden
        );
      }
    );


    close.addEventListener(
      "click",
      () => {
        setOpen(
          false
        );

        menuButton.focus();
      }
    );


    backdrop.addEventListener(
      "click",
      () => {
        setOpen(
          false
        );
      }
    );


    list.addEventListener(
      "click",
      event => {
        if (
          event.target.closest(
            "a"
          )
        ) {
          setOpen(
            false
          );
        }
      }
    );


    document.addEventListener(
      "keydown",
      event => {
        if (
          event.key === "Escape"
          && !menu.hidden
        ) {
          setOpen(
            false
          );

          menuButton.focus();
        }
      }
    );


    document.body.prepend(
      header
    );

    document.body.append(
      backdrop,
      menu
    );


    document.body
      .classList.add(
        "kgh-mounted"
      );


    window.KoppyGlobalHeader = {
      mounted:
        true,

      open:
        () => {
          setOpen(
            true
          );
        },

      close:
        () => {
          setOpen(
            false
          );
        }
    };
  };


  if (
    document.readyState
    === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      mount,
      {
        once:
          true
      }
    );
  } else {
    mount();
  }
})();
