import Utils from '../util/utils'

export function message(key:number|string) {
  return (target: Object, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) => {
    descriptor.value.onMessage = key;
    return descriptor;
  };
}

export default class MessageHandler {
  _handlers:{[key:string] : Pebble.Handler} = {};
  actionProperty:string = null;
  actionIdLookup:(any) => string = null;
  
  constructor(actionProperty:number|string, actionIdLookup?:(any) => string) {
    this.actionProperty = `${actionProperty}`;
    this.actionIdLookup = actionIdLookup;
   
    //Auto register
    for (let k in this) {
      if (this[k].onMessage !== undefined) {
        this.register(this[k].onMessage, this[k]);
      }
    }
    
    //Bind error to this context
    this.onError =this.onError.bind(this);
    
    // Listen for when an AppMessage is received
    Pebble.addEventListener('appmessage', this.onMessage.bind(this));   
  }
      
  onMessage(e:Pebble.Message):void {
    let data = e.payload;
    let key:string|number = this.translateKey(data[this.actionProperty]);
    
    Utils.log(`Received: ${key}: ${JSON.stringify(data)}`);
    
    if (this._handlers[key]) {
      let ret = this._handlers[key].call(this, data);
      
      //Auto listen for errors if a promise is returned
      if (ret.then) {
        ret.then(null, this.onError);
      }
    } else {
      this.onError(`Unknown action: ${key}`);
    }
  }

  onError(err) {
    console.log(err);
  }
  
  translateKey(key:number|string):string {
    if (this.actionIdLookup) {
      return this.actionIdLookup(key);
    } else {
      return '' + key;
    }
  }

  register(key:number|string, fn?:Pebble.Handler) {
    key = this.translateKey(key);
    Utils.log("Registering handler", key);
    this._handlers[key] = fn;
  }
}