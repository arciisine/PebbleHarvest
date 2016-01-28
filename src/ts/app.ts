import MessageQueue from './service/message-queue';
import OptionService from './service/options';
import HarvestService from './service/harvest';
import MessageHandler from './service/message-handler';
import {message} from './service/message-handler';

import {Promise} from './util/deferred';

import TaskModel from './model/task';
import TimerModel from './model/timer';
import ProjectModel from './model/project';

import Utils from './util/utils';
import Cache from './util/cache';
import {HOUR} from './util/cache';
import {Action, ActionNames, AppKey} from './message-format';

export default class App extends MessageHandler {

  queue:MessageQueue;
  options:OptionService;
  harvest:HarvestService;

  constructor() {
    super(AppKey.Action, (i) => ActionNames[i]);

    this.queue = new MessageQueue();
    this.options = new OptionService('http://harvest.arcsine.org');
    
    this.options.postInit = () => {
      this.options.set("harvest.client_id", "0omtLZyFXpILa-e04-kQIA");
      this.options.set("harvest.client_secret", "ee1T4ckZQyK0SD7s7yvsXWS4ngj5K7PPfedarS619zHu1pq-ffkEyzUepVdsyGp_79X5ciqVpmFZ9zbDyqUxOw");
    }
    
    this.options.onUpdate = () => {
      this.harvest.validateCode()
        .then(
          () => this.authenticate(),
          () => this.queue.pushMap(AppKey.Action, Action.Unauthenticated)
        );
    }
    
    this.harvest = new HarvestService(this.options);
        
    Pebble.addEventListener('ready', () => this.authenticate());
  }
  
  authenticate():void {
    this.harvest.authorize().then(
      () => this.queue.pushMap(AppKey.Action, Action.Ready),
      () => this.queue.pushMap(AppKey.Action, Action.Unauthenticated)
    )
  }
  
  onError(e) {
    Utils.log("Error: ",e);
    this.queue.pushMap(AppKey.Action, Action.Error);  
  }
  
  @message(Action.ProjectsFetch)
  projectList(data:Pebble.MessagePayload) {
    return this.harvest.getRecentProjectTaskMap().then(recent => {
      this.harvest.getProjects().then(projs => {
        projs = projs
          .map(p => {
            p.active = recent.used[p.id] !== undefined;
            p.assigned = recent.assigned[p.id] !== undefined;
            return p;
          })
          .filter(p => p.assigned || p.active)
          
        projs
          .sort((a,b) => {          
            return a.active !== b.active ?
              (a.active ? -1 : 1) : 
              (a.assigned !== b.assigned ?
                  (a.assigned ? -1 : 1) :
                  (a.name.toLowerCase().localeCompare(b.name.toLowerCase())));
          })
          .map(p => Utils.buildMap( 
            AppKey.Action, Action.ProjectItem,
            AppKey.Project, p.id,
            AppKey.Active, p.active,
            AppKey.Assigned, p.assigned,
            AppKey.Name, p.name 
          ))
          .forEach((p,i) => {
            if (i == projs.length - 1) {
               p[AppKey.Done] = true;
            }
            this.queue.push(p);
          });
      });
    });
  }
  
  @message(Action.TimersFetch)
  timerList(data:Pebble.MessagePayload) {
    return this.harvest.getTimers().then(items => {
      if (!items.length) {
        return this.queue.pushMap(
          AppKey.Action, Action.TimerItem,
          AppKey.Done, true
        );
      }
      items.sort((a,b) => {
        return a.active !== b.active ?
          (a.active ? -1 : 1) : 
          (a.taskTitle.toLowerCase().localeCompare(b.taskTitle.toLowerCase()));
      })
      .map(t => Utils.buildMap( 
          AppKey.Action, Action.TimerItem,
          AppKey.Timer, t.id,
          AppKey.Project, t.projectId,
          AppKey.Task, t.taskId,
          AppKey.Active, t.active,
          AppKey.Seconds, parseInt(''+(t.hours * 60 * 60)), 
          AppKey.Name, t.projectTitle,
          AppKey.SubName, t.taskTitle
      ))
      .forEach((t,i) => {
        if (i == items.length - 1) {
          t[AppKey.Done] = true;
        }
        this.queue.push(t);
      });
    });
  }
  
  @message(Action.TasksFetch) 
  projectTasks(data:Pebble.MessagePayload) {
    return this.harvest.getRecentProjectTaskMap().then((recent) => {
      this.harvest.getProjectTasks(data[AppKey.Project] as number)
        .then(tasks => {
          tasks
            .map(t => {
              t.active = !!(recent.used[data[AppKey.Project] as number] || {})[t.id]
              return t;
            })
            .sort((a,b) => {
              return a.active !== b.active ?
                (a.active ? -1 : 1) : 
                (a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
            })
            .map((t:TaskModel) => 
              Utils.buildMap(
                AppKey.Action, Action.TaskItem,
                AppKey.Task,  t.id, 
                AppKey.Active, t.active,
                AppKey.Name, t.name
              )
            )
            .forEach((t, i) => {
              if (i == tasks.length - 1) {
                 t[AppKey.Done] = true;
              }              
              this.queue.push(t);
            });
        }, this.onError)
    });
  }
  
  @message(Action.TimerAdd) 
  timerAdd(data:Pebble.MessagePayload) {
    return this.harvest.createTimer(data[AppKey.Project] as number, data[AppKey.Task] as number).then((timer:TimerModel) => {
      if (data[AppKey.Timer] !== undefined) {
        this.queue.pushMap( 
          AppKey.Action, Action.TimerCreated, 
          AppKey.Timer, timer.id 
        )
      } else {
        this.queue.pushMap( 
          AppKey.Action, Action.TimersRefresh, 
          AppKey.Timer, timer.id 
        )
      }
    });
  }
  
  @message(Action.TimerToggle)
  toggleTimer(data:Pebble.MessagePayload) {
    return this.harvest.toggleTimer(data[AppKey.Timer] as number).then(timer => {
      this.queue.pushMap(
        AppKey.Action, Action.TimerToggle,
        AppKey.Timer, timer.id,
        AppKey.Active, !timer.ended_at && !!timer.timer_started_at
      );
    });
  }
  
  @message(Action.TasksRefresh)
  refreshTaskData(data:Pebble.MessagePayload) {
      Cache.resetNamespace('tasks');
      this.queue.pushMap(AppKey.Action, Action.TasksRefresh);
  }
  
  @message(Action.ProjectsRefresh)
  refreshProjectData(data:Pebble.MessagePayload) {
    Cache.resetNamespace('projects');
    this.queue.pushMap(
      AppKey.Action, Action.ProjectsRefresh,
      AppKey.Project, 1
    );
  }
  
  @message(Action.TimersRefresh)
  refreshTimerData(data:Pebble.MessagePayload) {
    Cache.resetNamespace('timers');
    this.queue.pushMap(AppKey.Action, Action.TimersRefresh);
  }
}