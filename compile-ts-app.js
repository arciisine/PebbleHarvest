let child_process = require('child_process');
let fs = require('fs');

function register(window) {
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
}

function init(req) {
  req(['app'], function(app) { new app.default(); });;
}

//Compile
child_process.execSync('./node_modules/.bin/tsc -p . --outFile ./tmp/out.js');

//Read
let source = fs.readFileSync('./tmp/out.js');
fs.unlinkSync('./tmp/out.js');

try { fs.mkdirSync('src/js'); } catch(e) {}

//Final
fs.writeFileSync('src/js/pebble-js-app.js', 
`register(window); 
${source}; 
init(window.require); 
${[init, register].map(x=>x.toString()).join(';\n')}`);