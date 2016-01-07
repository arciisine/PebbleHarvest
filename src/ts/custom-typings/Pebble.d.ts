declare module Pebble {
  var addEventListener:(key:string, callback:((any?) => void)) => void;
  var sendAppMessage:(message:{}, success:((any?) => void), failure:((any?) => void)) => void;
  var openURL:(url:string) => void;
  
  type MessagePayload = {[key:string]:string|number};
  type Message = { payload : MessagePayload }; 
  type Handler = (MessagePayload, err:(any)=>void) => void;
}