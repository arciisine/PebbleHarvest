#include <pebble.h>
#include "common.h"
#include "app.h"
#include "message_format.h"
#include "menu.h"
#include <stdarg.h>

static Menu *project_menu;
static Menu *task_menu;
static Menu *timer_menu;
static Window *message_screen;
static TextLayer *message_text;

static Sections project_sections;
static Sections task_sections;
static Sections timer_sections;

static GBitmap *plus_icon;
static GBitmap *checkmark_active;
static GBitmap *checkmark_inactive;

static char* PROJECT_MENU_TITLE = "Projects";
static char* TIMER_MENU_TITLE = "Active Tasks";
static char* TASK_MENU_TITLE = "Tasks";
static char* OLDER_SECTION_TITLE = "Older";
static char* LOADING_TEXT = "Loading ...";
static char* EMPTY_TEXT = "No Items Found";

static MenuItem* active_item;

static bool menu_is_empty(Menu* menu, Sections sections) {
   return menu->sections[sections.alternate]->item_count == 0 && menu->sections[sections.primary]->item_count == 0 ;
}

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

static void menu_set_status(Menu* menu, uint16_t section_id, char* status) {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Setting Status: %s", status);
  free_and_clear(menu->sections[section_id]->title);
  menu->sections[section_id]->title = strdup(status);
  menu->sections[section_id]->always_show = status != NULL; 
  menu_layer_reload_data(menu->layer);
}

static void timer_menu_open() {  
  menu_empty(timer_menu);
  window_stack_pop_all(false);
  menu_open(timer_menu);
  menu_set_status(timer_menu, timer_sections.status, LOADING_TEXT);
  send_message(ActionTimerListFetch, 0);  
}

static void message_show(char* text) {
  window_stack_pop_all(false);
  text_layer_set_text(message_text, text);
  window_stack_push(message_screen, false);
}

static void project_menu_open() {
  if (menu_is_empty(project_menu, project_sections)) {
    send_message(ActionProjectListFetch, 0);
    menu_set_status(project_menu, project_sections.status, LOADING_TEXT);  
  }
  menu_open(project_menu);
}

static void project_select_handler(MenuItem* item, bool longPress) {
  if (item->id < 0) return;
  
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Project selected: %p, %d %s",item, item->id, item->title);
  menu_empty(task_menu);
  menu_set_status(task_menu, task_sections.status, LOADING_TEXT);  
  send_message(ActionTaskListFetch, 1, AppKeyProject, item->id);
  menu_open(task_menu);
}

static void task_select_handler(MenuItem* item, bool longPress) {
  if (item->id < 0) return;
  
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
      send_message(ActionTimerToggle, 1, AppKeyTimer, item->id);
    }
  } else if (item->id == -2) {
    project_menu_open();
  }
}

int max(int a, int b) { return a< b ? b : a; }

static void timer_active_count(struct tm *tick_time, TimeUnits units_changed) {
  if (active_item) {
    TaskTimer* timer = (TaskTimer*)active_item->data;
    if (units_changed == MINUTE_UNIT) {
      timer->seconds += 60;
      snprintf(active_item->subtitle, max(strlen(active_item->subtitle), 9), "%02d:%02d", 
        (timer->seconds / 3600) % 60, 
        (timer->seconds / 60) % 60
      );
    }
    menu_layer_reload_data(timer_menu->layer);
  }
}

static void timer_list_sync_state() {
  active_item = NULL;
  tick_timer_service_unsubscribe();
  
  MenuSection* timers = timer_menu->sections[timer_sections.primary];

  for (int i = 0; i < timers->item_count; i++) {
    MenuItem* item = timers->items[i];
    TaskTimer* timer = (TaskTimer*)item->data;
    
    if (timer->active) {
      active_item = item;
      item->icon = checkmark_active;
      tick_timer_service_subscribe(MINUTE_UNIT, timer_active_count);
      timer_active_count(NULL, MINUTE_UNIT);
    } else {
      item->icon = checkmark_inactive;
      strcpy(item->subtitle, timer->task);
    }
  }
  
  menu_layer_reload_data(timer_menu->layer);
}

