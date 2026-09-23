<?php

declare(strict_types=1);


require_once __DIR__ . '/auth.php';

require_once __DIR__
    . '/../core/runtime-path.php';


$authConfigPath =
    koppyResolveRuntimePath(
        'KOPPY_PASSWORD_AUTH_CONFIG_PATH',
        '/home/users/2/her.jp-mikipiano/.koppy-private/auth/auth-config.php'
    );


if (
    !is_file(
        $authConfigPath
    )
) {

    http_response_code(
        500
    );


    exit(
        'Authentication configuration is missing.'
    );
}


$authConfig =
    require $authConfigPath;


$passwordHash =
    (string) (
        $authConfig[
            'password_hash'
        ]
        ?? ''
    );


if (
    $passwordHash === ''
) {

    http_response_code(
        500
    );


    exit(
        'Authentication configuration is invalid.'
    );
}


$returnUrl =
    isset(
        $_GET['return']
    )
        ? (string) $_GET['return']
        : '/work/';


if (
    !str_starts_with(
        $returnUrl,
        '/work/'
    )
    && !str_starts_with(
        $returnUrl,
        '/next/work/'
    )
    && !str_starts_with(
        $returnUrl,
        '/kohaku-work/'
    )
    && !str_starts_with(
        $returnUrl,
        '/house/'
    )
    && !str_starts_with(
        $returnUrl,
        '/brain/'
    )
    && !str_starts_with(
        $returnUrl,
        '/chat/'
    )
) {
    $returnUrl =
        '/work/';
}


$errorMessage =
    '';


if (
    $_SERVER[
        'REQUEST_METHOD'
    ] === 'POST'
) {

    $password =
        (string) (
            $_POST[
                'password'
            ]
            ?? ''
        );


    $postedReturnUrl =
        (string) (
            $_POST[
                'return'
            ]
            ?? '/work/'
        );


    if (
        !str_starts_with(
            $postedReturnUrl,
            '/work/'
        )
        && !str_starts_with(
            $postedReturnUrl,
            '/next/work/'
        )
        && !str_starts_with(
            $postedReturnUrl,
            '/kohaku-work/'
        )
        && !str_starts_with(
            $postedReturnUrl,
            '/house/'
        )
        && !str_starts_with(
            $postedReturnUrl,
            '/brain/'
        )
        && !str_starts_with(
            $postedReturnUrl,
            '/chat/'
        )
    ) {
        $postedReturnUrl =
            '/work/';
    }


    if (
        koppyLogin(
            $password,
            $passwordHash
        )
    ) {

        header(
            'Location: '
            . $postedReturnUrl
        );


        exit;
    }


    $errorMessage =
        'パスワードが違います。';
}


if (
    koppyIsAuthenticated()
) {

    header(
        'Location: '
        . $returnUrl
    );


    exit;
}
?>
<!DOCTYPE html>
<html lang="ja">

<head>

  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0, viewport-fit=cover"
  >

  <title>Kohaku Work Login</title>

  <style>

    :root {
      color-scheme: light;
      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;
    }

    * {
      box-sizing: border-box;
    }

    body {
      min-height: 100vh;

      margin: 0;

      display: grid;
      place-items: center;

      padding: 24px;

      color: #274454;

      background:
        linear-gradient(
          180deg,
          #eefaff,
          #f9fdff
        );
    }

    .login-card {
      width:
        min(
          420px,
          100%
        );

      padding:
        32px;

      border:
        1px solid
        #c9e8f6;

      border-radius:
        24px;

      background:
        rgba(
          255,
          255,
          255,
          0.96
        );

      box-shadow:
        0 18px 48px
        rgba(
          58,
          126,
          158,
          0.12
        );
    }

    .brand {
      margin:
        0
        0
        8px;

      color:
        #41b4e6;

      font-size:
        11px;

      font-weight:
        900;

      letter-spacing:
        0.16em;
    }

    h1 {
      margin:
        0
        0
        26px;

      font-size:
        28px;
    }

    label {
      display:
        grid;

      gap:
        8px;

      color:
        #607b88;

      font-size:
        12px;

      font-weight:
        800;
    }

    input {
      width:
        100%;

      min-height:
        50px;

      padding:
        0
        14px;

      border:
        1px solid
        #bde1f2;

      border-radius:
        14px;

      color:
        #274454;

      background:
        #ffffff;

      font-size:
        16px;
    }

    button {
      width:
        100%;

      min-height:
        52px;

      margin-top:
        18px;

      border:
        0;

      border-radius:
        14px;

      color:
        #ffffff;

      background:
        #4db9e5;

      font-size:
        15px;

      font-weight:
        900;

      cursor:
        pointer;
    }

    .error {
      margin:
        14px
        0
        0;

      color:
        #c75c71;

      font-size:
        12px;

      font-weight:
        800;
    }

    .note {
      margin:
        18px
        0
        0;

      color:
        #8aa0ab;

      font-size:
        11px;

      line-height:
        1.6;
    }

  </style>

</head>

<body>

  <main class="login-card">

    <p class="brand">
      KOPPY WORLD
    </p>

    <h1>
      Kohaku Work
    </h1>


    <form
      method="post"
      autocomplete="on"
    >

      <input
        type="hidden"
        name="return"
        value="<?= htmlspecialchars(
            $returnUrl,
            ENT_QUOTES,
            'UTF-8'
        ) ?>"
      >


      <label>

        パスワード

        <input
          type="password"
          name="password"
          autocomplete="current-password"
          required
          autofocus
        >

      </label>


      <button
        type="submit"
      >
        ログイン
      </button>


      <?php if ($errorMessage !== ''): ?>

        <p class="error">
          <?= htmlspecialchars(
              $errorMessage,
              ENT_QUOTES,
              'UTF-8'
          ) ?>
        </p>

      <?php endif; ?>

    </form>


    <p class="note">
      この端末ではログイン状態を保持できます。
    </p>

  </main>

</body>

</html>