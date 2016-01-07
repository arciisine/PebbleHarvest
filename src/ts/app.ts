import MessageQueue from './service/message-queue';
import OptionService from './service/options';
import HarvestService from './service/harvest';
import MessageHandler from './service/message-handler';
import {message} from './service/message-handler';

import ProjectModel from './model/project';

export default class App extends MessageHandler {

  queue:MessageQueue;
  options:OptionService;
  harvest:HarvestService;

  constructor() {
    super('Action');

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

  onError(e) {
    console.log("Error: ",e);
    this.queue.push({
      Action : "Error",
    });  
  }
 
  @message('project-list')
  projectList(data:Pebble.MessagePayload, err) {
    this.harvest.getRecentProjectTaskMap()
      .then(recent => {
        this.harvest.getProjects().then(this.queue.pusher((p:ProjectModel):any => {
          return { 
            Action : 'project-added',
            Project : p.id,
            Active: recent[p.id] !== undefined,
            Name : p.name 
          };
        }), err);
    }, err);
  }
  
  @message('timer-list')
  timerList(data:Pebble.MessagePayload, err) {
    this.harvest.getTimers().then(items => {
      items.forEach(t => {
        this.queue.push([{
          Action : "timer-add-begin",
          Timer : t.id,
          Project : t.projectId,
          Task : t.taskId,
          Active : t.active
        }, {
          Action : "timer-add-project-name",
          Name : t.projectTitle
        },{
          Action : "timer-add-task-name",
          Name : t.taskTitle
        }, {
          Action : "timer-add-complete"
        }])
      });
    }, err);
  }
  @message('project-tasks') 
  projectTasks(data:Pebble.MessagePayload, err) {
    this.harvest.getRecentProjectTaskMap().then((recent) => {
      this.harvest.getProjectTasks(data['Project'] as number).then(this.queue.pusher((t) => {
        return {
          Action : 'project-task-added',  
          Task : t.id, 
          Active : recent[data['Project'] as number][t.id] !== undefined,
          Name : t.name 
        };
      }), err);
    }, err);
  }
  
  @message('timer-add') 
  timerAdd(data:Pebble.MessagePayload, err) {
    this.harvest.createTimer(data['Project'] as number, data['Task'] as number).then(this.queue.pusher((timer) => {
      return { 
        Action : 'timer-list-reload', 
        Timer : timer.id 
      };
    }), err);
  }
  
  @message('timer-toggle')
  toggleTimer(data:Pebble.MessagePayload, err) {
    this.harvest.toggleTimer(data['Timer'] as number).then(this.queue.pusher((timer) => {
      return {
        Action : 'timer-list-reload',
        Timer : timer.id,
        Active : !timer.ended_at && !!timer.timer_started_at
      };
    }), err);
  }
}
