import Utils from './utils';

export interface Promise<T> {
  then(succ:(T)=>void, fail?:(any?)=>void):Promise<T>
  always(fn:(any?)=>void)
}

export class Deferred<T> {
  
  _failure:Array<(any)=>void> = []
  _success:Array<(T)=>void> = []
  _resolved:T = undefined;
  _rejected:any = undefined;
  
  constructor() {
    this.resolve = this.resolve.bind(this);
    this.reject = this.reject.bind(this);
  }
  
  promise():Promise<T> {
    let prom = {
      then : (succ:(T)=>void, fail?:(any)=>void):Promise<T> =>{
        if (succ) {
          if (this._resolved !== undefined) {
            succ(this._resolved)
          } else {
            this._success.push(succ);
          }
        }
          
        if (fail) {
          if (this._rejected !== undefined) {
            fail(this._rejected);
          } else {
            this._failure.push(fail);
          }
        }
        return prom;
      },
      always : (fn:(any?)=>void) => {
        return prom.then(fn, fn);
      }
    }
    
    return prom;
  }
  
  resolve(data:T):Deferred<T> {
    Utils.debug(`Resolving deferred: ${JSON.stringify(data)}`)
    if (this._resolved === undefined && this._rejected === undefined) {
      this._resolved = data;
    } else {
      return;
    }
    this._success.forEach(fn => fn(data));
    
    return this;
  }
  
  reject(err:any):Deferred<T> {
    if (this._resolved === undefined && this._rejected === undefined) {
      this._rejected = err;
    } else {
      return;
    }
    this._failure.forEach(fn => fn(err));
    return this;
  } 
}