'use strict';


const KOPPY_AUTH_SESSION_URL =
  'https://koppy.miki-piano.com/api/v1/auth/session.php';

const KOPPY_AUTH_LOGIN_URL =
  'https://koppy.miki-piano.com/api/v1/auth/login.php';


function getAuthElements() {
  return {
    gate:
      document.getElementById(
        'authGate'
      ),

    message:
      document.getElementById(
        'authGateMessage'
      ),

    checking:
      document.getElementById(
        'authChecking'
      ),

    loginButton:
      document.getElementById(
        'authLoginButton'
      ),

    world:
      document.getElementById(
        'koppyWorld'
      ),
  };
}


function showAuthenticationRequired(
  message =
    'このWorldに入るにはGitHub認証が必要だよ。'
) {
  const elements =
    getAuthElements();


  if (elements.world) {
    elements.world.classList.add(
      'auth-pending'
    );
  }


  if (elements.gate) {
    elements.gate.hidden =
      false;
  }


  if (elements.message) {
    elements.message.textContent =
      message;
  }


  if (elements.checking) {
    elements.checking.hidden =
      true;
  }


  if (elements.loginButton) {
    elements.loginButton.href =
      KOPPY_AUTH_LOGIN_URL;

    elements.loginButton.hidden =
      false;
  }
}


function showAuthenticatedState(
  githubLogin = ''
) {
  const elements =
    getAuthElements();


  if (elements.message) {
    elements.message.textContent =
      githubLogin
        ? `${githubLogin} として認証できたよ。`
        : '認証できたよ。';
  }


  if (elements.checking) {
    elements.checking.hidden =
      false;

    elements.checking.textContent =
      'Koppy Worldを起動中……';
  }


  if (elements.loginButton) {
    elements.loginButton.hidden =
      true;
  }


  window.setTimeout(
    () => {

      if (elements.gate) {
        elements.gate.hidden =
          true;
      }


      if (elements.world) {
        elements.world.classList.remove(
          'auth-pending'
        );
      }

    },
    250
  );
}


async function checkKoppyAuthentication() {
  const elements =
    getAuthElements();


  if (elements.loginButton) {
    elements.loginButton.href =
      KOPPY_AUTH_LOGIN_URL;
  }


  try {
    const response =
      await fetch(
        KOPPY_AUTH_SESSION_URL,
        {
          method:
            'GET',

          credentials:
            'include',

          cache:
            'no-store',

          headers: {
            Accept:
              'application/json',
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
      showAuthenticationRequired();

      return false;
    }


    const githubLogin =
      result?.data?.user?.github_login
      ?? '';


    showAuthenticatedState(
      githubLogin
    );


    return true;


  } catch (error) {
    console.error(
      'Authentication check failed:',
      error
    );


    showAuthenticationRequired(
      '認証状態を確認できなかったよ。もう一度GitHub認証してね。'
    );


    return false;
  }
}


function handleKoppyAuthenticationError(
  response
) {
  if (
    !response
    || response.status !== 401
  ) {
    return false;
  }


  showAuthenticationRequired(
    '認証Sessionが切れたよ。GitHubでもう一度ログインしてね。'
  );


  return true;
}


async function refreshLatestWorld(
  button
) {
  const refreshToken =
    Date.now().toString();


  if (button) {

    button.disabled =
      true;

    button.textContent =
      '…';
  }


  try {

    const documentUrl =
      new URL(
        window.location.href
      );


    documentUrl.search =
      '';

    documentUrl.hash =
      '';


    const assetUrls =
      Array.from(
        new Set([
          documentUrl.href,

          ...Array.from(
            document.querySelectorAll(
              'link[rel="stylesheet"][href]'
            ),
            (link) =>
              link.href
          ),

          ...Array.from(
            document.querySelectorAll(
              'script[src]'
            ),
            (script) =>
              script.src
          ),
        ])
      );


    await Promise.allSettled(
      assetUrls.map(
        (url) =>
          fetch(
            url,
            {
              cache:
                'reload',

              credentials:
                'same-origin',
            }
          )
      )
    );

  } catch (error) {

    console.error(
      'Failed to refresh latest Koppy World assets.',
      error
    );
  }


  const latestUrl =
    new URL(
      window.location.href
    );


  latestUrl.searchParams.set(
    '_refresh',
    refreshToken
  );


  window.location.replace(
    latestUrl.toString()
  );
}


const worldRefreshButton =
  document.querySelector(
    '[data-world-refresh]'
  );


if (worldRefreshButton) {

  worldRefreshButton.addEventListener(
    'click',
    () => {
      refreshLatestWorld(
        worldRefreshButton
      );
    }
  );
}


const KOPPY_AUTH_ACTIVITY_REFRESH_INTERVAL_MS =
  5 * 60 * 1000;

let koppyAuthLastActivityRefreshAt =
  Date.now();

let koppyAuthActivityRefreshPending =
  false;


async function refreshKoppyAuthenticationActivity() {

  const now =
    Date.now();


  if (
    koppyAuthActivityRefreshPending
    || (
      now
      - koppyAuthLastActivityRefreshAt
    )
    < KOPPY_AUTH_ACTIVITY_REFRESH_INTERVAL_MS
  ) {
    return;
  }


  koppyAuthActivityRefreshPending =
    true;

  // Throttle attempts too, including failed or unauthenticated responses.
  koppyAuthLastActivityRefreshAt =
    now;


  try {

    const response =
      await fetch(
        KOPPY_AUTH_SESSION_URL,
        {
          method:
            'GET',

          credentials:
            'include',

          cache:
            'no-store',

          headers: {
            Accept:
              'application/json',
          },
        }
      );


    if (!response.ok) {

      if (response.status === 401) {
        handleKoppyAuthenticationError(
          response
        );
      }

      return;
    }


    const result =
      await response.json();


    const authenticated =
      result?.success === true
      && result?.data?.authenticated === true;


    if (!authenticated) {
      showAuthenticationRequired(
        '認証Sessionが切れたよ。GitHubでもう一度ログインしてね。'
      );

      return;
    }


    koppyAuthLastActivityRefreshAt =
      Date.now();

  } catch (error) {

    console.error(
      'Authentication activity refresh failed:',
      error
    );

  } finally {

    koppyAuthActivityRefreshPending =
      false;
  }
}


function handleKoppyAuthenticationActivity() {

  if (
    document.visibilityState
    === 'hidden'
  ) {
    return;
  }


  refreshKoppyAuthenticationActivity();
}


[
  'pointerdown',
  'keydown',
  'touchstart',
  'scroll',
].forEach(
  (eventName) => {

    window.addEventListener(
      eventName,
      handleKoppyAuthenticationActivity,
      {
        passive:
          true,
      }
    );
  }
);


document.addEventListener(
  'visibilitychange',
  () => {

    if (
      document.visibilityState
      === 'visible'
    ) {
      refreshKoppyAuthenticationActivity();
    }
  }
);


window.KoppyAuth = {
  check:
    checkKoppyAuthentication,

  requireLogin:
    showAuthenticationRequired,

  handleResponse:
    handleKoppyAuthenticationError,

  refreshActivity:
    refreshKoppyAuthenticationActivity,
};


checkKoppyAuthentication();