/**
 * VPN Viewer — вкладка "Плагины" + API для чтения/записи файла через агент
 */
"use strict";

module.exports.vpnviewer = function (parent) {
  const obj = {};
  obj.parent = parent;
  obj.meshServer = parent.parent;

  // Общее хранилище "ожидающих ответ" запросов
  if (!obj.meshServer.pluginHandler.__vpnviewerPending) {
    obj.meshServer.pluginHandler.__vpnviewerPending = Object.create(null);
  }
  obj.pending = obj.meshServer.pluginHandler.__vpnviewerPending;

  // -------- helpers --------
  function rid() { return Math.random().toString(36).slice(2, 10); }
  function waitReply(reqid, ms = 8000) {
    return new Promise((resolve) => {
      const t = setTimeout(() => {
        delete obj.pending[reqid];
        resolve({ ok: false, error: 'timeout', reqid });
      }, ms);
      obj.pending[reqid] = (payload) => {
        clearTimeout(t);
        delete obj.pending[reqid];
        resolve(payload || { ok: true, reqid });
      };
    });
  }

  function findAgent(nodeId) {
    const A = obj.meshServer?.webserver?.wsagents || {};
    if (!nodeId) return null;

    // точное совпадение
    if (A[nodeId]) return A[nodeId];

    // normalize: иногда id приходит как node/@xxxxx → node//xxxxx
    const id2 = nodeId.replace(/^node\/(?!\/)/, 'node//');
    if (A[id2]) return A[id2];

    // по dbNodeKey
    for (const k in A) {
      const ag = A[k];
      if (!ag) continue;
      if (ag.dbNodeKey === nodeId || ag.dbNodeKey === id2) return ag;
    }
    return null;
  }

  // --------- UI (клиент) ---------
  obj.exports = [ "onDeviceRefreshEnd", "consoleaction" ];

  obj.onDeviceRefreshEnd = function () {
    try {
      pluginHandler.registerPluginTab({ tabTitle: "Плагины", tabId: "pluginVpnViewer" });
    } catch (e) { console.log('[vpnviewer][ui] registerPluginTab error:', e); }

    let nodeId = "";
    try { nodeId = (window.currentNode && currentNode._id) || (window.node && node._id) || ""; } catch {}

    const src = "/pluginadmin.ashx?pin=vpnviewer&user=1" + (nodeId ? ("&node=" + encodeURIComponent(nodeId)) : "");
    console.log('[vpnviewer][ui] iframe src:', src);
    QA("pluginVpnViewer", '<iframe id="vpnviewerFrame" style="width:100%;height:720px;border:0;overflow:auto" src="' + src + '"></iframe>');
  };

  // просто чтобы `plugin vpnviewer ping` на сервере ничего не ломал
  obj.consoleaction = function (args) {
    return 'vpnviewer server plugin: console ok';
  };

  // ---------- ОБРАБОТКА ОТВЕТОВ ОТ АГЕНТА ----------
  obj.serveraction = function (command /*, myparent, grandparent */) {
    try {
      if (command && command.plugin === 'vpnviewer') {
        console.log('[vpnviewer][srvaction] <-', JSON.stringify(command));
      }
      const fn = command && command.reqid ? obj.pending[command.reqid] : null;
      if (!fn) return;

      switch (command.pluginaction) {
        case "pong":            fn({ ok: true, reqid: command.reqid }); break;
        case "fileContent":     fn({ ok: !command.error, pluginaction: 'fileContent',    content:command.content || "", error:command.error || null, reqid:command.reqid }); break;
        case "readFileResult":  fn({ ok: !command.error, pluginaction: 'readFileResult',  content:command.data    || "", error:command.error || null, reqid:command.reqid }); break;
        case "writeResult":     fn({ ok: command.ok === true, pluginaction: 'writeResult', error:command.error || null, reqid:command.reqid }); break;
        case "writeFileResult": fn({ ok: !command.error, pluginaction: 'writeFileResult', error:command.error || null, reqid:command.reqid }); break;
        default:                fn({ ok: false, error: 'unknown reply: ' + command.pluginaction, reqid: command.reqid }); break;
      }
    } catch (e) {
      console.log('[vpnviewer][srvaction] ERROR:', e);
    }
  };

  // ---------- HTTP: страница + API ----------
  obj.handleAdminReq = async function (req, res, user) {
    const node = String(req.query.node || "");
    const path = String(req.query.path || "/etc/systemd/network/10-vpn_vpn.network");
    const action = String(req.query.action || "");

    if (req.query.user != 1) { res.sendStatus(401); return; }

    try {
      console.log('[vpnviewer] [handleAdminReq] action=', action, 'node=', node, 'url=', req.url);

      // простая страница с редактором
      if (!action) {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.end(`<!doctype html><meta charset="utf-8"><title>VPN Viewer</title>
<style>
 body{font:14px system-ui;background:#101012;color:#eee;margin:0;padding:16px}
 textarea{width:100%;height:560px;background:#0b0b0b;color:#ddd;border:1px solid #333;border-radius:4px;padding:10px;font-family:monospace;font-size:13px}
 button{padding:8px 12px;border:1px solid #444;border-radius:6px;background:#232323;color:#fff;cursor:pointer}
 button:hover{background:#2d2d2d} #status{margin-left:10px}
</style>
<h2 style="margin:0 0 12px">Редактор: /etc/systemd/network/10-vpn_vpn.network</h2>
<div style="margin:8px 0 12px">
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
    const r = await fetch(url, opt);
    return r.json();
  }
  document.getElementById('bProbe').onclick = async ()=>{ S('Проверяю модуль…'); try{ const r=await api('probe'); S(r.ok?'OK: модуль отвечает':'Не отвечает: '+(r.error||'unknown'), r.ok);}catch(e){ S('Ошибка: '+e, false);} };
  document.getElementById('bLoad').onclick  = async ()=>{ S('Читаю файл…');     try{ const r=await api('read');  if(r.ok){ ed.value=r.content||''; S('Файл загружен'); } else S('Ошибка чтения: '+(r.error||'unknown'), false);}catch(e){ S('Ошибка: '+e, false);} };
  document.getElementById('bSave').onclick  = async ()=>{ S('Сохраняю…');        try{ const r=await api('write',{content:ed.value}); S(r.ok?'Сохранено':'Ошибка записи: '+(r.error||'unknown'), r.ok);}catch(e){ S('Ошибка: '+e, false);} };
})();
</script>`);
      }

      // пробный запрос к агенту
      if (action === "probe") {
        const agent = findAgent(node);
        if (!agent) {
          console.log('[vpnviewer] [findAgent] NOT FOUND; keys:', Object.keys(obj.meshServer.webserver.wsagents));
          return res.json({ ok:false, error:"Agent offline", node });
        }
        console.log('[vpnviewer] [findAgent] hit:', agent.dbNodeKey);
        const reqid = rid();
        const msg = { action:"plugin", plugin:"vpnviewer", pluginaction:"ping", reqid };
        try {
          console.log('[vpnviewer] [probe] send->', msg);
          agent.send(JSON.stringify(msg));
        } catch (e) {
          console.log('[vpnviewer] [probe] send error', e);
          return res.json({ ok:false, error:String(e) });
        }
        const r = await waitReply(reqid, 7000);
        console.log('[vpnviewer] [probe] reply:', r);
        return res.json(r);
      }

      if (action === "read") {
        const agent = findAgent(node);
        if (!agent) return res.json({ ok:false, error:"Agent offline" });
        const reqid = rid();
        const msg = { action:"plugin", plugin:"vpnviewer", pluginaction:"readFile", reqid, path };
        console.log('[vpnviewer] [read] send->', msg);
        agent.send(JSON.stringify(msg));
        const r = await waitReply(reqid, 15000);
        console.log('[vpnviewer] [read] reply:', r);
        return res.json(r.ok ? { ok:true, content:r.content || r.data || "" } : r);
      }

      if (action === "write" && req.method === "POST") {
        const chunks = []; req.on("data", c => chunks.push(c));
        req.on("end", async () => {
          let body={}; try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")||"{}"); } catch {}
          const content = (typeof body.content === "string") ? body.content : "";
          const agent = findAgent(node);
          if (!agent) return res.json({ ok:false, error:"Agent offline" });
          const reqid = rid();
          const msg = { action:"plugin", plugin:"vpnviewer", pluginaction:"writeFile", reqid, path, content };
          console.log('[vpnviewer] [write] send->', msg);
          agent.send(JSON.stringify(msg));
          const r = await waitReply(reqid, 20000);
          console.log('[vpnviewer] [write] reply:', r);
          return res.json(r);
        });
        return;
      }

      // неизвестная команда
      return res.json({ ok:false, error: "unknown action" });

    } catch (e) {
      console.log('[vpnviewer] [handleAdminReq] ERROR:', e);
      return res.json({ ok:false, error:String(e && e.stack || e) });
    }
  };

  return obj;
};
