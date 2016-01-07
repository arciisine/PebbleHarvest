function MessageHandler(key) {
  this._handlers = {};
  this._messageKey = key;
  
  // Listen for when an AppMessage is received
  Pebble.addEventListener('appmessage', this.onMessage.bind(this));
}

MessageHandler.prototype.onMessage = function(e) {
  var data = e.payload;
  var key = data[this._messageKey];
  
  console.log(JSON.stringify(data));
  
  if (this._handlers[key]) {
    this._handlers[key](data, err);
  } else {
    this.onError("Unknown action:" + key);
  }
}

MessageHandler.prototype.onError = function(err) {
  console.log(e);
}

MessageHandler.prototype.register = function(key, fn) {
  if (typeof key === 'object') {
    for (var k in key) {
      this.register(k, key[k]);
    } 
  } else {
    this._handlers[key] = fn;
  }  
}