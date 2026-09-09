/* ========================================
   OPENAI USAGE
======================================== */

const openAiUsageApiUrl = '/api/v1/openai-costs.php';

function formatOpenAiUsd(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '---';
  return `$${value.toFixed(2)}`;
}

function formatOpenAiUpdatedAt(value) {
  if (!value) return '最終更新 ---';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '最終更新 ---';
  return `最終更新 ${date.toLocaleString('ja-JP', { dateStyle: 'short', timeStyle: 'short' })}`;
}

function renderOpenAiUsage(data) {
  const chipLabel = document.getElementById('openai-usage-chip-label');
  const status = document.getElementById('openai-usage-status');
  const balance = document.getElementById('openai-usage-balance');
  const total = document.getElementById('openai-usage-total');
  const updated = document.getElementById('openai-usage-updated');
  if (!chipLabel || !status || !balance || !total || !updated) return;

  if (data?.status === 'ready') {
    chipLabel.textContent = `✦ API ${formatOpenAiUsd(data.estimated_balance_usd)}`;
    status.textContent = '取得済み';
    balance.textContent = `推定残高 ${formatOpenAiUsd(data.estimated_balance_usd)}`;
    total.textContent = `基準日時以降の使用額 ${formatOpenAiUsd(data.usage_usd)}`;
    updated.textContent = formatOpenAiUpdatedAt(data.updated_at);
    return;
  }

  chipLabel.textContent = '✦ API ---';
  status.textContent = data?.message || '利用額を取得できません';
  balance.textContent = data?.status === 'reference_unconfigured'
    ? '推定残高 残高基準未設定'
    : '推定残高 ---';
  total.textContent = '基準日時以降の使用額 ---';
  updated.textContent = '最終更新 ---';
}

async function loadOpenAiUsage() {
  try {
    const response = await fetch(openAiUsageApiUrl, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
    });
    const payload = await response.json();
    renderOpenAiUsage(response.ok && payload.success ? payload.data : null);
  } catch (error) {
    console.error('Failed to load OpenAI usage.', error);
    renderOpenAiUsage(null);
  }
}

function initializeOpenAiUsage() {
  const chip = document.getElementById('openai-usage-chip');
  const popover = document.getElementById('openai-usage-popover');
  if (!chip || !popover) return;

  chip.addEventListener('click', () => {
    const nextHidden = !popover.hidden;
    popover.hidden = nextHidden;
    chip.setAttribute('aria-expanded', String(!nextHidden));
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.api-usage-control')) {
      popover.hidden = true;
      chip.setAttribute('aria-expanded', 'false');
    }
  });

  void loadOpenAiUsage();
}

window.addEventListener('load', initializeOpenAiUsage);
