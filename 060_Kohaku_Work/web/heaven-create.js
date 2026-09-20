(() => {
  "use strict";

  const FINAL_API = "/api/v1/heaven-diaries.php";
  const DRAFT_API = "/api/v1/heaven-diary-drafts.php";
  const GENERATE_API = "/api/v1/heaven-diary.php";
  const SETTINGS_API = "/api/v1/heaven-diary-settings.php";

  const root = document.getElementById("view-heaven-create");

  if (!root) {
    console.error("Kohaku Work NEXT Heaven reservation diary: view missing.");
    return;
  }

  const state = {
    visit: null,
    settings: null,
    generatedCore: null,
    openingToken: 0,
  };

  const AUTOSAVE_DELAY = 800;

  let autosaveTimer = null;
  let changeRevision = 0;
  let saveQueue = Promise.resolve(true);

  function $(selector) {
    return root.querySelector(selector);
  }

  function text(value) {
    return String(value ?? "");
  }

  function payload(data) {
    return data?.data && typeof data.data === "object" ? data.data : data;
  }

  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      ...options,
    });

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("APIの応答を読めませんでした。");
    }

    if (!response.ok || !data || data.success !== true) {
      throw new Error(data?.error || "処理できませんでした。");
    }

    return data;
  }

  function statusLabel(value) {
    return ({
      new: "新規",
      repeat: "リピ",
      other_store_repeat: "他店リピ",
      repeat_unknown_id: "リピ",
    })[text(value)] || text(value) || "未登録";
  }

  function customerLabel(visit) {
    const names = Array.isArray(visit?.customer_names)
      ? visit.customer_names
      : [];

    const nickname = names.find(
      item => item?.name_type === "nickname" && item?.name
    );
    const kashikoi = names.find(
      item => item?.name_type === "kashikoi" && item?.name
    );
    const any = names.find(item => item?.name);

    if (nickname) return text(nickname.name);
    if (kashikoi) return `カ:${text(kashikoi.name)}`;
    if (any) return text(any.name);

    return text(visit?.customer_name)
      || text(visit?.customer_code)
      || "名前未登録";
  }

  function optionNames(visit) {
    if (!Array.isArray(visit?.options)) return [];

    return [
      ...new Set(
        visit.options
          .map(item => text(item?.custom_name || item?.name).trim())
          .filter(Boolean)
      ),
    ];
  }

  function isRepeat(visit) {
    return [
      "repeat",
      "other_store_repeat",
      "repeat_unknown_id",
    ].includes(text(visit?.customer_status));
  }

  function localKey() {
    return state.visit?.id
      ? `kohakuWorkNextHeavenDiaryDraft:${state.visit.id}`
      : "";
  }

  function formValues() {
    return {
      title: $("#nextHeavenTitle")?.value || "",
      body: $("#nextHeavenBody")?.value || "",
      note: $("#nextHeavenNote")?.value || "",
      extra_note: $("#nextHeavenExtraNote")?.value || "",
      place: root.querySelector(
        'input[name="next-heaven-place"]:checked'
      )?.value || "hotel",
    };
  }

  function setStatus(message, isError = false) {
    const node = $("#nextHeavenStatus");
    if (!node) return;
    node.textContent = message || "";
    node.classList.toggle("is-error", isError);
  }

  function saveLocalDraft() {
    const key = localKey();
    if (!key) return;

    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          ...formValues(),
          updated_at: new Date().toISOString(),
        })
      );
    } catch (error) {
      console.error("NEXT Heaven local draft save failed:", error);
    }
  }

  function clearLocalDraft() {
    const key = localKey();
    if (!key) return;

    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error("NEXT Heaven local draft cleanup failed:", error);
    }
  }

  function applyDraft(draft) {
    if (!draft) return false;

    const title = $("#nextHeavenTitle");
    const body = $("#nextHeavenBody");
    const note = $("#nextHeavenNote");
    const extra = $("#nextHeavenExtraNote");

    if (title) title.value = text(draft.title);
    if (body) body.value = text(draft.body);
    if (note) note.value = text(draft.note);
    if (extra) {
      extra.value = text(draft.extra_note ?? draft.extraNote);
    }

    const place = text(draft.place) || "hotel";

    root
      .querySelectorAll('input[name="next-heaven-place"]')
      .forEach(input => {
        input.checked = input.value === place;
      });

    return true;
  }

  function restoreLocalDraft() {
    const key = localKey();
    if (!key) return false;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) return false;

      const draft = JSON.parse(raw);
      if (!draft || typeof draft !== "object") return false;

      return applyDraft(draft);
    } catch (error) {
      console.error("NEXT Heaven local draft restore failed:", error);
      return false;
    }
  }

  function settingsThankYou() {
    return state.settings?.thank_you || {};
  }

  function defaultTitle() {
    const templates = state.settings?.title_templates || {};

    return isRepeat(state.visit)
      ? templates.thank_you_repeat || "リピートお礼日記♡♡♡"
      : templates.thank_you_new || "お礼日記♡";
  }

  function bodyTemplate() {
    return text(
      settingsThankYou().body_template
      || (
        "さっき{place}{course}分"
        + "{options_part}{repeat}お兄さん♡"
        + "\n\n\n{body}"
        + "\n\n\n{signature}"
      )
    );
  }

  function signature() {
    return text(
      settingsThankYou().signature
      ?? state.settings?.basic?.signature
      ?? "❄︎こはく❄︎"
    );
  }

  function placeText(place) {
    return ({
      hotel: "ホテルで",
      room: "Rで",
      home: "自宅で",
    })[text(place)] || "ホテルで";
  }

  function syncRenderedBodyPlace() {
    const body = $("#nextHeavenBody");
    if (!body) return;

    const current = body.value || "";
    if (!current) return;

    const replacement =
      placeText(formValues().place);

    const next = current.replace(
      /(ホテルで|ルームで|Rで|自宅で)/,
      replacement
    );

    if (next !== current) {
      body.value = next;
    }
  }

  function renderBody(core) {
    const body = $("#nextHeavenBody");
    if (!body) return;

    const visit = state.visit;
    const placeMap = {
      hotel: "ホテルで",
      room: "Rで",
      home: "自宅で",
    };

    const options = optionNames(visit);

    const values = {
      place: placeText(formValues().place),
      course: text(Number(visit?.course_minutes || 0)),
      options_part: options.length
        ? `${options.join("、")}希望の`
        : "の",
      repeat: isRepeat(visit) ? "リピの" : "",
      body: text(core),
      signature: signature(),
    };

    let rendered = bodyTemplate().replace(
      /\{(place|course|options_part|repeat|body|signature)\}/g,
      (match, key) => values[key] ?? match
    );

    if (!core) {
      rendered = rendered.replace(/\n{4,}/g, "\n\n\n");
    }

    body.value = rendered;
  }

  function renderVisit() {
    const visit = state.visit;
    if (!visit) return;

    const customer = $("#nextHeavenCustomer");
    const meta = $("#nextHeavenMeta");
    const options = $("#nextHeavenOptions");
    const store = $("#nextHeavenStore");

    if (customer) customer.textContent = customerLabel(visit);

    const started = text(visit.started_at);
    const time = started.length >= 16
      ? started.slice(11, 16)
      : "--:--";

    if (meta) {
      meta.textContent =
        `${time}｜${Number(visit.course_minutes || 0)}分｜${statusLabel(
          visit.customer_status
        )}`;
    }

    if (options) {
      const names = optionNames(visit);
      options.textContent =
        `OP: ${names.length ? names.join("・") : "なし"}`;
    }

    if (store) {
      store.textContent = text(visit.store_name) || "札幌";
    }
  }

  async function loadSettings() {
    try {
      const data = await requestJson(SETTINGS_API, { method: "GET" });
      state.settings = payload(data)?.settings || null;
    } catch (error) {
      console.warn(
        "NEXT Heaven settings load failed; fallback used.",
        error
      );
      state.settings = null;
    }
  }

  async function loadSavedFinal() {
    const visitId = Number(state.visit?.id || 0);
    if (!visitId) return false;

    try {
      const data = await requestJson(
        `${FINAL_API}?visit_id=${encodeURIComponent(String(visitId))}`,
        { method: "GET" }
      );

      const diary = payload(data)?.diary || null;
      if (!diary) return false;

      const body = $("#nextHeavenBody");
      if (body) body.value = text(diary.body);

      setStatus("✓ 保存済み日記を読み込みました");
      return true;
    } catch (error) {
      console.warn("NEXT Heaven final diary load failed:", error);
      return false;
    }
  }

  async function loadCloudDraft() {
    const visitId = Number(state.visit?.id || 0);
    if (!visitId) return false;

    try {
      const data = await requestJson(
        `${DRAFT_API}?visit_id=${encodeURIComponent(String(visitId))}`,
        { method: "GET" }
      );

      const draft = payload(data)?.draft || null;
      if (!draft) return false;

      applyDraft(draft);
      syncServicePlace(draft.place);
      setStatus("✓ DBの保存内容を読み込みました");
      return true;
    } catch (error) {
      console.warn("NEXT Heaven cloud draft load failed:", error);
      return false;
    }
  }

  function syncServicePlace(place) {
    const normalized = [
      "hotel",
      "room",
      "home",
    ].includes(text(place))
      ? text(place)
      : "";

    if (!normalized) return;

    if (state.visit) {
      state.visit.service_place = normalized;
    }

    const scheduleVisit =
      window.KohakuWorkNextSchedule
        ?.state
        ?.visits
        ?.find(
          item =>
            Number(item.id)
            === Number(state.visit?.id || 0)
        );

    if (scheduleVisit) {
      scheduleVisit.service_place = normalized;
    }
  }

  async function persistDb(
    revision,
    { quiet = false } = {}
  ) {
    const visitId = Number(state.visit?.id || 0);
    if (!visitId) return false;

    const values = formValues();

    if (!quiet) {
      setStatus("↻ DB保存中…");
    }

    try {
      await requestJson(DRAFT_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          visit_id: visitId,
          title: values.title,
          body: values.body,
          note: values.note,
          extra_note: values.extra_note,
          place: values.place,
        }),
      });

      saveLocalDraft();
      syncServicePlace(values.place);

      if (
        revision === changeRevision
        && !quiet
      ) {
        setStatus("✓ DB保存");
      }

      return true;
    } catch (error) {
      if (revision === changeRevision) {
        setStatus(
          error.message || "DB保存できませんでした。",
          true
        );
      }

      return false;
    }
  }

  function queueDbSave(
    revision,
    options = {}
  ) {
    const run =
      () => persistDb(revision, options);

    saveQueue =
      saveQueue
        .catch(() => true)
        .then(run);

    return saveQueue;
  }

  function scheduleDbSave(
    delay = AUTOSAVE_DELAY
  ) {
    if (autosaveTimer) {
      window.clearTimeout(autosaveTimer);
    }

    changeRevision += 1;
    const revision = changeRevision;

    setStatus(
      delay === 0
        ? "↻ DB保存中…"
        : "• DB保存待ち"
    );

    autosaveTimer =
      window.setTimeout(
        () => {
          autosaveTimer = null;
          void queueDbSave(revision);
        },
        delay
      );
  }

  async function flushDbSave(
    { quiet = false } = {}
  ) {
    if (autosaveTimer) {
      window.clearTimeout(autosaveTimer);
      autosaveTimer = null;
    }

    changeRevision += 1;

    return await queueDbSave(
      changeRevision,
      { quiet }
    );
  }

  async function generateDiary() {
    const visit = state.visit;
    if (!visit) return;

    const values = formValues();

    if (!values.note.trim()) {
      setStatus("「接客で書きたいこと」を入力してね。", true);
      $("#nextHeavenNote")?.focus();
      return;
    }

    const button = $("[data-nhc-generate]");
    if (button) {
      button.disabled = true;
      button.textContent = "Koppyが作成中…";
    }

    setStatus("日記本文を生成しています…");

    try {
      const data = await requestJson(GENERATE_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          note: values.note.trim(),
          extra_note: values.extra_note.trim(),
          course_minutes: Number(visit.course_minutes || 0),
          customer_status: text(visit.customer_status),
          place: values.place,
          options: optionNames(visit),
        }),
      });

      const core = text(
        payload(data)?.reply || data.reply
      ).trim();

      if (!core) {
        throw new Error("生成本文が空でした。");
      }

      state.generatedCore = core;
      renderBody(core);
      saveLocalDraft();
      scheduleDbSave(0);
      setStatus("✓ 日記本文を作成しました");
    } catch (error) {
      setStatus(
        error.message || "日記を生成できませんでした。",
        true
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "このお客様の日記を作る ✦ API";
      }
    }
  }

  async function saveFinal() {
    const visitId = Number(state.visit?.id || 0);
    const body = $("#nextHeavenBody")?.value?.trim() || "";

    if (!visitId || !body) {
      setStatus("保存する日記本文がありません。", true);
      return;
    }

    const button = $("[data-nhc-save-final]");
    if (button) {
      button.disabled = true;
      button.textContent = "保存中…";
    }

    setStatus("DBへ日記を保存しています…");

    try {
      const workingSaved =
        await flushDbSave({
          quiet:true,
        });

      if (!workingSaved) {
        throw new Error(
          "入力内容をDB保存できませんでした。"
        );
      }

      await requestJson(FINAL_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          visit_id: visitId,
          body,
          source: "manual",
        }),
      });

      try {
        await requestJson(
          `${DRAFT_API}?visit_id=${encodeURIComponent(String(visitId))}`,
          { method: "DELETE" }
        );
      } catch (error) {
        console.warn("NEXT Heaven draft cleanup failed:", error);
      }

      clearLocalDraft();
      if (state.visit) state.visit.diary_saved = true;
      setStatus("✓ DBに保存しました");
    } catch (error) {
      setStatus(
        error.message || "日記を保存できませんでした。",
        true
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "DBに保存";
      }
    }
  }

  function bridgeElements() {
    return {
      send: document.getElementById("heaven-bridge-send"),
      title: document.getElementById("heaven-standalone-title"),
      body: document.getElementById("heaven-standalone-body"),
      status: document.getElementById("heaven-bridge-status"),
      visible: $("#nextHeavenSend"),
      visibleStatus: $("#nextHeavenBridgeStatus"),
    };
  }

  function syncBridge() {
    const bridge = bridgeElements();

    if (
      !(bridge.send instanceof HTMLButtonElement)
      || !(bridge.visible instanceof HTMLButtonElement)
    ) {
      return;
    }

    bridge.visible.disabled = bridge.send.disabled;

    if (bridge.visibleStatus) {
      bridge.visibleStatus.textContent = bridge.send.disabled
        ? "Userscripts Bridgeを確認中…"
        : "Userscripts Bridge 接続済み";
    }
  }

  async function sendToHeaven() {
    const bridge = bridgeElements();

    const workingSaved =
      await flushDbSave({
        quiet:true,
      });

    if (!workingSaved) {
      setStatus(
        "DB保存に失敗したため送信を止めました。",
        true
      );
      return;
    }

    const titleValue = $("#nextHeavenTitle")?.value?.trim() || "";
    const bodyValue = $("#nextHeavenBody")?.value?.trim() || "";

    if (!titleValue || !bodyValue) {
      setStatus("タイトルと本文を確認してね。", true);
      return;
    }

    if (
      !(bridge.send instanceof HTMLButtonElement)
      || !(bridge.title instanceof HTMLInputElement)
      || !(bridge.body instanceof HTMLTextAreaElement)
      || bridge.send.disabled
    ) {
      setStatus(
        "Userscripts Bridgeがまだ準備できていません。",
        true
      );
      return;
    }

    const originalTitle = bridge.title.value;
    const originalBody = bridge.body.value;

    let finished = false;
    let observer = null;

    const restore = () => {
      if (finished) return;
      finished = true;
      observer?.disconnect();

      bridge.title.value = originalTitle;
      bridge.body.value = originalBody;

      bridge.title.dispatchEvent(new Event("input", { bubbles: true }));
      bridge.body.dispatchEvent(new Event("input", { bubbles: true }));

      window.setTimeout(() => {
        window.KohakuReservationHeavenBridgeActive = false;
      }, 0);

      syncBridge();
    };

    window.KohakuReservationHeavenBridgeActive = true;

    bridge.title.value = titleValue;
    bridge.body.value = bodyValue;

    bridge.title.dispatchEvent(new Event("input", { bubbles: true }));
    bridge.body.dispatchEvent(new Event("input", { bubbles: true }));

    saveLocalDraft();

    if (bridge.status) {
      observer = new MutationObserver(() => {
        const statusText = bridge.status.textContent || "";

        if (statusText.includes("送信準備できました")) {
          setStatus("✓ ヘブン送信準備できました");
          window.setTimeout(restore, 1200);
        }
      });

      observer.observe(bridge.status, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }

    bridge.send.click();
    window.setTimeout(restore, 8000);
  }

  async function initializeOpen(token) {
    await loadSettings();

    if (token !== state.openingToken || !state.visit) return;

    renderVisit();

    const title = $("#nextHeavenTitle");
    const note = $("#nextHeavenNote");
    const extra = $("#nextHeavenExtraNote");

    if (title) title.value = defaultTitle();
    if (note) note.value = "";
    if (extra) extra.value = "";

    const visitPlace =
      text(state.visit?.service_place);

    if (
      [
        "hotel",
        "room",
        "home",
      ].includes(visitPlace)
    ) {
      root
        .querySelectorAll(
          'input[name="next-heaven-place"]'
        )
        .forEach(input => {
          input.checked =
            input.value === visitPlace;
        });
    }

    state.generatedCore = null;
    renderBody("");

    const hasSavedFinal =
      await loadSavedFinal();

    if (token !== state.openingToken) return;

    const hasCloudDraft =
      await loadCloudDraft();

    if (token !== state.openingToken) return;

    const hasLocalDraft =
      !hasCloudDraft
      && restoreLocalDraft();

    if (hasLocalDraft) {
      setStatus(
        "✓ この端末の保存内容を復元しました"
      );
    } else if (
      !hasCloudDraft
      && !hasSavedFinal
    ) {
      setStatus(
        "入力内容はリアルタイムでDB保存されます。"
      );
    }

    syncBridge();
  }

  function open(visit) {
    if (!visit?.id) {
      window.alert("日記対象の予約を確認できませんでした。");
      return;
    }

    state.visit = visit;
    const token = ++state.openingToken;

    setStatus("日記情報を読み込み中…");

    window.KohakuWorkNext?.showView?.("heaven-create");
    void initializeOpen(token);
  }

  async function backToSchedule() {
    saveLocalDraft();

    await flushDbSave({
      quiet:true,
    });

    window.KohakuWorkNext
      ?.showView?.("schedule");

    void window.KohakuWorkNextSchedule
      ?.load?.();
  }

  root.addEventListener("input", event => {
    if (
      event.target.matches(
        "#nextHeavenTitle, #nextHeavenBody, #nextHeavenNote, #nextHeavenExtraNote"
      )
    ) {
      saveLocalDraft();
      scheduleDbSave();
    }
  });

  root.addEventListener("change", event => {
    if (event.target.matches('input[name="next-heaven-place"]')) {
      if (state.generatedCore !== null) {
        renderBody(state.generatedCore);
      } else {
        syncRenderedBodyPlace();
      }

      saveLocalDraft();
      scheduleDbSave(0);
    }
  });

  root.addEventListener("click", event => {
    if (event.target.closest("[data-nhc-back]")) {
      void backToSchedule();
      return;
    }

    if (event.target.closest("[data-nhc-generate]")) {
      void generateDiary();
      return;
    }

    if (event.target.closest("#nextHeavenSend")) {
      void sendToHeaven();
    }
  });

  const bridge = bridgeElements();

  if (bridge.send instanceof HTMLButtonElement) {
    new MutationObserver(syncBridge).observe(bridge.send, {
      attributes: true,
      attributeFilter: ["disabled"],
    });
  }

  if (bridge.status) {
    new MutationObserver(syncBridge).observe(bridge.status, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  window.KohakuWorkNextHeavenCreate = {
    open,
    verificationReadEnabled: false,
    verificationWriteEnabled: false,
    productionWriteEnabled: true,
    bridgeCompatible: true,
  };
})();
