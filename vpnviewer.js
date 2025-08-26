/**
 * @description VPN Viewer (edit /etc/systemd/network/10-vpn_vpn.network)
 * простой редактор файла на ноде через plugin-сообщения
 */

"use strict";

module.exports.vpnviewer = function (parent) {
  const obj = {};
  obj.parent = parent;
  obj.meshServer = parent.parent;              // MeshCentral server
  obj.VIEWS = __dirname + "/views/";           // шаблоны
  obj.pending = Object.create(null);           // ожидания ответов от агента по reqid

  // функции, доступные веб-UI (как у ScriptTask)
  obj.exports = [
    "onDeviceRefreshEnd"
  ];

  // Вкладка «Плагины» на странице устройства
  obj.onDeviceRefreshEnd = function () {
    pluginHandler.registerPluginTab({
      tabTitle: "Плагины",
      tabId: "pluginVpnViewer"
    });

    // получаем настоящий id узла из UI
    var nodeId = "";
    try {
      nodeId = (window.currentNode && window.currentNode._id) ||
              (window.node && window.node._id) || "";
    } catch (e) {}

    var src = "/pluginadmin.ashx?pin=vpnviewer&user=1";
    if (nodeId) src += "&node=" + encodeURIComponent(nodeId);

    QA("pluginVpnViewer",
      '<iframe id="vpnviewerFrame" style="width:100%;height:720px;border:0;overflow:auto" src="' + src + '"></iframe>');
  };

  // ===== Вспомогалка: ожидание ответа от агента по reqid =====
  function waitReply(reqid, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        delete obj.pending[reqid];
        reject(new Error("Timeout waiting agent reply"));
      }, timeoutMs);
      obj.pending[reqid] = (payload) => { clearTimeout(t); delete obj.pending[reqid]; resolve(payload); };
    });
  }

  // ===== HTTP обработчик /pluginadmin.ashx?pin=vpnviewer&... =====
  obj.handleAdminReq = async function (req, res, user) {
    // Только пользовательская страница (в iframe)
    if (req.query.user == 1) {

      // AJAX: прочитать файл с ноды
      if (req.query.action === "read") {
        try {
          const node = req.query.node;
          const path = req.query.path || "/etc/systemd/network/10-vpn_vpn.network";
          const agent = obj.meshServer.webserver.wsagents[node];
          if (!agent) return res.json({ ok: false, error: "Agent offline" });

          const reqid = require("crypto").randomBytes(6).toString("hex");
          const payload = { action: "plugin", plugin: "vpnviewer", pluginaction: "readFile", path, reqid };
          agent.send(JSON.stringify(payload));

          const reply = await waitReply(reqid, 15000);
          return res.json(reply);
        } catch (e) {
          return res.json({ ok: false, error: String(e) });
        }
      }

      // AJAX: записать файл на ноду
      if (req.query.action === "write" && req.method === "POST") {
        try {
          const node = req.query.node;
          const path = req.query.path || "/etc/systemd/network/10-vpn_vpn.network";
          const content = (req.body && req.body.content != null) ? String(req.body.content) : "";
          const agent = obj.meshServer.webserver.wsagents[node];
          if (!agent) return res.json({ ok: false, error: "Agent offline" });

          const reqid = require("crypto").randomBytes(6).toString("hex");
          const payload = { action: "plugin", plugin: "vpnviewer", pluginaction: "writeFile", path, content, reqid };
          agent.send(JSON.stringify(payload));

          const reply = await waitReply(reqid, 20000);
          return res.json(reply);
        } catch (e) {
          return res.json({ ok: false, error: String(e) });
        }
      }

      // Отрисовка самой страницы редактора
      const vars = {
        node: req.query.node || ""
      };
      return res.render(obj.VIEWS + "vpn_editor", vars);
    }

    // Остальное не обслуживаем здесь
    return res.sendStatus(401);
  };

  // ===== Сервер получает сообщения от агента плагина =====
  obj.serveraction = function (command /* from agent */, myparent, grandparent) {
    // ожидаем pluginaction от agent-side «modules_meshcore/vpnviewer.js»
    switch (command.pluginaction) {
      case "fileContent": {
        const fn = obj.pending[command.reqid];
        if (fn) fn({ ok: !command.error, content: command.content || "", error: command.error || null });
        break;
      }
      case "writeResult": {
        const fn = obj.pending[command.reqid];
        if (fn) fn({ ok: command.ok === true, error: command.error || null });
        break;
      }
      default:
        // игнор
        break;
    }
  };

  return obj;
};
