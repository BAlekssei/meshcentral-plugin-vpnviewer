"use strict";

// имя функции = shortName
function vpnviewer(parent) {
  var api = {};
  api.parent = parent;

  // экспортируем только то, что вызываем
  api.exports = ["onWebUIStartupEnd", "goPageEnd", "onDeviceRefreshEnd"];

  // --- ВСЕ утилиты на window (без замыканий) ---
  window.vpnviewerAddFloatingButton = window.vpnviewerAddFloatingButton || function () {
    if (typeof document === "undefined") return;
    if (document.getElementById("vpnviewer-fab")) return;

    var btn = document.createElement("button");
    btn.id = "vpnviewer-fab";
    btn.textContent = "VPN Viewer";
    btn.title = "Тестовая кнопка из плагина";
    btn.style.position = "fixed";
    btn.style.bottom = "14px";
    btn.style.right  = "14px";
    btn.style.zIndex = 99999;
    btn.style.padding = "8px 12px";
    btn.style.border = "1px solid #888";
    btn.style.borderRadius = "6px";
    btn.style.background = "#fff";
    btn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
    btn.onclick = function(){ alert("Кнопка работает"); };
    document.body.appendChild(btn);

    try { console.log("[vpnviewer] floating button injected"); } catch(e){}
  };

  // ищем ряд кнопок по текстам (RU/EN)
  window.vpnviewerFindActionBar = window.vpnviewerFindActionBar || function () {
    if (typeof document === "undefined") return null;

    // сначала явные селекторы разных тем
    var known = ["#p10Buttons", "#dp_ActionBar", ".RightButtons", ".devicetoolbar .right"];
    for (var i = 0; i < known.length; i++) {
      var el = document.querySelector(known[i]);
      if (el) return el;
    }

    // fallback: по подписям кнопок
    var texts = ["Действия","Примечания","Добавить событие","Run","Сообщение","Чат","Поделиться"];
    var nodes = document.querySelectorAll('input[type=button],button,a');
    var best = null, bestCount = 0;

    for (var j = 0; j < nodes.length; j++) {
      var el = nodes[j];
      var t = (el.value || el.textContent || "").trim();
      if (texts.indexOf(t) === -1) continue;

      var p = el.parentElement, depth = 0;
      while (p && depth < 4) {
        var count = 0;
        var kids = p.querySelectorAll('input[type=button],button,a');
        for (var k = 0; k < kids.length; k++) {
          var tt = (kids[k].value || kids[k].textContent || "").trim();
          if (texts.indexOf(tt) !== -1) count++;
        }
        if (count > bestCount) { best = p; bestCount = count; }
        p = p.parentElement; depth++;
      }
    }
    return best;
  };

  window.vpnviewerAddActionButton = window.vpnviewerAddActionButton || function () {
    if (typeof document === "undefined") return;
    if (document.getElementById("vpnviewer-btn")) return;

    // пробуем вставить сразу после последней известной кнопки
    var labels = ["Поделиться","Чат","Сообщение","Run","Добавить событие","Примечания","Действия"];
    var all = Array.from(document.querySelectorAll('input[type=button],button,a'));
    var ref = null;
    for (var i = 0; i < all.length; i++) {
      var t = (all[i].value || all[i].textContent || "").trim();
      if (labels.indexOf(t) !== -1) ref = all[i];
    }

    var btn = document.createElement("input");
    btn.type = "button";
    btn.id = "vpnviewer-btn";
    btn.value = "VPN Viewer";
    btn.onclick = function () { alert("VPN Viewer нажата"); };

    if (ref && ref.parentElement) {
      ref.insertAdjacentElement("afterend", btn);
      try { console.log("[vpnviewer] action button inserted after:", (ref.value || ref.textContent).trim()); } catch(e){}
      return;
    }

    // если не нашли «реф», добавим в контейнер
    var host = window.vpnviewerFindActionBar();
    if (host) {
      host.appendChild(btn);
      try { console.log("[vpnviewer] action button injected to host"); } catch(e){}
      return;
    }

    try { console.log("[vpnviewer] action bar not found (will retry)"); } catch(e){}
  };

  // --- Хуки (только вызовы window.*) ---
  api.onWebUIStartupEnd = function () {
    try { console.log("[vpnviewer] onWebUIStartupEnd fired"); } catch(e){}
    // alert можно убрать, просто для видимости
    try { alert("vpnviewer: hello from plugin"); } catch(e){}

    window.vpnviewerAddFloatingButton();
    window.vpnviewerAddActionButton();

    // немного ретраев для SPA-навигации
    if (!window.__vpnviewerRetry) {
      var n = 0;
      window.__vpnviewerRetry = setInterval(function(){
        window.vpnviewerAddFloatingButton();
        window.vpnviewerAddActionButton();
        if (++n > 40) { clearInterval(window.__vpnviewerRetry); window.__vpnviewerRetry = null; }
      }, 250);
    }
  };

  api.goPageEnd = function () {
    window.vpnviewerAddFloatingButton();
    window.vpnviewerAddActionButton();
  };

  api.onDeviceRefreshEnd = function () {
    window.vpnviewerAddFloatingButton();
    window.vpnviewerAddActionButton();
  };

  return api;
}

module.exports = vpnviewer;
module.exports.vpnviewer = vpnviewer;
