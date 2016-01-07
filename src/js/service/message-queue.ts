export default class MessageQueue {
  constructor() {
    ['_iterateSuccess' ,'_iterateFailure', 'push'].forEach(key => { this[key] = this[key].bind(this); })
  }
 
 _queue:Array<Pebble.MessagePayload> = [];
 _active:boolean = false;
 
  _iterateSuccess():void {
    this._queue.shift();
    this._iterate();
  }

  _iterateFailure(e:any):void {
    console.log("Error", e);
    this._iterate();
  }

  _iterate():void {
    if (!this._queue.length) {
      this._active = false;
      return;
    }
    
    let out = this._queue[0];    
    console.log("Dequeued", out['Action'], JSON.stringify(out));
    Pebble.sendAppMessage(out, this._iterateSuccess, this._iterateFailure);
  }
  
  push(data:Pebble.MessagePayload|Pebble.MessagePayload[]):void {
    //Add all
    if (!Array.isArray(data)) {
      this._queue.push(data);      
    } else {
        this._queue = this._queue.concat(data);
    }
    
    console.log("Queued", data['Action'], JSON.stringify(data));
    
    if (!this._active) {
      this._active = true;
      this._iterate();
    }
  }
  
  pusher(fn:(any)=>Pebble.MessagePayload):(any)=>void {
    return (data:any|any[]) => {
      let arr:any[] = Array.isArray(data) ? data : [data];
      this.push(arr.map(fn));
    };
  }
  
  clear():void {
    this._queue = [];
    this._active = false;
  }
}