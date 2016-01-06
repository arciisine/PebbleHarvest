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
  
  console.log("Making request", method, url);
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

function stream(transform) {
  return function(data) {
    (function itr() {
      if (!data.length) {
        return;
      }      
      var out = transform(data[0]);

      console.log(JSON.stringify(out));
      
      Pebble.sendAppMessage(
        out,
        function() {
          data.shift();
          itr();
        }, 
        function(e) {
          console.log("Error", e);
          itr();
        }
      );
    })();
  }
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

[fetchTasks,fetchTaskMap, fetchProjects, fetchProjectMap, fetchProjectTasks].forEach(function(fn) {
  window[fn.name] = memoizeSuccess(fn);
});

Pebble.addEventListener('ready', function(e) {
  option('access_token', 'f8NAb9sXnWJ7jiN9xaClMswBk9VmpZCnpzHDD8ETVj5AuFFlYDPkmdireKiDoZFxqcysOBAFu119bTPz67S');
});

// Listen for when an AppMessage is received
Pebble.addEventListener('appmessage', function(e) {
  var data = e.payload;
  console.log(JSON.stringify(data));
  if (data.Project !== undefined && data.Task !== undefined) {
    fetchProjectTasks(data.Project, stream(function(t) {
      return { Task : t.id, Name : t.name };
    }), function(err) {
      console.log(err);
    });
  } else if (data.Project !== undefined) {
    fetchProjects(stream(function(p) {
      return { Project : p.id, Name : p.name };
    }), function(err) {
      console.log(err);
    });
  }
});
