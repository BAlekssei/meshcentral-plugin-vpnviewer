/**
 * VPN Viewer — вкладка "Плагины" + редактор файла
 * Без шаблонов (res.render), отдаём HTML прямо из кода.
 */
"use strict";

module.exports.vpnviewer = function (parent) {
  const obj = {};
  obj.parent = parent;
  obj.meshServer = parent.parent;

  // Хранилище ожидателей — ОБЩЕЕ для всех экземпляров плагина
  if (!obj.meshServer.pluginHandler.__vpnviewerPending) {
    obj.meshServer.pluginHandler.__vpnviewerPending = Object.create(null);
  }
  obj.pending = obj.meshServer.pluginHandler.__vpnviewerPending;

  // ---------- helpers ----------
  function rid() { return Math.random().toString(36).slice(2, 10); }
  function waitReplySafe(reqid, ms = 15000) {
    return new Promise((resolve) => {
      const t = setTimeout(() => { delete obj.pending[reqid]; resolve({ ok:false, error:'timeout' }); }, ms);
      obj.pending[reqid] = (payload) => { clearTimeout(t); delete obj.pending[reqid]; resolve(payload || { ok:true }); };
    });
  }
  function findAgent(nodeId) {
    if (!nodeId) return null;
    const A = obj.meshServer.webserver.wsagents || {};
    if (A[nodeId]) return A[nodeId];
    for (const k in A) { const a = A[k]; if (a && a.dbNodeKey === nodeId) return a; }
    return null;
  }

  // ---------- WebUI ----------
  obj.exports = [ "onDeviceRefreshEnd" ];
  obj.onDeviceRefreshEnd = function () {
    if (typeof pluginHandler?.registerPluginTab === 'function') {
      pluginHandler.registerPluginTab({ tabTitle: "Плагины", tabId: "pluginVpnViewer" });
    }
    let nodeId = "";
    try { nodeId = (window.currentNode && currentNode._id) || (window.node && node._id) || ""; } catch {}
    const src = "/pluginadmin.ashx?pin=vpnviewer&user=1" + (nodeId ? ("&node=" + encodeURIComponent(nodeId)) : "");
    QA("pluginVpnViewer", '<iframe id="vpnviewerFrame" style="width:100%;height:720px;border:0;overflow:auto" src="' + src + '"></iframe>');
  };

  // Консоль на сервере (просто для проверки)
  obj.consoleaction = function (args) {
    if (typeof args === 'string') args = args.trim().split(/\s+/);
    else if (Array.isArray(args)) args = args.slice();
    else if (args && Array.isArray(args._)) args = args._.slice();
    else args = [];
    while (String(args[0]).toLowerCase() === 'plugin') args.shift();
    while (String(args[0]).toLowerCase() === 'vpnviewer') args.shift();
    if (String(args[0]||'').toLowerCase() === 'ping') return 'vpnviewer server plugin: pong';
    return 'vpnviewer server plugin: console ok';
  };

  // ---------- HTTP (страница + API) ----------
  obj.handleAdminReq = async function (req, res, user) {
    if (req.query.user != 1) { res.sendStatus(401); return; }

    const node = String(req.query.node || "");
    const path = String(req.query.path || "/etc/systemd/network/10-vpn_vpn.network");
    const action = String(req.query.action || "");

    // API: ping
    if (action === "probe") {
      const agent = findAgent(node);
      if (!agent) { res.json({ ok:false, error:"Agent offline" }); return; }
      const reqid = rid();
      agent.send(JSON.stringify({ action:"plugin", plugin:"vpnviewer", pluginaction:"ping", reqid }));
      const reply = await waitReplySafe(reqid, 5000);
      res.json(reply.ok ? { ok:true, info:"agent module ok" } : reply);
      return;
    }

    // API: read
    if (action === "read") {
      const agent = findAgent(node);
      if (!agent) { res.json({ ok:false, error:"Agent offline" }); return; }
      const reqid = rid();
      agent.send(JSON.stringify({ action:"plugin", plugin:"vpnviewer", pluginaction:"readFile", path, reqid }));
      const r = await waitReplySafe(reqid, 15000);
      if (r.pluginaction === 'fileContent') res.json({ ok: !r.error, content: r.content || "", error: r.error || null });
      else if (r.pluginaction === 'readFileResult') res.json({ ok: !r.error, content: r.data || "", error: r.error || null });
      else res.json(r);
      return;
    }

    // API: write (POST, json: {content})
    if (action === "write" && req.method === "POST") {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", async () => {
        let body = {};
        try { body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch {}
        const content = (typeof body.content === "string") ? body.content : "";
        const agent = findAgent(node);
        if (!agent) { res.json({ ok:false, error:"Agent offline" }); return; }
        const reqid = rid();
        agent.send(JSON.stringify({ action:"plugin", plugin:"vpnviewer", pluginaction:"writeFile", path, content, reqid }));
        const r = await waitReplySafe(reqid, 20000);
        if (r.pluginaction === 'writeResult') res.json({ ok: r.ok === true, error: r.error || null });
        else if (r.pluginaction === 'writeFileResult') res.json({ ok: !r.error, error: r.error || null });
        else res.json(r);
      });
      return;
    }

    // Страница
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(`<!doctype html><meta charset="utf-8"><title>VPN Viewer</title>
<style>
 body{font:14px system-ui;background:#101012;color:#eee;margin:0;padding:16px}
 textarea{width:100%;height:560px;background:#0b0b0b;color:#ddd;border:1px solid #333;border-radius:4px;padding:10px;font-family:monospace;font-size:13px}
 button{padding:8px 12px;border:1px solid #444;border-radius:6px;background:#232323;color:#fff;cursor:pointer}
 button:hover{background:#2d2d2d}
 #status{margin-left:10px}
</style>
<h2 style="margin:0 0 12px">Редактор: /etc/systemd/network/10-vpn_vpn.network</h2>
<div style="margin:8px 0 12px">
  <button id="bProbe">Проверка модуля</button>
  <button id="bLoad" style="margin-left:8px">Загрузить</button>
  <button id="bSave" style="margin-left:8px">Сохранить</button>
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
  document.getElementById('bProbe').onclick = async ()=>{ S('Проверяю модуль…'); try{ const r=await api('probe'); S(r.ok?'OK: агентный модуль загружен':'Не отвечает', r.ok); }catch(e){ S('Ошибка: '+e, false); } };
  document.getElementById('bLoad').onclick  = async ()=>{ S('Читаю файл…');     try{ const r=await api('read'); if(r.ok){ ed.value=r.content||''; S('Файл загружен'); } else S('Ошибка чтения: '+(r.error||'unknown'), false);}catch(e){ S('Ошибка: '+e, false);} };
  document.getElementById('bSave').onclick  = async ()=>{ S('Сохраняю…');        try{ const r=await api('write',{content:ed.value}); S(r.ok?'Сохранено':'Ошибка записи: '+(r.error||'unknown'), r.ok);}catch(e){ S('Ошибка: '+e, false);} };
  document.getElementById('bProbe').click(); setTimeout(()=>document.getElementById('bLoad').click(), 300);
})();
</script>`);
  };

  // ---------- ответы от агента ----------
  obj.serveraction = function (command) {
    try {
      const fn = (command && command.reqid) ? obj.pending[command.reqid] : null;
      if (!fn) return;
      switch (command.pluginaction) {
        case "pong": fn({ ok:true }); break;
        case "fileContent":     fn({ pluginaction:"fileContent",     content:command.content||"", error:command.error||null, ok:!command.error }); break;
        case "readFileResult":  fn({ pluginaction:"readFileResult",   data:command.data||"",       error:command.error||null, ok:!command.error }); break;
        case "writeResult":     fn({ pluginaction:"writeResult",      ok:command.ok===true,        error:command.error||null }); break;
        case "writeFileResult": fn({ pluginaction:"writeFileResult",  ok:!command.error,           error:command.error||null }); break;
        default: fn({ ok:true }); break;
      }
    } catch (e) { console.log("[vpnviewer] serveraction error:", e); }
  };

  return obj;
};
