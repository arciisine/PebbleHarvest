import {Deferred, Promise} from '../util/deferred';
import memoize from '../util/memoize';
import Utils from '../util/utils';

import TimerModel from '../model/timer';
import TaskModel from '../model/task';
import ProjectModel from '../model/project';

import BaseService from './base';  
import OptionService from './options';

let HOUR = 3600000
let DAY = 3600000

interface Recent {
  used:{[key:string]:{[key:string]:boolean}},
  assigned:{[key:string]:boolean}
}

class Accumulator {
  all: {} = {};
  flattened:TimerModel[] = [];
  
  merge(assignments:{day_entries:[any]}, today:boolean = false):TimerModel[] {           
    //Flatten Entries
    assignments.day_entries.forEach(x => {
      x.updated_at = Date.parse(x.updated_at) + (!!x.timer_started_at ? 3600 * 60 : 0);
                
      let key = `${x.project_id}||${x.task_id}`;
      if (!this.all[key]) { //Create 
        let out = new TimerModel();
        out.active = !today ? false : x.timer_started_at !== undefined;
        out.projectId = parseInt(x.project_id);
        out.projectTitle = x.project;
        out.taskId = parseInt(x.task_id);
        out.taskTitle = x.task;
        out.id = !today ? 0 : x.id;
        out.updated_at = x.updated_at; 
        out.hours = !today ? 0 : parseFloat(x.hours);
        this.all[key] = out;        
        this.flattened.push(out);
      } else if (today) {//Merge
        let out = this.all[key];
        out.hours += parseFloat(x.hours);
        
        if (!out.active && x.updated_at > out.updated_at) {
          out.id = x.id;            
          out.active = x.timer_started_at !== undefined;
          out.updated_at = x.updated_at;
        }
      }
    });
    return this.flattened;
  }    
}

let toURL = (o) => {
  let out = [];
  for (var k in o) {
    out.push([`${encodeURIComponent(k)}=${encodeURIComponent(o[k])}`])
  }
  return out.join('&');
};

export default class HarvestService extends BaseService {
  constructor(options:OptionService) {
    super();
    this.options = options;
  }
  
  options:OptionService;  
  baseUrl:string = 'https://api.harvestapp.com';
  
  json(method:string, path:string, body?:any):Promise<any> {
    let url = `${this.baseUrl}${path}?access_token=${this.options.get('oauth.access_token')}`;
    return super.json(method, url, body);
  }
  
  whoami():Promise<any> {
    return this.get('/account/who_am_i');
  }
  
  onTokenResponse(data):any {
    console.log(`Received Token: ${JSON.stringify(data)}`)
    this.options.set('oauth.access_token', data.access_token)
    this.options.set('oauth.refresh_token', data.refresh_token),
    this.options.set('oauth.expires_in', data.expires_in)
    this.options.save();
  }
  
  validateCode():Promise<any> {
    return this.exec('application/x-www-form-urlencoded', toURL, 'application/json', JSON.parse, 'POST', `${this.baseUrl}/oauth2/token`, {
      code : this.options.get("oauth.code"),
      client_id : this.options.get("harvest.client_id"),
      client_secret : this.options.get("harvest.client_secret"),
      redirect_uri : this.options.get("harvest.redirect_uri"),
      grant_type : "authorization_code"
    })
      .then((data) => this.onTokenResponse(data), (e) => {
        console.log(`Failure: ${e}`)
      });
  }
  
  refreshToken():Promise<any> {
    return this.exec('application/x-www-form-urlencoded', toURL, 'application/json', JSON.parse, 'POST', `${this.baseUrl}/oauth2/token`, {
      refresh_token : this.options.get("oauth.refresh_token"),
      client_id : this.options.get("harvest.client_id"),
      client_secret : this.options.get("harvest.client_secret")
    })
      .then((data) => this.onTokenResponse(data));    
  }
  
  authorize():Promise<any> {
    let def = new Deferred();
    if (!this.options.get("oauth.code")) {
      def.reject("Not logged in");
    } else {
      //Try to use exsting token
      this.whoami().then(def.resolve,
        () => {
          //Try to refresh token 
          this.refreshToken().then(def.resolve, def.reject) 
        }
      );
    }
    return def.promise();
  }
  
