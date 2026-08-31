'use strict';


const proposalApiBase =
  'https://koppy.miki-piano.com/api/v1/brain';


const proposalForm =
  document.getElementById(
    'proposalForm'
  );

const proposalTargetPath =
  document.getElementById(
    'proposalTargetPath'
  );

const proposalOperation =
  document.getElementById(
    'proposalOperation'
  );

const proposalReason =
  document.getElementById(
    'proposalReason'
  );

const proposalContentField =
  document.getElementById(
    'proposalContentField'
  );

const proposalContent =
  document.getElementById(
    'proposalContent'
  );

const proposalPatchFields =
  document.getElementById(
    'proposalPatchFields'
  );

const proposalSearch =
  document.getElementById(
    'proposalSearch'
  );

const proposalReplaceWith =
  document.getElementById(
    'proposalReplaceWith'
  );

const proposalCreateButton =
  document.getElementById(
    'proposalCreateButton'
  );

const proposalStatus =
  document.getElementById(
    'proposalStatus'
  );

const proposalStatusText =
  document.getElementById(
    'proposalStatusText'
  );

const proposalPreview =
  document.getElementById(
    'proposalPreview'
  );

const proposalIdBadge =
  document.getElementById(
    'proposalIdBadge'
  );

const proposalPreviewPath =
  document.getElementById(
    'proposalPreviewPath'
  );

const proposalPreviewOperation =
  document.getElementById(
    'proposalPreviewOperation'
  );

const proposalPreviewReason =
  document.getElementById(
    'proposalPreviewReason'
  );

const proposalContentPreviewSection =
  document.getElementById(
    'proposalContentPreviewSection'
  );

const proposalPreviewContent =
  document.getElementById(
    'proposalPreviewContent'
  );

const proposalPatchPreviewSection =
  document.getElementById(
    'proposalPatchPreviewSection'
  );

const proposalPreviewSearch =
  document.getElementById(
    'proposalPreviewSearch'
  );

const proposalPreviewReplaceWith =
  document.getElementById(
    'proposalPreviewReplaceWith'
  );

const proposalSafetyText =
  document.getElementById(
    'proposalSafetyText'
  );

const proposalRejectButton =
  document.getElementById(
    'proposalRejectButton'
  );

const proposalApproveButton =
  document.getElementById(
    'proposalApproveButton'
  );

const proposalComplete =
  document.getElementById(
    'proposalComplete'
  );

const proposalCompleteMessage =
  document.getElementById(
    'proposalCompleteMessage'
  );

const proposalError =
  document.getElementById(
    'proposalError'
  );


let currentProposalId =
  null;


function createWriterError(
  message,
  status = null
) {
  const error =
    new Error(message);

  error.status =
    status;

  return error;
}


function guardAuthenticationResponse(
  response
) {
  if (
    !response
    || response.status !== 401
  ) {
    return;
  }


  if (
    window.KoppyAuth
    && typeof window.KoppyAuth.handleResponse
      === 'function'
  ) {
    window.KoppyAuth.handleResponse(
      response
    );
  }


  throw createWriterError(
    '認証Sessionが切れたよ。GitHubでもう一度ログインしてね。',
    401
  );
}


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
    '';
}


function showProposalError(
  message
) {
  proposalError.textContent =
    message;

  setProposalStatus(
    'error',
    'エラー'
  );
}


function operationLabel(
  operation
) {
  switch (operation) {
    case 'append':
      return '追記';

    case 'patch':
      return '部分置換';

    case 'replace':
      return '全文置換';

    case 'create':
      return '新規作成';

    default:
      return operation;
  }
}


