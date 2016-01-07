function MessageQueue() {
  this.clear();
  
  var self = this;
  ['_iterateSuccess' ,'_iterateFailure', 'push'].forEach(function(key) {
    self[key] = self[key].bind(this);
  });
}

MessageQueue.prototype._iterateSuccess = function() {
  this._queue.shift();
  this._iterate();
}

MessageQueue.prototype._iterateFailure = function(e) {
  console.log("Error", e);
  this._iterate();
}

MessageQueue.prototype._iterate = function() {
  if (!this._queue.length) {
    this._active = false;
    return;
  }
    
  var out = this._queue[0];    
  console.log("Dequeued", out.Action, JSON.stringify(out));
  Pebble.sendAppMessage(out, this._iterateSuccess, this._iterateFailure);;
}

MessageQueue.prototype.push = function(data) {
  //Add all
  console.log("Queued", data.Action, JSON.stringify(data));
  var len = arguments.length;
  for (var i = 0; i < len; i++) {
    var o = arguments[i];
    if (!Array.isArray(o)) {
      queue.push(o);
    } else {
      queue = queue.concat(o);
    }        
  }
  
  if (!active) {
    active = true;
    iterate();
  }
}

MessageQueue.prototype.pusher = function(fn) {
  var self = this;
  return function(data) {
    data = data ? (Array.isArray(data) ? data : [data]) : [];
    self.push(data.map(fn));
  };
}

MessageQueue.prototype.clear = function() {
  this._queue = [];
  this._active = false;
}