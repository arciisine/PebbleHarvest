function BaseRest {
  this.memoize = [];
  this._memoizeCache = {};
}

BaseRest.prototype.exec = function(method, url, body) {
  var def = new Deferred();  
  var req = new XMLHttpRequest();
  
  req.open(method, url);
  req.setRequestHeader('Accept', 'application/json');
  if (body) {
    req.setRequestHeader('Content-Type', 'application/json');
  }
  req.onload = function(e) {
    if(req.status >= 200 && req.status < 400) {      
      def.resolve(JSON.parse(req.response));
    } else {
      def.reject("Request status is " + req.status);
    }
  }
  req.onerror = def.reject;
  
  body = body ? JSON.stringify(body) : null
  
  req.send(body);
}

BaseRest.prototype.get = function(url) {
  return this.exec('GET', url);
}

BaseRest.prototype.post = function(url, data) {
  return this.exec('POST', url, data);
}

BaseRest.prototype.listToMap = function(promise, keyProp) {
  var def = new Deferred();
  
  promise.then(function(data) {
      var out = {};
      data.forEach(function(x) {
        out[x[keyProp]] = x; 
      });    
      def.resolve(out);
    }, def.reject);
  
  return def.promise;
}

BaseRest.prototype.memoize = function(fn, name) {
   name = fn.name || 'Key' + Math.random();
   var self = this;
   
  return function() {
    var args = Array.prototype.slice.call(arguments, 0);
    var key = [name].concat(args).join('||');
    
    if (key in self._memoizeCache) {
      return new Deferred().resolve(self._memoizeCache[key]).promise;
    }
    
    return fn.apply(self, args)
      .then(function(data) {
        console.log("Caching", key, val);
        self._memoizeCache[key] = data;
      });
    }
  };
};