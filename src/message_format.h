
//GENERATED, please run `npm run-script gen-message-format` to update
#pragma once
typedef enum {
  ActionReady = 0,
ActionError = 1,
ActionUnauthenticated = 2,
ActionProjectListFetch = 3,
ActionProjectListItem = 4,
ActionTaskListFetch = 5,
ActionTaskListItem = 6,
ActionTimerListReload = 7,
ActionTimerListFetch = 8,
ActionTimerListItem = 9,
ActionTimerAdd = 10,
ActionTimerCreated = 11,
ActionTimerToggle = 12 
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
"ProjectListFetch",
"ProjectListItem",
"TaskListFetch",
"TaskListItem",
"TimerListReload",
"TimerListFetch",
"TimerListItem",
"TimerAdd",
"TimerCreated",
"TimerToggle"};

