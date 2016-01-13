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
import {Action, ActionNames, AppKey} from './message-format';

export default class App extends MessageHandler {

  queue:MessageQueue;
  options:OptionService;
  harvest:HarvestService;

  constructor() {
    super(AppKey.Action, (i) => ActionNames[i]);

    this.queue = new MessageQueue();
    this.options = new OptionService('https://rawgit.com/timothysoehnlin/PebbleHarvest/master/config/index.html');
    this.options.onUpdate = () => this.verifyAuth();
    
    this.harvest = new HarvestService(this.options);
        
    Pebble.addEventListener('ready', () => { this.verifyAuth(); });
  }
  
  verifyAuth():void {
    this.harvest.whoami().then(
      () => this.queue.pushMap(AppKey.Action, Action.Ready),
      () => this.queue.pushMap(AppKey.Action, Action.Unauthenticated)
    );
  }
  
  onError(e) {
    console.log("Error: ",e);
    this.queue.pushMap(AppKey.Action, Action.Error);  
  }
 
  @message(Action.ProjectListFetch)
  projectList(data:Pebble.MessagePayload) {
    this.queue.pushMap(AppKey.Action, Action.ProjectListStart);

    return this.harvest.getRecentProjectTaskMap().then(recent => {
      this.harvest.getProjects().then(projs => {
        projs
          .map(p => {
            p.active = recent.used[p.id] !== undefined;
            p.assigned = recent.assigned[p.id] !== undefined;
            return p;
          })
          .sort((a,b) => {          
            return a.active !== b.active ?
              (a.active ? -1 : 1) : 
              (a.assigned !== b.assigned ?
                  (a.assigned ? -1 : 1) :
                  (a.name.toLowerCase().localeCompare(b.name.toLowerCase())));
          })
          .map(p => Utils.buildMap( 
            AppKey.Action, Action.ProjectListItem,
            AppKey.Project, p.id,
            AppKey.Active, p.active,
            AppKey.Assigned, p.assigned,
            AppKey.Name, p.name 
          ))
          .forEach(p => this.queue.push(p));        
          
        this.queue.pushMap(AppKey.Action, Action.ProjectListEnd); 
      });
    });
  }
  
  @message(Action.TimerListFetch)
  timerList(data:Pebble.MessagePayload) {
    return this.harvest.getTimers().then(items => {
      this.queue.pushMap(AppKey.Action, Action.TimerListStart);      
      items.sort((a,b) => {
        return a.active !== b.active ?
          (a.active ? -1 : 1) : 
          (a.taskTitle.toLowerCase().localeCompare(b.taskTitle.toLowerCase()));
      })
      .forEach(t => {
        this.queue.pushMap(
          AppKey.Action, Action.TimerListItemStart,
          AppKey.Timer, t.id,
          AppKey.Project, t.projectId,
          AppKey.Task, t.taskId,
          AppKey.Active, t.active,
          AppKey.Seconds, parseInt(''+(t.hours * 60 * 60)) 
        );
        this.queue.pushMap(
          AppKey.Action, Action.TimerListItemProjectName,
          AppKey.Name, t.projectTitle
        );
        this.queue.pushMap(
          AppKey.Action, Action.TimerListItemTaskName,
          AppKey.Name, t.taskTitle
        );
        this.queue.pushMap(AppKey.Action, Action.TimerListItemEnd);
      });
      this.queue.pushMap(AppKey.Action, Action.TimerListEnd);
    });
  }
  
  @message(Action.TaskListFetch) 
  projectTasks(data:Pebble.MessagePayload) {
    this.queue.pushMap(AppKey.Action, Action.TaskListStart);

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
            .forEach((t:TaskModel) => this.queue.pushMap(
              AppKey.Action, Action.TaskListItem,
              AppKey.Task,  t.id, 
              AppKey.Active, t.active,
              AppKey.Name, t.name 
            ));
            
            this.queue.pushMap(AppKey.Action, Action.TaskListEnd);
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
          AppKey.Action, Action.TimerListReload, 
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
}