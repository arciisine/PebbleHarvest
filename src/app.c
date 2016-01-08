#include "common.h"
#include "message_format.h"
#include "menu.h"
#include <stdarg.h>

typedef struct Sections {
  int status;
  int primary;
  int alternate; 
} Sections;

static Window *window;
static Menu *project_menu;
static Menu *task_menu;
static Menu *timer_menu;

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

static MenuItem ADD_TASK_ITEM = {
  .title = "Add Task",
  .id = -2
};

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
  free_and_clear(menu->sections[section_id]->title);
  if (status) {
    menu->sections[section_id]->title = strdup(status);
    menu->sections[section_id]->always_show = true;
  } else {
    menu->sections[section_id]->always_show = false;
  }
  menu_layer_reload_data(menu->layer);
}

static void reload_timers() {
  menu_close(project_menu);
  menu_close(task_menu);
  menu_empty(timer_menu);
  menu_set_status(timer_menu, timer_sections.status, LOADING_TEXT);
  send_message(ActionTimerListFetch, 0);
  menu_open(timer_menu);
}

static void open_project_menu() {
  if (
    project_menu->sections[project_sections.primary]->item_count == 0 &&
    project_menu->sections[project_sections.alternate]->item_count == 0
  ) {
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
    open_project_menu();
  }
}

static void on_timerlist_build(DictionaryIterator *iter, Action action) {
  static MenuItem* buffered_timer;

  switch(action) {
    case ActionTimerListStart:
      break;
            
    case ActionTimerListItemStart:      
      buffered_timer = (MenuItem*) malloc(sizeof(MenuItem));
      buffered_timer->id = dict_key_int(iter, AppKeyTimer);
      buffered_timer->icon = dict_key_bool(iter, AppKeyActive) ? checkmark_active : checkmark_inactive;
      break;
      
    case ActionTimerListItemProjectName:
      buffered_timer->title = strdup(dict_key_str(iter, AppKeyName));
      break;
      
    case ActionTimerListItemTaskName:
      buffered_timer->subtitle = strdup(dict_key_str(iter, AppKeyName));
      break;
      
    case ActionTimerListItemEnd:
      menu_add_item(timer_menu, *buffered_timer, timer_sections.primary);
      free_and_clear(buffered_timer->title);
      free_and_clear(buffered_timer->subtitle);
      free_and_clear(buffered_timer);
      
      //If first item
      if (timer_menu->sections[timer_sections.primary]->item_count  == 1) {
        menu_layer_set_selected_index(timer_menu->layer, (MenuIndex){timer_sections.primary,0}, MenuRowAlignTop, false);
      }
      
      break;
      
    case ActionTimerListEnd:
      if (timer_menu->sections[timer_sections.primary]->item_count == 0 ){
        menu_set_status(timer_menu, timer_sections.status, EMPTY_TEXT);
      } else {
        menu_set_status(timer_menu, timer_sections.status, NULL); //Remove loading
      }
      
      menu_add_item(timer_menu, ADD_TASK_ITEM, timer_sections.alternate);
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
      if (
        task_menu->sections[task_sections.alternate]->item_count == 0 &&
        task_menu->sections[task_sections.primary]->item_count == 0  
      ){
        menu_set_status(task_menu, task_sections.status, EMPTY_TEXT);
      } else {
        menu_set_status(task_menu, task_sections.status, NULL); //Remove loading       
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
      if (
        project_menu->sections[project_sections.alternate]->item_count == 0 &&
        project_menu->sections[project_sections.primary]->item_count == 0  
      ){
         menu_set_status(project_menu, project_sections.status, EMPTY_TEXT);
      } else {
         menu_set_status(project_menu, project_sections.status, NULL); //Remove loading 
      }

      break;
      
    default: break;/** do nothing */
  }
}

static void toggle_timer(DictionaryIterator *iter) {
  int id = dict_key_int(iter, AppKeyTimer);
  bool active = dict_key_bool(iter, AppKeyActive);
  MenuSection* timers = timer_menu->sections[timer_sections.primary];
  
  for (int i = 0; i < timers->item_count; i++) {
    MenuItem* item = timers->items[i];
    item->icon = (item->id == id && active) ? checkmark_active : checkmark_inactive;    
  }
  
  menu_layer_reload_data(timer_menu->layer);  
}

static void on_message(DictionaryIterator *iter, void *context) {
  Action action = (Action) dict_find(iter, AppKeyAction)->value->uint32;

  const char* actionName = ActionNames[action];

  APP_LOG(APP_LOG_LEVEL_DEBUG, "Received Message: %s", actionName);
  
  switch(action) {
    case ActionReady:
      reload_timers();
      break;

    case ActionTimerListReload:
      reload_timers();
      break;
      
    case ActionTimerToggle:
      toggle_timer(iter);
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


static void main_menu_load(Window *window) {
    
  checkmark_active = gbitmap_create_with_resource(RESOURCE_ID_CHECK_ACTIVE);
  checkmark_inactive = gbitmap_create_with_resource(RESOURCE_ID_CHECK_INACTIVE);
  plus_icon = gbitmap_create_with_resource(RESOURCE_ID_PLUS);
  
  ADD_TASK_ITEM.icon = plus_icon;
  
  project_menu = menu_create(PROJECT_MENU_TITLE);
  project_sections = (Sections) {
    .status = menu_add_section(project_menu, NULL)->id,
    .primary = menu_add_section(project_menu, NULL)->id,
    .alternate = menu_add_section(project_menu, OLDER_SECTION_TITLE)->id  
  };
  project_menu->click = project_select_handler;

  task_menu = menu_create(TASK_MENU_TITLE);
  task_sections = (Sections) {
    .status = menu_add_section(task_menu, NULL)->id,
    .primary = menu_add_section(task_menu, NULL)->id,
    .alternate = menu_add_section(task_menu, OLDER_SECTION_TITLE)->id  
  };
  
  task_menu->click = task_select_handler;
}

static void main_menu_unload(Window *window) {
  menu_destroy(project_menu);
  menu_destroy(task_menu);

  gbitmap_destroy(checkmark_active);
  gbitmap_destroy(checkmark_inactive);
  gbitmap_destroy(plus_icon);
}

static void main_menu_appear(Window *window) {
  
}

static void init(void) {
  // Register message handlers
  app_message_register_inbox_received(on_message);
  
  // Init buffers
  app_message_open(120, 120);
  
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
