// vpnviewer.js — таб рядом с "Консоль" + панель + чтение /etc/systemd/network/10-vpn_vpn.network

module.exports.vpnviewer = function (parent) {
  const obj = {};
  obj.parent = parent;

  obj.exports = ['registerPluginTab', 'onWebUIStartupEnd', 'onDeviceRefreshEnd'];

  // если сервер умеет рисовать табы плагинов — это создаст <div id="p_vpnviewer">
  obj.registerPluginTab = function () {
    try { console.log('[vpnviewer] registerPluginTab()'); } catch (_) {}
    return { tabId: 'vpnviewer', tabTitle: 'VPN .network' };
  };

  obj.onWebUIStartupEnd = function () { try { console.log('[vpnviewer] UI loaded'); } catch (_) {} };

  obj.onDeviceRefreshEnd = function (divid, currentNode) {
    try {
      // --- локальные хелперы (попадают в клиентский бандл) ---
      function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
      function getMS(){ return window.meshserver || (window.parent && window.parent.meshserver); }
      function getNodeId(cur){ const ms=getMS(); return (cur && cur._id) || (ms && ms.currentNode && ms.currentNode._id) || null; }

      function renderPanel(host, cur) {
        const label = (cur && (cur.name || cur._id)) || 'unknown';
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
          const ms = getMS();
          const nodeid = getNodeId(cur);
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
              if (/__VPNVIEW_EOF__\s*$/.test(out.textContent)) {
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
          let host = document.getElementById('p_vpnviewer') || document.getElementById('vpnviewer_panel') || createPinnedPanel();
          if (!host) return;
          if (!host.dataset.vpnviewerInit) { host.dataset.vpnviewerInit = '1'; renderPanel(host, (getMS() && getMS().currentNode) || currentNode); }
          host.style.display = '';
          host.scrollIntoView({ behavior: 'smooth', block: 'start' });
          try { console.log('[vpnviewer] top tab clicked'); } catch (_) {}
        });

        consoleBtn.parentNode.insertBefore(btn, consoleBtn.nextSibling);
        try { console.log('[vpnviewer] top tab injected next to Console'); } catch (_) {}
      }

      // --- собственно логика ---
      injectTopButton();

      const tabHost = document.getElementById('p_vpnviewer');
      if (tabHost && !tabHost.dataset.vpnviewerInit) {
        tabHost.dataset.vpnviewerInit = '1';
        renderPanel(tabHost, currentNode);
        console.log('[vpnviewer] render into tab');
        return;
      }

      let panel = document.getElementById('vpnviewer_panel');
      if (!panel) panel = createPinnedPanel();
      if (panel && !panel.dataset.vpnviewerInit) {
        panel.dataset.vpnviewerInit = '1';
        renderPanel(panel, currentNode);
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        console.log('[vpnviewer] render into pinned panel');
      }

    } catch (e) {
      console.warn('[vpnviewer] onDeviceRefreshEnd error:', e);
    }
  };

  return obj;
};
