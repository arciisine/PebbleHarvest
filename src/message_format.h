
enum {
  ActionReady = 0,
ActionError = 1,
ActionProjectListFetch = 2,
ActionProjectListStart = 3,
ActionProjectListItem = 4,
ActionProjectListEnd = 5,
ActionTaskListFetch = 6,
ActionTaskListStart = 7,
ActionTaskListItem = 8,
ActionTaskListEnd = 9,
ActionTimerListReload = 10,
ActionTimerListStart = 11,
ActionTimerListEnd = 12,
ActionTimerListItemStart = 13,
ActionTimerListItemProjectName = 14,
ActionTimerListItemTaskName = 15,
ActionTimerListItemEnd = 16,
ActionTimerAdd = 17,
ActionTimerToggle = 18 
} Action;

enum {
  AppKeyAction = 0,
AppKeyProject = 1,
AppKeyTask = 2,
AppKeyTimer = 3,
AppKeyName = 4,
AppKeyActive = 5 
} AppKey;

char** ActionNames = { "Ready",
"Error",
"ProjectListFetch",
"ProjectListStart",
"ProjectListItem",
"ProjectListEnd",
"TaskListFetch",
"TaskListStart",
"TaskListItem",
"TaskListEnd",
"TimerListReload",
"TimerListStart",
"TimerListEnd",
"TimerListItemStart",
"TimerListItemProjectName",
"TimerListItemTaskName",
"TimerListItemEnd",
"TimerAdd",
"TimerToggle"};

