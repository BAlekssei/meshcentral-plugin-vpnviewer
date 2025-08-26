// vpnviewer.js — видимый при любом UI: вкладка + плавающая кнопка + панель сверху + "Загрузить конфиг"

module.exports.vpnviewer = function (parent) {
  const obj = {};
  obj.parent = parent;

  // Web-UI hooks
  obj.exports = ['registerPluginTab', 'onWebUIStartupEnd', 'onDeviceRefreshEnd'];

  obj.registerPluginTab = function () {
    try { console.log('[vpnviewer] registerPluginTab()'); } catch (e) {}
    return { tabId: 'vpnviewer', tabTitle: 'VPN .network' };
  };

  obj.onWebUIStartupEnd = function () {
    try { console.log('[vpnviewer] UI loaded'); } catch (e) {}
  };

  obj.onDeviceRefreshEnd = function (divid, currentNode) {
    try {
      // 1) Если сервер создал таб — рисуем туда
      const tabHost = document.getElementById('p_vpnviewer');
      if (tabHost && !tabHost.dataset.vpnviewerInit) {
        tabHost.dataset.vpnviewerInit = '1';
        renderPanel(tabHost, currentNode);
        console.log('[vpnviewer] render into tab');
        return;
      }

      // 2) Иначе — плавающая кнопка + панель сверху в основном контейнере
      ensureFloatingButton();
      const page = getMainPageContainer(divid);
      if (!page) { console.warn('[vpnviewer] main container not found'); return; }

      let panel = document.getElementById('vpnviewer_panel');
      if (!panel) {
        panel = document.createElement('div');
        panel.id = 'vpnviewer_panel';
        panel.style.border = '1px solid #555';
        panel.style.borderRadius = '8px';
        panel.style.margin = '10px 0';
        panel.style.padding = '10px';
        panel.style.background = 'rgba(255,255,255,0.03)';
        // ВСТАВЛЯЕМ САМЫМ ПЕРВЫМ ЭЛЕМЕНТОМ
        page.insertAdjacentElement('afterbegin', panel);
      }
      if (!panel.dataset.vpnviewerInit) {
        panel.dataset.vpnviewerInit = '1';
        renderPanel(panel, currentNode);
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        console.log('[vpnviewer] render into pinned panel');
      }
    } catch (e) {
      console.warn('[vpnviewer] onDeviceRefreshEnd error:', e);
    }

    // ---------- helpers ----------
    function getMainPageContainer(divid) {
      // типичные контейнеры карточки устройства
      return (
        document.getElementById('p11') ||
        (divid ? document.getElementById(divid) : null) ||
        document.getElementById('p12') ||
        document.querySelector('#p_content') ||
        document.body
      );
    }

    function ensureFloatingButton() {
      if (document.getElementById('vpnviewer_fab')) return;
      const btn = document.createElement('button');
      btn.id = 'vpnviewer_fab';
      btn.textContent = 'VPN .network';
      btn.className = 'xbutton';
      btn.style.position = 'fixed';
      btn.style.right = '16px';
      btn.style.bottom = '16px';
      btn.style.zIndex = '2147483647';
      btn.style.opacity = '0.9';
      btn.onclick = () => {
        const p = document.getElementById('vpnviewer_panel');
        if (!p) return;
        const show = p.style.display !== 'none';
        p.style.display = show ? 'none' : '';
        if (!show) p.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      document.body.appendChild(btn);
      console.log('[vpnviewer] floating button added');
    }

    function esc(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

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
        const ms = window.meshserver || (window.parent && window.parent.meshserver);

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
  };

  return obj;
};
