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
    if(req.status == 200) {      
      success(JSON.parse(req.response));
    } else {
      failure("Request status is " + req.status);
    }
  }
  req.onerror = function(e) {
    failure(e);
  }
  
  req.send(body ? JSON.stringify(body) : null);
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

//*****************************************************************
//APP
//*****************************************************************
var option = OptionHandler('https://rawgit.com/timothysoehnlin/PebbleHarvest/master/config/index.html');

function rest(method, path, body, success, failure) {
  var url = 'https://' + option('token.domain') + '.harvestapp.com' + path + '?access_token=' + option('oauth.access_token');
  restJSON(method, url, body, success, failure);
}

function fetchTasks(success, failure) {
  rest('GET', '/tasks', function(tasks) {
    tasks = tasks
      .filter(function(x) {
        return !!x.deactivated;
      })
      .forEach(function(x) {
        cache.tasks[x.id] = {
          id : x.id,
          name : x.name,
          is_default : x.is_default
        }
      });
    
    success(tasks);
  }, failure);
}

function fetchProjects(success, failure) {
  console.log("Fetching projects");
  
  rest('GET', '/projects', function(projects) {
    projects = projects
      .filter(function(x) {
        return x.project.active;
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
  fetchProjects(function(projects) {
    var projectMap = {};
    projects
      .forEach(function(x) {
        projectMap[x.id] = x;
      });
    success(projectMap);
  }, failure);
}

function fetchProjectTasks(projectId, success, failure) { 
  fetchTasks(function(tasks) {
    rest('GET', '/projects/' + projectId + '/task_assignments', function(taskProjects) {
      if (taskProjects && taskProjects.length) {
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

[fetchTasks, fetchProjects, fetchProjectMap, fetchProjectTasks].forEach(function(fn) {
  window[fn.name] = memoizeSuccess(fn);
});


Pebble.addEventListener('ready', function(e) {
  option('access_token', 'DGg6cAR70edArkQ8ZQMTcdDLaCD43rvwUGzBnLKHo8E1qIVZGeFDXm3SAK5xFrC8xkV_kGyKcW-YHZ-R6X70SA');
});

// Listen for when an AppMessage is received
Pebble.addEventListener('appmessage', function(e) {
  console.log(JSON.stringify(e));
  fetchProjects(function(projects) {
    (function itr() {
      if (!projects.length) {
        return;
      }      
      var p = projects[0];
      
      Pebble.sendAppMessage(
        {
          Project : p.id,
          Name : p.name
        },
        function() {
          projects.shift();
          itr();
        }, 
        function(e) {
          console.log("Error", e);
          itr();
        }
      );
    })();
  });
});
