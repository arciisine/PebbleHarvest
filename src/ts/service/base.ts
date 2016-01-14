import {Deferred, Promise} from '../util/deferred';
import Utils from '../util/utils'

export default class BaseRest {
  
  json(method:string, url:string, body?:any):Promise<{}> {
    return this.exec('application/json',  JSON.stringify, 'application/json', JSON.parse, method, url, body);
  }
  
  exec(reqType:string, reqHandler:(any)=>string, resType:string, resHandler:(string)=>{}, method:string, url:string, body?:any):Promise<{}> {
    let def = new Deferred();  
    let req = new XMLHttpRequest();
    
    req.open(method, url);
    if (resType) {
      req.setRequestHeader('Accept', resType);
    }
    if (body && reqType) {
      req.setRequestHeader('Content-Type', reqType);
    }
    req.onload = function(e) {
      if(req.status >= 200 && req.status < 400) {
        let res = resHandler(req.response);
        def.resolve(res);
      } else {
        Utils.log(req.status);
        def.reject("Request status is " + req.status);
      }
    }
    req.onerror = def.reject;
    
    body = body ? reqHandler(body) : null
    
    Utils.log(`curl -X ${method} '${url}' ${body ? `-d '${body}'` : ''}`)
    
    req.send(body);
    
    return def.promise();
  }
  
  get(url:string):Promise<{}> {
    return this.json('GET', url);
  }
  
  post(url:string, data?:any):Promise<{}> {
    return this.json('POST', url, data);
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