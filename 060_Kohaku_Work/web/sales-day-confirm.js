(() => {
  "use strict";

  const CONFIRM_API =
    "/api/v1/sales-day-confirm.php";

  const VISIT_PREVIEW_API =
    "/api/v1/visit-sales.php";

  /*
   * First production rollout:
   * preview is live, DB write stays locked.
   */
  const WRITE_ENABLED =
    false;

  const view =
    document.getElementById(
      "view-sales"
    );

  if (!view) {
    return;
  }

  const confirmState = {
    lastResult:null,
    preview:null,
    previewLoading:false,
    writeBusy:false,
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function dashboard() {
    const api =
      window.KohakuWorkNextSales;

    if (
      !api
      || typeof api.load
        !== "function"
    ) {
      throw new Error(
        "売上画面がまだ準備できていません。"
      );
    }

    return api;
  }

  function money(value) {
    return (
      "¥ "
      + Number(
        value || 0
      ).toLocaleString(
        "ja-JP"
      )
    );
  }

  async function readJson(
    response,
    fallback
  ) {
    let payload;

    try {
      payload =
        await response.json();
    } catch {
      throw new Error(
        fallback
      );
    }

    if (
      !response.ok
      || !payload
      || payload.success !== true
    ) {
      throw new Error(
        payload?.error
        || fallback
      );
    }

    return payload;
  }

  function isDaily(
    result
  ) {
    const type =
      result?.period?.type;

    return (
      type === "today"
      || type === "day"
    );
  }

  function anchorDate(
    result
  ) {
    return String(
      result?.period?.anchor_date
      || ""
    );
  }

  function resultStoreId(
    result
  ) {
    const value =
      Number(
        result?.filter?.store_id
        || 0
      );

    return value > 0
      ? value
      : null;
  }

  function unenteredVisits(
    result
  ) {
    return (
      Array.isArray(
        result?.visits
      )
        ? result.visits
        : []
    ).filter(
      visit =>
        visit.sales_state
        !== "confirmed"
    );
  }

  function sortedVisitIds(
    visits
  ) {
    return visits
      .map(
        visit =>
          Number(
            visit.id
          )
      )
      .filter(
        id =>
          Number.isInteger(id)
          && id > 0
      )
      .sort(
        (a,b) =>
          a - b
      );
  }

  function sameIds(
    left,
    right
  ) {
    if (
      left.length
      !== right.length
    ) {
      return false;
    }

    return left.every(
      (value,index) =>
        value
        === right[index]
    );
  }

  function setMessage(
    text,
    mode = ""
  ) {
    const message =
      byId(
        "nextSalesDayConfirmMessage"
      );

    if (!message) {
      return;
    }

    message.hidden =
      !text;

    message.textContent =
      text || "";

    message.classList.remove(
      "is-error",
      "is-ok",
      "is-warning"
    );

    if (mode) {
      message.classList.add(
        mode
      );
    }
  }

  function setMetric(
    id,
    value
  ) {
    const element =
      byId(id);

    if (element) {
      element.textContent =
        value;
    }
  }

  function resetPanel(
    hide = true
  ) {
    confirmState.preview =
      null;

    const panel =
      byId(
        "nextSalesDayConfirmPanel"
      );

    const submit =
      byId(
        "nextSalesDayConfirmSubmit"
      );

    if (
      panel
      && hide
    ) {
      panel.hidden =
        true;
    }

    if (submit) {
      submit.hidden =
        false;

      submit.disabled =
        true;
    }

    setMessage("");
  }

  function renderEmpty(
    result,
    messageText =
      "この日の売上はすべて確定済みです。"
  ) {
    const list =
      byId(
        "nextSalesDayConfirmList"
      );

    if (list) {
      list.replaceChildren();

      const empty =
        document.createElement(
          "p"
        );

      empty.className =
        "next-sales-empty";

      empty.textContent =
        "この日の未確定売上はありません。";

      list.appendChild(
        empty
      );
    }

    const summary =
      result?.summary || {};

    setMetric(
      "nextSalesDayConfirmCount",
      "0件"
    );

    setMetric(
      "nextSalesDayConfirmAmount",
      "¥ 0"
    );

    setMetric(
      "nextSalesDayConfirmFee",
      money(
        summary.daily_fee_total
        || 0
      )
    );

    setMetric(
      "nextSalesDayConfirmNet",
      money(
        summary.net_take_home_total
        ?? (
          Number(
            summary.take_home_total
            || 0
          )
          - Number(
            summary.daily_fee_total
            || 0
          )
        )
      )
    );

    const submit =
      byId(
        "nextSalesDayConfirmSubmit"
      );

    if (submit) {
      submit.hidden =
        true;
    }

    setMessage(
      messageText,
      "is-ok"
    );
  }

  function visitLabel(
    visit
  ) {
    const started =
      String(
        visit.started_at
        || ""
      );

    const time =
      started.slice(
        11,
        16
      );

    const course =
      visit.course_name
      || (
        visit.course_minutes
          ? `${
              Number(
                visit.course_minutes
              )
            }分`
          : "コース未登録"
      );

    return [
      time,
      visit.store_name,
      course,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  function renderPreviewRow(
    item
  ) {
    const row =
      document.createElement(
        "article"
      );

    row.className =
      item.ready
        ? "next-sales-confirm-row"
        : "next-sales-confirm-row is-error";

    const main =
      document.createElement(
        "div"
      );

    const name =
      document.createElement(
        "strong"
      );

    name.textContent =
      item.visit.customer_name
      || "お客様";

    const detail =
      document.createElement(
        "small"
      );

    detail.textContent =
      visitLabel(
        item.visit
      );

    main.append(
      name,
      detail
    );

    const side =
      document.createElement(
        "div"
      );

    const amount =
      document.createElement(
        "strong"
      );

    amount.textContent =
      item.ready
        ? money(
            item.takeHome
          )
        : "要確認";

    const status =
      document.createElement(
        "small"
      );

    status.textContent =
      item.ready
        ? "確定可能"
        : (
            item.error
            || "料金未確認"
          );

    side.append(
      amount,
      status
    );

    row.append(
      main,
      side
    );

    return row;
  }

  async function fetchVisitPreview(
    visit
  ) {
    try {
      const response =
        await fetch(
          `${
            VISIT_PREVIEW_API
          }?visit_id=${
            encodeURIComponent(
              String(
                visit.id
              )
            )
          }`,
          {
            method:"GET",
            credentials:
              "same-origin",
            cache:
              "no-store",
          }
        );

      const result =
        await readJson(
          response,
          "売上プレビューの取得に失敗しました。"
        );

      const takeHome =
        result?.preview
          ?.take_home_total;

      const ready =
        takeHome !== null
        && takeHome !== undefined
        && Number.isFinite(
          Number(takeHome)
        );

      return {
        visit,
        ready,
        takeHome:
          ready
            ? Number(
                takeHome
              )
            : null,
        error:
          ready
            ? null
            : "手取り料金が未設定です。",
      };

    } catch (error) {
      return {
        visit,
        ready:false,
        takeHome:null,
        error:
          error?.message
          || "売上プレビューの取得に失敗しました。",
      };
    }
  }

  async function openConfirm() {
    if (
      confirmState.previewLoading
      || confirmState.writeBusy
    ) {
      return;
    }

    const panel =
      byId(
        "nextSalesDayConfirmPanel"
      );

    const list =
      byId(
        "nextSalesDayConfirmList"
      );

    const submit =
      byId(
        "nextSalesDayConfirmSubmit"
      );

    if (
      !panel
      || !list
      || !submit
    ) {
      throw new Error(
        "売上一括確認画面が見つかりません。"
      );
    }

    confirmState.previewLoading =
      true;

    confirmState.preview =
      null;

    panel.hidden =
      false;

    submit.hidden =
      false;

    submit.disabled =
      true;

    list.replaceChildren();

    const loading =
      document.createElement(
        "p"
      );

    loading.className =
      "next-sales-loading";

    loading.textContent =
      "この日の売上を再確認しています…";

    list.appendChild(
      loading
    );

    setMessage(
      "本番DBへはまだ書き込みません。まず全件を確認します。"
    );

    try {
      const api =
        dashboard();

      const current =
        api.state || {};

      const result =
        await api.load({
          period:
            current.period,
          date:
            current.date,
          storeId:
            current.storeId,
        });

      if (
        !result
        || !isDaily(result)
      ) {
        throw new Error(
          "「今日」または指定日の売上を表示してから確認してください。"
        );
      }

      const date =
        anchorDate(result);

      if (
        !/^\d{4}-\d{2}-\d{2}$/
          .test(date)
      ) {
        throw new Error(
          "売上確定日の取得に失敗しました。"
        );
      }

      const parts =
        date
          .split("-")
          .map(Number);

      setMetric(
        "nextSalesDayConfirmTitle",
        Number.isFinite(
          parts[1]
        )
        && Number.isFinite(
          parts[2]
        )
          ? `${
              parts[1]
            }/${
              parts[2]
            } の売上確認`
          : "この日の売上確認"
      );

      const visits =
        unenteredVisits(
          result
        );

      if (
        visits.length === 0
      ) {
        renderEmpty(
          result
        );

        return;
      }

      const previews =
        await Promise.all(
          visits.map(
            fetchVisitPreview
          )
        );

      list.replaceChildren();

      let confirmTakeHome =
        0;

      let ready =
        true;

      const takeHomeByVisit =
        {};

      previews.forEach(
        item => {
          list.appendChild(
            renderPreviewRow(
              item
            )
          );

          if (!item.ready) {
            ready =
              false;

            return;
          }

          confirmTakeHome +=
            item.takeHome;

          takeHomeByVisit[
            String(
              Number(
                item.visit.id
              )
            )
          ] =
            item.takeHome;
        }
      );

      const summary =
        result.summary || {};

      const confirmedTakeHome =
        Number(
          summary.take_home_total
          || 0
        );

      const projectedFee =
        Number(
          summary.projected_daily_fee_total
          || 0
        );

      const projectedGross =
        confirmedTakeHome
        + confirmTakeHome;

      const projectedNet =
        projectedGross
        - projectedFee;

      setMetric(
        "nextSalesDayConfirmCount",
        `${
          visits.length
            .toLocaleString(
              "ja-JP"
            )
        }件`
      );

      setMetric(
        "nextSalesDayConfirmAmount",
        ready
          ? money(
              confirmTakeHome
            )
          : "¥ −"
      );

      setMetric(
        "nextSalesDayConfirmFee",
        money(
          projectedFee
        )
      );

      setMetric(
        "nextSalesDayConfirmNet",
        ready
          ? money(
              projectedNet
            )
          : "¥ −"
      );

      confirmState.preview = {
        ready,
        date,
        storeId:
          resultStoreId(
            result
          ),
        visitIds:
          sortedVisitIds(
            visits
          ),
        takeHomeByVisit,
        confirmTakeHome,
        projectedFee,
        projectedNet,
      };

      submit.disabled =
        !ready
        || !WRITE_ENABLED;

      setMessage(
        ready
          ? (
              WRITE_ENABLED
                ? "全件の料金確認OK。確定ボタンを押すと、もう一度対象を照合してから書き込みます。"
                : "全件の料金確認OK。本番確定は初回確認のため現在ロック中です。DBへの書き込みは行いません。"
            )
          : "「要確認」の接客があります。料金を確認するまで一括確定できません。",
        ready
          ? (
              WRITE_ENABLED
                ? "is-ok"
                : "is-warning"
            )
          : "is-warning"
      );

      panel.scrollIntoView({
        behavior:"smooth",
        block:"nearest",
      });

    } catch (error) {
      confirmState.preview =
        null;

      submit.disabled =
        true;

      list.replaceChildren();

      const failure =
        document.createElement(
          "p"
        );

      failure.className =
        "next-sales-error";

      failure.textContent =
        error?.message
        || "日次売上の確認に失敗しました。";

      list.appendChild(
        failure
      );

      setMessage(
        failure.textContent,
        "is-error"
      );

    } finally {
      confirmState.previewLoading =
        false;
    }
  }

  async function confirmDay() {
    if (!WRITE_ENABLED) {
      setMessage(
        "本番確定は現在ロック中です。DBへの書き込みは行いません。",
        "is-warning"
      );

      return;
    }

    if (
      confirmState.writeBusy
    ) {
      return;
    }

    const snapshot =
      confirmState.preview;

    const submit =
      byId(
        "nextSalesDayConfirmSubmit"
      );

    if (
      !snapshot?.ready
      || !submit
    ) {
      setMessage(
        "確認データがありません。もう一度「まとめて確認」を開いてください。",
        "is-error"
      );

      return;
    }

    confirmState.writeBusy =
      true;

    submit.disabled =
      true;

    setMessage(
      "確定対象を本番DBと再照合しています…"
    );

    try {
      const api =
        dashboard();

      const fresh =
        await api.load({
          period:"day",
          date:
            snapshot.date,
          storeId:
            snapshot.storeId,
        });

      if (
        !fresh
        || !isDaily(fresh)
        || anchorDate(fresh)
          !== snapshot.date
      ) {
        throw new Error(
          "売上確認日が変更されました。確認画面を開き直してください。"
        );
      }

      const freshIds =
        sortedVisitIds(
          unenteredVisits(
            fresh
          )
        );

      if (
        !sameIds(
          freshIds,
          snapshot.visitIds
        )
      ) {
        confirmState.preview =
          null;

        throw new Error(
          "未確定の接客が確認時から変更されました。確認画面を開き直してください。"
        );
      }

      const freshFee =
        Number(
          fresh?.summary
            ?.projected_daily_fee_total
          || 0
        );

      if (
        freshFee
        !== snapshot.projectedFee
      ) {
        confirmState.preview =
          null;

        throw new Error(
          "日次手数料が確認時から変更されました。確認画面を開き直してください。"
        );
      }

      const proceed =
        window.confirm(
          [
            `${snapshot.date} の未確定売上 ${
              snapshot.visitIds.length
            }件を本番DBへ確定します。`,
            "",
            `今回確定分: ${
              money(
                snapshot.confirmTakeHome
              )
            }`,
            `確定後手取り: ${
              money(
                snapshot.projectedNet
              )
            }`,
            "",
            "対象IDと各手取り額はAPI側でも再照合します。",
            "内容が変わっていた場合は1件も確定しません。",
            "",
            "この内容で確定しますか？",
          ].join("\n")
        );

      if (!proceed) {
        setMessage(
          "確定をキャンセルしました。DBへの書き込みはありません。",
          "is-warning"
        );

        submit.disabled =
          false;

        return;
      }

      setMessage(
        "本番DBへ一括確定しています…"
      );

      const payload = {
        date:
          snapshot.date,

        expected_visit_ids:
          snapshot.visitIds,

        expected_take_home_by_visit:
          snapshot.takeHomeByVisit,
      };

      if (
        Number(
          snapshot.storeId
        ) > 0
      ) {
        payload.store_id =
          Number(
            snapshot.storeId
          );
      }

      const response =
        await fetch(
          CONFIRM_API,
          {
            method:"POST",

            credentials:
              "same-origin",

            cache:
              "no-store",

            headers:{
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );

      const result =
        await readJson(
          response,
          "日次売上の一括確定に失敗しました。"
        );

      const confirmedCount =
        Number(
          result.confirmed_count
          || 0
        );

      const after =
        await api.load({
          period:"day",
          date:
            snapshot.date,
          storeId:
            snapshot.storeId,
        });

      confirmState.preview =
        null;

      if (!after) {
        setMessage(
          `${
            confirmedCount.toLocaleString(
              "ja-JP"
            )
          }件の売上確定は完了しましたが、画面の再読み込みに失敗しました。売上画面を開き直して確認してください。`,
          "is-warning"
        );

        return;
      }

      renderEmpty(
        after,
        `${
          confirmedCount.toLocaleString(
            "ja-JP"
          )
        }件の売上をまとめて確定しました。`
      );

    } catch (error) {
      console.error(
        "Kohaku Work daily sales confirm failed:",
        error
      );

      confirmState.preview =
        null;

      submit.disabled =
        true;

      setMessage(
        error?.message
        || "日次売上の一括確定に失敗しました。",
        "is-error"
      );

    } finally {
      confirmState.writeBusy =
        false;

      if (
        confirmState.preview
          ?.ready
      ) {
        submit.disabled =
          false;
      }
    }
  }

  function syncTrigger(
    result
  ) {
    if (!result) {
      return;
    }

    confirmState.lastResult =
      result;

    const trigger =
      byId(
        "nextSalesDayConfirmOpen"
      );

    const daily =
      isDaily(result);

    const visits =
      unenteredVisits(
        result
      );

    if (trigger) {
      trigger.hidden =
        !daily
        || visits.length === 0;
    }

    if (
      confirmState.previewLoading
      || confirmState.writeBusy
    ) {
      return;
    }

    const preview =
      confirmState.preview;

    if (!preview) {
      return;
    }

    const changed =
      !daily
      || anchorDate(result)
        !== preview.date
      || resultStoreId(result)
        !== preview.storeId
      || !sameIds(
        sortedVisitIds(
          visits
        ),
        preview.visitIds
      );

    if (changed) {
      resetPanel(true);
    }
  }

  view.addEventListener(
    "koppy:sales-loaded",
    event => {
      syncTrigger(
        event.detail
          ?.result
      );
    }
  );

  view.addEventListener(
    "click",
    event => {
      const button =
        event.target.closest(
          "[data-next-sales-confirm-action]"
        );

      if (!button) {
        return;
      }

      event.preventDefault();

      const action =
        button.dataset
          .nextSalesConfirmAction;

      if (action === "open") {
        void openConfirm();

        return;
      }

      if (action === "close") {
        resetPanel(true);

        return;
      }

      if (action === "submit") {
        void confirmDay();
      }
    }
  );

  window.KohakuWorkSalesDayConfirm = {
    open:
      openConfirm,

    confirm:
      confirmDay,

    close:
      () =>
        resetPanel(true),

    state:
      confirmState,
  };
})();
