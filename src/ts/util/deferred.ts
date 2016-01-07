export interface Promise<T> {
  then(succ:(T)=>void, fail?:(any?)=>void):Promise<T>
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
      }
    }
    
    return prom;
  }
  
  resolve(data:T):Deferred<T> {
    if (this._resolved === undefined && this._rejected === undefined) {
      this._resolved = data;
    } else {
      return;
    }
    this._success.forEach(function(fn) {
      fn(data);
    });
    
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