/**
 * @description MeshCentral VPNViewer (adds Plugins tab)
 * @license Apache-2.0
 */
"use strict";

module.exports.vpnviewer = function (parent) {
  var obj = {};
  obj.parent = parent;
  obj.meshServer = parent.parent;
  obj.db = null;                 // не используется, оставлено для совместимости с примером
  obj.intervalTimer = null;      // не используется, оставлено для совместимости
  obj.debug = obj.meshServer.debug;
  obj.VIEWS = __dirname + '/views/';  // можно задействовать позже

  // Эти функции будут экспортированы в браузер (важно!)
  obj.exports = [
    'onDeviceRefreshEnd',
    'resizeContent'
  ];

  // ====== SERVER HOOKS ======
  obj.server_startup = function () {
    try { obj.debug('Plugin', 'vpnviewer', 'server_startup'); }
    catch (e) { console.log('[vpnviewer] server_startup'); }
  };

  // Обработчик /pluginadmin.ashx?pin=vpnviewer&...
  obj.handleAdminReq = function (req, res, user) {
    if (req.query.user == 1) {
      // Простейшая страница — сюда поместите ваш UI
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`<!doctype html><meta charset="utf-8"><title>Plugins</title>
<style>
  body{font:14px system-ui;background:#101012;color:#e6e6e6;margin:0;padding:16px}
  h2{margin:0 0 12px}
  button{padding:8px 12px;border:1px solid #444;border-radius:6px;background:#232323;color:#fff;cursor:pointer}
  button:hover{background:#2d2d2d}
</style>
<h2>Plugins</h2>
<p>Это вкладка, добавленная плагином <b>vpnviewer</b>. Поместите сюда ваш VPN-виджет/панель.</p>
<button onclick="alert('Демонстрационное действие')">Проверка кнопки</button>`);
      return;
    }
    if (req.query.include == 1 && req.query.path) {
      // опциональная раздача статики: /pluginadmin.ashx?pin=vpnviewer&include=1&path=foo.js
      switch (req.query.path.split('.').pop()) {
        case 'css': res.contentType('text/css'); break;
        case 'js':  res.contentType('text/javascript'); break;
      }
      res.sendFile(__dirname + '/includes/' + req.query.path);
      return;
    }
    res.sendStatus(401);
  };

  // ====== UI HOOKS (в браузере) ======
  // Добавляем вкладку «Plugins» на странице устройства
  obj.onDeviceRefreshEnd = function () {
    // регистрируем вкладку (если уже есть — повторная регистрация безопасна)
    pluginHandler.registerPluginTab({
      tabTitle: 'Plugins',
      tabId: 'pluginVPNViewer'
    });

    // наполняем её iframe-ом с нашим UI
    QA('pluginVPNViewer',
      '<iframe id="pluginIframeVPNViewer" ' +
      'style="width:100%;height:700px;overflow:auto" ' +
      'scrolling="yes" frameBorder="0" ' +
      'src="/pluginadmin.ashx?pin=vpnviewer&user=1"></iframe>');
  };

  // Можно дергать для подстройки высоты
  obj.resizeContent = function () {
    var i = document.getElementById('pluginIframeVPNViewer');
    if (i) i.style.height = '700px';
  };

  return obj;
};
