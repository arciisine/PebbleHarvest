export function message(key:number|string) {
  return (target: Object, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) => {
    descriptor.value.onMessage = key;
    return descriptor;
  };
}

export default class MessageHandler {
  _handlers:{[key:string] : Pebble.Handler} = {};
  appKey:string = null;
  actionKeyTranslator:(any) => string = null;
  
  constructor(appKey, actionKeyTranslator?:(any) => string) {
    this.appKey = appKey;
    this.actionKeyTranslator = actionKeyTranslator;
   
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
    let key:string|number = this.translateKey(data[this.appKey]);
    
    console.log(JSON.stringify(data));
    
    if (this._handlers[key]) {
      let ret = this._handlers[key].call(this, data);
      
      //Auto listen for errors if a promise is returned
      if (ret.then) {
        ret.then(null, this.onError);
      }
    } else {
      this.onError("Unknown action:" + key);
    }
  }

  onError(err) {
    console.log(err);
  }
  
  translateKey(key:number|string):string {
    if (this.actionKeyTranslator) {
      return this.actionKeyTranslator[key];
    } else {
      return '' + key;
    }
  }

  register(key:number|string, fn?:Pebble.Handler) {
    key = this.translateKey(key);
    console.log("Registering handler", key);
    this._handlers[key] = fn;
  }
}