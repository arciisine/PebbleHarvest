import {Deferred} from './deferred';
import Cache from './cache';

//Memoize
export default (function() {
  
  return (duration:number, ns?:string) => {
    return (target: Object, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) => {
      let fn = descriptor.value;
      
      descriptor.value = function() {
        console.log(fn.name);
        let key = Cache.getKey(ns as string, fn.name, arguments);
        
        let entry = Cache.get(key);
        if (entry) {
          return new Deferred().resolve(entry.data).promise();
        }
        
        let res = fn.apply(this, Array.prototype.slice.call(arguments, 0));
        let set = data => Cache.set(key, data, duration)
        res.then ? res.then(set) : set(res);
        return res;
      }
      
      return descriptor;
    };
  }
})();