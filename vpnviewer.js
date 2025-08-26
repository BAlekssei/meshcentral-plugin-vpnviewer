/**
 * @description VPN Viewer — редактор /etc/systemd/network/10-vpn_vpn.network
 * + ping/pong для проверки, что агентный модуль подхватился
 */
"use strict";

module.exports.vpnviewer = function (parent) {
  const obj = {};
  obj.parent = parent;
  obj.meshServer = parent.parent;
  obj.pending = Object.create(null);

  // --- Экспортируемые в WebUI функции
  obj.exports = [ "onDeviceRefreshEnd" ];

  // ----- Утилиты -----
  function waitReply(reqid, ms=15000) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => { delete obj.pending[reqid]; reject(new Error("Timeout waiting agent reply")); }, ms);
      obj.pending[reqid] = (payload) => { clearTimeout(t); delete obj.pending[reqid]; resolve(payload); };
    });
  }
  function findAgent(nodeId) {
    if (!nodeId) return null;
    const A = obj.meshServer.webserver.wsagents || {};
    if (A[nodeId]) return A[nodeId];
    for (const k in A) { const a = A[k]; if (a && a.dbNodeKey === nodeId) return a; }
    return null;
  }
  function rid() { return require("crypto").randomBytes(6).toString("hex"); }

  // ----- Вкладка на странице устройства -----
  obj.onDeviceRefreshEnd = function () {
    pluginHandler.registerPluginTab({ tabTitle: "Плагины", tabId: "pluginVpnViewer" });
    var nodeId = "";
    try { nodeId = (window.currentNode && currentNode._id) || (window.node && node._id) || ""; } catch {}
    var src = "/pluginadmin.ashx?pin=vpnviewer&user=1" + (nodeId ? ("&node=" + encodeURIComponent(nodeId)) : "");
    QA("pluginVpnViewer", '<iframe id="vpnviewerFrame" style="width:100%;height:720px;border:0;overflow:auto" src="' + src + '"></iframe>');
  };

  // ----- HTTP (рендер страницы + AJAX API) -----
  obj.hook_setupHttpHandlers = function (app, express) {
    // для POST /write
    app.use("/pluginadmin.ashx", express.json({ limit: "5mb" }));
  };

  obj.handleAdminReq = async function (req, res, user) {
    if (req.query.user != 1) return res.sendStatus(401);

    const node = String(req.query.node || "");
    const path = String(req.query.path || "/etc/systemd/network/10-vpn_vpn.network");

    // ping: проверить, что агентный модуль жив
    if (req.query.action === "probe") {
      const agent = findAgent(node);
      if (!agent) return res.json({ ok:false, error:"Agent offline" });
      const reqid = rid();
      agent.send(JSON.stringify({ action:"plugin", plugin:"vpnviewer", pluginaction:"ping", reqid }));
      const reply = await waitReply(reqid, 5000).catch(e => ({ ok:false, error:String(e) }));
      return res.json(reply);
    }

    if (req.query.action === "read") {
      const agent = findAgent(node);
      if (!agent) return res.json({ ok:false, error:"Agent offline" });
      const reqid = rid();
      agent.send(JSON.stringify({ action:"plugin", plugin:"vpnviewer", pluginaction:"readFile", path, reqid }));
      const reply = await waitReply(reqid, 15000);
      return res.json(reply);
    }

    if (req.query.action === "write" && req.method === "POST") {
      const agent = findAgent(node);
      if (!agent) return res.json({ ok:false, error:"Agent offline" });
      const reqid = rid();
      const content = (req.body && typeof req.body.content === "string") ? req.body.content : "";
      agent.send(JSON.stringify({ action:"plugin", plugin:"vpnviewer", pluginaction:"writeFile", path, content, reqid }));
      const reply = await waitReply(reqid, 20000);
      return res.json(reply);
    }

    // страница редактора
    return res.render(__dirname + "/views/vpn_editor", { node });
  };

  // ----- Ответы ОТ агента -----
  obj.serveraction = function (command/*from agent*/, myparent, grandparent) {
    const fn = command && command.reqid ? obj.pending[command.reqid] : null;
    if (!fn) return;
    switch (command.pluginaction) {
      case "pong":        fn({ ok:true, info:"agent module ok" }); break;
      case "fileContent": fn({ ok:!command.error, content:command.content||"", error:command.error||null }); break;
      case "writeResult": fn({ ok:command.ok===true, error:command.error||null }); break;
    }
  };

  return obj;
};
