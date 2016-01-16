export default class Utils  {
  private static DAY_IN_MS:number = 1000*60*60*24;
  
  static dayOfYear(d:Date):number {
    var start = new Date(d.getFullYear(), 0, 0).getTime();
    var diff = d.getTime() - start;
    return parseInt(''+Math.floor(diff / Utils.DAY_IN_MS));
  }
  
  static mostRecentBusinessDays(count:number = 3, offset:number = 0):Date[] {
    let dates = [];
    let now = new Date();
    while (dates.length < count) {
      if (now.getDay() > 0 && now.getDay() < 7) {
        if (offset > 0) {
          offset--;
        } else {
          dates.push(now);
        }
      }
      now = new Date(now.getTime() - Utils.DAY_IN_MS);
    }
    return dates;
  }
  
  static buildMap(...all):any {
    let out = {};
    for (let i = 0; i < all.length; i+=2) {
      out[all[i]] = all[i+1]
    }
    return out;
  }
  static log(...all):void {
    console.log(all.map(x => `${x}`).join(' '))
  }
  static debug(...all):void {
    console.debug('DEBUG: ' + all.map(x => `${x}`).join(' '))
  }
  static error(...all):void {
    console.error('ERROR: ' + all.map(x => `${x}`).join(' '))
  }
  static toURL(o) {
    let out = [];
    for (var k in o) {
      out.push([`${encodeURIComponent(k)}=${encodeURIComponent(o[k])}`])
    }
    return out.join('&');
  }
  static hash(data:string):string {
    let hash:number = 0, len = data.length;
    if (len) {
      for (let i = 0; i < len; i++) {
        hash = ((hash<<5)-hash)+data.charCodeAt(i);
        hash = hash & hash;
      }
    }
    return `${hash}`;
  }
}