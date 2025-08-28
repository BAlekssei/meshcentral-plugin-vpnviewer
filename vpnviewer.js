/**
 * VPN Viewer — вкладка + HTTP API (server side)
 * ЛОГИ: во всех ветках console.log('[vpnviewer]', ...)
 */

"use strict";

module.exports.vpnviewer = function (parent) {
  const obj = {};
  obj.parent = parent;
  obj.meshServer = parent.parent;

  // ---------- utils ----------
  function log() { try { console.log("[vpnviewer]", ...arguments); } catch (_) {} }
  function rid() { return Math.random().toString(36).slice(2, 10); }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" }[c]));
  }

  // Общее хранилище «ожидателей» ответов от агента
  if (!obj.meshServer.pluginHandler.__vpnviewerPending) {
    obj.meshServer.pluginHandler.__vpnviewerPending = Object.create(null);
  }
  obj.pending = obj.meshServer.pluginHandler.__vpnviewerPending;

  function waitReply(reqid, ms = 15000) {
    return new Promise((resolve) => {
      const t = setTimeout(() => {
        delete obj.pending[reqid];
        log("[waitReply] TIMEOUT reqid=", reqid);
        resolve({ ok: false, error: "timeout", reqid });
      }, ms);
      obj.pending[reqid] = (payload) => {
        clearTimeout(t);
        delete obj.pending[reqid];
        log("[waitReply] RESOLVE reqid=", reqid, "payload.pluginaction=", payload && payload.pluginaction);
        resolve(payload || { ok: true, reqid });
      };
    });
  }

  function findAgent(nodeId) {
    const A = (obj.meshServer.webserver && obj.meshServer.webserver.wsagents) || {};
    if (!nodeId) { log("[findAgent] empty nodeId"); return null; }

    let s = String(nodeId);
    try { s = decodeURIComponent(s); } catch (_) {}
    // НЕ сжимаем двойные слэши, только @ -> /
    const asIs   = s;
    const slash  = s.indexOf("@") >= 0 ? s.replace(/@/g, "/") : s;
    const ated   = s.indexOf("@") >= 0 ? s : s.replace(/\//g, "@");

    const variants = Array.from(new Set([asIs, slash, ated]));
    log("[findAgent] nodeId=", nodeId, "variants=", variants);

    for (const v of variants) { if (A[v]) { log("[findAgent] direct hit", v); return A[v]; } }

    const tail = slash.split("/").pop();
    for (const k in A) {
      const a = A[k]; if (!a) continue;
      if (k === asIs || k === slash || k === ated ||
          a.dbNodeKey === asIs || a.dbNodeKey === slash || a.dbNodeKey === ated ||
          (k.endsWith("/" + tail)) || (a.dbNodeKey && a.dbNodeKey.endsWith("/" + tail))) {
        log("[findAgent] match by key/dbNodeKey", k, "->", a.dbNodeKey);
        return a;
      }
    }
    log("[findAgent] not found. wsagents keys:", Object.keys(A));
    return null;
  }

  // ---------- фронт (вкладка в карточке узла) ----------
  obj.exports = [ "onDeviceRefreshEnd" ];

  obj.onDeviceRefreshEnd = function () {
    try {
      if (typeof pluginHandler !== "undefined" && typeof pluginHandler.registerPluginTab === "function") {
        pluginHandler.registerPluginTab({ tabTitle: "Плагины", tabId: "pluginVpnViewer" });
      }
      var n = window.currentNode || window.node || {};
      var nodeId = (n.dbNodeKey || n._id || "");
      // Разрешаем @ -> /, НО НЕ сжимаем двойные //
      if (nodeId.indexOf("@") >= 0) nodeId = nodeId.replace(/@/g, "/");

      var src = "/pluginadmin.ashx?pin=vpnviewer&user=1" +
                (nodeId ? ("&node=" + encodeURIComponent(nodeId)) : "");
      if (typeof QA === "function") {
        QA("pluginVpnViewer",
          '<iframe id="vpnviewerFrame" style="width:100%;height:720px;border:0;overflow:auto" src="' + src + '"></iframe>');
      }
      // небольшой фронт-лог
      try { console.log("[vpnviewer][ui] iframe src:", src); } catch (_) {}
    } catch (e) {
      try { console.error("[vpnviewer][ui] onDeviceRefreshEnd error:", e); } catch (_) {}
    }
  };

  // ---------- HTTP: страница + API ----------
  obj.handleAdminReq = async function (req, res, user) {
    if (String(req.query.user) !== "1") { res.sendStatus(401); return; }

    const node   = String(req.query.node || "");
    const path   = String(req.query.path || "/etc/systemd/network/10-vpn_vpn.network");
    const action = String(req.query.action || "");

    log("[http]", "action=", action || "(page)", "node=", node, "path=", path, "user=", user && user.name);

    // API: probe
    if (action === "probe") {
      const agent = findAgent(node);
      if (!agent) { log("[probe] OFFLINE:", node); res.json({ ok:false, error:"Agent offline" }); return; }
      const reqid = rid();
      const msg = { action:"plugin", plugin:"vpnviewer", pluginaction:"ping", reqid };
      try { log("[probe] SEND ->", agent.dbNodeKey || "(no dbNodeKey)", "reqid=", reqid); agent.send(JSON.stringify(msg)); }
      catch (e) { log("[probe] SEND ERROR:", e); res.json({ ok:false, error:String(e) }); return; }
      const r = await waitReply(reqid, 7000);
      log("[probe] REPLY:", r);
      res.json(r && r.ok ? { ok:true } : (r || { ok:false, error:"timeout" }));
      return;
    }

    // API: read
    if (action === "read") {
      const agent = findAgent(node);
      if (!agent) { log("[read] OFFLINE:", node); res.json({ ok:false, error:"Agent offline" }); return; }
      const reqid = rid();
      const msg = { action:"plugin", plugin:"vpnviewer", pluginaction:"readFile", path, reqid };
      try { log("[read] SEND", { path, reqid }); agent.send(JSON.stringify(msg)); }
      catch (e) { log("[read] SEND ERROR:", e); res.json({ ok:false, error:String(e) }); return; }
      const r = await waitReply(reqid, 15000);
      log("[read] REPLY pluginaction=", r && r.pluginaction, "ok=", r && r.ok);
      if (r.pluginaction === "fileContent")     { res.json({ ok: !r.error, content: r.content || "", error: r.error || null }); return; }
      if (r.pluginaction === "readFileResult")   { res.json({ ok: !r.error, content: r.data    || "", error: r.error || null }); return; }
      res.json(r);
      return;
    }

    // API: write (POST {content})
    if (action === "write" && req.method === "POST") {
      const chunks = [];
      req.on("data", c => chunks.push(c));
      req.on("end", async () => {
        let body = {};
        try { body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch (_) {}
        const content = (typeof body.content === "string") ? body.content : "";

        const agent = findAgent(node);
        if (!agent) { log("[write] OFFLINE:", node); res.json({ ok:false, error:"Agent offline" }); return; }

        const reqid = rid();
        const msg = { action:"plugin", plugin:"vpnviewer", pluginaction:"writeFile", path, content, reqid };
        try { log("[write] SEND", { path, bytes: Buffer.byteLength(content, "utf8"), reqid }); agent.send(JSON.stringify(msg)); }
        catch (e) { log("[write] SEND ERROR:", e); res.json({ ok:false, error:String(e) }); return; }

        const r = await waitReply(reqid, 20000);
        log("[write] REPLY pluginaction=", r && r.pluginaction, "ok=", r && r.ok);
        if (r.pluginaction === "writeResult")     { res.json({ ok: r.ok === true, error: r.error || null }); return; }
        if (r.pluginaction === "writeFileResult") { res.json({ ok: !r.error,      error: r.error || null }); return; }
        res.json(r);
      });
      return;
    }

    // Страница-редактор (без шаблонов)
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(`<!doctype html><meta charset="utf-8"><title>VPN Viewer</title>
<style>
 body{font:14px system-ui;background:#101012;color:#eee;margin:0;padding:16px}
 textarea{width:100%;height:560px;background:#0b0b0b;color:#ddd;border:1px solid #333;border-radius:4px;padding:10px;font-family:monospace;font-size:13px}
 button{padding:8px 12px;border:1px solid #444;border-radius:6px;background:#232323;color:#fff;cursor:pointer}
 button:hover{background:#2d2d2d}
 #status{margin-left:10px}
</style>
<h2 style="margin:0 0 12px">Редактор: ${escapeHtml(path)}</h2>
<div style="margin:8px 0 12px">
  <button id="bProbe">Проверка модуля</button>
  <button id="bLoad"  style="margin-left:8px">Загрузить</button>
  <button id="bSave"  style="margin-left:8px">Сохранить</button>
  <span id="status"></span>
</div>
<textarea id="editor" spellcheck="false"></textarea>
<script>
(function(){
  const qs   = new URLSearchParams(location.search);
  const node = qs.get('node') || '';
  const path = qs.get('path') || ${JSON.stringify(path)};
  const st = document.getElementById('status'), ed = document.getElementById('editor');
  function S(m, ok){ st.style.color = (ok===false)?'#ff8a8a':'#9ecbff'; st.textContent = m; }
  async function api(a, body){
    const url = '/pluginadmin.ashx?pin=vpnviewer&user=1&action='+a+'&node='+encodeURIComponent(node)+'&path='+encodeURIComponent(path);
    const opt = body ? { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) } : {};
    const r = await fetch(url, opt); return r.json();
  }
  document.getElementById('bProbe').onclick = async ()=>{ S('Проверяю модуль…'); try{ const r=await api('probe'); S(r.ok?'OK: агентный модуль загружен':'Не отвечает', r.ok); }catch(e){ S('Ошибка: '+e, false); } };
  document.getElementById('bLoad').onclick  = async ()=>{ S('Читаю файл с агента…'); try{ const r=await api('read'); if(r.ok){ ed.value=r.content||''; S('Файл загружен'); } else S('Ошибка чтения: '+(r.error||'unknown'), false);}catch(e){ S('Ошибка: '+e, false);} };
  document.getElementById('bSave').onclick  = async ()=>{ S('Сохраняю…'); try{ const r=await api('write',{content:ed.value}); S(r.ok?'Сохранено':'Ошибка записи: '+(r.error||'unknown'), r.ok);}catch(e){ S('Ошибка: '+e, false);} };
  // авто: проверить и загрузить
  document.getElementById('bProbe').click();
  setTimeout(()=>document.getElementById('bLoad').click(), 400);
})();
</script>`);
  };

  // ---------- ответы от агента ----------
  // ВАЖНО: этот метод НЕ добавлять в obj.exports — это серверный обработчик!
  obj.serveraction = function (command, myparent) {
    try {
      const act   = command && command.pluginaction;
      const reqid = command && command.reqid;
      const node  = (myparent && myparent.dbNodeKey) || command && command.nodeid;
      log("[srv<-agent]", "action=", act, "reqid=", reqid, "node=", node);

      const fn = reqid ? obj.pending[reqid] : null;
      if (!fn) { log("[srv<-agent] no waiter for reqid", reqid); return; }

      switch (act) {
        case "pong":            fn({ ok:true, pluginaction:"pong" }); break;
        case "fileContent":     fn({ ok:!command.error, pluginaction:"fileContent",    content:command.content||"", error:command.error||null }); break;
        case "readFileResult":  fn({ ok:!command.error, pluginaction:"readFileResult",  data:command.data||"",      error:command.error||null }); break;
        case "writeResult":     fn({ ok:(command.ok===true), pluginaction:"writeResult",     error:command.error||null }); break;
        case "writeFileResult": fn({ ok:!command.error, pluginaction:"writeFileResult", error:command.error||null }); break;
        default:                fn({ ok:false, error:"unknown reply: "+act });
      }
    } catch (e) {
      log("[serveraction][ERROR]", e && (e.stack || e));
    }
  };

  return obj;
};
