// MeshCentral plugin UI: вкладка "VPN .network" + fallback-кнопка + чтение файла.

module.exports.vpnviewer = function (parent) {
  const obj = {};
  obj.parent = parent;

  // Функции, которые подхватит Web-UI
  obj.exports = ['registerPluginTab', 'onWebUIStartupEnd', 'onDeviceRefreshEnd'];

  // Регистрируем вкладку (если сервер умеет рисовать табы плагинов)
  obj.registerPluginTab = function () {
    try { console.log('[vpnviewer] registerPluginTab()'); } catch (e) {}
    return { tabId: 'vpnviewer', tabTitle: 'VPN .network' };
  };

  obj.onWebUIStartupEnd = function () {
    try { console.log('[vpnviewer] UI loaded'); } catch (e) {}
  };

  obj.onDeviceRefreshEnd = function (divid, currentNode) {
    // --- helpers объявлены внутри, чтобы попали в клиентский скрипт ---
    function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

    function addFallbackButton() {
      if (document.getElementById('vpnviewer_btn')) return;
      const candidates = [
        document.getElementById('p_actions'),
        (document.getElementById('p11') || document).querySelector('div.buttons'),
        document.querySelector('#p11 div.buttons'),
        document.querySelector('div.buttons')
      ];
      const bar = candidates.find(Boolean);
      if (!bar) return;
      const btn = document.createElement('input');
      btn.type = 'button';
      btn.value = 'VPN .network';
      btn.id = 'vpnviewer_btn';
      btn.style.marginLeft = '6px';
      btn.onclick = function () {
        const p = document.getElementById('vpnviewer_fallback');
        if (p) p.style.display = (p.style.display === 'none') ? '' : 'none';
      };
      bar.appendChild(btn);
      try { console.log('[vpnviewer] fallback button added'); } catch (e) {}
    }

    function ensureFallbackPanel(divid) {
      let p = document.getElementById('vpnviewer_fallback');
      if (p) return p;
      p = document.createElement('div');
      p.id = 'vpnviewer_fallback';
      p.style.border = '1px solid #555';
      p.style.borderRadius = '8px';
      p.style.margin = '8px 0';
      p.style.padding = '10px';
      p.style.background = 'rgba(255,255,255,.03)';
      const host =
        document.getElementById('p11') ||
        (divid ? document.getElementById(divid) : null) ||
        document.getElementById('p12') ||
        document.body;
      if (!host) return null;
      host.appendChild(p);
      return p;
    }

    function renderPanel(host, currentNode) {
      const label = (currentNode && (currentNode.name || currentNode._id)) || 'unknown';
      host.innerHTML = `
        <div>
          <h3 style="margin:0 0 8px">VPN .network</h3>
          <div style="margin:4px 0 10px">Узел: <b>${esc(label)}</b></div>
          <button id="vpnviewer-load" class="xbutton">Загрузить конфиг</button>
          <span id="vpnviewer-status" style="margin-left:8px;opacity:.8"></span>
          <pre id="vpnviewer-out" style="margin-top:10px;white-space:pre-wrap;max-height:50vh;overflow:auto;border:1px solid #333;padding:8px;border-radius:6px;background:#111;color:#ddd"></pre>
        </div>`;

      const btn = host.querySelector('#vpnviewer-load');
      const out = host.querySelector('#vpnviewer-out');
      const status = host.querySelector('#vpnviewer-status');

      btn.addEventListener('click', () => {
        const nodeid =
          (currentNode && currentNode._id) ||
          (window.meshserver && window.meshserver.currentNode && window.meshserver.currentNode._id);
        if (!nodeid) { status.textContent = 'nodeid не найден'; return; }

        const ms = window.meshserver || (window.parent && window.parent.meshserver);
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
              out.textContent = out.textContent.replace(/\s*__VPNVIEW_EOF__\s*$/, '');
              ms.removeEventListener && ms.removeEventListener('servermsg', onmsg);
              status.textContent = 'Готово';
            }
          }
        }

        ms.addEventListener && ms.addEventListener('servermsg', onmsg);
        ms.send({ action: 'runcommands', nodeid, type: 'linux', runasuser: false, cmd, reply: 1, tag });
      });
    }

    try {
      // 1) если сервер создал вкладку — рисуем туда
      const tabHost = document.getElementById('p_vpnviewer');
      if (tabHost && !tabHost.dataset.vpnviewerInit) {
        tabHost.dataset.vpnviewerInit = '1';
        renderPanel(tabHost, currentNode);
        console.log('[vpnviewer] render into tab');
        return;
      }

      // 2) иначе — fallback
      addFallbackButton();
      const panel = ensureFallbackPanel(divid);
      if (panel && !panel.dataset.vpnviewerInit) {
        panel.dataset.vpnviewerInit = '1';
        renderPanel(panel, currentNode);
        console.log('[vpnviewer] render into fallback panel');
      } else if (!panel) {
        console.warn('[vpnviewer] fallback host not found');
      }
    } catch (e) {
      console.warn('[vpnviewer] onDeviceRefreshEnd error:', e);
    }
  };

  return obj;
};
