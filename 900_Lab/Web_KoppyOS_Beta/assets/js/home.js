(() => {
  "use strict";

  /* ======================================================
     AUTH
  ====================================================== */

  const authGate =
    document.getElementById(
      "authGate"
    );

  const authGateMessage =
    document.getElementById(
      "authGateMessage"
    );

  const authChecking =
    document.getElementById(
      "authChecking"
    );

  const authLoginButton =
    document.getElementById(
      "authLoginButton"
    );

  const koppyWorld =
    document.getElementById(
      "koppyWorld"
    );

  async function checkAuthentication() {
    if (
      !authGate
      || !authGateMessage
      || !authChecking
      || !authLoginButton
      || !koppyWorld
    ) {
      return;
    }

    try {
      const response =
        await fetch(
          "https://koppy.miki-piano.com/api/v1/auth/session.php",
          {
            method:
              "GET",

            credentials:
              "include",

            headers: {
              "Accept":
                "application/json",
            },
          }
        );

      if (!response.ok) {
        throw new Error(
          `Auth API HTTP ${response.status}`
        );
      }

      const result =
        await response.json();

      const authenticated =
        result?.success === true
        && result?.data?.authenticated === true;

      if (!authenticated) {
        authGateMessage.textContent =
          "このWorldに入るにはGitHub認証が必要だよ。";

        authChecking.hidden =
          true;

        authLoginButton.hidden =
          false;

        return;
      }

      const githubLogin =
        result?.data?.user?.github_login
        ?? "";

      authGateMessage.textContent =
        githubLogin
          ? `${githubLogin} として認証できたよ。`
          : "認証できたよ。";

      authChecking.textContent =
        "Koppy Worldを起動中……";

      authLoginButton.hidden =
        true;

      window.setTimeout(
        () => {
          authGate.hidden =
            true;

          koppyWorld.classList.remove(
            "auth-pending"
          );
        },
        250
      );
    } catch (error) {
      console.error(
        "Authentication check failed:",
        error
      );

      authGateMessage.textContent =
        "認証状態を確認できなかったよ。";

      authChecking.hidden =
        true;

      authLoginButton.hidden =
        false;
    }
  }

  checkAuthentication();

  /* ======================================================
     COMMON / BRAIN
  ====================================================== */

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
        "Koppy WorldからBrain APIへ接続できています。";
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

  async function loadKoppyWorld() {
    setLoadingState();

    const brainApiUrl =
      "https://koppy.miki-piano.com/api/v1/brain/github.php";

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
      loadKoppyWorld
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

  /* ======================================================
     CHAT
  ====================================================== */

  // Chat moved to /chat/ and assets/js/chat.js.

  /* ======================================================
     LOCAL BRIDGE
  ====================================================== */

  const localBridgeButton =
    document.getElementById(
      "localBridgeButton"
    );

  const localBridgeStatus =
    document.getElementById(
      "localBridgeStatus"
    );

  const localBridgeSummary =
    document.getElementById(
      "localBridgeSummary"
    );

  const localBranchValue =
    document.getElementById(
      "localBranchValue"
    );

  const localChangesValue =
    document.getElementById(
      "localChangesValue"
    );

  const localChangeList =
    document.getElementById(
      "localChangeList"
    );

  function setLocalBridgeStatus(
    message,
    type = ""
  ) {
    if (!localBridgeStatus) {
      return;
    }

    localBridgeStatus.textContent =
      message;

    localBridgeStatus.className =
      `local-bridge-status ${type}`;
  }

  async function loadLocalGitStatus() {
    if (
      !localBridgeButton
      || !localBridgeSummary
      || !localBranchValue
      || !localChangesValue
      || !localChangeList
    ) {
      return;
    }

    localBridgeButton.disabled =
      true;

    localBridgeSummary.hidden =
      true;

    localChangeList.hidden =
      true;

    localChangeList.replaceChildren();

    setLocalBridgeStatus(
      "Mac内のローカルGitを確認しています……"
    );

    try {
      const response =
        await fetch(
          "/api/git-status",
          {
            cache:
              "no-store",
          }
        );

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }

      const result =
        await response.json();

      if (result.success !== true) {
        throw new Error(
          result.error
          || "原因不明のエラー"
        );
      }

      localBranchValue.textContent =
        result.branch
        || "ブランチ名なし";

      localBridgeSummary.hidden =
        false;

      if (result.hasChanges) {
        const changes =
          Array.isArray(
            result.changes
          )
            ? result.changes
            : [];

        localChangesValue.textContent =
          `${changes.length}件の変更あり`;

        localChangesValue.style.color =
          "var(--warning)";

        for (
          const change
          of changes
        ) {
          const item =
            document.createElement(
              "li"
            );

          item.textContent =
            change;

          localChangeList.appendChild(
            item
          );
        }

        localChangeList.hidden =
          changes.length === 0;

        setLocalBridgeStatus(
          `Local Bridge接続成功。${changes.length}件の変更を検知したよ。`,
          "warning"
        );
      } else {
        localChangesValue.textContent =
          "変更なし";

        localChangesValue.style.color =
          "var(--success)";

        setLocalBridgeStatus(
          "Local Bridge接続成功。未コミット変更はないよ。",
          "success"
        );
      }
    } catch (error) {
      console.error(
        "Local Bridge error:",
        error
      );

      localBranchValue.textContent =
        "取得失敗";

      localChangesValue.textContent =
        "確認できません";

      localChangesValue.style.color =
        "var(--error)";

      localBridgeSummary.hidden =
        false;

      setLocalBridgeStatus(
        `Local Bridge接続失敗：${error.message}`,
        "error"
      );
    } finally {
      localBridgeButton.disabled =
        false;
    }
  }

  if (localBridgeButton) {
    localBridgeButton.addEventListener(
      "click",
      loadLocalGitStatus
    );
  }

  chatInput?.focus();
})();