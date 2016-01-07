import MessageQueue from './service/message-queue';
import OptionService from './service/options';
import HarvestService from './service/harvest';
import MessageHandler from './service/message-handler';
import {message} from './service/message-handler';

import {Promise} from './util/deferred';

import TaskModel from './model/task';
import ProjectModel from './model/project';

import {Action, ActionNames, AppKey} from './message-format';

export default class App extends MessageHandler {

  queue:MessageQueue;
  options:OptionService;
  harvest:HarvestService;

  constructor() {
    super('Action', (i) => ActionNames[i]);

    this.queue = new MessageQueue();
    this.options = new OptionService('https://rawgit.com/timothysoehnlin/PebbleHarvest/master/config/index.html');
    this.harvest = new HarvestService(this.options);
        
    Pebble.addEventListener('ready', () => {
      this.options.set('token.domain', 'eaiti');
      this.options.set('oauth.access_token', 'MTpKXuAags1iN6tL-5W1tjVDPbIEc6vL_-HshDfhTqxpechFkU4O6qDdsRYyunsikToppK1kavznTx49wogvBw');
      
      this.queue.push({
        Action : 'ready'
      });
    });
  }
  
  streamList<T>(start: Action, item : Action, end: Action, promise:Promise<T[]>, transform:(T)=>any):Promise<T[]> {
    this.queue.push({ Action : start });
    return promise.then(function(data:T[]) {
      (data || []).forEach(i => {
        let msg = transform(i);
        msg.Action = item;
        this.queue.push(msg);
      }, this.onError.bind(this));
      this.queue.push({ Action : end });
    });
  }

  onError(e) {
    console.log("Error: ",e);
    this.queue.push({
      Action : "Error",
    });  
  }
 
  @message(Action.ProjectListFetch)
  projectList(data:Pebble.MessagePayload) {
    return this.harvest.getRecentProjectTaskMap().then(recent => {      
      this.streamList(Action.ProjectListStart, Action.ProjectListItem, Action.ProjectListEnd,
        this.harvest.getProjects(),
        (p:ProjectModel) => ({ 
          Project : p.id,
          Active: recent[p.id] !== undefined,
          Name : p.name 
        })
      )
    });
  }
  
  @message(Action.TimerListFetch)
  timerList(data:Pebble.MessagePayload) {
    return this.harvest.getTimers().then(items => {
      this.queue.push({ Action : Action.TimerListStart });
      
      items.forEach(t => {
        this.queue.push([{
          Action : Action.TimerListItemStart,
          Timer : t.id,
          Project : t.projectId,
          Task : t.taskId,
          Active : t.active
        }, {
          Action : Action.TimerListItemProjectName,
          Name : t.projectTitle
        },{
          Action : Action.TimerListItemTaskName,
          Name : t.taskTitle
        }, {
          Action : Action.TimerListItemEnd
        }])
      });
      
      this.queue.push({ Action : Action.TimerListEnd });
    });
  }
  @message(Action.TaskListFetch) 
  projectTasks(data:Pebble.MessagePayload) {
    return this.harvest.getRecentProjectTaskMap().then((recent) => {
      this.streamList(Action.TaskListStart, Action.TaskListItem, Action.TaskListEnd, 
        this.harvest.getProjectTasks(data[AppKey.Project] as number), 
        (t:TaskModel) => ({
          Task : t.id, 
          Active : recent[data[AppKey.Project] as number][t.id] !== undefined,
          Name : t.name 
        }));
    });
  }
  
  @message(Action.TimerAdd) 
  timerAdd(data:Pebble.MessagePayload) {
    return this.harvest.createTimer(data[AppKey.Project] as number, data['Task'] as number).then(timer => {
      this.queue.push({ 
        Action : Action.TimerListReload, 
        Timer : timer.id 
      })
    });
  }
  
  @message(Action.TimerToggle)
  toggleTimer(data:Pebble.MessagePayload) {
    return this.harvest.toggleTimer(data[AppKey.Timer] as number).then(timer => {
      this.queue.push({
        Action : Action.TimerListReload,
        Timer : timer.id,
        Active : !timer.ended_at && !!timer.timer_started_at
      });
    });
  }
}
