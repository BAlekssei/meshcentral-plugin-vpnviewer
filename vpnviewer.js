"use strict";

module.exports.vpnviewer = function (parent) {
  const obj = {};
  obj.parent = parent;
  obj.meshServer = parent.parent;
  obj.exports = ['onDeviceRefreshEnd'];
  obj.pending = Object.create(null);
  let seq = 1;

  const VIEWS = __dirname + '/views/';

  // Удобный ожидатель ответов от агента
  function waitReply(reqid, ms = 15000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        delete obj.pending[reqid];
        reject(new Error('Timeout waiting agent reply'));
      }, ms);
      obj.pending[reqid] = (msg) => { clearTimeout(timer); delete obj.pending[reqid]; resolve(msg); };
    });
  }

  // Получаем ВСЕ сообщения от агентов для этого плагина
  obj.serveraction = function (command/*, myparent, grandparent*/) {
    if (command && command.reqid && obj.pending[command.reqid]) {
      try { obj.pending[command.reqid](command); } catch (e) {}
    }
  };

  // Простая вкладка в устройстве
  obj.onDeviceRefreshEnd = function () {
    pluginHandler.registerPluginTab({ tabId: 'vpnviewer', tabTitle: 'Плагины' });
    // отрисовали страницу во вкладку
    QA('vpnviewer', '<iframe id="vpnv_iframe" style="width:100%;height:680px;border:0" src="/pluginadmin.ashx?pin=vpnviewer&user=1"></iframe>');
  };

  // HTTP-обработчик нашего мини-UI
  obj.handleAdminReq = function (req, res, user) {
    if (req.query.user == 1) {
      return res.render(VIEWS + 'plugins', {}); // страница редактора
    }

    // дальше идут AJAX ручки из нашего UI
    const nodeid = req.query.nodeid;
    const agent = obj.meshServer.webserver.wsagents[nodeid];
    if (!agent) { res.status(409).send('Agent offline'); return; }

    const rid = (seq++).toString(36) + Date.now().toString(36);

    if (req.query.a === 'ping') {
      agent.send(JSON.stringify({ action:'plugin', plugin:'vpnviewer', pluginaction:'ping', reqid: rid }));
      return waitReply(rid, 8000).then(r => res.json({ ok: r.pluginaction === 'pong' })).catch(e => res.status(504).send('ERR: '+e.message));
    }

    if (req.query.a === 'read') {
      const file = req.query.file;
      agent.send(JSON.stringify({ action:'plugin', plugin:'vpnviewer', pluginaction:'readFile', file, reqid: rid }));
      return waitReply(rid).then(r => {
        if (r.error) return res.status(500).send(r.error);
        res.json({ data: r.data || '' });
      }).catch(e => res.status(504).send('ERR: '+e.message));
    }

    if (req.query.a === 'write' && req.method === 'POST') {
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        agent.send(JSON.stringify({ action:'plugin', plugin:'vpnviewer', pluginaction:'writeFile', file: body.file, data: body.data, reqid: rid }));
        waitReply(rid).then(r => {
          if (r.error) return res.status(500).send(r.error);
          res.json({ ok: true });
        }).catch(e => res.status(504).send('ERR: '+e.message));
      });
      return;
    }

    res.sendStatus(404);
  };

  return obj;
};
