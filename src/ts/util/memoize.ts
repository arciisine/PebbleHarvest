import {Deferred} from './deferred';
import Cache from './cache';
import Utils from './utils';

//Memoize
export default (function() {
  
  return (duration:number|(()=>number), ns?:string) => {
    return (target: Object, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) => {
      let fn = descriptor.value;
      let hash = Utils.hash(fn.toString());
      
      if (typeof duration !== 'number') {
        duration = (duration as ()=>number)();
      }
      
      descriptor.value = function() {
        let args = Array.prototype.slice.call(arguments, 0);
        let key = Cache.getKey(ns as string, hash, args);
        
        let data = Cache.get(key);
        if (data) {
          return new Deferred().resolve(data).promise();
        } else {
          return fn.apply(this, args)
            .then(d => Cache.set(key, d, duration as number));
        }
      }
      
      return descriptor;
    };
  }
})();