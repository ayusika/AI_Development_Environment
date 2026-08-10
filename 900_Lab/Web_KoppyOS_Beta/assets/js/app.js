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
      document.getElementById("loadButton");

    const buttonText =
      document.getElementById("buttonText");

    const coreRing =
      document.getElementById("coreRing");

    const coreStatus =
      document.getElementById("coreStatus");

    const connectionValue =
      document.getElementById("connectionValue");

    const connectionDetail =
      document.getElementById("connectionDetail");

    const commitValue =
      document.getElementById("commitValue");

    const commitDetail =
      document.getElementById("commitDetail");

    const updatedValue =
      document.getElementById("updatedValue");

    const brainDetail =
      document.getElementById("brainDetail");

    const statusMessage =
      document.getElementById("statusMessage");

    const documentElement =
      document.getElementById("document");

    const documentToggle =
      document.getElementById("documentToggle");

    const documentWrap =
      document.getElementById("documentWrap");

    function setMessage(
      message,
      type = ""
    ) {
      statusMessage.textContent =
        message;

      statusMessage.className =
        `status-message ${type}`;
    }

    function setLoadingState() {
      loadButton.disabled =
        true;

      buttonText.textContent =
        "Brain接続中…";

      coreRing.classList.remove(
        "success"
      );

      coreRing.classList.add(
        "loading"
      );

      coreStatus.textContent =
        "GitHub Brainへ接続しています";

      connectionValue.textContent =
        "接続中";

      connectionDetail.textContent =
        "Koppy Brain APIを確認中です。";

      commitValue.textContent =
        "確認中";

      commitDetail.textContent =
        "最新コミットを探しています。";

      updatedValue.textContent =
        "確認中";

      brainDetail.textContent =
        "最新コミット日時を取得しています。";

      documentElement.textContent =
        "GitHub正本を取得中……";

      setMessage(
        "ちょっと待ってね。\nKoppyがGitHub Brainを見にいってるよ。"
      );
    }

    function formatDate(
      dateString
    ) {
      if (!dateString) {
        return "更新日時不明";
      }

      const date =
        new Date(dateString);

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
      ).format(date);
    }

    function setSuccessState({
      shortCommit,
      commitMessage,
      updatedAt,
      documentText,
    }) {
      coreRing.classList.remove(
        "loading"
      );

      coreRing.classList.add(
        "success"
      );

      coreStatus.textContent =
        "GitHub Brain 接続完了";

      connectionValue.textContent =
        "Connected";

      connectionDetail.textContent =
        "Koppy WorldからBrain APIへ接続できています。";

      commitValue.textContent =
        shortCommit;

      commitDetail.textContent =
        commitMessage;

      updatedValue.textContent =
        formatDate(
          updatedAt
        );

      brainDetail.textContent =
        "GitHub上の最新コミット日時";

      documentElement.textContent =
        documentText;

      setMessage(
        "見てきたよ！\nGitHub Brainとの接続は正常。\nKoppy設計書もちゃんと読み込めたよ。",
        "success"
      );
    }

    function setErrorState(
      errorMessage
    ) {
      coreRing.classList.remove(
        "loading",
        "success"
      );

      coreStatus.textContent =
        "Brain接続エラー";

      connectionValue.textContent =
        "Disconnected";

      connectionDetail.textContent =
        "Brain APIとの接続に失敗しました。";

      commitValue.textContent =
        "取得失敗";

      commitDetail.textContent =
        errorMessage;

      updatedValue.textContent =
        "取得失敗";

      brainDetail.textContent =
        "最新コミット日時を取得できませんでした。";

      documentElement.textContent =
        "GitHub正本を取得できませんでした。";

      setMessage(
        `むむ、Brainへつながらなかった。\n${errorMessage}`,
        "error"
      );
    }

    function resetButton() {
      loadButton.disabled =
        false;

      buttonText.textContent =
        "もう一度Brainを見る";
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
        resetButton();
      }
    }

    loadButton.addEventListener(
      "click",
      loadKoppyWorld
    );

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

    /* ======================================================
       CHAT
    ====================================================== */

    const koppyChatApiUrl =
      "https://koppy.miki-piano.com/api/v1/chat.php";

    const chatForm =
      document.getElementById("chatForm");

    const chatInput =
      document.getElementById("chatInput");

    const chatMessages =
      document.getElementById("chatMessages");

    const chatSendButton =
      document.getElementById("chatSendButton");

    const chatSendButtonText =
      document.getElementById("chatSendButtonText");

    const chatStatusDot =
      document.getElementById("chatStatusDot");

    const chatStatusText =
      document.getElementById("chatStatusText");

    const chatErrorMessage =
      document.getElementById("chatErrorMessage");

    const chatCharacterCount =
      document.getElementById("chatCharacterCount");

    function getKoppyGreeting() {
      const hour =
        new Date().getHours();

      if (
        hour >= 5
        && hour < 11
      ) {
        return "おはよう、しいちゃん☀️\n今日も一緒に遊んで開発しよ〜。";
      }

      if (
        hour >= 11
        && hour < 18
      ) {
        return "こんにちは、しいちゃん🌸\nここからボクと話せるよ。";
      }

      return "おかえり、しいちゃん✨\n今日も一緒にKoppy Worldを育てよ〜。";
    }

    function setChatStatus(
      status,
      text
    ) {
      chatStatusDot.className =
        "chat-status-dot";

      if (status) {
        chatStatusDot.classList.add(
          status
        );
      }

      chatStatusText.textContent =
        text;
    }

    function scrollChatToBottom() {
      chatMessages.scrollTo({
        top:
          chatMessages.scrollHeight,

        behavior:
          "smooth",
      });
    }

    function createChatMessage({
      speaker,
      text,
      type,
    }) {
      const messageElement =
        document.createElement(
          "div"
        );

      messageElement.className =
        `chat-message ${type}-message`;

      const avatarElement =
        document.createElement(
          "div"
        );

      avatarElement.className =
        "chat-avatar";

      avatarElement.textContent =
        type === "user"
          ? "♦ᴷ"
          : "♢ᴷ";

      const contentElement =
        document.createElement(
          "div"
        );

      contentElement.className =
        "chat-message-content";

      const speakerElement =
        document.createElement(
          "p"
        );

      speakerElement.className =
        "chat-speaker";

      speakerElement.textContent =
        speaker;

      const bubbleElement =
        document.createElement(
          "div"
        );

      bubbleElement.className =
        "chat-bubble";

      bubbleElement.textContent =
        text;

      contentElement.append(
        speakerElement,
        bubbleElement
      );

      messageElement.append(
        avatarElement,
        contentElement
      );

      chatMessages.appendChild(
        messageElement
      );

      scrollChatToBottom();

      return messageElement;
    }

    function createThinkingMessage() {
      const messageElement =
        document.createElement(
          "div"
        );

      messageElement.className =
        "chat-message koppy-message thinking-message";

      messageElement.innerHTML = `
        <div class="chat-avatar">
          ♢ᴷ
        </div>

        <div class="chat-message-content">
          <p class="chat-speaker">
            Koppy
          </p>

          <div class="chat-bubble">
            <span
              class="thinking-dots"
              aria-label="Koppyが考えています"
            >
              <span></span>
              <span></span>
              <span></span>
            </span>
          </div>
        </div>
      `;

      chatMessages.appendChild(
        messageElement
      );

      scrollChatToBottom();

      return messageElement;
    }

    function setChatSending(
      isSending
    ) {
      chatInput.disabled =
        isSending;

      chatSendButton.disabled =
        isSending;

      chatSendButtonText.textContent =
        isSending
          ? "思考中…"
          : "送信";

      setChatStatus(
        isSending
          ? "loading"
          : "online",

        isSending
          ? "Thinking..."
          : "Online"
      );
    }

    async function sendMessageToKoppy(
      message
    ) {
      const response =
        await fetch(
          koppyChatApiUrl,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                message,
              }),
          }
        );

      let result;

      try {
        result =
          await response.json();
      } catch {
        throw new Error(
          "Koppy APIから読み取れるJSONが返ってこなかったよ。"
        );
      }

      if (
        !response.ok
        || result.success !== true
      ) {
        throw new Error(
          result.error
          || `通信に失敗しました。HTTP ${response.status}`
        );
      }

      const reply =
        result.data?.reply;

      if (
        typeof reply !== "string"
        || reply.trim() === ""
      ) {
        throw new Error(
          "Koppyの返答が空っぽだったよ。"
        );
      }

      return reply.trim();
    }

    chatInput.addEventListener(
      "input",
      () => {
        chatCharacterCount.textContent =
          String(
            chatInput.value.length
          );
      }
    );

    chatInput.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Enter"
          && !event.shiftKey
          && !event.isComposing
        ) {
          event.preventDefault();

          chatForm.requestSubmit();
        }
      }
    );

    chatForm.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        const message =
          chatInput.value.trim();

        if (!message) {
          chatErrorMessage.textContent =
            "メッセージを入力してね。";

          return;
        }

        chatErrorMessage.textContent =
          "";

        createChatMessage({
          speaker:
            "しいちゃん",

          text:
            message,

          type:
            "user",
        });

        chatInput.value =
          "";

        chatCharacterCount.textContent =
          "0";

        setChatSending(
          true
        );

        const thinkingMessage =
          createThinkingMessage();

        try {
          const reply =
            await sendMessageToKoppy(
              message
            );

          thinkingMessage.remove();

          createChatMessage({
            speaker:
              "Koppy",

            text:
              reply,

            type:
              "koppy",
          });
        } catch (error) {
          thinkingMessage.remove();

          const errorText =
            error instanceof Error
              ? error.message
              : "原因不明のエラー";

          chatErrorMessage.textContent =
            errorText;

          setChatStatus(
            "error",
            "Offline"
          );
        } finally {
          setChatSending(
            false
          );

          chatInput.disabled =
            false;


          chatInput.focus();
        }
      }
    );

    const initialKoppyBubble =
      chatMessages.querySelector(
        ".koppy-message .chat-bubble"
      );

    if (initialKoppyBubble) {
      initialKoppyBubble.textContent =
        getKoppyGreeting();
    }

    setChatStatus(
      "online",
      "Online"
    );

    /* ======================================================
       PROPOSAL / GITHUB WRITER
    ====================================================== */

    const proposalApiBase =
      "https://koppy.miki-piano.com/api/v1/brain";

    const proposalForm =
      document.getElementById("proposalForm");

    const proposalTargetPath =
      document.getElementById("proposalTargetPath");

    const proposalOperation =
      document.getElementById("proposalOperation");

    const proposalReason =
      document.getElementById("proposalReason");

    const proposalContentField =
      document.getElementById("proposalContentField");

    const proposalContent =
      document.getElementById("proposalContent");

    const proposalPatchFields =
      document.getElementById("proposalPatchFields");

    const proposalSearch =
      document.getElementById("proposalSearch");

    const proposalReplaceWith =
      document.getElementById("proposalReplaceWith");

    const proposalCreateButton =
      document.getElementById("proposalCreateButton");

    const proposalStatus =
      document.getElementById("proposalStatus");

    const proposalStatusText =
      document.getElementById("proposalStatusText");

    const proposalPreview =
      document.getElementById("proposalPreview");

    const proposalIdBadge =
      document.getElementById("proposalIdBadge");

    const proposalPreviewPath =
      document.getElementById("proposalPreviewPath");

    const proposalPreviewOperation =
      document.getElementById("proposalPreviewOperation");

    const proposalPreviewReason =
      document.getElementById("proposalPreviewReason");

    const proposalContentPreviewSection =
      document.getElementById("proposalContentPreviewSection");

    const proposalPreviewContent =
      document.getElementById("proposalPreviewContent");

    const proposalPatchPreviewSection =
      document.getElementById("proposalPatchPreviewSection");

    const proposalPreviewSearch =
      document.getElementById("proposalPreviewSearch");

    const proposalPreviewReplaceWith =
      document.getElementById("proposalPreviewReplaceWith");

    const proposalSafetyText =
      document.getElementById("proposalSafetyText");

    const proposalRejectButton =
      document.getElementById("proposalRejectButton");

    const proposalApproveButton =
      document.getElementById("proposalApproveButton");

    const proposalComplete =
      document.getElementById("proposalComplete");

    const proposalCompleteMessage =
      document.getElementById("proposalCompleteMessage");

    const proposalError =
      document.getElementById("proposalError");

    let currentProposalId =
      null;

    function setProposalStatus(
      state,
      text
    ) {
      proposalStatus.className =
        `proposal-status ${state}`;

      proposalStatusText.textContent =
        text;
    }

    function setProposalBusy(
      isBusy
    ) {
      proposalCreateButton.disabled =
        isBusy;

      proposalApproveButton.disabled =
        isBusy;

      proposalRejectButton.disabled =
        isBusy;
    }

    function clearProposalError() {
      proposalError.textContent =
        "";
    }

    function showProposalError(
      message
    ) {
      proposalError.textContent =
        message;

      setProposalStatus(
        "error",
        "エラー"
      );
    }

    function operationLabel(
      operation
    ) {
      switch (operation) {
        case "append":
          return "追記";

        case "patch":
          return "部分置換";

        case "replace":
          return "全文置換";

        case "create":
          return "新規作成";

        default:
          return operation;
      }
    }
    function updateOperationUi() {
      const isPatch =
        proposalOperation.value
        === "patch";

      proposalPatchFields.hidden =
        !isPatch;

      proposalContentField.hidden =
        isPatch;

      proposalContent.required =
        !isPatch;

      proposalSearch.required =
        isPatch;

      proposalOperation.classList.remove(
        "operation-append",
        "operation-patch",
        "operation-replace",
        "operation-create"
      );

      proposalOperation.classList.add(
        `operation-${proposalOperation.value}`
      );

      if (isPatch) {
        proposalCreateButton.innerHTML =
          '<span aria-hidden="true">✦</span> 部分置換案をつくる';
      } else {
        proposalCreateButton.innerHTML =
          '<span aria-hidden="true">✦</span> 変更案をつくる';
      }

      clearProposalError();
    }

    proposalOperation.addEventListener(
      "change",
      updateOperationUi
    );

    const proposalOperationReset =
      document.getElementById(
        "proposalOperationReset"
      );

    if (proposalOperationReset) {
      proposalOperationReset.addEventListener(
        "click",
        () => {
          proposalOperation.value =
            "append";

          updateOperationUi();
        }
      );
    }

    document
      .querySelectorAll(
        "[data-reset-target]"
      )
      .forEach(
        button => {
          button.addEventListener(
            "click",
            () => {
              const target =
                document.getElementById(
                  button.dataset.resetTarget
                );

              if (!target) {
                return;
              }

              target.value =
                "";

              target.focus();

              clearProposalError();
            }
          );
        }
      );

    document
      .querySelectorAll(
        "[data-paste-target]"
      )
      .forEach(
        button => {
          button.addEventListener(
            "click",
            async () => {
              const target =
                document.getElementById(
                  button.dataset.pasteTarget
                );

              if (!target) {
                return;
              }

              try {
                const clipboardText =
                  await navigator.clipboard.readText();

                target.value =
                  clipboardText;

                target.focus();

                clearProposalError();
              } catch {
                showProposalError(
                  "クリップボードを読み取れなかったよ。ブラウザのクリップボード許可を確認してね。"
                );
              }
            }
          );
        }
      );

    updateOperationUi();

