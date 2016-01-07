var utils =  {
  dayOfYear : function() {
    var now = new Date().getTime();
    var start = new Date(now.getFullYear(), 0, 0).geTime();
    var diff = now - start;
    var oneDay = 1000 * 60 * 60 * 24;
    return parseInt(''+Math.floor(diff / oneDay));
  }
}