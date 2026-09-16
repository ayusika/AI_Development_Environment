(() => {
  "use strict";

  const SCHEDULE_API = "/api/next/v1/schedule.php";
  const scheduleApi = window.KohakuWorkNextSchedule;
  const drawer = document.getElementById("nextScheduleDetailDrawer");
  const footer = drawer?.querySelector(".next-schedule-detail-footer");
  const editButton = footer?.querySelector("[data-next-schedule-edit-open]");

  if (!scheduleApi || !drawer || !footer || !editButton) {
    console.error("Kohaku Work NEXT reservation delete: drawer UI missing.");
    return;
  }

  function mountDeleteButton() {
    if (footer.querySelector("[data-next-schedule-delete]")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "next-schedule-delete-button";
    button.dataset.nextScheduleDelete = "true";
    button.textContent = "予約を削除";

    editButton.before(button);
  }

  async function deleteReservation() {
    const visitId = Number(drawer.dataset.visitId || 0);
    if (!visitId) return;

    const visit = scheduleApi.state.visits.find(
      item => Number(item.id) === visitId
    ) || null;

    const label =
      visit?.customer_name
      || visit?.customer_code
      || `予約 #${visitId}`;

    const confirmed = window.confirm(
      `${label} を検証DBから削除する？\n\nこの操作は予約そのものを削除します。`
    );

    if (!confirmed) return;

    const button = footer.querySelector("[data-next-schedule-delete]");

    if (button) {
      button.disabled = true;
      button.textContent = "削除中…";
    }

    try {
      const response = await fetch(
        SCHEDULE_API,
        {
          method:"DELETE",
          credentials:"same-origin",
          cache:"no-store",
          headers:{
            "Content-Type":"application/json",
          },
          body:JSON.stringify({
            id:visitId,
          }),
        }
      );

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error("削除APIの応答を読めませんでした。");
      }

      if (!response.ok || !data || data.success !== true) {
        throw new Error(
          data?.error || "予約を削除できませんでした。"
        );
      }

      const index =
        scheduleApi.state.visits.findIndex(
          item => Number(item.id) === visitId
        );

      if (index >= 0) {
        scheduleApi.state.visits.splice(
          index,
          1
        );
      }

      scheduleApi.closeDetail();
      scheduleApi.render({
        preserveScroll:true,
      });

      window.alert(
        `予約 #${visitId} を検証DBから削除しました。`
      );

    } catch (error) {
      window.alert(
        error.message || "予約を削除できませんでした。"
      );

      if (button) {
        button.disabled = false;
        button.textContent = "予約を削除";
      }
    }
  }

  document.addEventListener(
    "click",
    event => {
      if (!event.target.closest("[data-next-schedule-delete]")) return;
      void deleteReservation();
    }
  );

  mountDeleteButton();

  window.KohakuWorkNextReservationDelete = {
    verificationWriteEnabled:true,
    productionWriteEnabled:false,
  };
})();
