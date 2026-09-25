(() => {
  "use strict";

  if (
    window.KoppyGlobalMemo
    ?.mounted
  ) {
    return;
  }


  const API_URL =
    "/api/v1/global-memos.php";

  const STYLE_URL =
    "/assets/css/koppy-global-memo.css";

  const POSITION_KEY =
    "koppy.global-memo.positions.v1";

  const VIEW_KEY =
    "koppy.global-memo.view.v1";

  const EDGE = 12;
  const GAP = 10;
  const DRAG_THRESHOLD = 6;
  const SAVE_DELAY = 500;


  const state = {
    buttons: [],
    root: null,
    panel: null,
    openButtonId: null,
    activePages: {},
    positions: {},
    dirtyPages: new Set(),
    saveTimers: new Map(),
    versions: new Map(),
    launchers: new Map(),
    panelResizeObserver: null
  };


  const storageGet = (
    key,
    fallback
  ) => {
    try {
      const raw =
        localStorage.getItem(
          key
        );

      return raw
        ? JSON.parse(raw)
        : fallback;
    } catch {
      return fallback;
    }
  };


  const storageSet = (
    key,
    value
  ) => {
    try {
      localStorage.setItem(
        key,
        JSON.stringify(value)
      );
    } catch {
      // Local UI state is optional.
    }
  };


  const clamp = (
    value,
    min,
    max
  ) =>
    Math.max(
      min,
      Math.min(
        max,
        value
      )
    );


  const viewport = () => {
    const vv =
      window.visualViewport;

    return {
      left:
        vv?.offsetLeft || 0,

      top:
        vv?.offsetTop || 0,

      width:
        vv?.width
        || window.innerWidth,

      height:
        vv?.height
        || window.innerHeight
    };
  };


  const ensureStyle = () => {
    if (
      document.querySelector(
        '[data-koppy-global-memo-style]'
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
      .koppyGlobalMemoStyle =
        "";

    document.head.appendChild(
      link
    );
  };


  const api = async (
    method,
    body = null,
    options = {}
  ) => {

    const response =
      await fetch(
        API_URL,
        {
          method,
          credentials:
            "same-origin",

          cache:
            "no-store",

          keepalive:
            options.keepalive
            === true,

          headers:
            body === null
              ? {
                  Accept:
                    "application/json"
                }
              : {
                  Accept:
                    "application/json",

                  "Content-Type":
                    "application/json"
                },

          body:
            body === null
              ? null
              : JSON.stringify(
                  body
                )
        }
      );


    if (response.status === 401) {
      const error =
        new Error(
          "Authentication required."
        );

      error.code =
        401;

      throw error;
    }


    const data =
      await response.json();


    if (
      !response.ok
      || data?.success
        !== true
    ) {
      throw new Error(
        data?.error
        || `Memo API failed: ${response.status}`
      );
    }


    return data;
  };


  const buttonById = (
    buttonId
  ) =>
    state.buttons.find(
      button =>
        Number(button.id)
        === Number(buttonId)
    )
    || null;


  const pageById = (
    pageId
  ) => {

    for (
      const button
      of state.buttons
    ) {

      const page =
        button.pages
          ?.find(
            candidate =>
              Number(candidate.id)
              === Number(pageId)
          );

      if (page) {
        return page;
      }
    }


    return null;
  };


  const persistView = () => {
    storageSet(
      VIEW_KEY,
      {
        openButtonId:
          state.openButtonId,

        activePages:
          state.activePages
      }
    );
  };


  const setButtons = (
    buttons
  ) => {
    state.buttons =
      Array.isArray(buttons)
        ? buttons
        : [];
  };


  const savePageOrder = async (
    button,
    orderedPageIds,
    previousPages
  ) => {

    try {

      await api(
        "POST",
        {
          action:
            "reorder_pages",

          button_id:
            button.id,

          page_ids:
            orderedPageIds
        }
      );


      setStatus(
        "並べ替え保存済み",
        "saved"
      );

    } catch (error) {

      button.pages =
        previousPages;

      renderPanel();

      setStatus(
        "並べ替え失敗",
        "error"
      );

      console.error(
        "Koppy global memo reorder failed.",
        error
      );
    }
  };


  const wirePageTabReorder = (
    tabs,
    button
  ) => {

    if (
      !tabs
      || !button
      || !Array.isArray(
        button.pages
      )
      || button.pages.length <= 1
    ) {
      return;
    }


    let drag =
      null;


    const finish = (
      event
    ) => {

      if (
        !drag
        || event.pointerId
          !== drag.pointerId
      ) {
        return;
      }


      const current =
        drag;

      drag =
        null;


      try {
        current.tab
          .releasePointerCapture(
            event.pointerId
          );
      } catch {
        // Pointer capture is optional.
      }


      current.tab
        .classList.remove(
          "is-dragging"
        );

      tabs.classList.remove(
        "is-reordering"
      );


      if (!current.moved) {
        return;
      }


      current.tab.dataset
        .kgmSuppressClick =
          "1";


      window.setTimeout(
        () => {
          delete current.tab.dataset
            .kgmSuppressClick;
        },
        250
      );


      const orderedPageIds =
        [
          ...tabs.querySelectorAll(
            ".kgm-page-tab"
          ),
        ]
        .map(
          tab =>
            Number(
              tab.dataset
                .kgmPageId
            )
        );


      const previousPageIds =
        current.previousPages
          .map(
            page =>
              Number(
                page.id
              )
          );


      if (
        orderedPageIds.length
          !== previousPageIds.length
        || orderedPageIds.some(
          pageId =>
            !Number.isFinite(
              pageId
            )
        )
      ) {

        renderPanel();

        return;
      }


      const changed =
        orderedPageIds.some(
          (
            pageId,
            index
          ) =>
            pageId
            !== previousPageIds[
              index
            ]
        );


      if (!changed) {
        return;
      }


      const pageMap =
        new Map(
          current.previousPages
            .map(
              page => [
                Number(
                  page.id
                ),
                page
              ]
            )
        );


      const reorderedPages =
        orderedPageIds.map(
          pageId =>
            pageMap.get(
              pageId
            )
        );


      if (
        reorderedPages.some(
          page =>
            !page
        )
      ) {

        renderPanel();

        return;
      }


      button.pages =
        reorderedPages;


      void savePageOrder(
        button,
        orderedPageIds,
        current.previousPages
      );
    };


    tabs.addEventListener(
      "pointerdown",
      event => {

        const tab =
          event.target.closest(
            ".kgm-page-tab"
          );


        if (
          !tab
          || !tabs.contains(
            tab
          )
        ) {
          return;
        }


        if (
          event.pointerType
            === "mouse"
          && event.button
            !== 0
        ) {
          return;
        }


        drag = {
          pointerId:
            event.pointerId,

          tab,

          startX:
            event.clientX,

          startY:
            event.clientY,

          moved:
            false,

          previousPages:
            [
              ...button.pages,
            ]
        };


        try {
          tab.setPointerCapture(
            event.pointerId
          );
        } catch {
          // Pointer capture is optional.
        }
      }
    );


    tabs.addEventListener(
      "pointermove",
      event => {

        if (
          !drag
          || event.pointerId
            !== drag.pointerId
        ) {
          return;
        }


        const dx =
          event.clientX
          - drag.startX;

        const dy =
          event.clientY
          - drag.startY;


        if (!drag.moved) {

          if (
            Math.hypot(
              dx,
              dy
            )
            < DRAG_THRESHOLD
          ) {
            return;
          }


          if (
            Math.abs(dy)
            > Math.abs(dx)
          ) {
            return;
          }


          drag.moved =
            true;

          drag.tab.classList.add(
            "is-dragging"
          );

          tabs.classList.add(
            "is-reordering"
          );
        }


        event.preventDefault();


        const candidates =
          [
            ...tabs.querySelectorAll(
              ".kgm-page-tab"
            ),
          ]
          .filter(
            candidate =>
              candidate
              !== drag.tab
          );


        const before =
          candidates.find(
            candidate => {

              const rect =
                candidate
                  .getBoundingClientRect();

              return (
                event.clientX
                < rect.left
                  + (
                    rect.width
                    / 2
                  )
              );
            }
          );


        if (before) {
          tabs.insertBefore(
            drag.tab,
            before
          );
        } else {
          tabs.appendChild(
            drag.tab
          );
        }
      }
    );


    tabs.addEventListener(
      "pointerup",
      finish
    );

    tabs.addEventListener(
      "pointercancel",
      finish
    );
  };


  const defaultPosition = (
    index,
    element
  ) => {
    const view =
      viewport();

    const rect =
      element
        .getBoundingClientRect();

    const column =
      index % 4;

    const row =
      Math.floor(
        index / 4
      );


    return {
      left:
        view.left
        + view.width
        - rect.width
        - EDGE
        - 64
        - (
          column
          * (
            rect.width
            + 8
          )
        ),

      top:
        view.top
        + view.height
        - rect.height
        - EDGE
        - (
          row
          * (
            rect.height
            + 8
          )
        )
    };
  };


  const placeLauncher = (
    element,
    left,
    top
  ) => {
    const view =
      viewport();

    const rect =
      element
        .getBoundingClientRect();

    const minX =
      view.left
      + EDGE;

    const minY =
      view.top
      + EDGE;

    const maxX =
      Math.max(
        minX,
        view.left
        + view.width
        - rect.width
        - EDGE
      );

    const maxY =
      Math.max(
        minY,
        view.top
        + view.height
        - rect.height
        - EDGE
      );


    element.style.left =
      `${clamp(
        left,
        minX,
        maxX
      )}px`;

    element.style.top =
      `${clamp(
        top,
        minY,
        maxY
      )}px`;
  };


  const restoreLauncherPosition = (
    buttonId,
    index,
    element
  ) => {
    const saved =
      state.positions[
        buttonId
      ];

    const view =
      viewport();

    const rect =
      element
        .getBoundingClientRect();


    if (
      saved
      && Number.isFinite(
        Number(saved.x)
      )
      && Number.isFinite(
        Number(saved.y)
      )
    ) {

      const spanX =
        Math.max(
          1,
          view.width
          - rect.width
          - (
            EDGE * 2
          )
        );

      const spanY =
        Math.max(
          1,
          view.height
          - rect.height
          - (
            EDGE * 2
          )
        );


      placeLauncher(
        element,

        view.left
        + EDGE
        + (
          spanX
          * clamp(
              Number(saved.x),
              0,
              1
            )
        ),

        view.top
        + EDGE
        + (
          spanY
          * clamp(
              Number(saved.y),
              0,
              1
            )
        )
      );

      return;
    }


    const fallback =
      defaultPosition(
        index,
        element
      );


    placeLauncher(
      element,
      fallback.left,
      fallback.top
    );
  };


  const saveLauncherPosition = (
    buttonId,
    element
  ) => {
    const view =
      viewport();

    const rect =
      element
        .getBoundingClientRect();

    const spanX =
      Math.max(
        1,
        view.width
        - rect.width
        - (
          EDGE * 2
        )
      );

    const spanY =
      Math.max(
        1,
        view.height
        - rect.height
        - (
          EDGE * 2
        )
      );


    state.positions[
      buttonId
    ] = {
      x:
        clamp(
          (
            rect.left
            - view.left
            - EDGE
          )
          / spanX,
          0,
          1
        ),

      y:
        clamp(
          (
            rect.top
            - view.top
            - EDGE
          )
          / spanY,
          0,
          1
        )
    };


    storageSet(
      POSITION_KEY,
      state.positions
    );
  };


  const setStatus = (
    text,
    status = ""
  ) => {
    const element =
      state.panel
        ?.querySelector(
          "[data-kgm-status]"
        );

    if (!element) {
      return;
    }


    element.textContent =
      text;

    element.dataset.state =
      status;
  };


  const savePage = async (
    pageId,
    version,
    options = {}
  ) => {
    const page =
      pageById(
        pageId
      );

    if (!page) {
      return;
    }


    if (
      options.keepalive
      !== true
    ) {
      setStatus(
        "保存中…",
        "saving"
      );
    }


    try {

      await api(
        "PATCH",
        {
          page_id:
            page.id,

          title:
            page.title,

          content:
            page.content
        },
        {
          keepalive:
            options.keepalive
            === true
        }
      );


      if (
        state.versions.get(
          pageId
        )
        === version
      ) {
        state.dirtyPages
          .delete(
            pageId
          );


        if (
          options.keepalive
          !== true
        ) {
          setStatus(
            "保存済み",
            "saved"
          );
        }
      }


    } catch (error) {

      if (
        options.keepalive
        !== true
      ) {
        setStatus(
          "保存失敗",
          "error"
        );
      }


      console.error(
        "Koppy global memo save failed.",
        error
      );
    }
  };


  const scheduleSave = (
    pageId
  ) => {
    const version =
      (
        state.versions.get(
          pageId
        )
        || 0
      )
      + 1;


    state.versions.set(
      pageId,
      version
    );

    state.dirtyPages.add(
      pageId
    );


    const existing =
      state.saveTimers.get(
        pageId
      );

    if (existing) {
      window.clearTimeout(
        existing
      );
    }


    setStatus(
      "保存待ち",
      ""
    );


    const timer =
      window.setTimeout(
        () => {

          state.saveTimers
            .delete(
              pageId
            );

          void savePage(
            pageId,
            version
          );
        },
        SAVE_DELAY
      );


    state.saveTimers.set(
      pageId,
      timer
    );
  };


  const cancelPendingSave = (
    pageId
  ) => {
    const timer =
      state.saveTimers.get(
        pageId
      );

    if (timer) {
      window.clearTimeout(
        timer
      );
    }

    state.saveTimers.delete(
      pageId
    );

    state.dirtyPages.delete(
      pageId
    );

    state.versions.delete(
      pageId
    );
  };


  const flushDirty = () => {
    state.dirtyPages
      .forEach(
        pageId => {

          const version =
            state.versions.get(
              pageId
            )
            || 0;

          void savePage(
            pageId,
            version,
            {
              keepalive:
                true
            }
          );
        }
      );
  };


  const positionPanel = () => {
    if (
      !state.panel
      || state.panel.hidden
      || state.openButtonId
        === null
    ) {
      return;
    }


    const launcher =
      state.launchers.get(
        state.openButtonId
      );

    if (!launcher) {
      return;
    }


    const view =
      viewport();

    const launcherRect =
      launcher
        .getBoundingClientRect();

    const panelRect =
      state.panel
        .getBoundingClientRect();


    let left =
      launcherRect.left
      - panelRect.width
      - GAP;


    if (
      left
      < view.left + EDGE
    ) {
      left =
        launcherRect.right
        + GAP;
    }


    left =
      clamp(
        left,
        view.left + EDGE,
        Math.max(
          view.left + EDGE,
          view.left
          + view.width
          - panelRect.width
          - EDGE
        )
      );


    let top =
      launcherRect.top;


    top =
      clamp(
        top,
        view.top + EDGE,
        Math.max(
          view.top + EDGE,
          view.top
          + view.height
          - panelRect.height
          - EDGE
        )
      );


    state.panel.style.left =
      `${left}px`;

    state.panel.style.top =
      `${top}px`;
  };


  const clampPanelToViewport = () => {

    if (
      !state.panel
      || state.panel.hidden
    ) {
      return;
    }


    const view =
      viewport();

    const rect =
      state.panel
        .getBoundingClientRect();


    const minLeft =
      view.left
      + EDGE;

    const minTop =
      view.top
      + EDGE;

    const maxLeft =
      Math.max(
        minLeft,
        view.left
        + view.width
        - rect.width
        - EDGE
      );

    const maxTop =
      Math.max(
        minTop,
        view.top
        + view.height
        - rect.height
        - EDGE
      );


    state.panel.style.left =
      `${
        clamp(
          rect.left,
          minLeft,
          maxLeft
        )
      }px`;

    state.panel.style.top =
      `${
        clamp(
          rect.top,
          minTop,
          maxTop
        )
      }px`;
  };


  const activePageFor = (
    button
  ) => {
    if (!button) {
      return null;
    }


    const preferred =
      Number(
        state.activePages[
          button.id
        ]
      );


    const preferredPage =
      button.pages
        ?.find(
          page =>
            Number(page.id)
            === preferred
        );


    if (preferredPage) {
      return preferredPage;
    }


    const first =
      button.pages?.[0]
      || null;


    if (first) {
      state.activePages[
        button.id
      ] =
        Number(
          first.id
        );
    }


    return first;
  };


  const renderPanel = () => {
    const panel =
      state.panel;

    if (!panel) {
      return;
    }


    const button =
      buttonById(
        state.openButtonId
      );


    if (!button) {
      panel.hidden =
        true;

      return;
    }


    const page =
      activePageFor(
        button
      );


    panel.replaceChildren();


    const head =
      document.createElement(
        "div"
      );

    head.className =
      "kgm-panel-head";


    const name =
      document.createElement(
        "div"
      );

    name.className =
      "kgm-panel-name";

    name.textContent =
      `GLOBAL MEMO ${state.buttons.indexOf(button) + 1}`;


    const actions =
      document.createElement(
        "div"
      );

    actions.className =
      "kgm-panel-actions";


    const addPage =
      document.createElement(
        "button"
      );

    addPage.type =
      "button";

    addPage.className =
      "kgm-panel-action";

    addPage.textContent =
      "＋";

    addPage.title =
      "このボタンにメモ画面を追加";


    const addButton =
      document.createElement(
        "button"
      );

    addButton.type =
      "button";

    addButton.className =
      "kgm-panel-action";

    addButton.textContent =
      "＋＋";

    addButton.title =
      "メモボタンを増やす";


    const deleteButton =
      document.createElement(
        "button"
      );

    deleteButton.type =
      "button";

    deleteButton.className =
      "kgm-panel-action "
      + "kgm-panel-action--danger";

    deleteButton.textContent =
      "🗑";

    deleteButton.title =
      state.buttons.length <= 1
        ? "最後のメモボタンは削除できません"
        : "このメモボタンを丸ごと削除";

    deleteButton.disabled =
      state.buttons.length <= 1;


    const close =
      document.createElement(
        "button"
      );

    close.type =
      "button";

    close.className =
      "kgm-panel-action";

    close.textContent =
      "閉じる";

    close.title =
      "閉じる";


    actions.append(
      addPage,
      addButton,
      deleteButton,
      close
    );


    head.append(
      name,
      actions
    );


    const tabs =
      document.createElement(
        "div"
      );

    tabs.className =
      "kgm-page-tabs";


    button.pages
      ?.forEach(
        memoPage => {

          const tab =
            document.createElement(
              "button"
            );

          tab.type =
            "button";

          tab.className =
            "kgm-page-tab";

          tab.dataset.kgmPageId =
            String(
              memoPage.id
            );

          tab.title =
            button.pages.length > 1
              ? "ドラッグで並べ替え"
              : "";


          if (
            page
            && Number(
              memoPage.id
            )
            === Number(
              page.id
            )
          ) {
            tab.classList.add(
              "is-active"
            );
          }


          tab.textContent =
            memoPage.title
            || "メモ";


          tab.addEventListener(
            "click",
            event => {

              if (
                tab.dataset
                  .kgmSuppressClick
                === "1"
              ) {
                event.preventDefault();
                return;
              }


              state.activePages[
                button.id
              ] =
                Number(
                  memoPage.id
                );

              persistView();
              renderPanel();
            }
          );


          tabs.appendChild(
            tab
          );
        }
      );


    wirePageTabReorder(
      tabs,
      button
    );


    const editor =
      document.createElement(
        "div"
      );

    editor.className =
      "kgm-editor";


    if (page) {

      const title =
        document.createElement(
          "input"
        );

      title.type =
        "text";

      title.className =
        "kgm-title";

      title.maxLength =
        80;

      title.value =
        page.title;

      title.placeholder =
        "メモ名";


      const content =
        document.createElement(
          "textarea"
        );

      content.className =
        "kgm-content";

      content.value =
        page.content;

      content.placeholder =
        "ここにメモ…";


      const status =
        document.createElement(
          "div"
        );

      status.className =
        "kgm-status";

      status.dataset.kgmStatus =
        "";

      status.textContent =
        "保存済み";

      status.dataset.state =
        "saved";


      const editorFooter =
        document.createElement(
          "div"
        );

      editorFooter.className =
        "kgm-editor-footer";


      const deletePage =
        document.createElement(
          "button"
        );

      deletePage.type =
        "button";

      deletePage.className =
        "kgm-page-delete";

      deletePage.textContent =
        "このメモを削除";

      deletePage.title =
        button.pages.length <= 1
          ? "最後のメモは削除できません"
          : "現在のメモだけを削除";

      deletePage.disabled =
        button.pages.length <= 1;


      title.addEventListener(
        "input",
        () => {

          page.title =
            title.value;

          scheduleSave(
            page.id
          );


          const activeTab =
            tabs.querySelector(
              ".kgm-page-tab.is-active"
            );

          if (activeTab) {
            activeTab.textContent =
              title.value
              || "メモ";
          }
        }
      );


      content.addEventListener(
        "input",
        () => {

          page.content =
            content.value;

          scheduleSave(
            page.id
          );
        }
      );


      title.addEventListener(
        "blur",
        () => {
          if (
            state.dirtyPages
              .has(
                page.id
              )
          ) {
            const version =
              state.versions.get(
                page.id
              )
              || 0;

            void savePage(
              page.id,
              version
            );
          }
        }
      );


      content.addEventListener(
        "blur",
        () => {
          if (
            state.dirtyPages
              .has(
                page.id
              )
          ) {
            const version =
              state.versions.get(
                page.id
              )
              || 0;

            void savePage(
              page.id,
              version
            );
          }
        }
      );


      deletePage.addEventListener(
        "click",
        async () => {

          if (
            deletePage.disabled
          ) {
            return;
          }


          const confirmed =
            window.confirm(
              `「${
                page.title
                || "メモ"
              }」を削除する？\n`
              + "この操作は元に戻せません。"
            );


          if (!confirmed) {
            return;
          }


          deletePage.disabled =
            true;


          const wasDirty =
            state.dirtyPages.has(
              page.id
            );


          cancelPendingSave(
            page.id
          );


          try {

            const data =
              await api(
                "DELETE",
                {
                  action:
                    "delete_page",

                  page_id:
                    page.id
                }
              );


            setButtons(
              data.buttons
            );


            const updatedButton =
              buttonById(
                button.id
              );


            const nextPage =
              updatedButton
                ?.pages
                ?.[0]
              || null;


            if (nextPage) {

              state.activePages[
                button.id
              ] =
                Number(
                  nextPage.id
                );

            } else {

              delete state.activePages[
                button.id
              ];
            }


            persistView();
            renderLaunchers();
            renderPanel();


          } catch (error) {

            if (wasDirty) {
              scheduleSave(
                page.id
              );
            }


            setStatus(
              "削除失敗",
              "error"
            );


            console.error(
              "Koppy global memo page delete failed.",
              error
            );


            deletePage.disabled =
              false;
          }
        }
      );


      editorFooter.append(
        deletePage,
        status
      );


      editor.append(
        title,
        content,
        editorFooter
      );
    }


    panel.append(
      head,
      tabs,
      editor
    );


    addPage.addEventListener(
      "click",
      async () => {

        addPage.disabled =
          true;


        try {

          const data =
            await api(
              "POST",
              {
                action:
                  "create_page",

                button_id:
                  button.id
              }
            );


          setButtons(
            data.buttons
          );


          state.activePages[
            button.id
          ] =
            Number(
              data.created_page_id
            );


          persistView();
          renderLaunchers();
          renderPanel();


        } catch (error) {

          setStatus(
            "追加失敗",
            "error"
          );

          console.error(
            "Koppy global memo page creation failed.",
            error
          );


        } finally {

          addPage.disabled =
            false;
        }
      }
    );


    addButton.addEventListener(
      "click",
      async () => {

        addButton.disabled =
          true;


        try {

          const data =
            await api(
              "POST",
              {
                action:
                  "create_button"
              }
            );


          setButtons(
            data.buttons
          );


          state.openButtonId =
            Number(
              data.created_button_id
            );


          state.activePages[
            state.openButtonId
          ] =
            Number(
              data.created_page_id
            );


          persistView();
          renderLaunchers();
          renderPanel();


        } catch (error) {

          setStatus(
            "追加失敗",
            "error"
          );

          console.error(
            "Koppy global memo button creation failed.",
            error
          );


        } finally {

          addButton.disabled =
            false;
        }
      }
    );


    deleteButton.addEventListener(
      "click",
      async () => {

        if (
          deleteButton.disabled
        ) {
          return;
        }


        const pageCount =
          button.pages
            ?.length
          || 0;


        const confirmed =
          window.confirm(
            "このメモボタンと中のメモ"
            + pageCount
            + "件を全部削除する？\n"
            + "この操作は元に戻せません。"
          );


        if (!confirmed) {
          return;
        }


        deleteButton.disabled =
          true;


        const dirtyPageIds =
          (
            button.pages
            || []
          )
            .filter(
              memoPage =>
                state.dirtyPages.has(
                  memoPage.id
                )
            )
            .map(
              memoPage =>
                Number(
                  memoPage.id
                )
            );


        (
          button.pages
          || []
        ).forEach(
          memoPage => {
            cancelPendingSave(
              Number(
                memoPage.id
              )
            );
          }
        );


        try {

          const data =
            await api(
              "DELETE",
              {
                action:
                  "delete_button",

                button_id:
                  button.id
              }
            );


          delete state.positions[
            button.id
          ];


          storageSet(
            POSITION_KEY,
            state.positions
          );


          delete state.activePages[
            button.id
          ];


          setButtons(
            data.buttons
          );


          state.openButtonId =
            null;

          panel.hidden =
            true;


          persistView();
          renderLaunchers();


        } catch (error) {

          dirtyPageIds.forEach(
            pageId => {
              scheduleSave(
                pageId
              );
            }
          );


          setStatus(
            "削除失敗",
            "error"
          );


          console.error(
            "Koppy global memo button delete failed.",
            error
          );


          deleteButton.disabled =
            false;
        }
      }
    );


    close.addEventListener(
      "click",
      () => {

        state.openButtonId =
          null;

        panel.hidden =
          true;

        persistView();

        renderLaunchers();
      }
    );


    panel.hidden =
      false;


    requestAnimationFrame(
      positionPanel
    );
  };


  const togglePanel = (
    buttonId
  ) => {
    if (
      state.openButtonId
      === buttonId
      && state.panel
      && !state.panel.hidden
    ) {

      state.openButtonId =
        null;

      state.panel.hidden =
        true;

      persistView();
      renderLaunchers();

      return;
    }


    state.openButtonId =
      buttonId;

    persistView();

    renderLaunchers();
    renderPanel();
  };


  const wireDrag = (
    launcher,
    buttonId
  ) => {
    let drag = null;
    let suppressClick = false;


    launcher.addEventListener(
      "pointerdown",
      event => {

        if (
          event.pointerType
            === "mouse"
          && event.button
            !== 0
        ) {
          return;
        }


        const rect =
          launcher
            .getBoundingClientRect();


        drag = {
          pointerId:
            event.pointerId,

          startX:
            event.clientX,

          startY:
            event.clientY,

          left:
            rect.left,

          top:
            rect.top,

          moved:
            false
        };


        suppressClick =
          false;


        launcher
          .setPointerCapture?.(
            event.pointerId
          );


        launcher.classList.add(
          "is-dragging"
        );
      }
    );


    launcher.addEventListener(
      "pointermove",
      event => {

        if (
          !drag
          || event.pointerId
            !== drag.pointerId
        ) {
          return;
        }


        const dx =
          event.clientX
          - drag.startX;

        const dy =
          event.clientY
          - drag.startY;


        if (
          !drag.moved
          && Math.hypot(
            dx,
            dy
          )
          < DRAG_THRESHOLD
        ) {
          return;
        }


        drag.moved =
          true;

        suppressClick =
          true;

        event.preventDefault();


        placeLauncher(
          launcher,
          drag.left + dx,
          drag.top + dy
        );


        if (
          state.openButtonId
          === buttonId
        ) {
          positionPanel();
        }
      }
    );


    const finish = (
      event
    ) => {

      if (
        !drag
        || event.pointerId
          !== drag.pointerId
      ) {
        return;
      }


      if (drag.moved) {
        saveLauncherPosition(
          buttonId,
          launcher
        );
      }


      try {
        launcher
          .releasePointerCapture?.(
            event.pointerId
          );
      } catch {
        // Capture may already be released.
      }


      drag =
        null;


      launcher.classList.remove(
        "is-dragging"
      );
    };


    launcher.addEventListener(
      "pointerup",
      finish
    );

    launcher.addEventListener(
      "pointercancel",
      finish
    );


    launcher.addEventListener(
      "click",
      event => {

        if (suppressClick) {

          suppressClick =
            false;

          event.preventDefault();

          return;
        }


        togglePanel(
          buttonId
        );
      }
    );
  };


  function renderLaunchers() {
    if (!state.root) {
      return;
    }


    state.root.replaceChildren();

    state.launchers.clear();


    state.buttons
      .forEach(
        (
          button,
          index
        ) => {

          const launcher =
            document.createElement(
              "button"
            );

          launcher.type =
            "button";

          launcher.className =
            "kgm-launcher";

          launcher.dataset
            .buttonId =
              String(
                button.id
              );


          launcher.setAttribute(
            "aria-label",
            `グローバルメモ ${index + 1}`
          );

          launcher.title =
            "メモ / ドラッグで移動";


          if (
            Number(
              state.openButtonId
            )
            === Number(
              button.id
            )
            && state.panel
            && !state.panel.hidden
          ) {
            launcher.classList.add(
              "is-open"
            );
          }


          const icon =
            document.createElement(
              "span"
            );

          icon.className =
            "kgm-launcher-icon";

          icon.setAttribute(
            "aria-hidden",
            "true"
          );

          icon.textContent =
            "▤";


          const badge =
            document.createElement(
              "span"
            );

          badge.className =
            "kgm-launcher-index";

          badge.textContent =
            String(
              index + 1
            );


          launcher.append(
            icon,
            badge
          );


          state.root.appendChild(
            launcher
          );


          state.launchers.set(
            Number(
              button.id
            ),
            launcher
          );


          wireDrag(
            launcher,
            Number(
              button.id
            )
          );


          requestAnimationFrame(
            () => {
              restoreLauncherPosition(
                Number(
                  button.id
                ),
                index,
                launcher
              );
            }
          );
        }
      );


    requestAnimationFrame(
      positionPanel
    );
  }


  const mount = async () => {

    ensureStyle();


    try {

      const data =
        await api(
          "GET"
        );


      setButtons(
        data.buttons
      );


    } catch (error) {

      if (error?.code === 401) {
        return;
      }


      console.error(
        "Koppy global memo load failed.",
        error
      );

      return;
    }


    state.positions =
      storageGet(
        POSITION_KEY,
        {}
      );


    const view =
      storageGet(
        VIEW_KEY,
        {}
      );


    state.openButtonId =
      Number.isFinite(
        Number(
          view?.openButtonId
        )
      )
        && Number(
          view?.openButtonId
        ) > 0
          ? Number(
              view.openButtonId
            )
          : null;


    state.activePages =
      (
        view?.activePages
        && typeof
          view.activePages
          === "object"
      )
        ? view.activePages
        : {};


    state.root =
      document.createElement(
        "div"
      );

    state.root.className =
      "kgm-root";


    state.panel =
      document.createElement(
        "section"
      );

    state.panel.className =
      "kgm-panel";

    state.panel.hidden =
      true;


    document.body.append(
      state.root,
      state.panel
    );


    renderLaunchers();


    if (
      state.openButtonId
      !== null
      && buttonById(
        state.openButtonId
      )
    ) {
      renderPanel();
    }


    const reflow = () => {

      state.launchers
        .forEach(
          (
            launcher,
            buttonId
          ) => {

            const index =
              state.buttons
                .findIndex(
                  button =>
                    Number(button.id)
                    === Number(
                      buttonId
                    )
                );


            restoreLauncherPosition(
              buttonId,
              Math.max(
                0,
                index
              ),
              launcher
            );
          }
        );


      positionPanel();
    };


    window.addEventListener(
      "resize",
      reflow
    );

    window.addEventListener(
      "orientationchange",
      reflow
    );

    window.visualViewport
      ?.addEventListener(
        "resize",
        reflow
      );


    if (
      typeof ResizeObserver
      === "function"
    ) {

      state.panelResizeObserver =
        new ResizeObserver(
          () => {
            window.requestAnimationFrame(
              clampPanelToViewport
            );
          }
        );


      state.panelResizeObserver
        .observe(
          state.panel
        );
    }


    window.addEventListener(
      "pagehide",
      flushDirty
    );


    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) {
          flushDirty();
        }
      }
    );


    window.KoppyGlobalMemo = {
      mounted:
        true,

      open:
        buttonId => {
          togglePanel(
            Number(
              buttonId
            )
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
      () => {
        void mount();
      },
      {
        once:
          true
      }
    );

  } else {

    void mount();
  }
})();
