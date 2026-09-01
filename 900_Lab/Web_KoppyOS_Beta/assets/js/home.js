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
     BRAIN
  ====================================================== */

  // Brain moved to /brain/ and assets/js/brain.js.

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
})();