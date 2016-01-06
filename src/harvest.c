#include "common.h"
#include "menu.h"
#include <stdarg.h>

static Window *window;
static TextLayer *text_layer;
static Menu *project_menu;
static Menu *task_menu;
static Menu *timer_menu;


static int project_recent = -1;
static int project_all = -1;

static int task_recent = -1;
static int task_all = -1;

static bool send_message(int count, ...) {
  va_list argp;
  
  va_start(argp, count);

  DictionaryIterator *iter;
  app_message_outbox_begin(&iter);
  
  for (int i = 0; i < count; i++) {  
    int key = va_arg(argp, int);
    int value = va_arg(argp, int);
    
    // Some other request with no string data
    dict_write_int(iter, key, &value, sizeof(int), true);
  }
  
  dict_write_end(iter);
  app_message_outbox_send();
  va_end(argp);
  
  return true;
}

static void select_click_handler(ClickRecognizerRef recognizer, void *context) {
  text_layer_set_text(text_layer, "Select");
  if (project_menu->item_count == 0) {
    send_message(1, HarvestKeyProject, 0);  
    menu_empty(project_menu);
  }
  menu_open(project_menu);
}

static void project_select_handler(MenuItem* item, bool longPress) {
   APP_LOG(APP_LOG_LEVEL_DEBUG, "Project selected: %p, %d %s",item, item->id, item->title);
   menu_empty(task_menu);
   send_message(2, 
     HarvestKeyProject, item->id,
     HarvestKeyTask, 0
   );
   menu_open(task_menu);
}

static void task_select_handler(MenuItem* item, bool longPress) {
   APP_LOG(APP_LOG_LEVEL_DEBUG, "Task selected: %p, %d %s",item, item->id, item->title);
}

static void up_click_handler(ClickRecognizerRef recognizer, void *context) {
  text_layer_set_text(text_layer, "Up");
}

static void down_click_handler(ClickRecognizerRef recognizer, void *context) {
  text_layer_set_text(text_layer, "Down");
}

static void click_config_provider(void *context) {
  window_single_click_subscribe(BUTTON_ID_SELECT, select_click_handler);
  window_single_click_subscribe(BUTTON_ID_UP, up_click_handler);
  window_single_click_subscribe(BUTTON_ID_DOWN, down_click_handler);
}

static void window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);

  text_layer = text_layer_create((GRect) { .origin = { 0, 72 }, .size = { bounds.size.w, 20 } });
  text_layer_set_text(text_layer, "Press a button");
  text_layer_set_text_alignment(text_layer, GTextAlignmentCenter);
  layer_add_child(window_layer, text_layer_get_layer(text_layer));
  
  project_menu = menu_create("Project List");
  project_recent = menu_add_section(project_menu, "Recent")->id;
  project_all = menu_add_section(project_menu, "All")->id;
  project_menu->click = project_select_handler;

  task_menu = menu_create("Task List");
  task_recent = menu_add_section(task_menu, "Recent")->id;
  task_all = menu_add_section(task_menu, "All")->id;
  task_menu->click = task_select_handler;
  
  timer_menu = menu_create("Timers");
}

static void window_unload(Window *window) {
  text_layer_destroy(text_layer);
  menu_destroy(project_menu);
  menu_destroy(task_menu);
  menu_destroy(timer_menu);
}

static void in_received_handler(DictionaryIterator *iter, void *context) {
  Tuple *project_tuple = dict_find(iter, HarvestKeyProject);
  Tuple *task_tuple = dict_find(iter, HarvestKeyTask);
  Tuple *name_tuple = dict_find(iter, HarvestKeyName);

  if (project_tuple) {
    APP_LOG(APP_LOG_LEVEL_DEBUG, "Received project: %s", name_tuple->value->cstring);
    menu_add_item(project_menu, (MenuItem) {
      .title = name_tuple->value->cstring,
      .id = project_tuple->value->uint32
    }, project_all);
  } else if (task_tuple) {
    menu_add_item(task_menu, (MenuItem) {
      .title = name_tuple->value->cstring,
      .id = task_tuple->value->uint32
    }, project_all);
  }
}

static void init(void) {
  // Register message handlers
  app_message_register_inbox_received(in_received_handler);
  
  // Init buffers
  app_message_open(64, 64);
  
  window = window_create();
  window_set_click_config_provider(window, click_config_provider);
  window_set_window_handlers(window, (WindowHandlers) {
    .load = window_load,
    .unload = window_unload,
  });
  const bool animated = true;
  window_stack_push(window, animated);
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
