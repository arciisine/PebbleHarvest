
//GENERATED, please run `npm run-script gen-message-format` to update
export enum Action {
  Ready = 0,
Error = 1,
Unauthenticated = 2,
ProjectsRefresh = 3,
ProjectsFetch = 4,
ProjectItem = 5,
TasksRefresh = 6,
TasksFetch = 7,
TaskItem = 8,
TimersRefresh = 9,
TimersFetch = 10,
TimerItem = 11,
TimerAdd = 12,
TimerCreated = 13,
TimerToggle = 14
}

export let ActionNames:string[] = ["Ready",
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
