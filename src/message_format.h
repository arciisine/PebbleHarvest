
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
ActionTimerListEnd = 14,
ActionTimerListItemStart = 15,
ActionTimerListItemProjectName = 16,
ActionTimerListItemTaskName = 17,
ActionTimerListItemEnd = 18,
ActionTimerAdd = 19,
ActionTimerToggle = 20 
} Action;

typedef enum {
  AppKeyAction = 0,
AppKeyProject = 1,
AppKeyTask = 2,
AppKeyTimer = 3,
AppKeyName = 4,
AppKeyActive = 5 
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
"TimerListEnd",
"TimerListItemStart",
"TimerListItemProjectName",
"TimerListItemTaskName",
"TimerListItemEnd",
"TimerAdd",
"TimerToggle"};

