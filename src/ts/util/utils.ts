export default class Utils  {
  static dayOfYear():number {
    var now = new Date();
    var start = new Date(now.getFullYear(), 0, 0).getTime();
    var diff = now.getTime() - start;
    var oneDay = 1000 * 60 * 60 * 24;
    return parseInt(''+Math.floor(diff / oneDay));
  }
  static buildMap(...all):any {
    let out = {};
    for (let i = 0; i < all.length; i+=2) {
      out[all[i]] = all[i+1]
    }
    return out;
  }
}