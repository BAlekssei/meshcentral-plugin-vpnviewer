"use strict";

// имя функции = shortName
function vpnviewer(parent) {
  var api = {};
  api.parent = parent;

  // экспортируемые браузерные хуки
  api.exports = ["onWebUIStartupEnd", "goPageEnd", "onDeviceRefreshEnd"];

  // ---------- ВСЁ ниже работает и в топ-странице, и внутри iframe ----------
  // Получить document активного контента (внутри p14frame, если он есть)
  window.vpnviewerGetDoc = window.vpnviewerGetDoc || function () {
    try {
      var f = document.getElementById("p14frame")
           || document.querySelector('iframe#p14frame, iframe[name="p14frame"], iframe[id^="p"], iframe[src*="commander"]');
      if (f && f.contentWindow && f.contentWindow.document) return f.contentWindow.document;
    } catch (e) {}
    return document; //fallback
  };

  // Плавающая кнопка (внутри активного документа)
  window.vpnviewerAddFloatingButton = window.vpnviewerAddFloatingButton || function () {
    var doc = window.vpnviewerGetDoc();
    if (!doc || !doc.body || doc.getElementById("vpnviewer-fab")) return;

    var btn = doc.createElement("button");
    btn.id = "vpnviewer-fab";
    btn.textContent = "VPN Viewer";
    btn.title = "Тестовая кнопка из плагина";
    btn.style.position = "fixed";
    btn.style.bottom = "14px";
    btn.style.right  = "14px";
    btn.style.zIndex = 2147483647; // поверх всего внутри фрейма
    btn.style.padding = "8px 12px";
    btn.style.border = "1px solid #888";
    btn.style.borderRadius = "6px";
    btn.style.background = "#fff";
    btn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
    btn.onclick = function(){ alert("Кнопка работает"); };
    doc.body.appendChild(btn);

    try { console.log("[vpnviewer] floating button injected into", doc.location.href); } catch(e){}
  };

  // Найти панель с кнопками действий на странице устройства
  window.vpnviewerFindActionBar = window.vpnviewerFindActionBar || function () {
    var doc = window.vpnviewerGetDoc();
    if (!doc) return null;

    // Известные селекторы
    var known = ["#p10Buttons", "#dp_ActionBar", ".RightButtons", ".devicetoolbar .right"];
    for (var i = 0; i < known.length; i++) {
      var el = doc.querySelector(known[i]);
      if (el) return el;
    }

    // Fallback: по подписям RU/EN
    var texts = ["Действия","Примечания","Добавить событие","Run","Сообщение","Чат","Поделиться"];
    var nodes = doc.querySelectorAll('input[type=button],button,a');
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

  // Вставить кнопку в ряд «Действия / Run / …» (внутри фрейма)
  window.vpnviewerAddActionButton = window.vpnviewerAddActionButton || function () {
    var doc = window.vpnviewerGetDoc();
    if (!doc || doc.getElementById("vpnviewer-btn")) return;

    // Попробуем поставить сразу после последней из известных кнопок
    var labels = ["Поделиться","Чат","Сообщение","Run","Добавить событие","Примечания","Действия"];
    var all = Array.from(doc.querySelectorAll('input[type=button],button,a'));
    var ref = null;
    for (var i = 0; i < all.length; i++) {
      var t = (all[i].value || all[i].textContent || "").trim();
      if (labels.indexOf(t) !== -1) ref = all[i];
    }

    var btn = doc.createElement("input");
    btn.type = "button";
    btn.id = "vpnviewer-btn";
    btn.value = "VPN Viewer";
    btn.onclick = function () { alert("VPN Viewer нажата"); };

    if (ref && ref.parentElement) {
      ref.insertAdjacentElement("afterend", btn);
      try { console.log("[vpnviewer] action button inserted after:", (ref.value || ref.textContent).trim()); } catch(e){}
      return;
    }

    var host = window.vpnviewerFindActionBar();
    if (host) {
      host.appendChild(btn);
      try { console.log("[vpnviewer] action button injected into host"); } catch(e){}
      return;
    }

    try { console.log("[vpnviewer] action bar not found yet (will retry)"); } catch(e){}
  };

  // общий запуск: добавляем обе кнопки и делаем ретраи
  function boot() {
    window.vpnviewerAddFloatingButton();
    window.vpnviewerAddActionButton();

    if (!window.__vpnviewerRetry) {
      var n = 0;
      window.__vpnviewerRetry = setInterval(function(){
        window.vpnviewerAddFloatingButton();
        window.vpnviewerAddActionButton();
        if (++n > 60) { clearInterval(window.__vpnviewerRetry); window.__vpnviewerRetry = null; }
      }, 250); // до ~15 секунд ждём, пока iframe/DOM стабилизируется
    }
  }

  api.onWebUIStartupEnd = function () {
    try { console.log("[vpnviewer] startup"); } catch(e){}
    // можно включить алерт для наглядности:
    // try { alert("vpnviewer v0.0.34"); } catch(e){}
    boot();
  };

  api.goPageEnd = function () { boot(); };
  api.onDeviceRefreshEnd = function () { boot(); };

  return api;
}

module.exports = vpnviewer;
module.exports.vpnviewer = vpnviewer;
