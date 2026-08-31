(() => {
  "use strict";

  const koppyChatApiUrl =
    "https://koppy.miki-piano.com/api/v1/chat.php";

  const chatForm =
    document.getElementById(
      "chatForm"
    );

  const chatInput =
    document.getElementById(
      "chatInput"
    );

  const chatMessages =
    document.getElementById(
      "chatMessages"
    );

  const chatSendButton =
    document.getElementById(
      "chatSendButton"
    );

  const chatSendButtonText =
    document.getElementById(
      "chatSendButtonText"
    );

  const chatStatusDot =
    document.getElementById(
      "chatStatusDot"
    );

  const chatStatusText =
    document.getElementById(
      "chatStatusText"
    );

  const chatErrorMessage =
    document.getElementById(
      "chatErrorMessage"
    );

  const chatCharacterCount =
    document.getElementById(
      "chatCharacterCount"
    );

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
    if (
      !chatStatusDot
      || !chatStatusText
    ) {
      return;
    }

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
    if (!chatMessages) {
      return;
    }

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
    if (!chatMessages) {
      return null;
    }

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
    if (!chatMessages) {
      return null;
    }

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
    if (chatInput) {
      chatInput.disabled =
        isSending;
    }

    if (chatSendButton) {
      chatSendButton.disabled =
        isSending;
    }

    if (chatSendButtonText) {
      chatSendButtonText.textContent =
        isSending
          ? "思考中…"
          : "送信";
    }

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

          credentials:
            "include",

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

    if (
      window.KoppyAuth
      && typeof window.KoppyAuth.handleResponse === "function"
      && window.KoppyAuth.handleResponse(
        response
      )
    ) {
      throw new Error(
        "認証Sessionが切れたよ。GitHubでもう一度ログインしてね。"
      );
    }

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

  if (
    chatForm
    && chatInput
    && chatMessages
    && chatSendButton
    && chatSendButtonText
    && chatErrorMessage
    && chatCharacterCount
  ) {
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
      event => {
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
      async event => {
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

          thinkingMessage?.remove();

          createChatMessage({
            speaker:
              "Koppy",

            text:
              reply,

            type:
              "koppy",
          });
        } catch (error) {
          thinkingMessage?.remove();

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

    chatInput.focus();
  }
})();