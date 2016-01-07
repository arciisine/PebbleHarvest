function OptionService(url, ns) {
  this._data = {};
  this._ns = ns;
  this._url = url;
  
  Pebble.addEventListener('ready', this.init.bind(this));  
}

OptionService.prototype.init = function() {
  var self = this;  
  
  Pebble.addEventListener('showConfiguration', function(e) {
    Pebble.openURL(this._url)
  });

  Pebble.addEventListener('webviewclosed', function(e) {
    this.putAll(JSON.parse(decodeURIComponent(e.response || '{}')));
  });
  
  this.read();
}

OptionService.prototype.read = function() {
  this._data = JSON.parse(localStorage.getItem(this._ns + "_data") || '{}');
}

OptionService.prototype.save = function() {
  localStorage.setItem(this._ns + "_data", JSON.stringify(this._data));
}

OptionService.prototype.get = function(key) {
  return this._data[key];
}

OptionService.prototype.set = function(key, val) {
  this._data[key] = val;
  this.save();
}

OptionService.prototype.getAll = function() {
  return this._data;
}

OptionService.prototype.putAll = function(obj) {
  for (var k in obj) {
    this._data[k] = obj[k];
  }
  this.save();
}