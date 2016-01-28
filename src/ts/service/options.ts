import Utils from '../util/utils';

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
    Pebble.addEventListener('showConfiguration', (e) => {
      Utils.debug("Loading config: ", JSON.stringify(this._data));
      Pebble.openURL(this._url + '#'+encodeURIComponent(JSON.stringify(this._data)))
    });
    Pebble.addEventListener('webviewclosed', (e) => {
      this._data = {};
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
    var toParse = localStorage.getItem(this._ns + "_data") || '{}';
    Utils.debug(`Parsing: |${toParse}|`)
    this._data = JSON.parse(toParse);
    Utils.debug(JSON.stringify(this._data));
    return this._data;
  }

  save():void {
    Utils.debug(`Saving:  ${JSON.stringify(this._data)}`);
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