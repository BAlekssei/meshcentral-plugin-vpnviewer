// Плагин MeshCentral: вкладка "VPN .network" + кнопка рядом с «Консоль» + чтение файла
// ВАЖНО: именованный экспорт с именем как в shortName (vpnviewer)

module.exports.vpnviewer = function (parent) {
  const obj = {};
  obj.parent = parent;

  // Хуки, которые UI реально вызывает (как в ScriptTask)
  obj.exports = ['registerPluginTab', 'onWebUIStartupEnd', 'onDeviceRefreshEnd', 'goPageEnd'];

  // --- 1) Регистрация вкладки (стандартный путь)
  obj.registerPluginTab = function () {
    try { console.log('[vpnviewer] registerPluginTab()'); } catch (_) {}
    return { tabId: 'vpnviewer', tabTitle: 'VPN .network' };
  };

  obj.onWebUIStartupEnd = function () { try { console.log('[vpnviewer] UI loaded'); } catch (_) {} };

  // --- 2) Доп. инъекция кнопки рядом с «Консоль», если вкладку не рисуют
  obj.goPageEnd = function () { try { injectTopTabButton(); } catch (_) {} };

  // --- 3) Рендер содержимого (вкладка или наш контейнер)
  obj.onDeviceRefreshEnd = function (divid, currentNode) {
    try {
      injectTopTabButton();

      const tabHost = document.getElementById('p_vpnviewer');
      if (tabHost && !tabHost.dataset.vpnviewerInit) {
        tabHost.dataset.vpnviewerInit = '1';
        renderPanel(tabHost, currentNode);
        console.log('[vpnviewer] render into tab');
        return;
      }

      let panel = document.getElementById('vpnviewer_panel');
      if (!panel) panel = createPinnedPanel(divid);
      if (panel && !panel.dataset.vpnviewerInit) {
        panel.dataset.vpnviewerInit = '1';
        renderPanel(panel, currentNode);
        console.log('[vpnviewer] render into pinned panel');
      }
    } catch (e) {
      console.warn('[vpnviewer] onDeviceRefreshEnd error:', e);
    }
  };

  // ===== helpers (объявлены на верхнем уровне, чтобы были видны и в goPageEnd) =====

  function injectTopTabButton() {
    if (document.getElementById('vpnviewer_topbtn')) return;

    // ищем кнопку/линк «Консоль» и вставляем нашу рядом
    const els = Array.from(document.querySelectorAll('a,button,input[type=button]'));
    let consoleBtn = null;
    for (const el of els) {
      const t = ((el.textContent || el.value || '') + '').trim().toLowerCase();
      if (t === 'консоль' || t === 'console') { consoleBtn = el; break; }
    }
    if (!consoleBtn || !consoleBtn.parentNode) return;

    const btn = document.createElement('a');
    btn.id = 'vpnviewer_topbtn';
    btn.href = 'javascript:void(0)';
    btn.textContent = 'VPN .network';
    btn.className = consoleBtn.className || '';
    btn.style.marginLeft = '8px';
    btn.addEventListener('click', () => {
      // показать нашу панель (если вкладки нет)
      let host = document.getElementById('p_vpnviewer');
      if (!host) host = document.getElementById('vpnviewer_panel') || createPinnedPanel();
      if (!host) return;
      if (!host.dataset.vpnviewerInit) renderPanel(host, window.currentNode || null);
      host.style.display = '';
      host.scrollIntoView({ behavior: 'smooth', block: 'start' });
      console.log('[vpnviewer] top tab clicked');
    });

    consoleBtn.parentNode.insertBefore(btn, consoleBtn.nextSibling);
    console.log('[vpnviewer] top tab injected next to Console');
  }

  function createPinnedPanel(divid) {
    const page = document.getElementById('p11') || (divid ? document.getElementById(divid) : null) ||
                 document.getElementById('p12') || document.querySelector('#p_content') || document.body;
    if (!page) return null;
    const panel = document.createElement('div');
    panel.id = 'vpnviewer_panel';
    panel.style.border = '1px solid #555';
    panel.style.borderRadius = '8px';
    panel.style.margin = '10px 0';
    panel.style.padding = '10px';
    panel.style.background = 'rgba(255,255,255,0.03)';
    page.insertAdjacentElement('afterbegin', panel);
    return panel;
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function getMS() { return window.meshserver || (window.parent && window.parent.meshserver); }
  function getNodeId(currentNode) {
    return (currentNode && currentNode._id) || (getMS() && getMS().currentNode && getMS().currentNode._id) || null;
  }

  function renderPanel(host, currentNode) {
    const label = (currentNode && (currentNode.name || currentNode._id)) || 'unknown';
    host.innerHTML = `
      <div>
        <h3 style="margin:0 0 8px">VPN .network</h3>
        <div style="margin:4px 0 10px">Узел: <b>${esc(label)}</b></div>
        <button id="vpnv-load" class="xbutton">Загрузить конфиг</button>
        <span id="vpnv-status" style="margin-left:8px;opacity:.8"></span>
        <pre id="vpnv-out" style="margin-top:10px;white-space:pre-wrap;max-height:50vh;overflow:auto;border:1px solid #333;padding:8px;border-radius:6px;background:#111;color:#ddd"></pre>
      </div>`;

    const btn = host.querySelector('#vpnv-load');
    const out = host.querySelector('#vpnv-out');
    const status = host.querySelector('#vpnv-status');

    btn.addEventListener('click', () => {
      const nodeid = getNodeId(currentNode);
      const ms = getMS();

      if (!nodeid) { status.textContent = 'nodeid не найден'; return; }
      if (!ms || typeof ms.send !== 'function') { status.textContent = 'meshserver недоступен'; return; }

      status.textContent = 'Читаю файл…';
      out.textContent = '';

      const tag = 'vpnviewer-' + Date.now();
      const cmd = "sh -lc 'cat /etc/systemd/network/10-vpn_vpn.network 2>/dev/null || echo \"(файл не найден)\"'; echo __VPNVIEW_EOF__";
      console.log('[vpnviewer] send runcommands to', nodeid, 'tag=', tag);

      function onmsg(msg) {
        if (!msg || msg.action !== 'runcommands' || msg.tag !== tag) return;
        if (typeof msg.output === 'string') {
          out.textContent += msg.output;
          if (out.textContent.indexOf('__VPNVIEW_EOF__') !== -1) {
            out.textContent = out.textContent.replace(/\s*__VPNVIEW_EOF__\s*$/, '');
            ms.removeEventListener && ms.removeEventListener('servermsg', onmsg);
            status.textContent = 'Готово';
          }
        } else if (msg.error) {
          status.textContent = 'Ошибка: ' + msg.error;
        }
      }

      ms.addEventListener && ms.addEventListener('servermsg', onmsg);
      ms.send({ action: 'runcommands', nodeid, type: 'linux', runasuser: false, cmd, reply: 1, tag });
    });
  }

  return obj;
};
