export default class Utils  {
  private static DAY_IN_MS:number = 1000*60*60*24;
  
  static dayOfYear(d:Date):number {
    var start = new Date(d.getFullYear(), 0, 0).getTime();
    var diff = d.getTime() - start;
    return parseInt(''+Math.floor(diff / Utils.DAY_IN_MS));
  }
  
  static mostRecentBusinessDays(count:number = 3):Date[] {
    let dates = [];
    let now = new Date();
    while (dates.length < count) {
      if (now.getDay() > 0 && now.getDay() < 7) {
        dates.push(now);
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
}