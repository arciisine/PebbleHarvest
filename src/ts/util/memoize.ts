import {Deferred} from './deferred';

//Memoize
export default (function() {
  let cache:{[key:string]:any} = {};
    
  return (ns?:string) => {
    ns = ns ? ns : `${new Date().getTime()}||${Math.random()}`
    
    return (target: Object, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) => {
      let fn = descriptor.value;
      
      descriptor.value = function() {
        let args = Array.prototype.slice.call(arguments, 0);
        let key = ns + '||' + args.join('||');
        
        if (key in cache) {
          return new Deferred().resolve(cache[key]).promise();
        }
        
        return fn.apply(this, args)
          .then(data => {
            console.log("Caching", key, data);
            cache[key] = data;
          });
      }
      
      return descriptor;
    };
  }
})();