static void on_timerlist_build(DictionaryIterator *iter, Action action) {
  static TaskTimer* buffered_timer;
  
  switch(action) {
    case ActionTimerListStart:
      break;
            
    case ActionTimerListItemStart:      
      buffered_timer = (TaskTimer*) malloc(sizeof(MenuItem));
      buffered_timer->id = dict_key_int(iter, AppKeyTimer);      
      buffered_timer->active = dict_key_bool(iter, AppKeyActive);
      buffered_timer->seconds = dict_key_int(iter, AppKeySeconds);
      break;
      
    case ActionTimerListItemProjectName:
      buffered_timer->project = strdup(dict_key_str(iter, AppKeyName));
      break;
      
    case ActionTimerListItemTaskName:
      buffered_timer->task = strdup(dict_key_str(iter, AppKeyName));
      break;
      
    case ActionTimerListItemEnd:
      menu_add_item(timer_menu, (MenuItem) {
        .id = buffered_timer->id,
        .title = buffered_timer->project,
        .subtitle = buffered_timer->task,
        .data = buffered_timer 
      }, timer_sections.primary);
      
      buffered_timer = NULL;
      
      //If first item
      if (timer_menu->sections[timer_sections.primary]->item_count  == 1) {
        menu_layer_set_selected_index(timer_menu->layer, (MenuIndex){timer_sections.primary,0}, MenuRowAlignTop, false);
      }
      
      break;
      
    case ActionTimerListEnd:
      if (menu_is_empty(timer_menu, timer_sections)){
        menu_set_status(timer_menu, timer_sections.status, EMPTY_TEXT);
      } else {
        menu_set_status(timer_menu, timer_sections.status, NULL); //Remove loading
      }
      
      timer_list_sync_state();
      
      menu_add_item(timer_menu, (MenuItem) {
        .title = "Add Task",
        .id = -2,
        .icon = plus_icon
      }, timer_sections.alternate);
      break;
      
    default: break;/** do nothing */
  }
}

static void on_tasklist_build(DictionaryIterator *iter, Action action) {
  switch(action) {
    case ActionTaskListStart:
      break;
      
    case ActionTaskListItem:
      menu_add_item(task_menu, (MenuItem) {
        .title = dict_key_str(iter, AppKeyName),
        .id = dict_key_int(iter, AppKeyTask),
      }, dict_key_bool(iter, AppKeyActive) ? task_sections.primary : task_sections.alternate);
      break;
      
    case ActionTaskListEnd:
      if (menu_is_empty(task_menu, task_sections)){
        menu_set_status(task_menu, task_sections.status, EMPTY_TEXT);
      } else {
        menu_set_status(task_menu, task_sections.status, NULL); //Remove loading
        menu_force_selection_change_on_current(task_menu);       
      }
      break;
      
    default: break;/** do nothing */
  }    
}


static void on_projectlist_build(DictionaryIterator *iter, Action action) {
  switch(action) {
    case ActionProjectListStart:
      break;
      
    case ActionProjectListItem:     
      menu_add_item(project_menu, (MenuItem) {
        .title = dict_key_str(iter, AppKeyName),
        .id = dict_key_int(iter, AppKeyProject)
      }, dict_key_bool(iter, AppKeyActive) ? project_sections.primary : project_sections.alternate);           
      break;
      
    case ActionProjectListEnd: 
      if (menu_is_empty(project_menu, project_sections)){
         menu_set_status(project_menu, project_sections.status, EMPTY_TEXT);
      } else {
         menu_set_status(project_menu, project_sections.status, NULL); //Remove loading
         menu_force_selection_change_on_current(project_menu);
      }

      break;
      
    default: break;/** do nothing */
  }
}

static void timer_toggle(DictionaryIterator *iter) {
  int id = dict_key_int(iter, AppKeyTimer);
  bool active = dict_key_bool(iter, AppKeyActive);
  MenuSection* timers = timer_menu->sections[timer_sections.primary];
  
  for (int i = 0; i < timers->item_count; i++) {
    MenuItem* item = timers->items[i];
    TaskTimer* timer = (TaskTimer*) item->data;
    timer->active = (item->id == id && active); 
  }
  
  timer_list_sync_state();
}

static void menu_free_timer_data() {
  MenuSection* timers = timer_menu->sections[timer_sections.primary];  
  for (int i = 0; i < MAX_MENU_SIZE; i++) {
    MenuItem* item = timers->items[i];
    TaskTimer* timer = (TaskTimer*)item->data;
    free_and_clear(timer->project);
    free_and_clear(timer->task);
    free_and_clear(timers->items[i]);        
  }  
}

