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
  
  streamList<T>(start: Action, item : Action, end: Action, promise:Promise<T[]>, transform:(T)=>any):Promise<T[]> {
    this.queue.pushMap(AppKey.Action, start);
    return promise.then((data:T[]) => {
      (data || []).forEach(i => {
        let msg = transform(i);
        msg[AppKey.Action] = item;
        this.queue.push(msg);
      }, this.onError.bind(this));
      this.queue.push({ Action : end });
    });
  }

  onError(e) {
    console.log("Error: ",e);
    this.queue.pushMap(AppKey.Action, Action.Ready);  
  }
 
  @message(Action.ProjectListFetch)
  projectList(data:Pebble.MessagePayload) {
    return this.harvest.getRecentProjectTaskMap().then(recent => {      
      this.streamList(Action.ProjectListStart, Action.ProjectListItem, Action.ProjectListEnd,
        this.harvest.getProjects(),
        (p:ProjectModel) => Utils.buildMap( 
          AppKey.Project, p.id,
          AppKey.Active, recent[p.id] !== undefined,
          AppKey.Name, p.name 
        )
      )
    });
  }
  
  @message(Action.TimerListFetch)
  timerList(data:Pebble.MessagePayload) {
    return this.harvest.getTimers().then(items => {
      this.queue.pushMap(AppKey.Action, Action.TimerListStart);
      
      items.forEach(t => {
        this.queue.pushMap(
          AppKey.Action, Action.TimerListItemStart,
          AppKey.Timer, t.id,
          AppKey.Project, t.projectId,
          AppKey.Task, t.taskId,
          AppKey.Active, t.active
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
    return this.harvest.getRecentProjectTaskMap().then((recent) => {
      this.streamList(Action.TaskListStart, Action.TaskListItem, Action.TaskListEnd, 
        this.harvest.getProjectTasks(data[AppKey.Project] as number), 
        (t:TaskModel) => Utils.buildMap(
          AppKey.Task,  t.id, 
          AppKey.Active, recent[data[AppKey.Project] as number][t.id] !== undefined,
          AppKey.Name, t.name 
        ));
    });
  }
  
  @message(Action.TimerAdd) 
  timerAdd(data:Pebble.MessagePayload) {
    return this.harvest.createTimer(data[AppKey.Project] as number, data['Task'] as number).then((timer:TimerModel) => {
      this.queue.pushMap( 
        AppKey.Action, Action.TimerListReload, 
        AppKey.Timer, timer.id 
      )
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