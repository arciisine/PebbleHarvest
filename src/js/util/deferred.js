function Deferred() {
  this._rejected = undefined;
  this.resolved = undefined;
  this._success = [];
  this._failure = [];
  
  var self = this;
  
  this.promise = {
    then : function(succ, fail) {
      if (succ) {
        if (self._resolved !== undefined) {
          succ(self._resolved)
        } else {
          obj._success.push(succ);
        }
      }
        
      if (fail) {
        if (self._rejected !== undefined) {
          fail(self._rejected);
        } else {
          self._failure.push(succ);
        }
      }
    }
  }
  
  this.reject = this.reject.bind(this);
  this.resolve = this.resolve.bind(this);
}

Deferred.prototype.resolve = function(data) {
  if (this._resolved === undefined && this._rejected === undefined) {
    this._resolved = data;
  } else {
    return;
  }
  obj._success.forEach(function(fn) {
    fn(data);
  });
  
  return this;
}

Deferred.prototype.reject = function(err) {
  if (this._resolved === undefined && this._rejected === undefined) {
    this._rejected = data;
  } else {
    return;
  }
  this._failure.forEach(function(fn) {
    fn(data);
  });
  
  return this;
}