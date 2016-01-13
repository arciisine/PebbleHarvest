import {Deferred, Promise} from '../util/deferred';

export default class BaseRest {
  
  exec(method:string, url:string, body?:string):Promise<{}> {
    let def = new Deferred();  
    let req = new XMLHttpRequest();
    
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
    
    console.log(`Rest call: ${method} ${url} ${body || ''}`)
    
    req.send(body);
    
    return def.promise();
  }
  
  get(url:string):Promise<{}> {
    return this.exec('GET', url);
  }
  
  post(url:string, data?:any):Promise<{}> {
    return this.exec('POST', url, data);
  }
  
  listToMap<T>(promise:Promise<T[]>, keyProp:string):Promise<{[key:string]:T}> {
    let def = new Deferred<{[key:string]:T}>();
    
    promise.then(data => {
        let out:{[key:string]:T} = {};
        data.forEach(x => out[x[keyProp]] = x);
        def.resolve(out);
      }, def.reject);
    
    return def.promise();
  }
}