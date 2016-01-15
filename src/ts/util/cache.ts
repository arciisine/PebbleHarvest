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
  _cache:{[key:string]:{[key:string]:Entry}} = {};
   
  getKey(ns:string, prefix:string, args:any):Key {
    return {
      ns : ns || DEFAULT_NAMESPACE,
      unique : prefix + " ==> " + Array.prototype.slice.call(args, 0).join('||')
    }
  }
  
  _getCacheKey(key:Key):string {
    return `_cache_${key.ns}__${key.unique}`;
  }

  resetNamespace(ns:string) {
    ns = ns || DEFAULT_NAMESPACE;
    this._cache[ns] = {};
  }
  
  get(key:Key):Entry {
    if (this._cache[key.ns] === undefined || this._cache[key.ns][key.unique] === undefined) {
      this._cache[key.ns] = {};
      this._cache[key.ns][key.unique] = JSON.parse(localStorage.getItem(this._getCacheKey(key) || 'null'));
    }
    
    let res = this._cache[key.ns][key.unique];
    
    if (res && res.duration && (new Date().getTime() - res.age) > res.duration) {
      this.delete(key);
      return;
    } else { 
      return res;
    }
  }
  set(key:Key, data:{}, duration:number) {
    Utils.log("Caching", key, data);
    this._cache[key.ns] = this._cache[key.ns] || {}; 
    this._cache[key.ns][key.unique] = {
      age : new Date().getTime(),
      duration: duration,
      data : data
    };
    localStorage.setItem(this._getCacheKey(key), JSON.stringify(this._cache[key.ns][key.unique]));
  }
  delete(key:Key) {
    if (this._cache[key.ns]) {
      localStorage.removeItem(this._getCacheKey(key));
      delete this._cache[key.ns][key.unique];
    }
  }
}

export default new Cache();