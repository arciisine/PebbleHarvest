import {Deferred, Promise} from '../util/deferred';
import memoize from '../util/memoize';

import TimerModel from '../model/timer';
import TaskModel from '../model/task';
import ProjectModel from '../model/project';

import BaseService from './base';  
import OptionService from './options';

let HOUR = 3600000
let DAY = 3600000

export default class HarvestService extends BaseService {
  constructor(options:OptionService) {
    super();
    this.options = options;
  }
  
  options:OptionService;  
  
  exec(method:string, path:string, body?:any):Promise<any> {
    let url = `https://api.harvestapp.com${path}?access_token=${this.options.get('oauth.access_token')}`;
    return super.exec(method, url, body);
  }
  
  whoami():Promise<any> {
    return this.get('/account/who_am_i');
  }
  
  getTimers():Promise<TimerModel> {
    let seen = {}; 
    let def = new Deferred<TimerModel>();
    
    this.get('/daily').then(assignments => {
      
      let active = assignments.day_entries
        .map(a => {
          a.updated_at = Date.parse(a.updated_at);
          if (!!a.timer_started_at) {
            a.updated_at += 3600 * 60;
          }
          return a;
        })
        .sort((a:any,b:any) => b.updated_at - a.updated_at)
        .map(x => {
          let key = `${x.project_id}||${x.task_id}`;
          if (!seen[key]) { 
            seen[key] = true;
            let out = new TimerModel();
            out.active = !!x.timer_started_at;
            out.projectId = x.project_id;
            out.projectTitle = x.project;
            out.taskId = x.task_id;
            out.taskTitle = x.task;
            out.id = x.id;
            return out;
          }
        })
        .filter(x => !!x);
      
      def.resolve(active);
    }, def.reject);
    
    return def.promise();
  }
  
  @memoize(HOUR)
  getRecentProjectTaskMap():Promise<{[key:string]:{[key:string]:boolean}}> {
    let def = new Deferred<{[key:string]:{[key:string]:boolean}}>();
      
    this.get('/daily').then(assignments => {
      let recent:{[key:string]:{[key:string]:boolean}} = {};
      
      let addProjectTask = (projectid, taskid) => {
        if (!recent[projectid]) recent[projectid] = {};
        recent[projectid][taskid] = true;
      }
      
      assignments.day_entries.forEach(x => addProjectTask(x.project_id, x.task_id));
      
      assignments.projects.forEach(p => {
        p.tasks.forEach(t => addProjectTask(p.id, t.id));
      });
      
      def.resolve(recent);
    }, def.reject);
    
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
    return this.post('/daily/timer/'+entryId);
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
      this.get('/projects/' + projectId + '/task_assignments').then(tp => {
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