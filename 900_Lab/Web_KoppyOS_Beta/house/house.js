/* Koppy Home v0.1: read-only DB view; never infer device connections. */
'use strict';
(() => {
  const status = document.getElementById('houseStatus');
  const roomsElement = document.getElementById('houseRooms');
  const retry = document.getElementById('houseRetry');
  const login = document.getElementById('houseLogin');
  let pending = false;
  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text != null) element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function formatKg(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return String(Number(number.toFixed(3)));
  }

  function deviceList(
    devices,
    loadByTargetId = new Map()
  ) {
    const list = node('ul', null, 'devices');

    for (const device of devices) {
      const item = node('li');

      item.append(node('strong', device.name));

      item.append(
        node(
          'p',
          [device.category, device.status]
            .filter(Boolean)
            .join(' / '),
          'device-meta'
        )
      );

      if (device.model) {
        item.append(node('p', device.model));
      }

      const loadMeta = [];

      const weight = formatKg(device.weight_kg);

      if (weight !== null) {
        loadMeta.push(
          `${
            Number(device.weight_is_estimate) === 1
              ? '参考重量'
              : '重量'
          } ${weight}kg`
        );
      }

      const capacity = formatKg(
        device.load_capacity_kg
      );

      if (capacity !== null) {
        loadMeta.push(
          `耐荷重 ${capacity}kg`
        );
      }

      if (loadMeta.length) {
        item.append(
          node(
            'p',
            loadMeta.join(' / '),
            'device-load'
          )
        );
      }

      const loadSummary =
        loadByTargetId.get(
          String(device.id)
        );

      if (
        loadSummary
        && Number(
          loadSummary.registered_device_count
        ) > 0
      ) {
        const registeredLoad = formatKg(
          loadSummary.registered_load_kg
        );

        const loadCapacity = formatKg(
          loadSummary.load_capacity_kg
        );

        const remaining = formatKg(
          loadSummary.remaining_capacity_kg
        );

        const estimatedCount = Number(
          loadSummary.estimated_weight_count
        );

        const unknownCount = Number(
          loadSummary.unknown_weight_count
        );

        const summary = node(
          'div',
          null,
          'device-load-summary'
        );

        summary.append(
          node(
            'strong',
            `登録済み荷重 ${
              estimatedCount > 0 ? '約' : ''
            }${registeredLoad}kg / ${loadCapacity}kg`
          )
        );

        const details = [];

        if (unknownCount === 0) {
          details.push(
            `残り目安 ${
              estimatedCount > 0 ? '約' : ''
            }${remaining}kg`
          );
        } else {
          details.push(
            `重量未登録 ${unknownCount}件`
          );
        }

        if (estimatedCount > 0) {
          details.push('参考重量を含む');
        }

        summary.append(
          node(
            'p',
            details.join(' / ')
          )
        );

        item.append(summary);
      }

      if (device.notes) {
        item.append(
          node('p', device.notes)
        );
      }

      list.append(item);
    }

    return devices.length
      ? list
      : node(
          'p',
          'デバイスは登録されていません'
        );
  }
  function render(data) {
    const fragment = document.createDocumentFragment();
    const byId = new Map(
      data.devices.map(
        device => [
          String(device.id),
          device
        ]
      )
    );

    const loadByTargetId = new Map(
      (
        Array.isArray(data.load_summaries)
          ? data.load_summaries
          : []
      ).map(
        summary => [
          String(summary.target_device_id),
          summary
        ]
      )
    );
    for (const room of data.rooms) {
      const section = node('section', null, 'panel');
      section.dataset.wfPanel = '';
      section.dataset.wfPanelSurface = '';
      section.append(
        node(
          'h2',
          room.name,
          'wf-panel-title'
        )
      );
      section.append(
        deviceList(
          data.devices.filter(
            device =>
              String(device.room_id)
              === String(room.id)
          ),
          loadByTargetId
        )
      );
      if (room.code === 'gaming') {
        const map = node('div', null, 'connections');
        map.append(node('h3', 'デスク周り接続マップ'));
        const connections = data.connections.filter(connection => [connection.source_device_id, connection.target_device_id].some(id => String(byId.get(String(id))?.room_id) === String(room.id)));
        if (!connections.length) map.append(node('p', '接続情報はまだ登録されていません'));
        else {
          const list = node('ul');
          for (const connection of connections) {
            const source = byId.get(String(connection.source_device_id));
            const target = byId.get(String(connection.target_device_id));
            const text = `${source?.name ?? '未登録デバイス'}${connection.source_port ? ` (${connection.source_port})` : ''} → ${target?.name ?? '未登録デバイス'}${connection.target_port ? ` (${connection.target_port})` : ''}`;
            list.append(node('li', [text, connection.connection_type, connection.label, connection.notes].filter(Boolean).join(' / ')));
          }
          map.append(list);
        }
        section.append(map);
      }
      fragment.append(section);
    }
    const portable = node('section', null, 'panel');
    portable.dataset.wfPanel = '';
    portable.dataset.wfPanelSurface = '';
    portable.append(
      node(
        'h2',
        '持ち運び',
        'wf-panel-title'
      ),
      deviceList(
        data.devices.filter(
          device =>
            Number(device.portable) === 1
        ),
        loadByTargetId
      )
    );
    fragment.append(portable);
    roomsElement.replaceChildren(fragment);
  }
  async function load() {
    if (pending) return;
    pending = true; retry.disabled = true; login.hidden = true;
    status.classList.remove('is-error'); status.textContent = '自宅データを読み込んでいます……';
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('/api/v1/home.php', {method: 'GET', credentials: 'same-origin', cache: 'no-store', headers: {Accept: 'application/json'}, signal: controller.signal});
      if (response.status === 401) {
        roomsElement.replaceChildren();
        login.hidden = false;
        status.textContent = '認証Sessionが切れています。GitHubでログインしてください。';
        return;
      }
      if (!response.ok) throw new Error('API failure');
      const result = await response.json();
      if (result.success !== true || !['rooms', 'devices', 'connections'].every(key => Array.isArray(result.data?.[key]))) throw new Error('Invalid response');
      render(result.data);
      status.textContent = `${result.data.devices.length}件のデバイスを表示しています。`;
    } catch (_) {
      status.classList.add('is-error');
      status.textContent = '自宅データを取得できませんでした。通信・ログイン状態を確認して再読み込みしてください。表示中のデータは更新前のものです。';
    } finally {
      window.clearTimeout(timeout); pending = false; retry.disabled = false;
    }
  }
  retry.addEventListener('click', load);
  load();
})();
