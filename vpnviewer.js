module.exports = function (parent) {
  const obj = {};
  obj.parent = parent;
  obj.exports = ['registerPluginTab', 'onWebUIStartupEnd'];

  obj.registerPluginTab = function () {
    console.log('[vpnviewer] registerPluginTab');
    return { tabId: 'vpnviewer', tabTitle: 'VPN .network' };
  };

  obj.onWebUIStartupEnd = function () {
    console.log('[vpnviewer] UI loaded');
    // Просто добавим кнопку в верхнее меню (без панели)
    const consoleBtn = document.querySelector('a[href*="console"]');
    if (consoleBtn) {
      const btn = document.createElement('a');
      btn.href = 'javascript:void(0)';
      btn.textContent = 'VPN .network';
      btn.style.marginLeft = '8px';
      btn.onclick = () => alert('Кнопка работает!');
      consoleBtn.parentNode.insertBefore(btn, consoleBtn.nextSibling);
      console.log('[vpnviewer] Кнопка добавлена');
    } else {
      console.warn('[vpnviewer] Кнопка "Консоль" не найдена!');
    }
  };

  return obj;
};