  getTimers():Promise<TimerModel[]> {
    let def = new Deferred<TimerModel[]>();
    
    let dates = Utils.mostRecentBusinessDays(2);
    let acc = new Accumulator()
    let count = 0;

    dates.map((x,i) => {
      this.get(`/daily/${Utils.dayOfYear(x)}/${x.getFullYear()}`)
        .then(asn => { acc.merge(asn, i === 0); }, def.reject)
        .always(() => {
          if (++count === dates.length) {
            def.resolve(acc.flattened.sort((a,b) => b.updated_at - a.updated_at));
          }
        });
      ;  
    });
 
    return def.promise();
  }
  
  getTimer(id:number):Promise<TimerModel> {
    let def = new Deferred<TimerModel>();
    this.getTimers().then(timers => {
      for (let i = 0; i < timers.length;i++) {
        if (timers[i].id === id) {
          def.resolve(timers[i]);
        }
      }
      def.reject(`Cannot find timer with id: ${id}`);
    }, def.reject);
    return def.promise();
  }
  
  @memoize(HOUR)
  getRecentProjectTaskMap():Promise<Recent> {
    let def = new Deferred<Recent>();
      
    let dates = Utils.mostRecentBusinessDays(4);
    let count = 0;
    
    let add = (projectid, taskid) => {
      if (!recent.used[projectid]) recent.used[projectid] = {};
      recent.used[projectid][taskid] = true;
    }
    
    let recent:Recent = {
      used : {},
      assigned : {}
    };
    
    dates.forEach(x => {
      this.get(`/daily/${Utils.dayOfYear(x)}/${x.getFullYear()}`)
        .then(asn => {                   
          asn.day_entries.forEach(x => add(x.project_id, x.task_id));
          asn.projects.forEach(p => recent.assigned[p.id] = true)          
        }, def.reject)
        .always(() => {
          if (++count === dates.length) {
            def.resolve(recent);
          }
        });      
    });
    
    return def.promise();
  }
  
  createTimer(projectId:number, taskId:number):Promise<TimerModel> {
    let def = new Deferred<TimerModel>();
    let data = {
      "project_id" : projectId,
      "task_id" : taskId
    };
    this.post('/daily/add', data).then(timer => {
      let model = new TimerModel();
      model.id = timer.id;
      def.resolve(model);
    }, def.reject);
    return def.promise();
  }
  
  toggleTimer(entryId:number):Promise<any> {  
    return this.post(`/daily/timer/${entryId}`);
  }
  
  @memoize(DAY)
  getTasks():Promise<TaskModel[]> {
    let def = new Deferred<TaskModel[]>();
    
    this.get('/tasks').then((tasks:any[]) => {
      let models = tasks
        .filter(x => !x.task.deactivated)
        .map(x => {
          let out = new TaskModel();
          out.id = x.task.id;
          out.name = x.task.name;
          out.is_default = x.task.is_default;
          return out;
        });
      
      def.resolve(models);
    }, def.reject);
    
    return def.promise();
  }
  
  @memoize(DAY)
  getTaskMap():Promise<{[key:string]:TaskModel}> {
    return this.listToMap(this.getTasks(), 'id');
  }
  
  @memoize(DAY)
  getProjects():Promise<ProjectModel[]> {
    let def = new Deferred<ProjectModel[]>();
    
    this.get('/projects').then(projects => {
      let models = projects
        .filter(x => x.project.active && x.project.name)
        .map(x => {
          let out = new ProjectModel();
          out.name = x.project.name;
          out.id = x.project.id;
          out.client_id = x.project.client_id;
          return out;
        })
        .sort((a,b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
            
      def.resolve(models);      
    }, def.reject);
    
    return def.promise();
  }  
  
  @memoize(DAY)
  getProjectMap():Promise<{[key:string]:ProjectModel}> {
    this.getProjects().then(function(data:ProjectModel[]) {
      
    });
    return this.listToMap(this.getProjects(), 'id');
  }
  
  @memoize(HOUR)
  getProjectTasks(projectId:number):Promise<TaskModel[]> {
    let def = new Deferred<TaskModel[]>();
    
    this.getTaskMap().then(taskMap => {
      this.get(`/projects/${projectId}/task_assignments`).then(tp => {
        let models:TaskModel[] = null;
        if (tp && tp.length) {
          models = tp
            .map(x => taskMap[x.task_assignment.task_id])
            .filter(x => !!x)
            .sort((a,b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
            
          for (let i = 0; i < models.length;i++) {
            if (models[i].is_default) {
              models.unshift.apply(models, models.splice(i,1));
              break;
            }
          }
        }        
        def.resolve(models);                      
      }, def.reject);
    }, def.reject);
    
    return def.promise();    
  }
}