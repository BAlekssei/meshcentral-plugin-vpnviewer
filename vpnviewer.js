// vpnviewer.js — вкладка "VPN .network" (как в ScriptTask) + дублируем кнопку рядом с "Консоль".
// Кнопка "Загрузить конфиг" читает /etc/systemd/network/10-vpn_vpn.network через runcommands.

module.exports.vpnviewer = function (parent) {
  const obj = {};
  obj.parent = parent;

  // Только то, что реально должно попасть в UI:
  obj.exports = ['registerPluginTab', 'onWebUIStartupEnd', 'onDeviceRefreshEnd', 'goPageEnd'];

  // 1) серверная регистрация таба (создаст <div id="p_vpnviewer">)
  obj.registerPluginTab = function () {
    try { console.log('[vpnviewer] registerPluginTab()'); } catch (_) {}
    return { tabId: 'vpnviewer', tabTitle: 'VPN .network' };
  };

  obj.onWebUIStartupEnd = function () {
    try { console.log('[vpnviewer] UI loaded'); } catch (_) {}
  };

  // 2) дублируем кнопку рядом с "Консоль" при каждом переходе страниц
  obj.goPageEnd = function () {
    try {
      // всё локально, чтобы точно попало в сборку
      function injectTopButton() {
        if (document.getElementById('vpnviewer_topbtn')) return;
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
          let host = document.getElementById('p_vpnviewer') || document.getElementById('vpnviewer_panel');
          if (!host) host = createPinnedPanel();
          if (!host) return;
          if (!host.dataset.vpnviewerInit) renderPanel(host, (window.meshserver && window.meshserver.currentNode) || null);
          host.style.display = '';
          host.scrollIntoView({ behavior: 'smooth', block: 'start' });
          try { console.log('[vpnviewer] top tab clicked'); } catch (_) {}
        });

        consoleBtn.parentNode.insertBefore(btn, consoleBtn.nextSibling);
        try { console.log('[vpnviewer] top tab injected next to Console'); } catch (_) {}
      }

      function createPinnedPanel() {
        const page = document.getElementById('p11') ||
                     document.querySelector('#p_content') ||
                     document.getElementById('p12') || document.body;
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

      function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
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
        wireLoader(host, currentNode);
      }

      function wireLoader(host, currentNode) {
        const btn = host.querySelector('#vpnv-load');
        const out = host.querySelector('#vpnv-out');
        const status = host.querySelector('#vpnv-status');

        btn.addEventListener('click', () => {
          const ms = window.meshserver || (window.parent && window.parent.meshserver);
          const nodeid = (currentNode && currentNode._id) || (ms && ms.currentNode && ms.currentNode._id);
          if (!nodeid) { status.textContent = 'nodeid не найден'; return; }
          if (!ms || typeof ms.send !== 'function') { status.textContent = 'meshserver недоступен'; return; }

          status.textContent = 'Читаю файл…';
          out.textContent = '';
          const tag = 'vpnviewer-' + Date.now();
          const cmd = "sh -lc 'cat /etc/systemd/network/10-vpn_vpn.network 2>/dev/null || echo \"(файл не найден)\"'; echo __VPNVIEW_EOF__";

          function onmsg(msg) {
            if (!msg || msg.action !== 'runcommands' || msg.tag !== tag) return;
            if (typeof msg.output === 'string') {
              out.textContent += msg.output;
              if (out.textContent.indexOf('__VPNVIEW_EOF__') !== -1) {
                out.textContent = out.textContent.replace(/\s*__VPNVIEW_EOF__\\s*$/, '');
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

      // собственно вставка кнопки
      injectTopButton();

    } catch (e) {
      console.warn('[vpnviewer] goPageEnd error:', e);
    }
  };

  // 3) основной хук страницы устройства: рисуем либо во вкладку, либо в нашу панель
  obj.onDeviceRefreshEnd = function (divid, currentNode) {
    try {
      // локальные хелперы (чтобы точно были в сборке)
      function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
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
        wireLoader(host, currentNode);
      }
      function wireLoader(host, currentNode) {
        const btn = host.querySelector('#vpnv-load');
        const out = host.querySelector('#vpnv-out');
        const status = host.querySelector('#vpnv-status');
        btn.addEventListener('click', () => {
          const ms = window.meshserver || (window.parent && window.parent.meshserver);
          const nodeid = (currentNode && currentNode._id) || (ms && ms.currentNode && ms.currentNode._id);
          if (!nodeid) { status.textContent = 'nodeid не найден'; return; }
          if (!ms || typeof ms.send !== 'function') { status.textContent = 'meshserver недоступен'; return; }

          status.textContent = 'Читаю файл…';
          out.textContent = '';
          const tag = 'vpnviewer-' + Date.now();
          const cmd = "sh -lc 'cat /etc/systemd/network/10-vpn_vpn.network 2>/dev/null || echo \"(файл не найден)\"'; echo __VPNVIEW_EOF__";

          function onmsg(msg) {
            if (!msg || msg.action !== 'runcommands' || msg.tag !== tag) return;
            if (typeof msg.output === 'string') {
              out.textContent += msg.output;
              if (out.textContent.indexOf('__VPNVIEW_EOF__') !== -1) {
                out.textContent = out.textContent.replace(/\s*__VPNVIEW_EOF__\\s*$/, '');
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
      function createPinnedPanel() {
        const page = document.getElementById('p11') ||
                     (divid ? document.getElementById(divid) : null) ||
                     document.getElementById('p12') ||
                     document.querySelector('#p_content') || document.body;
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

      // 3.1 если сервер создал таб — рендерим в него
      const tabHost = document.getElementById('p_vpnviewer');
      if (tabHost && !tabHost.dataset.vpnviewerInit) {
        tabHost.dataset.vpnviewerInit = '1';
        renderPanel(tabHost, currentNode);
        console.log('[vpnviewer] render into tab');
        return;
      }

      // 3.2 иначе создаём свою панель
      let panel = document.getElementById('vpnviewer_panel');
      if (!panel) panel = createPinnedPanel();
      if (panel && !panel.dataset.vpnviewerInit) {
        panel.dataset.vpnviewerInit = '1';
        renderPanel(panel, currentNode);
        console.log('[vpnviewer] render into pinned panel');
      }
    } catch (e) {
      console.warn('[vpnviewer] onDeviceRefreshEnd error:', e);
    }
  };

  return obj;
};
