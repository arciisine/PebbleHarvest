//*****************************************************************
//UTILS
//*****************************************************************
function OptionHandler(url, ns) {
  var options = {};
  
  function option(key, value) {
    var storageKey = ns + "_data";
    if (!key) {
      options = JSON.parse(localStorage.getItem(storageKey) || '{}');
      return;
    }
    
    if (typeof key === 'object') {
      for (var k in key) {
        options[k] = key[k];
      }
    } else {
      if (value) {
        options[key] = value;
      } else {
        return options[key];
      }
    }
    localStorage.setItem(storageKey, JSON.stringify(options));
  }


  Pebble.addEventListener('ready', function(e) {
    option();
  });

  Pebble.addEventListener('showConfiguration', function(e) {
    Pebble.openURL(url)
  });

  Pebble.addEventListener('webviewclosed', function(e) {
    option(JSON.parse(decodeURIComponent(e.response || '{}')));
  });
  
  return option;
}

function restJSON(method, url, body, success, failure) {
  if (typeof body === 'function') {
    failure = success;
    success = body;
    body = null;
  }
    
  var req = new XMLHttpRequest();
  
  req.open(method, url);
  req.setRequestHeader('Accept', 'application/json');
  if (body) {
    req.setRequestHeader('Content-Type', 'application/json');
  }
  req.onload = function(e) {
    if(req.status >= 200 && req.status < 400) {      
      success(JSON.parse(req.response));
    } else {
      failure("Request status is " + req.status);
    }
  }
  req.onerror = function(e) {
    failure(e);
  }
  
  body = body ? JSON.stringify(body) : null
  
  console.log("Making request", method, url, body);
  req.send(body);
}

var memoizeSuccess = (function() {
  var cached = {};
   
   function firstFunctionIndex(arr) {
     for (var i = 0; i < arr.length;i++) {
       if (typeof arr[i] === 'function') { 
         return i;
       }
     }
     return -1;
   }
   
   function copy(val) {
     if (Array.isArray(val)) { 
       return val.slice(0);
     }
     return val;
   }
   
  return function (fn) {
    return function() {
      var args = Array.prototype.slice.call(arguments, 0);
      var successInd = firstFunctionIndex(args);
      var origSuccess = args[successInd];
      var success = function(val) { return origSuccess(copy(val)); }
      
      var key = [fn.name].concat(args.slice(0, successInd)).join('||');
      var val = cached[key];
      
      if (val) {
        return success(val);
      } else {
        args[successInd] = function(val) {
          console.log("Caching", key, val);
          cached[key] = val;
          success(val);
        }; 
        fn.apply(this, args);
      }
    }
  }
})();

function MessageQueue() {
  var queue = [];
  var active = false;
  
  function iterate() {
    if (!queue.length) {
      active = false;
      return;
    }
    
    var out = queue[0];
    
    console.log("Dequeued", out.Action, JSON.stringify(out));
    
    Pebble.sendAppMessage(
      out,
      function() {
        queue.shift();
        iterate();
      }, 
      function(e) {
        console.log("Error", e);
        iterate();
      }
    );
  }
  
  var api = {
    push : function enqueue(data) {
      //Add all
      console.log("Queued", data.Action, JSON.stringify(data));
      var len = arguments.length;
      for (var i = 0; i < len; i++) {
        var o = arguments[i];
        if (!Array.isArray(o)) {
          queue.push(o);
        } else {
          queue = queue.concat(o);
        }        
      }
      
      if (!active) {
        active = true;
        iterate();
      }
    },
    pusher : function(fn) {
      return function(data) {
        data = data ? (Array.isArray(data) ? data : [data]) : [];
        api.push(data.map(fn));
      };
    },
    clear : function() {
      queue = [];
      active = false;
    }
  };
  
  return api;
}

function fetchListAsMap(fn, keyFn, succ, fail) {
  fn(function(data) {
    var out = {};
    data.forEach(function(x) {
      out[keyFn(x)] = x; 
    });    
    succ(out);
  }, fail);
}

function dayOfYear() {
  var now = new Date().getTime();
  var start = new Date(now.getFullYear(), 0, 0).geTime();
  var diff = now - start;
  var oneDay = 1000 * 60 * 60 * 24;
  return parseInt(''+Math.floor(diff / oneDay));
}

//*****************************************************************
//APP
//*****************************************************************
var option = OptionHandler('https://rawgit.com/timothysoehnlin/PebbleHarvest/master/config/index.html');
var queue = MessageQueue();

function rest(method, path, body, success, failure) {
  var url = 'https://' + option('token.domain') + '.harvestapp.com' + path + '?access_token=' + option('oauth.access_token');
  restJSON(method, url, body, success, failure);
}
/*
function fetchRecentAssignemnts(success, failure) {  
  rest('GET', '/daily/' + dayOfYear() + '/' + new Date().getFullYear(), function(assignments) {
    assignments.day_entries.map(function(x) {
       return {
         projectId : x.project_id,
         taskId : x.task_id
       };
    });
  }, failure);
}*/

