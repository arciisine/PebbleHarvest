export function message(key:string) {
  return (target: Object, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) => {
    descriptor.value.onMessage = key;
    return descriptor;
  };
}

export default class MessageHandler {
  constructor(key) {
    this._messageKey = key;
   
   for (let k in this) {
      if (this[k].onMessage) {
        this.register(this[k].onMessage, this[k]);
      }
    }
    
    // Listen for when an AppMessage is received
    Pebble.addEventListener('appmessage', this.onMessage.bind(this));   
  }

  _handlers:{[key:string] : Pebble.Handler} = {};
  _messageKey:string = null;
    
  onMessage(e:Pebble.Message):void {
    let data = e.payload;
    let key = data[this._messageKey];
    
    console.log(JSON.stringify(data));
    
    if (this._handlers[key]) {
      this._handlers[key].call(this, data, this.onError.bind(this));
    } else {
      this.onError("Unknown action:" + key);
    }
  }

  onError(err) {
    console.log(err);
  }

  register(key:string, fn?:Pebble.Handler) {
    console.log("Registering handler", key);
    this._handlers[key] = fn;
  }
}