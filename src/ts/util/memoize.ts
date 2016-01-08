import {Deferred} from './deferred';

//Memoize
export default (function() {
  let cache:{[key:string]:any} = {};
  let cacheProperties:{[key:string]:{age:number}} = {};
    
  return (ns?:string|number, duration?:number) => {
    if (typeof ns === 'number') {
      duration = ns as number;
      ns = null;
    }
    ns = ns ? ns : `${new Date().getTime()}||${Math.random()}`
    
    return (target: Object, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) => {
      let fn = descriptor.value;
      
      descriptor.value = function() {
        let args = Array.prototype.slice.call(arguments, 0);
        let key = ns + '||' + args.join('||');
        
        let props = cacheProperties[key];
        
        if (props && (!duration || (new Date().getTime() - props.age) < duration)) {
          return new Deferred().resolve(cache[key]).promise();
        } else {
          delete cache[key], cacheProperties[key];
        }
        
        return fn.apply(this, args)
          .then(data => {
            console.log("Caching", key, data);
            cache[key] = data;
            cacheProperties[key] = {
              age : new Date().getTime()
            }
          });
      }
      
      return descriptor;
    };
  }
})();