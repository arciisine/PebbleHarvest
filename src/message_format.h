
//GENERATED, please run `npm run-script gen-message-format` to update
#pragma once
typedef enum {
  ActionReady = 0,
ActionError = 1,
ActionUnauthenticated = 2,
ActionProjectsRefresh = 3,
ActionProjectsFetch = 4,
ActionProjectItem = 5,
ActionTasksRefresh = 6,
ActionTasksFetch = 7,
ActionTaskItem = 8,
ActionTimersRefresh = 9,
ActionTimersFetch = 10,
ActionTimerItem = 11,
ActionTimerAdd = 12,
ActionTimerCreated = 13,
ActionTimerToggle = 14 
} Action;

typedef enum {
  AppKeyAction = 0,
AppKeyProject = 1,
AppKeyTask = 2,
AppKeyTimer = 3,
AppKeyName = 4,
AppKeyActive = 5,
AppKeySeconds = 6,
AppKeyAssigned = 7,
AppKeySubName = 8,
AppKeyDone = 9 
} AppKey;

const char* ActionNames[] = { "Ready",
"Error",
"Unauthenticated",
"ProjectsRefresh",
"ProjectsFetch",
"ProjectItem",
"TasksRefresh",
"TasksFetch",
"TaskItem",
"TimersRefresh",
"TimersFetch",
"TimerItem",
"TimerAdd",
"TimerCreated",
"TimerToggle"};

