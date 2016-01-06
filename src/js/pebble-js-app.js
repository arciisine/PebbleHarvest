/**
 * Welcome to Pebble.js!
 *
 * This is where you write your app.
 */

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
    console.log("loaded");
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

var projectState = null

var option = null;

// Listen for when an AppMessage is received
Pebble.addEventListener('appmessage', function(e) {
  console.log(JSON.stringify(e));
});

Pebble.addEventListener('ready', function(e) {
  console.log('hi');
  option = OptionHandler('https://rawgit.com/timothysoehnlin/PebbleHarvest/master/config/index.html');
  option('access_token', 'DGg6cAR70edArkQ8ZQMTcdDLaCD43rvwUGzBnLKHo8E1qIVZGeFDXm3SAK5xFrC8xkV_kGyKcW-YHZ-R6X70SA');
});

function rest(method, path, body, success, failure) {
  var url = 'https://' + option('token.domain') + '.harvestapp.com' + path + '?access_token=' + option('oauth.access_token');
  restJSON(method, url, body, succes, failure);
}

function fetchProjects(success, failure) {
  console.log("Fetching projects");
  
  if (projectState) {
    success(projectState);
  }
  
  var state = {
    projects : {},
    tasks : {},
    projectList : [],
    projectsRead : 0
  };
  
  function onFailure() {
    if (failure) {
      failure();
      failure = null;
    } 
  }
  
  function onProject(taskProjects) {
    if (taskProjects && taskProjects.length) {
      var projectId = taskProjects[0].task_assignment.project_id; 
      state.projects[projectId] = taskProjects
        .map(function(x) {
          return state.tasks[x.task_assignment.task_id]
        })
        .filter(function(x) { return !!x; })
        .sort(function(a,b) {
          return a.is_default ? a : (a.name < b.name ? a : b);
        });
    }
    
    state.projectsRead++;
    
    if (state.projectsRead == state.projectList.length) {
      projectState = state;
      success(state);
    }
  }
  
  rest('GET', '/projects', function(projects) {
    state.projectList = projects
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
        return a.name < b.name ? a : b;
      });
          
    state.projectList
      .forEach(function(x) {
        state.projects[x.project.id] = x;
      });

    console.log("projects", state.projectList);
    
    rest('GET', '/tasks', function(tasks) {     
      tasks
        .filter(function(x) {
          return !!x.deactivated;
        })
        .forEach(function(x) {
          state.tasks[x.id] = {
            id : x.id,
            name : x.name,
            is_default : x.is_default
          }
        });
       
      projects
        .forEach(function(proj) {
          rest('GET', '/projects/' + proj.id + '/task_assignments', onProject, onFailure);
        });
    }, onFailure);
  }, onFailure);
}

function selectNewTask() {
  fetchProjects(function(state) {
    var menu = new UI.Menu({
      sections: state.projectList.map(function(x) {
        return {
          subtitle : x.name,
          items : x.tasks.map(function(y) {
             return {
               subtitle : y.name
             };
          })
        };
      })
    });
    
  }, function(err) {
    
  });
}