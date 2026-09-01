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
     SYSTEM
  ====================================================== */

  // Local Bridge moved to /system/ and assets/js/system.js.
})();