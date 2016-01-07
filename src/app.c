#include "common.h"
#include "message_format.h"
#include "menu.h"
#include <stdarg.h>

static Window *window;
static Menu *project_menu;
static Menu *task_menu;
static Menu *timer_menu;

static int project_recent = -1;
static int project_all = -1;

static int task_recent = -1;
static int task_all = -1;

static int timer_list = -1;
static int timer_actions = -1;

static MenuItem* buffered_timer;

static GBitmap *plus_icon;
static GBitmap *checkmark_active;
static GBitmap *checkmark_inactive;

static bool send_message(Action action, int count, ...) {
  va_list argp;
  
  va_start(argp, count);

  APP_LOG(APP_LOG_LEVEL_DEBUG, "Send Message: %s", ActionNames[action]);

  DictionaryIterator *iter;
  app_message_outbox_begin(&iter);
  
  dict_write_uint32(iter, AppKeyAction, action);
  
  for (int i = 0; i < count; i++) {  
    int key = va_arg(argp, int);
    int value = va_arg(argp, int);
    
    // Some other request with no string data
    dict_write_uint32(iter, key, value);
  }
  
  dict_write_end(iter);
  app_message_outbox_send();
  va_end(argp);
  
  return true;
}

static void reload_timers() {
  menu_close(project_menu);
  menu_close(task_menu);
  menu_empty(timer_menu);
  menu_add_item(timer_menu, (MenuItem) {
    .title = "Add Task",
    .icon = plus_icon,
    .id = -1
  }, timer_actions);
  send_message(ActionTimerListFetch, 0);
  menu_open(timer_menu);
}

static void open_project_menu() {
  if (project_menu->item_count == 0) {
    send_message(ActionProjectListFetch, 0);  
    menu_empty(project_menu);
  }
  menu_open(project_menu);
}

static void project_select_handler(MenuItem* item, bool longPress) {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Project selected: %p, %d %s",item, item->id, item->title);
  menu_empty(task_menu);
  send_message(ActionTasksFetch, 1, AppKeyProject, item->id);
  menu_open(task_menu);
}

static void task_select_handler(MenuItem* item, bool longPress) {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Task selected: %p, %d %s",item, item->id, item->title);
   
  send_message(ActionTimerAdd, 2, 
    AppKeyProject, menu_get_selected_item(project_menu)->id,
    AppKeyTask, item->id
  );
}

static void timer_select_handler(MenuItem* item, bool longPress) {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Timer selected: %p, %d %s",item, item->id, item->title);
  if (item->id > 0) {
    if (!longPress) {
      send_message(ActionTimerToggle, 2, 
          AppKeyTimer, item->id
      );
    }
  } else if (item->id == -1) {
    open_project_menu();
  }
}

static void in_received_handler(DictionaryIterator *iter, void *context) {
  Action action = dict_find(iter, AppKeyAction)->value->uint32;

  APP_LOG(APP_LOG_LEVEL_DEBUG, "Received Message: %s", ActionNames[action]);
  
  switch(action) {
    case ActionReady:
      reload_timers();
      break;
      
    case ActionProjectListStart:
      break;
    case ActionProjectListItem:
      Tuple *project_tuple = dict_find(iter, AppKeyProject);
      Tuple *name_tuple = dict_find(iter, AppKeyName);
      Tuple *active_tuple = dict_find(iter, AppKeyActive);

      menu_add_item(project_menu, (MenuItem) {
        .title = name_tuple->value->cstring,
        .id = project_tuple->value->uint32
      }, active_tuple->value->uint32 == 1 ? project_recent : project_all);
      break;
    case ActionProjectListEnd:
      break;
      
      
    case ActionTaskListStart:
      break;
    case ActionTaskListItem:
      Tuple *task_tuple = dict_find(iter, AppKeyTask);
      Tuple *name_tuple = dict_find(iter, AppKeyName);
      Tuple *active_tuple = dict_find(iter, AppKeyActive);
      
      menu_add_item(task_menu, (MenuItem) {
        .title = name_tuple->value->cstring,
        .id = task_tuple->value->uint32,
      }, active_tuple->value->uint32 == 1 ? task_recent : task_all);
      break;
    case ActionTaskLisEnd:
      break;      
      
    case ActionTimerListReload:
      reload_timers();
      break;
      
    case ActionTimerListStart:
      break;
      
    case ActionTimerListItemStart:
      Tuple *timer_tuple = dict_find(iter, AppKeyTimer);
      Tuple *active_tuple = dict_find(iter, AppKeyActive);
      
      buffered_timer = (MenuItem*) malloc(sizeof(MenuItem));
      buffered_timer->id = timer_tuple->value->uint32;
      buffered_timer->icon = active_tuple->value->uint32 == 1 ? checkmark_active : checkmark_inactive;
      break;
    case ActionTimerListItemProjectName:
      Tuple *name_tuple = dict_find(iter, AppKeyName);
      buffered_timer->title = strdup(name_tuple->value->cstring);
      break;
    case ActionTimerListItemTaskName:
      Tuple *name_tuple = dict_find(iter, AppKeyName);
      buffered_timer->subtitle = strdup(name_tuple->value->cstring);
      break;
    case ActionTimerListItemEnd:
      menu_add_item(timer_menu, *buffered_timer, timer_list);
      free_and_clear(buffered_timer->title);
      free_and_clear(buffered_timer->subtitle);
      free_and_clear(buffered_timer);
      break;
      
    case ActionTimerListEnd:
      break;
      
    default:
      APP_LOG(APP_LOG_LEVEL_DEBUG, "Received Message: %s UNKNOWN", actionName);
  }
}


static void main_menu_load(Window *window) {
    
  checkmark_active = gbitmap_create_with_resource(RESOURCE_ID_CHECK_ACTIVE);
  checkmark_inactive = gbitmap_create_with_resource(RESOURCE_ID_CHECK_INACTIVE);
  
  project_menu = menu_create("Project List");
  project_recent = menu_add_section(project_menu, "Recent")->id;
  project_all = menu_add_section(project_menu, "All")->id;
  project_menu->click = project_select_handler;

  task_menu = menu_create("Task List");
  task_recent = menu_add_section(task_menu, "Recent")->id;
  task_all = menu_add_section(task_menu, "All")->id;
  task_menu->click = task_select_handler;
}

static void main_menu_unload(Window *window) {
  menu_destroy(project_menu);
  menu_destroy(task_menu);

  gbitmap_destroy(checkmark_active);
  gbitmap_destroy(checkmark_inactive);
}

static void init(void) {
  // Register message handlers
  app_message_register_inbox_received(in_received_handler);
  
  // Init buffers
  app_message_open(120, 120);
  
  timer_menu = menu_create("Timers");
  timer_menu->click = timer_select_handler;
  timer_list = menu_add_section(timer_menu, NULL)->id;
  timer_actions = menu_add_section(timer_menu, NULL)->id;
  timer_menu->basic_render = true;
  timer_menu->on_load = main_menu_load;
  timer_menu->on_unload = main_menu_unload;
  menu_open(timer_menu);  
}

static void deinit(void) {
  menu_destroy(timer_menu);
}

int main(void) {
  init();

  APP_LOG(APP_LOG_LEVEL_DEBUG, "Done initializing, pushed window: %p", window);

  app_event_loop();
  deinit();
}
