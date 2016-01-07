type MessagePayload = {[key:string]:string|number};
type Message = { payload : MessagePayload }; 
type Handler = (MessagePayload) => void;

export default class MessageHandler {
  constructor(key) {
    
    this._messageKey = key;
    
    // Listen for when an AppMessage is received
    Pebble.addEventListener('appmessage', this.onMessage.bind(this));
  }

  _handlers:{[key:string] : (MessagePayload) => any} = {};
  _messageKey:string = null;
  
  onMessage(e:Message):void {
    let data = e.payload;
    let key = data[this._messageKey];
    
    console.log(JSON.stringify(data));
    
    if (this._handlers[key]) {
      this._handlers[key](data);
    } else {
      this.onError("Unknown action:" + key);
    }
  }

  onError(err) {
    console.log(err);
  }

  register(key:string|{[key:string]:Handler}, fn?:Handler) {
    if (typeof key === 'string') {
        this._handlers[key] = fn;
    } else {
      for (var k in key) {
        this.register(k, key[k]);
      } 
    }  
  }
}