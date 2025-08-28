"use strict";

module.exports.vpnviewer = function (parent) {
  const obj = {};
  obj.parent = parent;
  obj.meshServer = parent.parent;

  // ---------- logging ----------
  function log() { try { console.log("[vpnviewer]", ...arguments); } catch(_){} }

  // ---------- pending replies ----------
  if (!obj.meshServer.pluginHandler.__vpnviewerPending) {
    obj.meshServer.pluginHandler.__vpnviewerPending = Object.create(null);
  }
  obj.pending = obj.meshServer.pluginHandler.__vpnviewerPending;

  function rid() { return Math.random().toString(36).slice(2,10); }
  function waitReply(reqid, ms = 15000) {
    return new Promise((resolve) => {
      const t = setTimeout(() => { delete obj.pending[reqid]; resolve({ ok:false, error:"timeout", reqid }); }, ms);
      obj.pending[reqid] = (payload) => {
        clearTimeout(t); delete obj.pending[reqid];
        resolve(payload || { ok:true, reqid });
      };
    });
  }

  // ---------- agent socket resolution ----------
  function idVariants(nodeId){
    if (!nodeId) return [];
    let s = String(nodeId); try { s = decodeURIComponent(s); } catch {}
    const slash = s.indexOf("@") >= 0 ? s.replace(/@/g,"/") : s;
    const ated  = s.indexOf("@") >= 0 ? s : s.replace(/\//g,"@");
    return Array.from(new Set([s, slash, ated]));
  }

  function findAgent(nodeId){
    const A = (obj.meshServer.webserver && obj.meshServer.webserver.wsagents) || {};
    if (!nodeId) { log("[findAgent] empty nodeId"); return null; }
    for (const v of idVariants(nodeId)) { if (A[v]) { log("[findAgent] hit:", v); return A[v]; } }
    const tail = String(nodeId).replace(/@/g,"/").split("/").pop();
    for (const k in A) {
      const a = A[k]; if (!a) continue;
      if (k.endsWith("/"+tail) || ((a.dbNodeKey||"").endsWith("/"+tail))) { log("[findAgent] tail match:", k); return a; }
    }
    log("[findAgent] NOT FOUND; keys:", Object.keys(A));
    return null;
  }

  // ---------- UI (injected on device page) ----------
  obj.exports = [ "onDeviceRefreshEnd" ];
  obj.onDeviceRefreshEnd = function () {
    try {
      if (typeof pluginHandler !== "undefined" && typeof pluginHandler.registerPluginTab === "function") {
        pluginHandler.registerPluginTab({ tabTitle: "Плагины", tabId: "pluginVpnViewer" });
      }
      var n = window.currentNode || window.node || {};
      var nodeId = (n.dbNodeKey || n._id || "");
      if (nodeId.indexOf("@") >= 0) nodeId = nodeId.replace(/@/g,"/"); // @ → /
      var src = "/pluginadmin.ashx?pin=vpnviewer&user=1" + (nodeId ? ("&node="+encodeURIComponent(nodeId)) : "");
      try { console.log("[vpnviewer][ui] iframe src:", src); } catch(_){}
      if (typeof QA === "function") {
        QA("pluginVpnViewer",
           '<iframe id="vpnviewerFrame" style="width:100%;height:720px;border:0;overflow:auto" src="'+src+'"></iframe>');
      }
    } catch (e) { try { console.error("[vpnviewer][ui] onDeviceRefreshEnd error:", e); } catch(_){} }
  };

  // ---------- server console: `plugin vpnviewer ping` ----------
  obj.consoleaction = function (args) {
    if (typeof args === 'string') args = args.trim().split(/\s+/);
    else if (Array.isArray(args)) args = args.slice();
    else if (args && Array.isArray(args._)) args = args._.slice(); else args = [];
    while (String(args[0]||'').toLowerCase()==='plugin') args.shift();
    while (String(args[0]||'').toLowerCase()==='vpnviewer') args.shift();
    if (String(args[0]||'').toLowerCase()==='ping') return 'vpnviewer server plugin: pong';
    return 'vpnviewer server plugin: console ok';
  };

  // ---------- HTTP: page + API ----------
  obj.handleAdminReq = async function (req, res, user) {
    const q = req.query || {};
    const action = String(q.action || "");
    const node   = String(q.node   || "");
    const path   = String(q.path   || "/etc/systemd/network/10-vpn_vpn.network");
    log("[handleAdminReq]", "action=", action || "(page)", "node=", node, "url=", req.originalUrl || req.url);

    if (String(q.user) !== "1") { res.sendStatus(401); return; }

    // 0) health check: must return JSON — так мы поймём, что плагин реально подхватился
    if (action === "ver") {
      res.setHeader("Content-Type","application/json; charset=utf-8");
      res.end(JSON.stringify({ ok:true, tag:"vpnviewer-ver", ts: Date.now() }));
      return;
    }

    // 1) DIAG: покажет варианты ID и список wsagents
    if (action === "diag") {
      const A = (obj.meshServer.webserver && obj.meshServer.webserver.wsagents) || {};
      const info = Object.keys(A).map(k => ({ key:k, dbNodeKey: A[k] && A[k].dbNodeKey }));
      res.setHeader("Content-Type","application/json; charset=utf-8");
      res.end(JSON.stringify({ ok:true, node, variants: idVariants(node), wsagents: info, count: info.length }));
      return;
    }

    // 2) Быстрая проверка наличия сокета
    if (action === "probeNoWait") {
      const agent = findAgent(node);
      res.setHeader("Content-Type","application/json; charset=utf-8");
      res.end(JSON.stringify({ ok: !!agent, node, agentKey: agent && (agent.dbNodeKey || "<<found>>") }));
      return;
    }

    // 3) ping агента
    if (action === "probe") {
      const agent = findAgent(node);
      if (!agent) { res.setHeader("Content-Type","application/json; charset=utf-8"); res.end(JSON.stringify({ ok:false, error:"Agent offline" })); return; }
      const reqid = rid();
      try { agent.send(JSON.stringify({ action:"plugin", plugin:"vpnviewer", pluginaction:"ping", reqid })); }
      catch(e){ res.setHeader("Content-Type","application/json; charset=utf-8"); res.end(JSON.stringify({ ok:false, error:String(e) })); return; }
      const r = await waitReply(reqid, 7000);
      res.setHeader("Content-Type","application/json; charset=utf-8");
      res.end(JSON.stringify(r && r.ok ? { ok:true } : (r || { ok:false, error:"timeout" })));
      return;
    }

    // 4) read
    if (action === "read") {
      const agent = findAgent(node);
      if (!agent) { res.setHeader("Content-Type","application/json; charset=utf-8"); res.end(JSON.stringify({ ok:false, error:"Agent offline" })); return; }
      const reqid = rid();
      try { agent.send(JSON.stringify({ action:"plugin", plugin:"vpnviewer", pluginaction:"readFile", path, reqid })); }
      catch(e){ res.setHeader("Content-Type","application/json; charset=utf-8"); res.end(JSON.stringify({ ok:false, error:String(e) })); return; }
      const r = await waitReply(reqid, 15000);
      let out;
      if (r && r.pluginaction === "fileContent")   out = { ok:!r.error, content:r.content||"", error:r.error||null };
      else if (r && r.pluginaction === "readFileResult") out = { ok:!r.error, content:r.data||"", error:r.error||null };
      else out = r || { ok:false, error:"timeout" };
      res.setHeader("Content-Type","application/json; charset=utf-8");
      res.end(JSON.stringify(out));
      return;
    }

    // 5) write
    if (action === "write" && req.method === "POST") {
      const bufs = []; req.on("data", c => bufs.push(c));
      req.on("end", async () => {
        let body = {}; try { body = JSON.parse(Buffer.concat(bufs).toString("utf8") || "{}"); } catch {}
        const content = (typeof body.content === "string") ? body.content : "";
        const agent = findAgent(node);
        if (!agent) { res.setHeader("Content-Type","application/json; charset=utf-8"); res.end(JSON.stringify({ ok:false, error:"Agent offline" })); return; }
        const reqid = rid();
        try { agent.send(JSON.stringify({ action:"plugin", plugin:"vpnviewer", pluginaction:"writeFile", path, content, reqid })); }
        catch(e){ res.setHeader("Content-Type","application/json; charset=utf-8"); res.end(JSON.stringify({ ok:false, error:String(e) })); return; }
        const r = await waitReply(reqid, 20000);
        let out;
        if (r && r.pluginaction === "writeResult")     out = { ok: r.ok===true, error:r.error||null };
        else if (r && r.pluginaction === "writeFileResult") out = { ok: !r.error,   error:r.error||null };
        else out = r || { ok:false, error:"timeout" };
        res.setHeader("Content-Type","application/json; charset=utf-8");
        res.end(JSON.stringify(out));
      });
      return;
    }

    // 6) HTML-страница
    res.setHeader("Content-Type","text/html; charset=utf-8");
    res.end(`<!doctype html><meta charset="utf-8"><title>VPN Viewer</title>
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
    const r = await fetch(url, opt); return r.json();
  }
  // Чтобы наглядно видеть ID/сокеты в консоли браузера
  (async()=>{ try{ const d = await fetch('/pluginadmin.ashx?pin=vpnviewer&user=1&action=diag&node='+encodeURIComponent(node)).then(x=>x.json()); console.log('[vpnviewer][ui] diag:', d); }catch(e){ console.warn('[vpnviewer][ui] diag failed', e); } })();

  document.getElementById('bProbe').onclick = async ()=>{ S('Проверяю модуль…'); try{ const r=await api('probe'); S(r.ok?'OK':'Не отвечает', r.ok);}catch(e){ S('Ошибка: '+e, false);} };
  document.getElementById('bLoad').onclick  = async ()=>{ S('Читаю файл…');     try{ const r=await api('read');  if(r.ok){ ed.value=r.content||''; S('Файл загружен'); } else S('Ошибка чтения: '+(r.error||'unknown'), false);}catch(e){ S('Ошибка: '+e, false);} };
  document.getElementById('bSave').onclick  = async ()=>{ S('Сохраняю…');        try{ const r=await api('write',{content:ed.value}); S(r.ok?'Сохранено':'Ошибка записи: '+(r.error||'unknown'), r.ok);}catch(e){ S('Ошибка: '+e, false);} };
  document.getElementById('bProbe').click();
})();
</script>`);
  };

  // ---------- replies from agent ----------
  obj.serveraction = function (command, myparent) {
    try {
      const act   = command && command.pluginaction;
      const reqid = command && command.reqid;
      const node  = (myparent && myparent.dbNodeKey) || (command && command.nodeid);
      log("[srv<-agent]", "act=", act, "reqid=", reqid, "node=", node);
      const fn = reqid ? obj.pending[reqid] : null;
      if (!fn) { log("[srv<-agent] no waiter for reqid", reqid); return; }
      switch (act) {
        case "pong":            fn({ ok:true,                       pluginaction:"pong" }); break;
        case "fileContent":     fn({ ok:!command.error,             pluginaction:"fileContent",    content:command.content||"", error:command.error||null }); break;
        case "readFileResult":  fn({ ok:!command.error,             pluginaction:"readFileResult",  data:command.data||"",      error:command.error||null }); break;
        case "writeResult":     fn({ ok:(command.ok===true),        pluginaction:"writeResult",     error:command.error||null }); break;
        case "writeFileResult": fn({ ok:!command.error,             pluginaction:"writeFileResult", error:command.error||null }); break;
        default:                fn({ ok:false, error:"unknown reply: "+act });
      }
    } catch (e) { log("[serveraction][ERROR]", e && (e.stack || e)); }
  };

  log("[server] PLUGIN LOADED", new Date().toISOString());
  return obj;
};
