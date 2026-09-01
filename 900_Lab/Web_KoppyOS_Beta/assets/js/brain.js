(() => {
  "use strict";

  /* ======================================================
     KOPPY BRAIN
  ====================================================== */

  const brainApiUrl =
    "https://koppy.miki-piano.com/api/v1/brain/github.php";

  const loadButton =
    document.getElementById(
      "loadButton"
    );

  const buttonText =
    document.getElementById(
      "buttonText"
    );

  const coreRing =
    document.getElementById(
      "coreRing"
    );

  const coreStatus =
    document.getElementById(
      "coreStatus"
    );

  const connectionValue =
    document.getElementById(
      "connectionValue"
    );

  const connectionDetail =
    document.getElementById(
      "connectionDetail"
    );

  const commitValue =
    document.getElementById(
      "commitValue"
    );

  const commitDetail =
    document.getElementById(
      "commitDetail"
    );

  const updatedValue =
    document.getElementById(
      "updatedValue"
    );

  const brainDetail =
    document.getElementById(
      "brainDetail"
    );

  const statusMessage =
    document.getElementById(
      "statusMessage"
    );

  const documentElement =
    document.getElementById(
      "document"
    );

  const documentToggle =
    document.getElementById(
      "documentToggle"
    );

  const documentWrap =
    document.getElementById(
      "documentWrap"
    );


  function setMessage(
    message,
    type = ""
  ) {
    if (!statusMessage) {
      return;
    }

    statusMessage.textContent =
      message;

    statusMessage.className =
      `status-message ${type}`;
  }


  function formatDate(
    dateString
  ) {
    if (!dateString) {
      return "更新日時不明";
    }

    const date =
      new Date(
        dateString
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return dateString;
    }

    return new Intl.DateTimeFormat(
      "ja-JP",
      {
        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit",
      }
    ).format(
      date
    );
  }


  function setLoadingState() {
    if (loadButton) {
      loadButton.disabled =
        true;
    }

    if (buttonText) {
      buttonText.textContent =
        "Brain接続中…";
    }

    if (coreRing) {
      coreRing.classList.remove(
        "success"
      );

      coreRing.classList.add(
        "loading"
      );
    }

    if (coreStatus) {
      coreStatus.textContent =
        "GitHub Brainへ接続しています";
    }

    if (connectionValue) {
      connectionValue.textContent =
        "接続中";
    }

    if (connectionDetail) {
      connectionDetail.textContent =
        "Koppy Brain APIを確認中です。";
    }

    if (commitValue) {
      commitValue.textContent =
        "確認中";
    }

    if (commitDetail) {
      commitDetail.textContent =
        "最新コミットを探しています。";
    }

    if (updatedValue) {
      updatedValue.textContent =
        "確認中";
    }

    if (brainDetail) {
      brainDetail.textContent =
        "最新コミット日時を取得しています。";
    }

    if (documentElement) {
      documentElement.textContent =
        "GitHub正本を取得中……";
    }

    setMessage(
      "ちょっと待ってね。\nKoppyがGitHub Brainを見にいってるよ。"
    );
  }


  function setSuccessState({
    shortCommit,
    commitMessage,
    updatedAt,
    documentText,
  }) {
    if (coreRing) {
      coreRing.classList.remove(
        "loading"
      );

      coreRing.classList.add(
        "success"
      );
    }

    if (coreStatus) {
      coreStatus.textContent =
        "GitHub Brain 接続完了";
    }

    if (connectionValue) {
      connectionValue.textContent =
        "Connected";
    }

    if (connectionDetail) {
      connectionDetail.textContent =
        "Koppy Brain APIへ接続できています。";
    }

    if (commitValue) {
      commitValue.textContent =
        shortCommit;
    }

    if (commitDetail) {
      commitDetail.textContent =
        commitMessage;
    }

    if (updatedValue) {
      updatedValue.textContent =
        formatDate(
          updatedAt
        );
    }

    if (brainDetail) {
      brainDetail.textContent =
        "GitHub上の最新コミット日時";
    }

    if (documentElement) {
      documentElement.textContent =
        documentText;
    }

    setMessage(
      "見てきたよ！\nGitHub Brainとの接続は正常。\nKoppy設計書もちゃんと読み込めたよ。",
      "success"
    );
  }


  function setErrorState(
    errorMessage
  ) {
    if (coreRing) {
      coreRing.classList.remove(
        "loading",
        "success"
      );
    }

    if (coreStatus) {
      coreStatus.textContent =
        "Brain接続エラー";
    }

    if (connectionValue) {
      connectionValue.textContent =
        "Disconnected";
    }

    if (connectionDetail) {
      connectionDetail.textContent =
        "Brain APIとの接続に失敗しました。";
    }

    if (commitValue) {
      commitValue.textContent =
        "取得失敗";
    }

    if (commitDetail) {
      commitDetail.textContent =
        errorMessage;
    }

    if (updatedValue) {
      updatedValue.textContent =
        "取得失敗";
    }

    if (brainDetail) {
      brainDetail.textContent =
        "最新コミット日時を取得できませんでした。";
    }

    if (documentElement) {
      documentElement.textContent =
        "GitHub正本を取得できませんでした。";
    }

    setMessage(
      `むむ、Brainへつながらなかった。\n${errorMessage}`,
      "error"
    );
  }


  function resetBrainButton() {
    if (loadButton) {
      loadButton.disabled =
        false;
    }

    if (buttonText) {
      buttonText.textContent =
        "もう一度Brainを見る";
    }
  }


  async function loadKoppyBrain() {
    setLoadingState();

    try {
      const response =
        await fetch(
          brainApiUrl,
          {
            method:
              "GET",

            cache:
              "no-store",
          }
        );

      let result;

      try {
        result =
          await response.json();
      } catch {
        throw new Error(
          "Brain APIから読み取れるJSONが返ってこなかったよ。"
        );
      }

      if (
        !response.ok
        || result.success !== true
      ) {
        throw new Error(
          result.error
          || `Brain取得失敗（HTTP ${response.status}）`
        );
      }

      const data =
        result.data;

      setSuccessState({
        shortCommit:
          data.latest_commit?.short_sha
          || "不明",

        commitMessage:
          data.latest_commit?.message
          || "コミットメッセージ不明",

        updatedAt:
          data.latest_commit?.date
          || "",

        documentText:
          data.document?.content
          || "Brain本文が空でした。",
      });
    } catch (error) {
      console.error(
        "Koppy Brain load failed:",
        error
      );

      setErrorState(
        error instanceof Error
          ? error.message
          : "不明なエラー"
      );
    } finally {
      resetBrainButton();
    }
  }


  if (loadButton) {
    loadButton.addEventListener(
      "click",
      loadKoppyBrain
    );
  }


  if (
    documentToggle
    && documentWrap
  ) {
    documentToggle.addEventListener(
      "click",
      () => {
        const isHidden =
          documentWrap.hasAttribute(
            "hidden"
          );

        if (isHidden) {
          documentWrap.removeAttribute(
            "hidden"
          );

          documentToggle.textContent =
            "本文を閉じる";

          documentToggle.setAttribute(
            "aria-expanded",
            "true"
          );
        } else {
          documentWrap.setAttribute(
            "hidden",
            ""
          );

          documentToggle.textContent =
            "本文を開く";

          documentToggle.setAttribute(
            "aria-expanded",
            "false"
          );
        }
      }
    );
  }
})();