function encodeUtf8Base64(
  value
) {
  const bytes =
    new TextEncoder().encode(
      value
    );

  let binary =
    "";

  const chunkSize =
    0x8000;

  for (
    let offset = 0;
    offset < bytes.length;
    offset += chunkSize
  ) {
    const chunk =
      bytes.subarray(
        offset,
        offset + chunkSize
      );

    binary +=
      String.fromCharCode(
        ...chunk
      );
  }

  return btoa(
    binary
  );
}

async function sha256Hex(
  value
) {
  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(
        value
      )
    );

  return Array.from(
    new Uint8Array(digest)
  )
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(2, "0")
    )
    .join("");
}

async function testProposalChunk(
  chunk
) {
  const uploadId =
    crypto.randomUUID()
      .replaceAll("-", "")
      .slice(0, 16);

  const response =
    await fetch(
      `${proposalApiBase}/proposal-upload.php`,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            upload_id:
              uploadId,

            chunk_index:
              0,

            chunk_data:
              chunk,

            encoding:
              "base64",
          }),
      }
    );

  return response.status;
}

async function splitProposalChunkUntilSafe(
  chunk
) {
  const minimumChunkSize =
    16;

  const status =
    await testProposalChunk(
      chunk
    );

  if (status === 200) {
    return [
      chunk
    ];
  }

  if (
    status !== 403
    || chunk.length <= minimumChunkSize
  ) {
    throw new Error(
      `Chunk Transportに失敗したよ。HTTP ${status} / length ${chunk.length}`
    );
  }

  const half =
    Math.ceil(
      chunk.length / 2
    );

  const left =
    chunk.slice(
      0,
      half
    );

  const right =
    chunk.slice(
      half
    );

  const safeLeft =
    await splitProposalChunkUntilSafe(
      left
    );

  const safeRight =
    await splitProposalChunkUntilSafe(
      right
    );

  return [
    ...safeLeft,
    ...safeRight,
  ];
}

