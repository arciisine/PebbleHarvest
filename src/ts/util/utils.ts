export default class Utils  {
  dayOfYear():number {
    var now = new Date();
    var start = new Date(now.getFullYear(), 0, 0).getTime();
    var diff = now.getTime() - start;
    var oneDay = 1000 * 60 * 60 * 24;
    return parseInt(''+Math.floor(diff / oneDay));
  }
}