
//GENERATED, please run `npm run-script gen-message-format` to update
export enum Action {
  Ready = 0,
Error = 1,
Unauthenticated = 2,
ProjectListFetch = 3,
ProjectListStart = 4,
ProjectListItem = 5,
ProjectListEnd = 6,
TaskListFetch = 7,
TaskListStart = 8,
TaskListItem = 9,
TaskListEnd = 10,
TimerListReload = 11,
TimerListFetch = 12,
TimerListStart = 13,
TimerListEnd = 14,
TimerListItemStart = 15,
TimerListItemProjectName = 16,
TimerListItemTaskName = 17,
TimerListItemEnd = 18,
TimerAdd = 19,
TimerToggle = 20
}

export let ActionNames:string[] = ["Ready",
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
"TimerToggle"];

export let AppKey = {
  Action : "Action",
Project : "Project",
Task : "Task",
Timer : "Timer",
Name : "Name",
Active : "Active" 
};