async function uploadAdaptiveValue(
  value
) {
  const encodedValue =
    encodeUtf8Base64(
      value
    );

  if (encodedValue === "") {
    throw new Error(
      "空文字列はChunk Uploadできないよ。"
    );
  }

  const initialChunkSize =
    64;

  const initialChunks =
    [];

  for (
    let offset = 0;
    offset < encodedValue.length;
    offset += initialChunkSize
  ) {
    initialChunks.push(
      encodedValue.slice(
        offset,
        offset + initialChunkSize
      )
    );
  }

  const safeChunks =
    [];

  for (
    const chunk
    of initialChunks
  ) {
    const safeParts =
      await splitProposalChunkUntilSafe(
        chunk
      );

    safeChunks.push(
      ...safeParts
    );
  }

  const reconstructed =
    safeChunks.join("");

  if (
    reconstructed
    !== encodedValue
  ) {
    throw new Error(
      "Adaptive Chunk再構築チェックに失敗したよ。"
    );
  }

  const uploadId =
    crypto.randomUUID()
      .replaceAll("-", "")
      .slice(0, 16);

  for (
    let index = 0;
    index < safeChunks.length;
    index++
  ) {
    const response =
      await fetch(
        `${proposalApiBase}/proposal-upload.php`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              upload_id:
                uploadId,

              chunk_index:
                index,

              chunk_data:
                safeChunks[index],

              encoding:
                "base64",
            }),
        }
      );

    if (!response.ok) {
      throw new Error(
        `Chunk保存に失敗したよ。HTTP ${response.status}`
      );
    }
  }

  return {
    uploadId,
    totalChunks:
      safeChunks.length,
    sha256:
      await sha256Hex(
        value
      ),
  };
}

