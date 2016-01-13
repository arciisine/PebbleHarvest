
//GENERATED, please run `npm run-script gen-message-format` to update
#pragma once
typedef enum {
  ActionReady = 0,
ActionError = 1,
ActionUnauthenticated = 2,
ActionProjectListFetch = 3,
ActionProjectListStart = 4,
ActionProjectListItem = 5,
ActionProjectListEnd = 6,
ActionTaskListFetch = 7,
ActionTaskListStart = 8,
ActionTaskListItem = 9,
ActionTaskListEnd = 10,
ActionTimerListReload = 11,
ActionTimerListFetch = 12,
ActionTimerListStart = 13,
ActionTimerListItemStart = 14,
ActionTimerListItemProjectName = 15,
ActionTimerListItemTaskName = 16,
ActionTimerListItemEnd = 17,
ActionTimerListEnd = 18,
ActionTimerAdd = 19,
ActionTimerCreated = 20,
ActionTimerToggle = 21 
} Action;

typedef enum {
  AppKeyAction = 0,
AppKeyProject = 1,
AppKeyTask = 2,
AppKeyTimer = 3,
AppKeyName = 4,
AppKeyActive = 5,
AppKeySeconds = 6 
} AppKey;

const char* ActionNames[] = { "Ready",
"Error",
"Unauthenticated",
"ProjectListFetch",
"ProjectListStart",
"ProjectListItem",
"ProjectListEnd",
"TaskListFetch",
"TaskListStart",
"TaskListItem",
"TaskListEnd",
"TimerListReload",
"TimerListFetch",
"TimerListStart",
"TimerListItemStart",
"TimerListItemProjectName",
"TimerListItemTaskName",
"TimerListItemEnd",
"TimerListEnd",
"TimerAdd",
"TimerCreated",
"TimerToggle"};

