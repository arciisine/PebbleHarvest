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
    Pebble.addEventListener('showConfiguration', (e) => Pebble.openURL(this._url + '#'+encodeURIComponent(JSON.stringify(this._data))));
    Pebble.addEventListener('webviewclosed', (e) => {
      this.putAll(JSON.parse(decodeURIComponent(e.response || '{}')));
      this.onUpdate();
    });
    this.read();
    
    this.postInit();
    
    return this._data;
  }
  
  onUpdate():void {
    
  }
  
  postInit():void {
    
  }

  read():{} {
    this._data = JSON.parse(localStorage.getItem(this._ns + "_data") || '{}');
    console.log(JSON.stringify(this._data));
    return this._data;
  }

  save():void {
    console.log(`Saving:  ${JSON.stringify(this._data)}`);
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