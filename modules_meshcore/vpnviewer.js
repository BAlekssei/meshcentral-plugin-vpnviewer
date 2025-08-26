// ---- MeshAgent side (runs inside meshcore/Duktape) ----
try {
  if (typeof pluginHandler === 'undefined') { return; }

  // Никаких require вне try — если чего-то нет, не роняем регистрацию плагина
  var fs = null;
  try { fs = require('fs'); } catch (e) { /* на старых агентах fs может быть урезан */ }

  pluginHandler.vpnviewer = {};
  // Сообщения от сервера сюда
  pluginHandler.vpnviewer.serveraction = function (msg, parent) {
    try {
      var rid = msg.reqid;
      if (msg.pluginaction === 'ping') {
        parent.send(JSON.stringify({ action:'plugin', plugin:'vpnviewer', pluginaction:'pong', reqid: rid }));
        return;
      }

      if (msg.pluginaction === 'readFile') {
        var out = null, err = null;
        try { out = fs ? fs.readFileSync(msg.file, 'utf8') : null; } catch (e) { err = String(e); }
        parent.send(JSON.stringify({ action:'plugin', plugin:'vpnviewer', pluginaction:'readFileResult', reqid: rid, data: out, error: err }));
        return;
      }

      if (msg.pluginaction === 'writeFile') {
        var werr = null;
        try {
          if (!fs) throw new Error('fs module unavailable on agent');
          fs.writeFileSync(msg.file, msg.data, 'utf8');
        } catch (e) { werr = String(e); }
        parent.send(JSON.stringify({ action:'plugin', plugin:'vpnviewer', pluginaction:'writeFileResult', reqid: rid, error: werr }));
        return;
      }
    } catch (ex) {
      try {
        parent.send(JSON.stringify({ action:'plugin', plugin:'vpnviewer', pluginaction:'error', reqid: msg.reqid, error: String(ex) }));
      } catch (__) {}
    }
  };
} catch (e) { /* тихо */ }
