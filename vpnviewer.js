"use strict";
module.exports.vpnviewer = function (parent) {
  var obj = {};
  obj.parent = parent;
  obj.exports = ["onDesktopDisconnect"];
  obj.onDesktopDisconnect = function () {
    writeDeviceEvent(encodeURIComponent(currentNode._id));
    Q('d2devEvent').value = (new Date()).toLocaleString() + ': ';
    focusTextBox('d2devEvent');
  };
  return obj;
};
