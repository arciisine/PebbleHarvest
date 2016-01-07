
//GENERATED, please run `npm run-script gen-message-format` to update
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
TimerListFetch = 11,
TimerListStart = 12,
TimerListEnd = 13,
TimerListItemStart = 14,
TimerListItemProjectName = 15,
TimerListItemTaskName = 16,
TimerListItemEnd = 17,
TimerAdd = 18,
TimerToggle = 19
}

export let ActionNames:string[] = ["Ready",
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
"TimerToggle"];

export enum AppKey {
  Action = 0,
Project = 1,
Task = 2,
Timer = 3,
Name = 4,
Active = 5 
} AppKey;
