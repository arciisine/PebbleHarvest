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
//GENERATED, please run \`npm run-script gen-message-format\` to update
#pragma once
typedef enum {
  ${entries(actionKeys).map(x => `Action${x[0]} = ${x[1]}`).join(',\n')} 
} Action;

typedef enum {
  ${entries(appKeys).map(x => `AppKey${x[0]} = ${x[1]}`).join(',\n')} 
} AppKey;

const char* ActionNames[] = { ${toArray(appKeys).map(x => !x ? 'NULL' : `"${x}"`).join(',\n')}};

`);

fs.writeFileSync('src/ts/message-format.ts', `
//GENERATED, please run \`npm run-script gen-message-format\` to update
export enum Action {
  ${entries(actionKeys).map(x => `${x[0]} = ${x[1]}`).join(',\n')}
}

export let ActionNames:string[] = [${toArray(appKeys).map(x => !x ? 'null' : `"${x}"`).join(',\n')}];

export let AppKey = {
  ${entries(appKeys).map(x => `${x[0]} : "${x[0]}"`).join(',\n')} 
};
`);