function updateOperationUi() {
  const isPatch =
    proposalOperation.value
    === 'patch';


  proposalPatchFields.hidden =
    !isPatch;

  proposalContentField.hidden =
    isPatch;

  proposalContent.required =
    !isPatch;

  proposalSearch.required =
    isPatch;


  proposalOperation.classList.remove(
    'operation-append',
    'operation-patch',
    'operation-replace',
    'operation-create'
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


function encodeUtf8Base64(
  value
) {
  const bytes =
    new TextEncoder().encode(
      value
    );

  let binary =
    '';

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
      'SHA-256',
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
          .padStart(
            2,
            '0'
          )
    )
    .join('');
}


async function testProposalChunk(
  chunk
) {
  const uploadId =
    crypto.randomUUID()
      .replaceAll(
        '-',
        ''
      )
      .slice(
        0,
        16
      );


  const response =
    await fetch(
      `${proposalApiBase}/proposal-upload.php`,
      {
        method:
          'POST',

        credentials:
          'include',

        headers: {
          'Content-Type':
            'application/json',
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
              'base64',
          }),
      }
    );


  guardAuthenticationResponse(
    response
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
      chunk,
    ];
  }


  if (
    status !== 403
    || chunk.length <= minimumChunkSize
  ) {
    throw createWriterError(
      `Chunk Transportに失敗したよ。HTTP ${status} / length ${chunk.length}`,
      status
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


  if (encodedValue === '') {
    throw new Error(
      '空文字列はChunk Uploadできないよ。'
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
    safeChunks.join('');


  if (
    reconstructed
    !== encodedValue
  ) {
    throw new Error(
      'Adaptive Chunk再構築チェックに失敗したよ。'
    );
  }


  const uploadId =
    crypto.randomUUID()
      .replaceAll(
        '-',
        ''
      )
      .slice(
        0,
        16
      );


  for (
    let index = 0;
    index < safeChunks.length;
    index += 1
  ) {
    const response =
      await fetch(
        `${proposalApiBase}/proposal-upload.php`,
        {
          method:
            'POST',

          credentials:
            'include',

          headers: {
            'Content-Type':
              'application/json',
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
                'base64',
            }),
        }
      );


    guardAuthenticationResponse(
      response
    );


    if (!response.ok) {
      throw createWriterError(
        `Chunk保存に失敗したよ。HTTP ${response.status}`,
        response.status
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
    replaceWith === '';

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
          'POST',

        credentials:
          'include',

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify(
            finalizePayload
          ),
      }
    );


  guardAuthenticationResponse(
    finalizeResponse
  );


  let result;


  try {
    result =
      await finalizeResponse.json();

  } catch {
    throw createWriterError(
      'Patch Finalize APIからJSONを読み取れなかったよ。',
      finalizeResponse.status
    );
  }


  if (
    !finalizeResponse.ok
    || result.success !== true
  ) {
    throw createWriterError(
      result.error
      || `Patch Finalize APIエラー（HTTP ${finalizeResponse.status}）`,
      finalizeResponse.status
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
      'Adaptive Patchの完全性確認に失敗したよ。'
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
          'POST',

        credentials:
          'include',

        headers: {
          'Content-Type':
            'application/json',
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


  guardAuthenticationResponse(
    finalizeResponse
  );


  let result;


  try {
    result =
      await finalizeResponse.json();

  } catch {
    throw createWriterError(
      'Finalize APIからJSONを読み取れなかったよ。',
      finalizeResponse.status
    );
  }


  if (
    !finalizeResponse.ok
    || result.success !== true
  ) {
    throw createWriterError(
      result.error
      || `Finalize APIエラー（HTTP ${finalizeResponse.status}）`,
      finalizeResponse.status
    );
  }


  if (
    result.data
      ?.transport
      ?.integrity_verified
    !== true
  ) {
    throw new Error(
      'Chunk Transportの完全性確認に失敗したよ。'
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
          'POST',

        credentials:
          'include',

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify(
            payload
          ),
      }
    );


  guardAuthenticationResponse(
    response
  );


  let result;


  try {
    result =
      await response.json();

  } catch {
    throw createWriterError(
      'Koppy APIからJSONを読み取れなかったよ。',
      response.status
    );
  }


  if (
    !response.ok
    || result.success !== true
  ) {
    throw createWriterError(
      result.error
      || `APIエラー（HTTP ${response.status}）`,
      response.status
    );
  }


  return result.data;
}


proposalOperation.addEventListener(
  'change',
  updateOperationUi
);


const proposalOperationReset =
  document.getElementById(
    'proposalOperationReset'
  );


if (proposalOperationReset) {
  proposalOperationReset.addEventListener(
    'click',
    () => {

      proposalOperation.value =
        'append';

      updateOperationUi();
    }
  );
}


document
  .querySelectorAll(
    '[data-reset-target]'
  )
  .forEach(
    button => {

      button.addEventListener(
        'click',
        () => {

          const target =
            document.getElementById(
              button.dataset.resetTarget
            );


          if (!target) {
            return;
          }


          target.value =
            '';

          target.focus();

          clearProposalError();
        }
      );
    }
  );


document
  .querySelectorAll(
    '[data-paste-target]'
  )
  .forEach(
    button => {

      button.addEventListener(
        'click',
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
              await navigator.clipboard
                .readText();


            target.value =
              clipboardText;

            target.focus();

            clearProposalError();


          } catch {
            showProposalError(
              'クリップボードを読み取れなかったよ。ブラウザのクリップボード許可を確認してね。'
            );
          }
        }
      );
    }
  );


proposalForm.addEventListener(
  'submit',
  async event => {

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
        '変更するファイルを指定してね。'
      );

      return;
    }


    if (
      operation === 'patch'
      && search === ''
    ) {
      showProposalError(
        '部分置換では「探す文字列」が必要だよ。'
      );

      return;
    }


    if (
      operation !== 'patch'
      && !content.trim()
    ) {
      showProposalError(
        '変更内容を書いてね。'
      );

      return;
    }


    setProposalBusy(
      true
    );

    setProposalStatus(
      'working',
      '変更案を作成中…'
    );

    proposalCreateButton.textContent =
      '変更案を作成中…';


    try {
      const payload = {
        target_path:
          targetPath,

        operation,

        reason,
      };


      if (
        operation === 'patch'
      ) {
        payload.search =
          encodeUtf8Base64(
            search
          );

        payload.search_encoding =
          'base64';

        payload.replace_with =
          encodeUtf8Base64(
            replaceWith
          );

        payload.replace_with_encoding =
          'base64';

      } else {
        payload.content =
          encodeUtf8Base64(
            content
          );

        payload.content_encoding =
          'base64';
      }


      let data;


      try {
        data =
          await fetchProposalApi(
            'proposal.php',
            payload
          );


      } catch (error) {
        const isForbidden =
          error?.status === 403
          || String(
            error?.message
            ?? ''
          ).includes(
            'HTTP 403'
          );


        if (!isForbidden) {
          throw error;
        }


        if (
          operation === 'patch'
        ) {
          setProposalStatus(
            'working',
            '部分置換を安全な経路で送信中…'
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
            'working',
            '長文を安全な経路で送信中…'
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
        || '理由なし';


      const isPatch =
        proposal.operation
        === 'patch';


      proposalContentPreviewSection.hidden =
        isPatch;

      proposalPatchPreviewSection.hidden =
        !isPatch;


      if (isPatch) {
        proposalPreviewSearch.textContent =
          proposal.search
          || '';

        proposalPreviewReplaceWith.textContent =
          proposal.replace_with
          ?? '';

        proposalSafetyText.textContent =
          'GitHubはまだ変更されていません。採用後も、探す文字列が完全一致で1件だけの場合に限ってExecutorが置換します。';

      } else {
        proposalPreviewContent.textContent =
          proposal.content
          || '';

        proposalSafetyText.textContent =
          'この時点ではGitHubは変更されていません。「採用してGitHubへ保存」を押したときだけ実行します。';
      }


      proposalPreview.hidden =
        false;


      setProposalStatus(
        'idle',
        '承認待ち'
      );


      proposalPreview.scrollIntoView({
        behavior:
          'smooth',

        block:
          'center',
      });


    } catch (error) {
      showProposalError(
        error instanceof Error
          ? error.message
          : '変更案の作成に失敗したよ。'
      );


    } finally {
      setProposalBusy(
        false
      );


      if (
        proposalOperation.value
        === 'patch'
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
  'click',
  () => {

    currentProposalId =
      null;

    proposalPreview.hidden =
      true;

    proposalComplete.hidden =
      true;

    clearProposalError();


    setProposalStatus(
      'idle',
      '待機中'
    );
  }
);


proposalApproveButton.addEventListener(
  'click',
  async () => {

    clearProposalError();


    if (!currentProposalId) {
      showProposalError(
        '承認するProposalが見つからないよ。'
      );

      return;
    }


    setProposalBusy(
      true
    );

    setProposalStatus(
      'working',
      '承認中…'
    );

    proposalApproveButton.textContent =
      '承認中…';


    try {
      await fetchProposalApi(
        'approve.php',
        {
          proposal_id:
            currentProposalId,
        }
      );


      setProposalStatus(
        'working',
        'GitHubへ保存中…'
      );

      proposalApproveButton.textContent =
        'GitHubへ保存中…';


      const executeData =
        await fetchProposalApi(
          'executor/github.php',
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
          : '';

      const operationText =
        github?.operation
          ? ` / ${operationLabel(
              github.operation
            )}`
          : '';


      proposalCompleteMessage.textContent =
        shortSha
          ? `Commit ${shortSha}${operationText}`
          : `Commit完了${operationText}`;


      setProposalStatus(
        'success',
        '保存完了'
      );


      currentProposalId =
        null;


    } catch (error) {
      showProposalError(
        error instanceof Error
          ? error.message
          : 'GitHubへの保存に失敗したよ。'
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


updateOperationUi();