static void on_message(DictionaryIterator *iter, void *context) {
  Action action = dict_key_int(iter, AppKeyAction);

  const char* actionName = ActionNames[action];

  APP_LOG(APP_LOG_LEVEL_DEBUG, "Received Message: %s", actionName);
  
  switch(action) {
    case ActionReady:
      //Reset for full update
      menu_empty(timer_menu);
      menu_empty(project_menu);
      menu_empty(task_menu);
      timer_menu_open();
      break;
    
    case ActionUnauthenticated:
      message_show("Please login first via the Settings Menu");
      break;

    case ActionTimerListReload:
      timer_menu_open();
      break;
      
    case ActionTimerToggle:
      timer_toggle(iter);
      break;
      
    case ActionProjectListStart:
    case ActionProjectListItem:
    case ActionProjectListEnd: 
      return on_projectlist_build(iter, action);
      
    case ActionTaskListStart:
    case ActionTaskListItem:
    case ActionTaskListEnd: 
      return on_tasklist_build(iter, action);      
      
    case ActionTimerListStart:      
    case ActionTimerListItemStart:      
    case ActionTimerListItemProjectName:
    case ActionTimerListItemTaskName:
    case ActionTimerListItemEnd:
    case ActionTimerListEnd:
      return on_timerlist_build(iter, action);
      
    default:
      APP_LOG(APP_LOG_LEVEL_DEBUG, "Received Message: %s UNKNOWN", actionName);
  }
}


static void main_menu_load(Window *window) {}
static void main_menu_unload(Window *window) {}
static void main_menu_appear(Window *window) {
  timer_list_sync_state();
}
static void main_menu_disappear(Window *window) {
  tick_timer_service_unsubscribe();
}

static void init_message() {
  //Initialize Message Screen
  message_screen = window_create();
  Layer* root = window_get_root_layer(message_screen);
  GRect bounds = layer_get_frame(root);  
  message_text = text_layer_create((GRect){.size={bounds.size.w, bounds.size.h-20}, .origin={0, 20}});
  text_layer_set_font(message_text, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD));
  text_layer_set_text_alignment(message_text, GTextAlignmentCenter);  
  layer_add_child(root, text_layer_get_layer(message_text));

  message_show(LOADING_TEXT);
}

static void init(void) {
  //Init Timer Menu
  timer_menu = menu_create(TIMER_MENU_TITLE);
  timer_menu->click = timer_select_handler;
  
  timer_sections = (Sections) {
    .status = menu_add_section(timer_menu, NULL)->id,
    .primary = menu_add_section(timer_menu, NULL)->id,
    .alternate = menu_add_section(timer_menu, NULL)->id  
  };
  
  timer_menu->basic_render = true;
  timer_menu->window_handlers.appear = main_menu_appear;
  timer_menu->window_handlers.load = main_menu_load;
  timer_menu->window_handlers.unload = main_menu_unload;
  timer_menu->window_handlers.disappear = main_menu_disappear;
  
  //Init project menu
  project_menu = menu_create(PROJECT_MENU_TITLE);
  project_sections = (Sections) {
    .status = menu_add_section(project_menu, NULL)->id,
    .primary = menu_add_section(project_menu, NULL)->id,
    .alternate = menu_add_section(project_menu, OLDER_SECTION_TITLE)->id  
  };
  project_menu->click = project_select_handler;

  //Init Taks Menu
  task_menu = menu_create(TASK_MENU_TITLE);
  task_sections = (Sections) {
    .status = menu_add_section(task_menu, NULL)->id,
    .primary = menu_add_section(task_menu, NULL)->id,
    .alternate = menu_add_section(task_menu, OLDER_SECTION_TITLE)->id  
  };
  
  task_menu->click = task_select_handler;
  
  checkmark_active = gbitmap_create_with_resource(RESOURCE_ID_CHECK_ACTIVE);
  checkmark_inactive = gbitmap_create_with_resource(RESOURCE_ID_CHECK_INACTIVE);
  plus_icon = gbitmap_create_with_resource(RESOURCE_ID_PLUS);   

  init_message();
    
  // Register message handlers
  app_message_register_inbox_received(on_message);
  
  // Init buffers
  app_message_open(120, 120);
}

static void deinit(void) {
  menu_free_timer_data(timer_menu);
  
  //Destroy menu
  menu_destroy(timer_menu);
  menu_destroy(project_menu);
  menu_destroy(task_menu);
  
  //Destroy message screen
  text_layer_destroy(message_text);
  window_destroy(message_screen);
    
  gbitmap_destroy(checkmark_active);
  gbitmap_destroy(checkmark_inactive);
  gbitmap_destroy(plus_icon);
}

int main(void) {
  init();
  app_event_loop();
  deinit();
}
