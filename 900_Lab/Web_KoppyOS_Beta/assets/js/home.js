(() => {
  'use strict';

  const companion =
    document.querySelector(
      '[data-koppy-companion]'
    );

  const speech =
    document.querySelector(
      '[data-koppy-speech]'
    );

  const hero =
    document.querySelector(
      '#koppyHomeHero'
    );

  const dock =
    document.querySelector(
      '[data-koppy-dock]'
    );

  const miniPortrait =
    document.querySelector(
      '[data-koppy-mini-portrait]'
    );

  const portrait =
    document.querySelector(
      '.koppy-portrait'
    );

  const messages = [
    'おかえり、しいちゃん。',
    '今日はどこから育てよっか？',
    'Brain、のぞいてく？',
    '自宅マップも育ってきたね。',
    '仕事OSもちゃんと見てるよ。',
    '氷のWorld、かなり好き。',
    'つぎは何つくる？ ♢ᴷ',
  ];

  let hideTimer = null;
  let messageIndex = 0;

  function showMessage(message) {
    if (!companion || !speech) {
      return;
    }

    if (hideTimer) {
      window.clearTimeout(hideTimer);
    }

    speech.textContent = message;

    companion.classList.add(
      'is-speaking'
    );

    hideTimer =
      window.setTimeout(
        () => {
          companion.classList.remove(
            'is-speaking'
          );
        },
        3200
      );
  }

  if (companion) {
    companion.addEventListener(
      'click',
      () => {
        messageIndex =
          (messageIndex + 1)
          % messages.length;

        showMessage(
          messages[messageIndex]
        );
      }
    );

    companion.addEventListener(
      'pointerenter',
      () => {
        if (
          !companion.classList.contains(
            'is-speaking'
          )
        ) {
          showMessage(
            'みつけた？ ♢ᴷ'
          );
        }
      }
    );
  }

  if (
    portrait
    && miniPortrait
  ) {
    const mini =
      portrait.cloneNode(true);

    mini.removeAttribute('role');
    mini.removeAttribute('aria-label');

    miniPortrait.appendChild(mini);
  }

  if (
    hero
    && dock
    && 'IntersectionObserver' in window
  ) {
    const observer =
      new IntersectionObserver(
        (entries) => {
          const [entry] = entries;

          dock.classList.toggle(
            'is-visible',
            !entry.isIntersecting
          );
        },
        {
          threshold: 0.18,
        }
      );

    observer.observe(hero);
  }

  window.setTimeout(
    () => {
      showMessage(
        'おかえり、しいちゃん。'
      );
    },
    650
  );
})();
