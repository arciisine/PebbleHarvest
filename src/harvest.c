#include "common.h"
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

static bool send_message(char* action, int count, ...) {
  va_list argp;
  
  va_start(argp, count);

  APP_LOG(APP_LOG_LEVEL_DEBUG, "Send Message: %s", action);

  DictionaryIterator *iter;
  app_message_outbox_begin(&iter);
  
  dict_write_cstring(iter, HarvestKeyAction, action);
  
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
  send_message("timer-list", 0);
  menu_open(timer_menu);
}

static void open_project_menu() {
  if (project_menu->item_count == 0) {
    send_message("project-list", 0);  
    menu_empty(project_menu);
  }
  menu_open(project_menu);
}

static void project_select_handler(MenuItem* item, bool longPress) {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Project selected: %p, %d %s",item, item->id, item->title);
  menu_empty(task_menu);
  send_message("project-tasks", 1, HarvestKeyProject, item->id);
  menu_open(task_menu);
}

static void task_select_handler(MenuItem* item, bool longPress) {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Task selected: %p, %d %s",item, item->id, item->title);
   
  send_message("timer-add", 2, 
    HarvestKeyProject, menu_get_selected_item(project_menu)->id,
    HarvestKeyTask, item->id
  );
}

static void timer_select_handler(MenuItem* item, bool longPress) {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Timer selected: %p, %d %s",item, item->id, item->title);
  if (item->id > 0) {
    if (!longPress) {
      send_message("timer-toggle", 2, 
          HarvestKeyTimer, item->id
      );
    }
  } else if (item->id == -1) {
    open_project_menu();
  }
}

static void in_received_handler(DictionaryIterator *iter, void *context) {
  char* action = dict_find(iter, HarvestKeyAction)->value->cstring;
  
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Received Message: %s", action);
  
  if (strcmp(action, "ready") == 0) {
    reload_timers();
  //Add Project to list
  } else if (strcmp(action, "project-added") == 0) {
    Tuple *project_tuple = dict_find(iter, HarvestKeyProject);
    Tuple *name_tuple = dict_find(iter, HarvestKeyName);
    Tuple *active_tuple = dict_find(iter, HarvestKeyActive);

    menu_add_item(project_menu, (MenuItem) {
      .title = name_tuple->value->cstring,
      .id = project_tuple->value->uint32
    }, active_tuple->value->uint32 == 0 ? project_recent : project_all);
    
  //Add task to list
  } else if (strcmp(action, "project-task-added") == 0) {
    Tuple *task_tuple = dict_find(iter, HarvestKeyTask);
    Tuple *name_tuple = dict_find(iter, HarvestKeyName);
    Tuple *active_tuple = dict_find(iter, HarvestKeyActive);
    
    menu_add_item(task_menu, (MenuItem) {
      .title = name_tuple->value->cstring,
      .id = task_tuple->value->uint32,
    }, active_tuple->value->uint32 == 0 ? task_recent : task_all);
    
  //Reload timer list
  } else if (strcmp(action, "timer-list-reload") == 0) {
    reload_timers();
    
  //Handle timer (too big for buffer)
  } else if (strcmp(action, "timer-add-begin") == 0) {
    Tuple *timer_tuple = dict_find(iter, HarvestKeyTimer);
    Tuple *active_tuple = dict_find(iter, HarvestKeyActive);
    
    buffered_timer = (MenuItem*) malloc(sizeof(MenuItem));
    buffered_timer->id = timer_tuple->value->uint32;
    buffered_timer->icon = active_tuple->value->uint32 == 1 ? checkmark_active : checkmark_inactive;
        
  } else if (strcmp(action, "timer-add-project-name") == 0) {
    Tuple *name_tuple = dict_find(iter, HarvestKeyName);
    buffered_timer->title = strdup(name_tuple->value->cstring);
  } else if (strcmp(action, "timer-add-task-name") == 0) {
    Tuple *name_tuple = dict_find(iter, HarvestKeyName);
    buffered_timer->subtitle = strdup(name_tuple->value->cstring);
  } else if (strcmp(action, "timer-add-complete") == 0) {
    menu_add_item(timer_menu, *buffered_timer, timer_list);
    free_and_clear(buffered_timer->title);
    free_and_clear(buffered_timer->subtitle);
    free_and_clear(buffered_timer);
  } else {
    APP_LOG(APP_LOG_LEVEL_DEBUG, "Received Message: %s UNKNOWN", action);
  }
}


static void window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);
  
  timer_menu = menu_create("Timers");
  timer_menu->click = timer_select_handler;
  timer_list = menu_add_section(timer_menu, NULL)->id;
  timer_actions = menu_add_section(timer_menu, NULL)->id;
  timer_menu->basic_render = true;

  project_menu = menu_create("Project List");
  project_recent = menu_add_section(project_menu, "Recent")->id;
  project_all = menu_add_section(project_menu, "All")->id;
  project_menu->click = project_select_handler;

  task_menu = menu_create("Task List");
  task_recent = menu_add_section(task_menu, "Recent")->id;
  task_all = menu_add_section(task_menu, "All")->id;
  task_menu->click = task_select_handler;
}

static void window_unload(Window *window) {
  menu_destroy(project_menu);
  menu_destroy(task_menu);
  menu_destroy(timer_menu);

  gbitmap_destroy(checkmark_active);
  gbitmap_destroy(checkmark_inactive);
}


static void init(void) {
  // Register message handlers
  app_message_register_inbox_received(in_received_handler);
  
  // Init buffers
  app_message_open(120, 120);
  
  checkmark_active = gbitmap_create_with_resource(RESOURCE_ID_CHECK_ACTIVE);
  checkmark_inactive = gbitmap_create_with_resource(RESOURCE_ID_CHECK_INACTIVE);
  
  window = window_create();
  window_set_window_handlers(window, (WindowHandlers) {
    .load = window_load,
    .unload = window_unload,
  });
  window_stack_push(window, true);  
}

static void deinit(void) {
  window_destroy(window);
}

int main(void) {
  init();

  APP_LOG(APP_LOG_LEVEL_DEBUG, "Done initializing, pushed window: %p", window);

  app_event_loop();
  deinit();
}
