(() => {
  "use strict";

  const DETAIL_API = "/api/next/v1/visit-detail.php";
  const scheduleApi = window.KohakuWorkNextSchedule;

  if (
    !scheduleApi
    || typeof scheduleApi.openDetail !== "function"
    || !scheduleApi.state
  ) {
    console.error(
      "Kohaku Work NEXT complete detail module: schedule API missing."
    );
    return;
  }

  const drawer =
    document.getElementById("nextScheduleDetailDrawer");
  const body =
    document.getElementById("nextScheduleDetailBody");
  const editButton =
    document.querySelector("[data-next-schedule-edit-open]");

  if (!drawer || !body || !editButton) {
    console.error(
      "Kohaku Work NEXT complete detail module: drawer UI missing."
    );
    return;
  }

  let requestToken = 0;
  const originalOpenDetail = scheduleApi.openDetail;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function textOrNone(value) {
    const text = String(value ?? "").trim();
    return text || "なし";
  }

  function money(value) {
    if (
      value === null
      || value === undefined
      || value === ""
    ) {
      return "未入力";
    }

    return `¥${Number(value).toLocaleString("ja-JP")}`;
  }

  function signedMoney(value) {
    if (
      value === null
      || value === undefined
      || value === ""
    ) {
      return "未入力";
    }

    const amount = Number(value);

    if (amount === 0) {
      return "¥0";
    }

    return `${amount > 0 ? "+" : "-"}¥${Math.abs(amount).toLocaleString("ja-JP")}`;
  }

  function memoBlock(label, value) {
    return `
      <article class="next-schedule-complete-note">
        <span>${escapeHtml(label)}</span>
        <p>${escapeHtml(textOrNone(value))}</p>
      </article>
    `;
  }

  function diaryStatusLabel(record) {
    const status = String(record?.status || "");

    return ({
      draft:"下書き",
      scheduled:"予約投稿",
      posted:"投稿済み",
      cancelled:"取消",
    })[status]
      || status
      || "状態不明";
  }

  function diaryRecordHtml(record) {
    const title = textOrNone(record?.title);

    const meta = [
      record?.platform,
      record?.diary_type,
      diaryStatusLabel(record),
      record?.posted_at
        ? `投稿 ${record.posted_at}`
        : "",
      record?.scheduled_at
        ? `予定 ${record.scheduled_at}`
        : "",
    ]
      .filter(Boolean)
      .join(" / ");

    return `
      <details class="next-schedule-complete-details">
        <summary>
          <strong>${escapeHtml(title)}</strong>
          <small>${escapeHtml(meta)}</small>
        </summary>
        <p>${escapeHtml(textOrNone(record?.body))}</p>
      </details>
    `;
  }

  function heavenHtml(record) {
    if (!record) {
      return `
        <p class="next-schedule-complete-empty">
          ヘブン日記なし
        </p>
      `;
    }

    const meta = [
      record.platform || "heaven",
      record.source || "",
      record.updated_at
        ? `更新 ${record.updated_at}`
        : "",
    ]
      .filter(Boolean)
      .join(" / ");

    return `
      <details class="next-schedule-complete-details">
        <summary>
          <strong>ヘブン日記</strong>
          <small>${escapeHtml(meta)}</small>
        </summary>
        <p>${escapeHtml(textOrNone(record.body))}</p>
      </details>
    `;
  }

  function renderCompleteDetail(data) {
    const visit = data.visit || {};
    const sales = data.sales || null;
    const diary = data.diary || {};
    const diaries = Array.isArray(diary.diaries)
      ? diary.diaries
      : [];

    body
      .querySelector("[data-next-complete-detail]")
      ?.remove();

    const cancellation =
      visit.status === "cancelled"
      || visit.cancelled_at
        ? `
          <p
            class="next-schedule-detail-section-label"
            data-next-detail-section="cancellation"
          >
            CANCELLATION
          </p>

          <div class="next-schedule-detail-card">
            <div class="next-schedule-detail-row">
              <span>状態</span>
              <strong>${escapeHtml(textOrNone(visit.status))}</strong>
            </div>
            <div class="next-schedule-detail-row">
              <span>取消日時</span>
              <strong>${escapeHtml(textOrNone(visit.cancelled_at))}</strong>
            </div>
            <div class="next-schedule-detail-row">
              <span>取消者</span>
              <strong>${escapeHtml(textOrNone(visit.cancelled_by))}</strong>
            </div>
            <div class="next-schedule-detail-row">
              <span>理由</span>
              <strong>${escapeHtml(textOrNone(visit.cancel_reason))}</strong>
            </div>
          </div>
        `
        : "";

    const diaryItems = diaries.length
      ? diaries.map(diaryRecordHtml).join("")
      : `
        <p class="next-schedule-complete-empty">
          通常日記の紐付けなし
        </p>
      `;

    const salesHtml = sales
      ? `
        <div class="next-detail-sales-overview">
          <div class="next-detail-sales-total">
            <div>
              <span class="next-detail-sales-status">
                ${escapeHtml(
                  sales.confirmed_at
                    ? "確定済み"
                    : "未確定"
                )}
              </span>
              <small>最終手取り</small>
            </div>

            <strong>
              ${escapeHtml(
                money(sales.take_home_total)
              )}
            </strong>
          </div>

          <div class="next-detail-sales-metrics">
            <article>
              <span>コース</span>
              <strong>
                ${escapeHtml(
                  money(
                    sales.course_take_home_snapshot
                  )
                )}
              </strong>
            </article>

            <article>
              <span>OP</span>
              <strong>
                ${escapeHtml(
                  money(
                    sales.option_take_home_total_snapshot
                  )
                )}
              </strong>
            </article>

            <article>
              <span>チップ</span>
              <strong>
                ${escapeHtml(
                  money(sales.tip_amount)
                )}
              </strong>
            </article>

            <article>
              <span>調整</span>
              <strong>
                ${escapeHtml(
                  signedMoney(
                    sales.adjustment_amount
                  )
                )}
              </strong>
            </article>
          </div>

          <details class="next-detail-sales-breakdown">
            <summary>
              <span>売上内訳</span>
              <strong>詳細を見る</strong>
            </summary>

            <div class="next-schedule-detail-card">
              <div class="next-schedule-detail-row">
                <span>基本料金snapshot</span>
                <strong>${escapeHtml(money(sales.base_price_snapshot))}</strong>
              </div>
              <div class="next-schedule-detail-row">
                <span>OP売上</span>
                <strong>${escapeHtml(money(sales.option_price_total_snapshot))}</strong>
              </div>
              <div class="next-schedule-detail-row">
                <span>割引</span>
                <strong>${escapeHtml(money(sales.discount_amount))}</strong>
              </div>
              <div class="next-schedule-detail-row">
                <span>割引区分</span>
                <strong>${escapeHtml(textOrNone(sales.discount_reason_type))}</strong>
              </div>
              <div class="next-schedule-detail-row">
                <span>割引メモ</span>
                <strong>${escapeHtml(textOrNone(sales.discount_reason_note))}</strong>
              </div>
              <div class="next-schedule-detail-row">
                <span>支払総額</span>
                <strong>${escapeHtml(money(sales.customer_payment_total))}</strong>
              </div>
              <div class="next-schedule-detail-row">
                <span>確定日時</span>
                <strong>${escapeHtml(textOrNone(sales.confirmed_at))}</strong>
              </div>
            </div>
          </details>
        </div>
      `
      : `
        <p class="next-schedule-complete-empty">
          売上レコードなし
        </p>
      `;

    body.insertAdjacentHTML(
      "beforeend",
      `
        <div
          class="next-schedule-complete-detail"
          data-next-complete-detail
        >
          ${cancellation}

          <p
            class="next-schedule-detail-section-label"
            data-next-detail-section="memos"
          >
            MEMOS
          </p>

          <div class="next-schedule-complete-notes">
            ${memoBlock("特徴メモ", visit.customer_features)}
            ${memoBlock("会話メモ", visit.conversation_notes)}
            ${memoBlock("来店メモ", visit.visit_notes)}
          </div>

          <p
            class="next-schedule-detail-section-label"
            data-next-detail-section="diary"
          >
            DIARY
          </p>

          <div class="next-schedule-complete-stack">
            ${memoBlock("日記素材", diary.note?.body)}
            ${diaryItems}
            ${heavenHtml(diary.heaven)}
          </div>

          <p
            class="next-schedule-detail-section-label"
            data-next-detail-section="sales"
          >
            SALES
          </p>

          ${salesHtml}

          <p
            class="next-schedule-detail-section-label"
            data-next-detail-section="snapshot"
          >
            INPUT SNAPSHOT
          </p>

          <div class="next-schedule-detail-card">
            <div class="next-schedule-detail-row">
              <span>予約受付日時</span>
              <strong>${escapeHtml(textOrNone(visit.booked_at))}</strong>
            </div>
            <div class="next-schedule-detail-row">
              <span>顧客ID</span>
              <strong>${escapeHtml(
                visit.customer_id === null
                || visit.customer_id === undefined
                  ? "未紐付け"
                  : String(visit.customer_id)
              )}</strong>
            </div>
            <div class="next-schedule-detail-row">
              <span>顧客コード</span>
              <strong>${escapeHtml(textOrNone(visit.customer_code))}</strong>
            </div>
            <div class="next-schedule-detail-row">
              <span>指名料</span>
              <strong>${escapeHtml(money(visit.nomination_fee_amount))}</strong>
            </div>
            <div class="next-schedule-detail-row">
              <span>予約状態</span>
              <strong>${escapeHtml(textOrNone(visit.status))}</strong>
            </div>
            <div class="next-schedule-detail-row">
              <span>作成</span>
              <strong>${escapeHtml(textOrNone(visit.created_at))}</strong>
            </div>
            <div class="next-schedule-detail-row">
              <span>更新</span>
              <strong>${escapeHtml(textOrNone(visit.updated_at))}</strong>
            </div>
          </div>
        </div>
      `
    );
  }

  function mergeDetailIntoState(data) {
    const visit = data.visit;

    if (!visit) {
      return;
    }

    const index =
      scheduleApi.state.visits.findIndex(
        item =>
          Number(item.id)
          === Number(visit.id)
      );

    if (index < 0) {
      return;
    }

    scheduleApi.state.visits[index] = {
      ...scheduleApi.state.visits[index],
      ...visit,
      sales_detail: data.sales || null,
      diary_detail: data.diary || null,
      detail_loaded:true,
    };
  }

  function setEditLoading(loading) {
    editButton.disabled = loading;
    editButton.textContent = loading
      ? "詳細読込中…"
      : "✎ 予約を編集";
  }

  function showReadError(message) {
    body
      .querySelector("[data-next-complete-detail]")
      ?.remove();

    body.insertAdjacentHTML(
      "beforeend",
      `
        <div
          class="next-schedule-complete-detail is-error"
          data-next-complete-detail
        >
          <p class="next-schedule-detail-section-label">
            COMPLETE READ ERROR
          </p>

          <p class="next-schedule-complete-error">
            ${escapeHtml(message)}
          </p>

          <p class="next-schedule-complete-error-note">
            完全情報を取得できていないため、この予約の編集はロックしています。
            Drawerを閉じて再度開くと再読込します。
          </p>
        </div>
      `
    );
  }

  async function loadCompleteDetail(visitId) {
    const token = ++requestToken;

    delete drawer.dataset.detailLoadedId;
    setEditLoading(true);

    try {
      const response = await fetch(
        `${DETAIL_API}?id=${encodeURIComponent(String(visitId))}`,
        {
          method:"GET",
          credentials:"same-origin",
          cache:"no-store",
        }
      );

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "完全予約情報APIの応答を読めませんでした。"
        );
      }

      if (
        !response.ok
        || !data
        || data.success !== true
        || !data.visit
      ) {
        throw new Error(
          data?.error
          || "完全予約情報を取得できませんでした。"
        );
      }

      if (
        token !== requestToken
        || Number(drawer.dataset.visitId || 0) !== Number(visitId)
        || !drawer.classList.contains("is-open")
      ) {
        return;
      }

      mergeDetailIntoState(data);
      renderCompleteDetail(data);

      drawer.dataset.detailLoadedId =
        String(visitId);

      setEditLoading(false);

      const status =
        document.getElementById("nextScheduleWriteStatus");

      if (
        status
        && (
          !status.dataset.state
          || status.dataset.state === "editing"
        )
      ) {
        status.textContent =
          "VERIFICATION DB / EDIT READY";
        status.dataset.state = "";
      }

    } catch (error) {
      if (
        token !== requestToken
        || Number(drawer.dataset.visitId || 0) !== Number(visitId)
      ) {
        return;
      }

      showReadError(
        error.message
        || "完全予約情報を取得できませんでした。"
      );

      setEditLoading(true);
    }
  }

  function maybeLoadCompleteDetail() {
    const visitId =
      Number(drawer.dataset.visitId || 0);

    if (
      !visitId
      || !drawer.classList.contains("is-open")
    ) {
      if (!visitId) {
        delete drawer.dataset.detailLoadedId;
        requestToken += 1;
      }
      return;
    }

    if (
      String(drawer.dataset.detailLoadedId || "")
      === String(visitId)
    ) {
      return;
    }

    void loadCompleteDetail(visitId);
  }

  const observer =
    new MutationObserver(
      () => {
        queueMicrotask(
          maybeLoadCompleteDetail
        );
      }
    );

  observer.observe(
    drawer,
    {
      attributes:true,
      attributeFilter:[
        "class",
        "data-visit-id",
      ],
    }
  );

  scheduleApi.openDetail =
    function(
      visit,
      trigger = null
    ) {
      delete drawer.dataset.detailLoadedId;

      const result =
        originalOpenDetail(
          visit,
          trigger
        );

      queueMicrotask(
        maybeLoadCompleteDetail
      );

      return result;
    };

  scheduleApi.completeDetailReadEnabled =
    true;
})();
