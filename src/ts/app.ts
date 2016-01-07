import MessageQueue from './service/message-queue';
import OptionService from './service/options';
import HarvestService from './service/harvest';
import MessageHandler from './service/message-handler';

import ProjectModel from './model/project';

let queue = new MessageQueue();
let options = new OptionService('https://rawgit.com/timothysoehnlin/PebbleHarvest/master/config/index.html');
let harvest = new HarvestService(options);
let handler = new MessageHandler('Action');
  
handler.onError = function(e) {
  console.log(e);
  queue.push({
    Action : "Error",
  });
}

handler.register({
  /*function fetchRecentAssignemnts(success, failure) {  
    rest('GET', '/daily/' + utils.dayOfYear() + '/' + new Date().getFullYear(), function(assignments) {
      assignments.day_entries.map(function(x) {
        return {
          projectId : x.project_id,
          taskId : x.task_id
        };
      });
    }, failure);
  }*/

  'project-list' : function(data:Pebble.MessagePayload, err) {
    harvest.getRecentProjectTaskMap()
      .then(recent => {
        harvest.getProjects().then(queue.pusher((p:ProjectModel):any => {
          return { 
            Action : 'project-added',
            Project : p.id,
            Active: recent[p.id] !== undefined,
            Name : p.name 
          };
        }), err);
    }, err);
  },
  'timer-list' : function(data:Pebble.MessagePayload, err) {
    harvest.getTimers().then(items => {      
      items.forEach(t => {
        queue.push([{
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
  },
  'project-tasks' : function(data, err) {
    harvest.getRecentProjectTaskMap().then(function(recent) {
      harvest.getProjectTasks(data.Project).then(queue.pusher(function(t) {
        return {
          Action : 'project-task-added',  
          Task : t.id, 
          Active : recent[data.Project][t.id] !== undefined,
          Name : t.name 
        };
      }), err);
    }, err);
  },
  'timer-add' : function(data, err) {
    harvest.createTimer(data.Project, data.Task).then(queue.pusher(function(timer) {
      return { 
        Action : 'timer-list-reload', 
        Timer : timer.id 
      };
    }), err);
  },
  'timer-toggle' : function(data, err) {
    harvest.toggleTimer(data.Timer).then(queue.pusher(function(timer) {
      return {
        Action : 'timer-list-reload',
        Timer : timer.id,
        Active : !timer.ended_at && !!timer.timer_started_at
      };
    }), err);
  }
});

Pebble.addEventListener('ready', function(e) {
  options.set('access_token', 'f8NAb9sXnWJ7jiN9xaClMswBk9VmpZCnpzHDD8ETVj5AuFFlYDPkmdireKiDoZFxqcysOBAFu119bTPz67S');
  queue.push({
    Action : 'ready'
  });
});