async function createAdaptivePatchProposal(
  {
    targetPath,
    reason,
    search,
    replaceWith,
  }
) {
  const searchUpload =
    await uploadAdaptiveValue(
      search
    );

  const replaceIsEmpty =
    replaceWith === "";

  const replaceSha256 =
    await sha256Hex(
      replaceWith
    );

  let replaceUpload =
    null;

  if (!replaceIsEmpty) {
    replaceUpload =
      await uploadAdaptiveValue(
        replaceWith
      );
  }

  const finalizePayload = {
    search_upload_id:
      searchUpload.uploadId,

    search_total_chunks:
      searchUpload.totalChunks,

    search_sha256:
      searchUpload.sha256,

    replace_is_empty:
      replaceIsEmpty,

    replace_sha256:
      replaceSha256,

    target_path:
      targetPath,

    reason,
  };

  if (replaceUpload) {
    finalizePayload.replace_upload_id =
      replaceUpload.uploadId;

    finalizePayload.replace_total_chunks =
      replaceUpload.totalChunks;
  }

  const finalizeResponse =
    await fetch(
      `${proposalApiBase}/proposal-upload-patch-finalize.php`,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            finalizePayload
          ),
      }
    );

  let result;

  try {
    result =
      await finalizeResponse.json();
  } catch {
    throw new Error(
      "Patch Finalize APIからJSONを読み取れなかったよ。"
    );
  }

  if (
    !finalizeResponse.ok
    || result.success !== true
  ) {
    throw new Error(
      result.error
      || `Patch Finalize APIエラー（HTTP ${finalizeResponse.status}）`
    );
  }

  const searchVerified =
    result.data
      ?.transport
      ?.search
      ?.integrity_verified
    === true;

  const replaceVerified =
    result.data
      ?.transport
      ?.replace_with
      ?.integrity_verified
    === true;

  if (
    !searchVerified
    || !replaceVerified
  ) {
    throw new Error(
      "Adaptive Patchの完全性確認に失敗したよ。"
    );
  }

  return result.data;
}

