/**
 * Welcome to Pebble.js!
 *
 * This is where you write your app.
 */

var UI = require('ui');
var Vector2 = require('vector2');
var Settings = require('settings');
var ajax = require('ajax');

var options = {};

var main = null
var projectState = null

var DEFAULT_ITEMS = [
  {
    title: 'Add',
    subtitle: 'New Project'
  },{
    title: 'Copy',
    subtitle: 'From Yesterday'
  }
];

Settings.option('access_token', 'DGg6cAR70edArkQ8ZQMTcdDLaCD43rvwUGzBnLKHo8E1qIVZGeFDXm3SAK5xFrC8xkV_kGyKcW-YHZ-R6X70SA');

// Set a configurable with the open callback
Settings.config(
  { url: 'https://rawgit.com/timothysoehnlin/pebblejs/master/config/index.html' },
  function(e) {
    console.log('opening configurable', JSON.stringify(e.options));
    setupMain()
  },
  function(e) {
    setupMain();
    console.log('closed configurable', JSON.stringify(e.options));
  }
);

function rest(method, path, body, success, failure) {
  if (typeof body === 'function') {
    failure = success;
    success = body;
    body = null;
  }
  
  var config = {
    method : method,
    headers : {
      'Accept' : 'application/json' 
    },
    url : 'https://' + Settings.option('token.domain') + '.harvestapp.com' + path + '?access_token=' + Settings.option('oauth.access_token')
  };
  
  if (body) {
    config.data = body;
    config.type = 'json';
  }
  
  ajax(config, success, failure);
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
    
    menu.show();
  }, function(err) {
    
  });
}

function setupTimerScreen() {
  var menu = new UI.Menu({
    sections: [{
      title : 'Tasks',
      items : [].concat(DEFAULT_ITEMS)
    }]
  });

  menu.on('select', function(e) {
    console.log(JSON.stringify(e));
    if (e.sectionIndex < menu.sections.length - 2) {
      if (e.sectionIndex === menu.sections.length - 2) {
        selectNewTask();
      }
      //Do something
    } else {
      //Toggle Timer
    }  
  });

  menu.on('longSelect', function(e) {
    if (e.sectionIndex < menu.sections.length - 2) {
      //Details
    }  
  });
  
  return menu;
}

function setupMain() {
  if (!Settings.option('access_token')) {
    main = new UI.Card();
    main.title('Harvest');
    main.body('Please authorize the app in the settings');
  } else {
    main = setupTimerScreen();
  }

  main.show();
}

function setItems() {
  
} 

setupMain();