export default class OptionService {
  _data:{[key:string]:any} = {};
  _ns:string;
  _url:string;
  
  constructor(url:string, ns?:string) {
    this._ns = ns;
    this._url = url;
    Pebble.addEventListener('ready', () => this.init());  
  }
  
  init():{} {
    var self = this;  
    Pebble.addEventListener('showConfiguration', (e) => Pebble.openURL(this._url));
    Pebble.addEventListener('webviewclosed', (e) => this.putAll(JSON.parse(decodeURIComponent(e.response || '{}'))));
    return this.read();
  }

  read():{} {
    this._data = JSON.parse(localStorage.getItem(this._ns + "_data") || '{}');
    return this._data;
  }

  save():void {
    localStorage.setItem(this._ns + "_data", JSON.stringify(this._data));
  }

  get(key:string):any {
    return this._data[key];
  }

  set(key:string, val:any):void {
    this._data[key] = val;
    this.save();
  }

  getAll():{} {
    return this._data;
  }

  putAll(obj:{}):void {
    for (var k in obj) {
      this._data[k] = obj[k];
    }
    this.save();
  }
}