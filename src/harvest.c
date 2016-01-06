#include <pebble.h>

static Window *window;
static TextLayer *text_layer;

typedef enum {
  HarvestKeyProject = 0,
  HarvestKeyTask,
  HarvestKeyTimer,
  HarvestKeyName,
  HarvestKeyActive
} HarvestKey; 

static bool send_to_phone_multi(int key, int valueInt, char *valueStr) {
  DictionaryIterator *iter;
  app_message_outbox_begin(&iter);

  if(valueStr) {
    // We are sending the stocks symbol
    dict_write_cstring(iter, key, valueStr);
  } else {
    // Some other request with no string data
    dict_write_int(iter, key, &valueInt, sizeof(int), true);
  }

  dict_write_end(iter);
  app_message_outbox_send();
  return true;
}

static void select_click_handler(ClickRecognizerRef recognizer, void *context) {
  text_layer_set_text(text_layer, "Select");
  send_to_phone_multi(HarvestKeyProject, 0, NULL);
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
}

static void window_unload(Window *window) {
  text_layer_destroy(text_layer);
}

static void in_received_handler(DictionaryIterator *iter, void *context) {
  static char label[100];
  
  Tuple *project_tuple = dict_find(iter, HarvestKeyProject);
  Tuple *name_tuple = dict_find(iter, HarvestKeyName);

  if (project_tuple) {
    strcpy(label, name_tuple->value->cstring);
    text_layer_set_text(text_layer, label);
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
