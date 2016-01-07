
  export enum Action {
    Ready = 0,
Error = 1,
ProjectListFetch = 2,
ProjectListStart = 3,
ProjectListItem = 4,
ProjectListEnd = 5,
TaskListFetch = 6,
TaskListStart = 7,
TaskListItem = 8,
TaskListEnd = 9,
TimerListReload = 10,
TimerListStart = 11,
TimerListEnd = 12,
TimerListItemStart = 13,
TimerListItemProjectName = 14,
TimerListItemTaskName = 15,
TimerListItemEnd = 16,
TimerAdd = 17,
TimerToggle = 18
  }
  
  export enum AppKey {
    Action = 0,
Project = 1,
Task = 2,
Timer = 3,
Name = 4,
Active = 5 
  } AppKey;
