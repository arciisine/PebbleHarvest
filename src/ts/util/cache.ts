import Utils from './utils';

interface Entry {
  age :number,
  duration: number,
  data : {[key:string]:any}
}

interface Key {
  ns: string,
  unique: string
}

let DEFAULT_NAMESPACE = '__default__';

class Cache {
  private _cache:{[key:string]:{[key:string]:Entry}} = {};
   
  getKey(ns:string, prefix:string, args:any):Key {
    return {
      ns : ns || DEFAULT_NAMESPACE,
      unique : prefix + " ==> " + Array.prototype.slice.call(args, 0).join('||')
    }
  }
  
  private getCacheKey(key:Key):string {
    return `_cache_${key.ns}__${key.unique}`;
  }

  resetNamespace(ns:string) {
    ns = ns || DEFAULT_NAMESPACE;
    this._cache[ns] = {};
  }
  
  get(key:Key):{[key:string]:any} {
    this._cache[key.ns] = this._cache[key.ns] || {};
    if (this._cache[key.ns][key.unique] === undefined) {
      let stored = JSON.parse(localStorage.getItem(this.getCacheKey(key) || 'null'));
      if (stored) {
        Utils.debug(`Received from cache ${JSON.stringify(stored)}`);    
      }      
      this._cache[key.ns][key.unique] = stored; 
    }
    
    let res = this._cache[key.ns][key.unique];
    
    if (res && res.duration && (new Date().getTime() - res.age) > res.duration) {
      this.delete(key);
      return;
    } else { 
      return res ? res.data : null;
    }
  }
  set(key:Key, data:{}, duration:number):void {
    Utils.debug(`Caching ${key.ns} ${key.unique} ${JSON.stringify(data)}`);
    this._cache[key.ns] = this._cache[key.ns] || {}; 
    let entry = this._cache[key.ns][key.unique] = {
      age : new Date().getTime(),
      duration: duration,
      data : data
    };
    localStorage.setItem(this.getCacheKey(key), JSON.stringify(entry));
  }
  delete(key:Key):void {
    if (this._cache[key.ns]) {
      localStorage.removeItem(this.getCacheKey(key));
      delete this._cache[key.ns][key.unique];
    }
  }
}

export default new Cache();