async function createAdaptiveProposal(
  {
    targetPath,
    operation,
    reason,
    content,
  }
) {
  const upload =
    await uploadAdaptiveValue(
      content
    );

  const finalizeResponse =
    await fetch(
      `${proposalApiBase}/proposal-upload-finalize.php`,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            upload_id:
              upload.uploadId,

            total_chunks:
              upload.totalChunks,

            content_sha256:
              upload.sha256,

            target_path:
              targetPath,

            operation,

            reason,
          }),
      }
    );

  let result;

  try {
    result =
      await finalizeResponse.json();
  } catch {
    throw new Error(
      "Finalize APIからJSONを読み取れなかったよ。"
    );
  }

  if (
    !finalizeResponse.ok
    || result.success !== true
  ) {
    throw new Error(
      result.error
      || `Finalize APIエラー（HTTP ${finalizeResponse.status}）`
    );
  }

  if (
    result.data
      ?.transport
      ?.integrity_verified
    !== true
  ) {
    throw new Error(
      "Chunk Transportの完全性確認に失敗したよ。"
    );
  }

  return result.data;
}

    async function fetchProposalApi(
      path,
      payload
    ) {
      const response =
        await fetch(
          `${proposalApiBase}/${path}`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );

      let result;

      try {
        result =
          await response.json();
      } catch {
        const error =
          new Error(
            "Koppy APIからJSONを読み取れなかったよ。"
          );

        error.status =
          response.status;

        throw error;
      }

      if (
        !response.ok
        || result.success !== true
      ) {
        const error =
          new Error(
            result.error
            || `APIエラー（HTTP ${response.status}）`
          );

        error.status =
          response.status;

        throw error;
      }

      return result.data;
    }

    proposalForm.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        clearProposalError();

        proposalComplete.hidden =
          true;

        proposalPreview.hidden =
          true;

        const targetPath =
          proposalTargetPath.value.trim();

        const operation =
          proposalOperation.value;

        const reason =
          proposalReason.value.trim();

        const content =
          proposalContent.value;

        const search =
          proposalSearch.value;

        const replaceWith =
          proposalReplaceWith.value;

        if (!targetPath) {
          showProposalError(
            "変更するファイルを指定してね。"
          );

          return;
        }

        if (
          operation === "patch"
          && search === ""
        ) {
          showProposalError(
            "部分置換では「探す文字列」が必要だよ。"
          );

          return;
        }

        if (
          operation !== "patch"
          && !content.trim()
        ) {
          showProposalError(
            "変更内容を書いてね。"
          );

          return;
        }

        setProposalBusy(
          true
        );

        setProposalStatus(
          "working",
          "変更案を作成中…"
        );

        proposalCreateButton.textContent =
          "変更案を作成中…";

        try {
          const payload = {
            target_path:
              targetPath,

            operation,

            reason,
          };

          if (
            operation === "patch"
          ) {
            payload.search =
              encodeUtf8Base64(
                search
              );

            payload.search_encoding =
              "base64";

            payload.replace_with =
              encodeUtf8Base64(
                replaceWith
              );

            payload.replace_with_encoding =
              "base64";
          } else {
            payload.content =
              encodeUtf8Base64(
                content
              );

            payload.content_encoding =
              "base64";
          }

          let data;

          try {
            data =
              await fetchProposalApi(
                "proposal.php",
                payload
              );
          } catch (error) {
            const isForbidden =
              error?.status === 403
              || String(
                error?.message ?? ""
              ).includes(
                "HTTP 403"
              );

            if (!isForbidden) {
              throw error;
            }

            if (
              operation === "patch"
            ) {
              setProposalStatus(
                "working",
                "部分置換を安全な経路で送信中…"
              );

              data =
                await createAdaptivePatchProposal({
                  targetPath,
                  reason,
                  search,
                  replaceWith,
                });
            } else {
              setProposalStatus(
                "working",
                "長文を安全な経路で送信中…"
              );

              data =
                await createAdaptiveProposal({
                  targetPath,
                  operation,
                  reason,
                  content,
                });
            }
          }

          const proposal =
            data.proposal;

          currentProposalId =
            proposal.id;

          proposalIdBadge.textContent =
            `ID: ${proposal.id}`;

          proposalPreviewPath.textContent =
            proposal.target_path;

          proposalPreviewOperation.textContent =
            operationLabel(
              proposal.operation
            );

          proposalPreviewReason.textContent =
            proposal.reason
            || "理由なし";

          const isPatch =
            proposal.operation
            === "patch";

          proposalContentPreviewSection.hidden =
            isPatch;

          proposalPatchPreviewSection.hidden =
            !isPatch;

          if (isPatch) {
            proposalPreviewSearch.textContent =
              proposal.search
              || "";

            proposalPreviewReplaceWith.textContent =
              proposal.replace_with
              ?? "";

            proposalSafetyText.textContent =
              "GitHubはまだ変更されていません。採用後も、探す文字列が完全一致で1件だけの場合に限ってExecutorが置換します。";
          } else {
            proposalPreviewContent.textContent =
              proposal.content
              || "";

            proposalSafetyText.textContent =
              "この時点ではGitHubは変更されていません。「採用してGitHubへ保存」を押したときだけ実行します。";
          }

          proposalPreview.hidden =
            false;

          setProposalStatus(
            "idle",
            "承認待ち"
          );

          proposalPreview.scrollIntoView({
            behavior:
              "smooth",

            block:
              "center",
          });
        } catch (error) {
          showProposalError(
            error instanceof Error
              ? error.message
              : "変更案の作成に失敗したよ。"
          );
        } finally {
          setProposalBusy(
            false
          );

          if (
            proposalOperation.value
            === "patch"
          ) {
            proposalCreateButton.innerHTML =
              '<span aria-hidden="true">✦</span> 部分置換案をつくる';
          } else {
            proposalCreateButton.innerHTML =
              '<span aria-hidden="true">✦</span> 変更案をつくる';
          }
        }
      }
    );

    proposalRejectButton.addEventListener(
      "click",
      () => {
        currentProposalId =
          null;

        proposalPreview.hidden =
          true;

        proposalComplete.hidden =
          true;

        clearProposalError();

        setProposalStatus(
          "idle",
          "待機中"
        );
      }
    );

    proposalApproveButton.addEventListener(
      "click",
      async () => {
        clearProposalError();

        if (!currentProposalId) {
          showProposalError(
            "承認するProposalが見つからないよ。"
          );

          return;
        }

        setProposalBusy(
          true
        );

        setProposalStatus(
          "working",
          "承認中…"
        );

        proposalApproveButton.textContent =
          "承認中…";

        try {
          await fetchProposalApi(
            "approve.php",
            {
              proposal_id:
                currentProposalId,
            }
          );

          setProposalStatus(
            "working",
            "GitHubへ保存中…"
          );

          proposalApproveButton.textContent =
            "GitHubへ保存中…";

          const executeData =
            await fetchProposalApi(
              "executor/github.php",
              {
                proposal_id:
                  currentProposalId,
              }
            );

          const github =
            executeData.github;

          proposalPreview.hidden =
            true;

          proposalComplete.hidden =
            false;

          const shortSha =
            github?.commit_sha
              ? github.commit_sha.slice(
                  0,
                  7
                )
              : "";

          const operationText =
            github?.operation
              ? ` / ${operationLabel(github.operation)}`
              : "";

          proposalCompleteMessage.textContent =
            shortSha
              ? `Commit ${shortSha}${operationText}`
              : `Commit完了${operationText}`;

          setProposalStatus(
            "success",
            "保存完了"
          );

          if (
            typeof createChatMessage
            === "function"
          ) {
            createChatMessage({
              speaker:
                "Koppy",

              text:
                github?.operation === "patch"
                  ? "部分置換してGitHubへ保存したよ✨\n完全一致1件だけを安全に変更したよ。"
                  : "GitHubへ保存したよ✨\n変更内容はちゃんとCommitされたよ。",

              type:
                "koppy",
            });
          }

          currentProposalId =
            null;

          await loadKoppyWorld();
        } catch (error) {
          showProposalError(
            error instanceof Error
              ? error.message
              : "GitHubへの保存に失敗したよ。"
          );
        } finally {
          setProposalBusy(
            false
          );

          proposalApproveButton.innerHTML =
            '<span aria-hidden="true">✓</span> 採用してGitHubへ保存';
        }
      }
    );

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
      localBridgeStatus.textContent =
        message;

      localBridgeStatus.className =
        `local-bridge-status ${type}`;
    }

    async function loadLocalGitStatus() {
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
            Array.isArray(result.changes)
              ? result.changes
              : [];

          localChangesValue.textContent =
            `${changes.length}件の変更あり`;

          localChangesValue.style.color =
            "var(--warning)";

          for (const change of changes) {
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

    localBridgeButton.addEventListener(
      "click",
      loadLocalGitStatus
    );
    chatInput.focus();