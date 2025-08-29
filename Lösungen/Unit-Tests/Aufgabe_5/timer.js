function delayedLog(callback) {
  setTimeout(() => {
    callback("Timer Callback wurde nach 3000s aufgerufen");
  }, 3000);
}

module.exports.delayedLog = delayedLog;