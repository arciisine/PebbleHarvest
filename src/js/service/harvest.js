function HarvestService(options) {
  this.options = options;
  
  var self = this;

  //Memoize  
  ['getTasks' ,'getTaskMap','getProjects','getProjectMap','getProjectTasks','getRecentProjectTaskMap']
    .forEach(function(fn) {
      self[fn] = self.memoize(self[fn], fn);
    });
}

HarvestService.prototype = BaseService.prototype;

HarvestService.prototype.exec = function(method, path, body) {
  var url = 'https://' + this.options.get('token.domain') + '.harvestapp.com' + path + '?access_token=' + this.options.get('oauth.access_token');
  return BaseService.prototype.exec.call(this, method, url, body);
};

HarvestService.prototype.getTimers = function() {
  var seen = {}; 
  var def = new Deferred();
  
  this.get('/daily').then(function(assignments) {
    var active = assignments.day_entries
      .map(function(a) {
        a.updated_at = Date.parse(a.updated_at);
        
        if (!!a.timer_started_at) {
          a.updated_at += 3600 * 60;
        }
        
        return a;
      })
      .sort(function(a,b) { return b.updated_at - a.updated_at; })
      .map(function(x) {
        console.log(x.updated_at);
        var key = x.project_id + " || " + x.task_id;
        if (!seen[key]) { 
          seen[key] = true;
          return {
            active : !!x.timer_started_at,
            projectId : x.project_id,
            projectTitle : x.project,
            taskId : x.task_id,
            taskTitle : x.task,
            id : x.id
          };
        }
      })
      .filter(function(x) {
        return !!x;
      });
    
    def.resolve(active);
  }, def.reject);
  
  return def.promise;
}

HarvestService.prototype.getRecentProjectTaskMap = function() {
  var def = new Deferred();
    
  this.get('/daily').then(function(assignments) {
    var recent = {};
    function addProjectTask(projectid, taskid) {
      if (!recent[projectid]) {
        recent[projectid] = {};
      }
      recent[projectid][taskid] = true;
    }
    
    assignments.day_entries.forEach(function(x) {
      addProjectTask(x.project_id, x.task_id);
    });
    
    assignments.projects.forEach(function(p) {
      p.tasks.forEach(function(t) {
        addProjectTask(p.id, t.id);
      });
    });
    
    def.resolve(recent);
  }, def.reject);
  
  return def.promise;
}

HarvestService.prototype.createTimer = function(projectId, taskId) {
  var data = {
    "project_id" : projectId,
    "task_id" : taskId
  };
  return this.post('/daily/add', data);
}

HarvestService.prototype.toggleTimer = function(entryId) {  
  return this.post('/daily/timer/'+entryId);
}

HarvestService.prototype.getTasks = function() {
  var def = new Deferred();
  
  this.get('/tasks').then(function(tasks) {
    tasks = tasks
      .filter(function(x) { return !x.task.deactivated; })
      .map(function(x) {
        return {
          id : x.task.id,
          name : x.task.name,
          is_default : x.task.is_default
        }
      });
    
    def.resolve(tasks);
  }, def.reject);
  
  return def.promise;
}

HarvestService.prototype.getTaskMap = function() {
  return this.listToMap(this.getTasks(), 'id');
}

HarvestService.prototype.getProjects = function() {
  var def = new Deferred();
  
  this.get('/projects').then(function(projects) {
    projects = projects
      .filter(function(x) { return x.project.active && x.project.name; })
      .map(function(x) {
        return {
          name : x.project.name,
          id: x.project.id,
          client_id: x.project.client_id
        };
      })
      .sort(function(a,b) { return a.name.toLowerCase().localeCompare(b.name.toLowerCase()); });
          
    def.resolve(projects);      
  }, def.reject);
  
  return def.promise;
}

HarvestService.prototype.getProjectMap = function() {
  return this.listToMap(this.getProjects(), 'id');
}

HarvestService.prototype.getProjectTasks = function(projectId, success, failure) {
  var def = new Deferred();
  this.getTaskMap().then(function(tasks) { 
    this.get('/projects/' + projectId + '/task_assignments')
    .then(function(taskProjects) {
      if (taskProjects && taskProjects.length) {
        taskProjects = taskProjects
          .map(function(x) { return tasks[x.task_assignment.task_id] })
          .filter(function(x) { return !!x; })
          .sort(function(a,b) {
            return a.is_default ? -1 : a.name.toLowerCase().localeCompare(b.name.toLowerCase());
          });
      }
      def.resolve(taskProjects);                      
    }, def.reject);
  }, def.reject);
  return def.promise;    
}