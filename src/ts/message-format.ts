
//GENERATED, please run `npm run-script gen-message-format` to update
export enum Action {
  Ready = 0,
Error = 1,
Unauthenticated = 2,
ProjectListFetch = 3,
ProjectListItem = 4,
TaskListFetch = 5,
TaskListItem = 6,
TimerListReload = 7,
TimerListFetch = 8,
TimerListItem = 9,
TimerAdd = 10,
TimerCreated = 11,
TimerToggle = 12
}

export let ActionNames:string[] = ["Ready",
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
"TimerToggle"];

export let AppKey = {
  Action : "Action",
Project : "Project",
Task : "Task",
Timer : "Timer",
Name : "Name",
Active : "Active",
Seconds : "Seconds",
Assigned : "Assigned",
SubName : "SubName",
Done : "Done" 
};
