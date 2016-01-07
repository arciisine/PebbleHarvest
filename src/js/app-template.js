var requirejs = (function() {
  var loaded = { require : function() {} };
  var registry = {};
  
  function register(name, deps, cb) {
    registry[name] = [deps, cb];
  }
  
  function resolve(name) {            
    if (!loaded[name]) {
      var set = registry[name];
      loaded[name] = {  };
      set[1].apply(this, set[0].map(function(x) {
        return x == 'exports' ? loaded[name] : resolve(x);
      }));
    }
    return loaded[name];
  }
  
  function imp(names, cb) {
    cb.apply(this, names.map(function(x) {
      return resolve(x);
    }));
  }
  
  return {
    require : imp,
    define : register
  };
  
})();

var require = requirejs.require;
var define = requirejs.define;

var module = { exports : {} };

"BODY";

require(['src/ts/app'], function(app) {});