function fetchTimers(success, failure) {
  var seen = {}; 
  rest('GET', '/daily', function(assignments) {
    var active = assignments.day_entries
      .map(function(a) {
        a.updated_at = Date.parse(a.updated_at);
        
        if (!!a.timer_started_at) {
          a.updated_at += 3600 * 60;
        }
        return a;
      })
      .sort(function(a,b) {
        return b.updated_at - a.updated_at;
      })
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
    
    success(active);
  }, failure);
}

function fetchRecentProjectTaskMap(success, failure) {  
  rest('GET', '/daily', function(assignments) {
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
    
    success(recent);
  }, failure);
}

function createTimer(projectId, taskId, success, failure) {
  var data = {
    "project_id" : projectId,
    "task_id" : taskId
  };
  rest('POST', '/daily/add', data, success, failure);
}

function toggleTimer(entryId, success, failure) {  
  rest('POST', '/daily/timer/'+entryId, success, failure);
}

function fetchTasks(success, failure) {
  rest('GET', '/tasks', function(tasks) {
    tasks = tasks
      .filter(function(x) {
        return !x.task.deactivated;
      })
      .map(function(x) {
        return {
          id : x.task.id,
          name : x.task.name,
          is_default : x.task.is_default
        }
      });
    
    console.log(JSON.stringify(tasks));

    success(tasks);
  }, failure);
}

function fetchTaskMap(success, failure) {
  fetchListAsMap(fetchTasks, function(x) { return x.id }, success, failure);
}

function fetchProjects(success, failure) {
  console.log("Fetching projects");
  
  rest('GET', '/projects', function(projects) {
    projects = projects
      .filter(function(x) {
        return x.project.active && x.project.name;
      })
      .map(function(x) {
        return {
          name : x.project.name,
          id: x.project.id,
          client_id: x.project.client_id
        };
      })
      .sort(function(a,b) {
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });
          
    success(projects);      
  }, failure);
}

function fetchProjectMap(success, failure) {
  fetchListAsMap(fetchProjects, function(x) { return x.id }, success, failure);
}

function fetchProjectTasks(projectId, success, failure) { 
  fetchTaskMap(function(tasks) {
    rest('GET', '/projects/' + projectId + '/task_assignments', function(taskProjects) {
      if (taskProjects && taskProjects.length) {
        console.log(JSON.stringify(tasks));

        taskProjects = taskProjects
          .map(function(x) {
            return tasks[x.task_assignment.task_id]
          })
          .filter(function(x) { return !!x; })
          .sort(function(a,b) {
            return a.is_default ? -1 : a.name.toLowerCase().localeCompare(b.name.toLowerCase());
          });
      }
              
      success(taskProjects);
    }, failure);
  }, failure);
}

[fetchTasks,fetchTaskMap, fetchProjects, fetchProjectMap, fetchProjectTasks, fetchRecentProjectTaskMap].forEach(function(fn) {
  window[fn.name] = memoizeSuccess(fn);
});

Pebble.addEventListener('ready', function(e) {
  option('access_token', 'f8NAb9sXnWJ7jiN9xaClMswBk9VmpZCnpzHDD8ETVj5AuFFlYDPkmdireKiDoZFxqcysOBAFu119bTPz67S');
  queue.push({
    Action : 'ready'
  });
});

var MessageHandlers = {
  'project-list' : function(data, err) {
    fetchRecentProjectTaskMap(function(recent) {
      fetchProjects(queue.pusher(function(p) {
        return { 
          Action : 'project-added',
          Project : p.id,
          Active: recent[p.id] !== undefined,
          Name : p.name 
        };
      }), err);
    }, err);
  },
  'timer-list' : function(data, err) {
    fetchTimers(function(items) {      
      items.forEach(function(t) {
        queue.push({
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
        })
      });
    }, err);
  },
  'project-tasks' : function(data, err) {
    fetchRecentProjectTaskMap(function(recent) {
      fetchProjectTasks(data.Project, queue.pusher(function(t) {
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
    createTimer(data.Project, data.Task, queue.pusher(function(timer) {
      return { 
        Action : 'timer-list-reload', 
        Timer : timer.id 
      };
    }), err);
  },
  'timer-toggle' : function(data, err) {
    toggleTimer(data.Timer, queue.pusher(function(timer) {
      return {
        Action : 'timer-list-reload',
        Timer : timer.id,
        Active : !timer.ended_at && !!timer.timer_started_at
      };
    }), err);
  }
}

// Listen for when an AppMessage is received
Pebble.addEventListener('appmessage', function(e) {
  var data = e.payload;
  console.log(JSON.stringify(data));
  
  function err(e) {
    console.log(e);
    queue.push({
      Action : "Error",
    });
  }
  
  if (MessageHandlers[data.Action]) {
    MessageHandlers[data.Action](data, err);
  } else {
      console.lot("Unknown action", data.Action);
  }
});