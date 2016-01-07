let fs = require('fs');
let config = JSON.parse(fs.readFileSync('./appinfo.json', "utf8"));

let actionKeys = config['actionKeys'];
let appKeys = config['appKeys'];

function entries(o) {
  if (Array.isArray(o)) {
    return o.map((x,i) => [x,i]);    
  } else {
    let out = [];
    for (let k in o) {
      out.push([k, o[k]])
    }
    return out;
  }
}

function toArray(o) {
  let arr = [];
  entries(actionKeys).forEach(function(p) { arr[p[1]] = p[0]; })
  return arr;
}

fs.writeFileSync('src/message_format.h', `
enum {
  ${entries(actionKeys).map(x => `Action${x[0]} = ${x[1]}`).join(',\n')} 
} Action;

enum {
  ${entries(appKeys).map(x => `AppKey${x[0]} = ${x[1]}`).join(',\n')} 
} AppKey;

char** ActionNames = { ${toArray(appKeys).map(x => !x ? 'NULL' : `"${x}"`).join(',\n')}};

`);

fs.writeFileSync('src/ts/message-format.ts', `
  export enum Action {
    ${entries(actionKeys).map(x => `${x[0]} = ${x[1]}`).join(',\n')}
  }
  
  export enum AppKey {
    ${entries(appKeys).map(x => `${x[0]} = ${x[1]}`).join(',\n')} 
  } AppKey;
`);