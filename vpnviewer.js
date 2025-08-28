// plugins/vpnviewer/vpnviewer.js
// VPN Viewer — вкладка "Плагины" + редактор файла через MeshAgent
"use strict";

module.exports.vpnviewer = function (parent) {
  const obj = {};
  obj.parent = parent;
  obj.meshServer = parent.parent;

  // ---- общая очередь ожиданий (доступна всем экземплярам) ----
  if (!obj.meshServer.pluginHandler.__vpnviewerPending) {
    obj.meshServer.pluginHandler.__vpnviewerPending = Object.create(null);
  }
  obj.pending = obj.meshServer.pluginHandler.__vpnviewerPending;

  // ---- helpers ----
  function rid() { return Math.random().toString(36).slice(2, 10); }
  function waitReply(reqid, ms = 15000) {
    return new Promise((resolve) => {
      const t = setTimeout(() => {
        delete obj.pending[reqid];
        resolve({ ok: false, error: "timeout" });
      }, ms);
      obj.pending[reqid] = (payload) => {
        clearTimeout(t);
        delete obj.pending[reqid];
        resolve(payload || { ok: true });
      };
    });
  }
  function findAgent(nodeId) {
    if (!nodeId) return null;
    const A = (obj.meshServer.webserver && obj.meshServer.webserver.wsagents) || {};
    if (A[nodeId]) return A[nodeId];
    for (const k in A) {
      const a = A[k];
      if (a && (a.dbNodeKey === nodeId || a.dbNodeKey === (nodeId._id || nodeId))) return a;
    }
    return null;
  }

  // ---- экспортируемые функции плагина ----
  // ВАЖНО: здесь есть и serveraction, и handleAdminReq, и consoleaction.
  obj.exports = ["onDeviceRefreshEnd", "handleAdminReq", "serveraction", "consoleaction"];

  // Вкладка на карточке устройства
  obj.onDeviceRefreshEnd = function () {
    if (typeof pluginHandler !== 'undefined' && pluginHandler.registerPluginTab) {
      pluginHandler.registerPluginTab({ tabTitle: "Плагины", tabId: "pluginVpnViewer" });
    }
    let nodeId = "";
    try { nodeId = (window.currentNode && currentNode._id) || (window.node && node._id) || ""; } catch (_) {}
    const src = "/pluginadmin.ashx?pin=vpnviewer&user=1" + (nodeId ? ("&node=" + encodeURIComponent(nodeId)) : "");
    QA("pluginVpnViewer", '<iframe id="vpnviewerFrame" style="width:100%;height:720px;border:0;overflow:auto" src="' + src + '"></iframe>');
  };

  // Консоль сервера: безопасный ping (не трогает агента)
  obj.consoleaction = function (args) {
    if (typeof args === 'string') args = args.trim().split(/\s+/);
    else if (Array.isArray(args)) args = args.slice();
    else if (args && Array.isArray(args._)) args = args._.slice(); else args = [];
    while ((args[0] || '').toLowerCase() === 'plugin') args.shift();
    while ((args[0] || '').toLowerCase() === 'vpnviewer') args.shift();
    const sub = String(args[0] || '').toLowerCase();
    if (sub === 'ping') return 'vpnviewer server plugin: pong';
    return 'vpnviewer server plugin: console ok';
  };

  // HTTP обработчик UI + API
  obj.handleAdminReq = async function (req, res, user) {
    if (req.query.user != 1) { res.sendStatus(401); return; }

    const node = String(req.query.node || "");
    const path = String(req.query.path || "/etc/systemd/network/10-vpn_vpn.network");
    const action = String(req.query.action || "");

    // API: проверка модуль/агент
    if (action === "probe") {
      const agent = findAgent(node);
      if (!agent) { res.json({ ok: false, error: "Agent offline" }); return; }
      const reqid = rid();
      try {
        agent.send(JSON.stringify({ action: "plugin", plugin: "vpnviewer", pluginaction: "ping", reqid, path }));
      } catch (e) { res.json({ ok: false, error: String(e) }); return; }
      const r = await waitReply(reqid, 6000);
      res.json(r.ok ? { ok: true } : r);
      return;
    }

    // API: чтение файла
    if (action === "read") {
      const agent = findAgent(node);
      if (!agent) { res.json({ ok: false, error: "Agent offline" }); return; }
      const reqid = rid();
      try {
        agent.send(JSON.stringify({ action: "plugin", plugin: "vpnviewer", pluginaction: "readFile", path, reqid }));
      } catch (e) { res.json({ ok: false, error: String(e) }); return; }
      const r = await waitReply(reqid, 15000);
      if (r.pluginaction === 'fileContent') { res.json({ ok: !r.error, content: r.content || "", error: r.error || null }); return; }
      if (r.pluginaction === 'readFileResult') { res.json({ ok: !r.error, content: r.data || "", error: r.error || null }); return; }
      res.json(r);
      return;
    }

    // API: запись файла (POST body: {content})
    if (action === "write" && req.method === "POST") {
      const bufs = [];
      req.on("data", c => bufs.push(c));
      req.on("end", async () => {
        let body = {};
        try { body = JSON.parse(Buffer.concat(bufs).toString("utf8") || "{}"); } catch (_) {}
        const content = (typeof body.content === "string") ? body.content : "";
        const agent = findAgent(node);
        if (!agent) { res.json({ ok: false, error: "Agent offline" }); return; }
        const reqid = rid();
        try {
          agent.send(JSON.stringify({ action: "plugin", plugin: "vpnviewer", pluginaction: "writeFile", path, content, reqid }));
        } catch (e) { res.json({ ok: false, error: String(e) }); return; }
        const r = await waitReply(reqid, 20000);
        if (r.pluginaction === 'writeResult')     { res.json({ ok: r.ok === true, error: r.error || null }); return; }
        if (r.pluginaction === 'writeFileResult') { res.json({ ok: !r.error,      error: r.error || null }); return; }
        res.json(r);
      });
      return;
    }

    // Страница UI
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(`<!doctype html><meta charset="utf-8"><title>VPN Viewer</title>
<style>
 body{font:14px system-ui;background:#101012;color:#eee;margin:0;padding:16px}
 textarea{width:100%;height:560px;background:#0b0b0b;color:#ddd;border:1px solid #333;border-radius:4px;padding:10px;font-family:monospace;font-size:13px}
 button{padding:8px 12px;border:1px solid #444;border-radius:6px;background:#232323;color:#fff;cursor:pointer}
 button:hover{background:#2d2d2d} #status{margin-left:10px}
 .row{margin:8px 0 12px}
</style>
<h2 style="margin:0 0 12px">Редактор: /etc/systemd/network/10-vpn_vpn.network</h2>
<div class="row">
  <button id="bProbe">Проверка модуля</button>
  <button id="bLoad"  style="margin-left:8px">Загрузить</button>
  <button id="bSave"  style="margin-left:8px">Сохранить</button>
  <span id="status"></span>
</div>
<textarea id="editor" spellcheck="false"></textarea>
<script>
(function(){
  const qs = new URLSearchParams(location.search);
  const node = qs.get('node') || '';
  const path = '/etc/systemd/network/10-vpn_vpn.network';
  const st = document.getElementById('status'), ed = document.getElementById('editor');
  function S(m, ok){ st.style.color = (ok===false)?'#ff8a8a':'#9ecbff'; st.textContent = m; }
  async function api(a, body){
    const url = '/pluginadmin.ashx?pin=vpnviewer&user=1&action='+a+'&node='+encodeURIComponent(node)+'&path='+encodeURIComponent(path);
    const opt = body ? { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) } : {};
    const r = await fetch(url, opt); return r.json();
  }
  document.getElementById('bProbe').onclick = async ()=>{ S('Проверяю модуль…'); try{ const r=await api('probe'); S(r.ok?'OK: модуль отвечает':'timeout', r.ok);}catch(e){ S('Ошибка: '+e, false);} };
  document.getElementById('bLoad').onclick  = async ()=>{ S('Читаю файл…');     try{ const r=await api('read');  if(r.ok){ ed.value=r.content||''; S('Файл загружен'); } else S('Ошибка чтения: '+(r.error||'unknown'), false);}catch(e){ S('Ошибка: '+e, false);} };
  document.getElementById('bSave').onclick  = async ()=>{ S('Сохраняю…');        try{ const r=await api('write',{content:ed.value}); S(r.ok?'Сохранено':'Ошибка записи: '+(r.error||'unknown'), r.ok);}catch(e){ S('Ошибка: '+e, false);} };
  // авто: проверить и затем загрузить
  document.getElementById('bProbe').click(); setTimeout(()=>document.getElementById('bLoad').click(), 300);
})();
</script>`);
  };

  // Приём ответов от агента — снимаем ожидания
  obj.serveraction = function (command) {
    try {
      if (!command || command.plugin !== 'vpnviewer') return;
      // Диагностика в лог сервера (видно в "Мой сервер → Консоль")
      console.log('[vpnviewer][srv] reply:', command.pluginaction, 'reqid=', command.reqid, 'nodeid=', command.nodeid);

      const fn = (command.reqid && obj.pending[command.reqid]) ? obj.pending[command.reqid] : null;
      if (!fn) return;

      switch (command.pluginaction) {
        case 'pong':
          fn({ ok: true });
          break;
        case 'fileContent':
          fn({ pluginaction: 'fileContent', content: command.content || '', error: command.error || null, ok: !command.error });
          break;
        case 'readFileResult':
          fn({ pluginaction: 'readFileResult', data: command.data || '', error: command.error || null, ok: !command.error });
          break;
        case 'writeResult':
          fn({ pluginaction: 'writeResult', ok: command.ok === true, error: command.error || null });
          break;
        case 'writeFileResult':
          fn({ pluginaction: 'writeFileResult', ok: !command.error, error: command.error || null });
          break;
        default:
          fn({ ok: false, error: 'unknown reply: ' + command.pluginaction });
          break;
      }
    } catch (e) {
      console.log('[vpnviewer][srv] error:', e);
    }
  };

  return obj;
};
