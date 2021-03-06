import Utils from '../util/utils';

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
    Utils.error(`Error ${e}`);
    this._iterate();
  }

  _iterate():void {
    if (!this._queue.length) {
      this._active = false;
      return;
    }
    
    let out = this._queue[0];    
    Utils.debug(`Dequeued ${JSON.stringify(out)}`);
    Pebble.sendAppMessage(out, this._iterateSuccess, this._iterateFailure);
  }
  
  pushMap(...args):void {
    this.push(Utils.buildMap.apply(null, args));
  }
  
  push(data:Pebble.MessagePayload|Pebble.MessagePayload[]):void {
    //Add all
    if (!Array.isArray(data)) {
      this._queue.push(data);      
    } else {
        this._queue = this._queue.concat(data);
    }
    
    Utils.debug(`Queued  ${JSON.stringify(data)}`);
    
    if (!this._active) {
      this._active = true;
      this._iterate();
    }
  }

  clear():void {
    this._queue = [];
    this._active = false;
  }
}