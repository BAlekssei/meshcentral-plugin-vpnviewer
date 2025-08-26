/**
 * VPN Viewer — безопасное ожидание ответа агента (без reject)
 */
"use strict";

module.exports.vpnviewer = function (parent) {
  const obj = {};
  obj.parent = parent;
  obj.meshServer = parent.parent;
  obj.pending = Object.create(null);

  // ===== utils =====
  const crypto = require("crypto");
  function rid() { return crypto.randomBytes(6).toString("hex"); }

  // БЕЗОПАСНОЕ ожидание: никогда не reject, только resolve с ok:false
  function waitReplySafe(reqid, ms = 15000) {
    return new Promise((resolve) => {
      const done = (payload) => { try { clearTimeout(t); } catch {} delete obj.pending[reqid]; resolve(payload || { ok: true }); };
      const t = setTimeout(() => done({ ok: false, error: "timeout" }), ms);
      obj.pending[reqid] = done;
    });
  }

  function findAgent(nodeId) {
    if (!nodeId) return null;
    const A = obj.meshServer.webserver.wsagents || {};
    if (A[nodeId]) return A[nodeId];
    for (const k in A) { const a = A[k]; if (a && a.dbNodeKey === nodeId) return a; }
    return null;
  }

  // ===== вкладка на странице устройства =====
  obj.exports = [ "onDeviceRefreshEnd" ];
  obj.onDeviceRefreshEnd = function () {
    pluginHandler.registerPluginTab({ tabTitle: "Плагины", tabId: "pluginVpnViewer" });
    let nodeId = "";
    try { nodeId = (window.currentNode && currentNode._id) || (window.node && node._id) || ""; } catch {}
    const src = "/pluginadmin.ashx?pin=vpnviewer&user=1" + (nodeId ? ("&node=" + encodeURIComponent(nodeId)) : "");
    QA("pluginVpnViewer", '<iframe id="vpnviewerFrame" style="width:100%;height:720px;border:0;overflow:auto" src="' + src + '"></iframe>');
  };

  // ===== HTTP =====
  obj.hook_setupHttpHandlers = function (app, express) {
    app.use("/pluginadmin.ashx", express.json({ limit: "10mb" }));
  };

  obj.handleAdminReq = async function (req, res, user) {
    if (req.query.user != 1) return res.sendStatus(401);

    const node = String(req.query.node || "");
    const path = String(req.query.path || "/etc/systemd/network/10-vpn_vpn.network");
    const action = String(req.query.action || "");

    try {
      if (action === "probe") {
        const agent = findAgent(node);
        if (!agent) return res.json({ ok: false, error: "Agent offline" });
        const reqid = rid();
        agent.send(JSON.stringify({ action: "plugin", plugin: "vpnviewer", pluginaction: "ping", reqid }));
        const reply = await waitReplySafe(reqid, 5000);
        return res.json(reply.ok ? { ok: true, info: "agent module ok" } : reply);
      }

      if (action === "read") {
        const agent = findAgent(node);
        if (!agent) return res.json({ ok: false, error: "Agent offline" });
        const reqid = rid();
        agent.send(JSON.stringify({ action: "plugin", plugin: "vpnviewer", pluginaction: "readFile", path, reqid }));
        const reply = await waitReplySafe(reqid, 15000);
        return res.json(reply);
      }

      if (action === "write" && req.method === "POST") {
        const agent = findAgent(node);
        if (!agent) return res.json({ ok: false, error: "Agent offline" });
        const reqid = rid();
        const content = (req.body && typeof req.body.content === "string") ? req.body.content : "";
        agent.send(JSON.stringify({ action: "plugin", plugin: "vpnviewer", pluginaction: "writeFile", path, content, reqid }));
        const reply = await waitReplySafe(reqid, 20000);
        return res.json(reply);
      }

      // страница редактора
      return res.render(__dirname + "/views/vpn_editor", { node });

    } catch (e) {
      // на всякий случай — никогда не падаем
      return res.json({ ok: false, error: String(e) });
    }
  };

  // ===== ответы от агента =====
  obj.serveraction = function (command/*from agent*/) {
    try {
      const fn = command && command.reqid ? obj.pending[command.reqid] : null;
      if (!fn) return;
      switch (command.pluginaction) {
        case "pong":        fn({ ok: true, info: "agent module ok" }); break;
        case "fileContent": fn({ ok: !command.error, content: command.content || "", error: command.error || null }); break;
        case "writeResult": fn({ ok: command.ok === true, error: command.error || null }); break;
      }
    } catch (e) { console.log("[vpnviewer] serveraction error:", e); }
  };

  return obj;
};
