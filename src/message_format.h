
//GENERATED, please run `npm run-script gen-message-format` to update
#ifndef __TEST__
#define __TEST__
#pragma once
typedef enum {
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
ActionTimerListFetch = 11,
ActionTimerListStart = 12,
ActionTimerListEnd = 13,
ActionTimerListItemStart = 14,
ActionTimerListItemProjectName = 15,
ActionTimerListItemTaskName = 16,
ActionTimerListItemEnd = 17,
ActionTimerAdd = 18,
ActionTimerToggle = 19 
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

#endif