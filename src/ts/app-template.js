(function setupRegister() {
  var loaded = { require : function() {} };
  var registry = { require : [] };
  
  function register(name, deps, cb) {
    registry[name] = [deps, cb];
  }
  
  function resolve(name) {
    if (!registry[name]) {
      console.log("Module is not defined: "+ name);
      throw new Error("Module is not defined: "+ name);
    }       
    if (!loaded[name]) {
      var set = registry[name];
      loaded[name] = {  };
      console.log("Resolving: "+name +" "+JSON.stringify(set[0]));
      set[1].apply(this, set[0].map(function(x) {
        return x == 'exports' ? loaded[name] : resolve(x);
      }));
    }
    return loaded[name];
  }
  
  function imp(names, cb) {
    console.log("Importing: "+JSON.stringify(names));
    cb.apply(this, names.map(function(x) {
      return resolve(x);
    }));
  }
  
  window.require = imp
  window.define = register;
  window.module = { exports : {} };
})()

"BODY"; 

require(['app'], function(app) {
  new app.default();
});