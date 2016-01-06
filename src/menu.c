#include "common.h"
#include "menu.h"

void menu_empty(Menu* menu) {
  for (int i = 0; i < menu->size; i++) {
    if (menu->items[i]->title) {
      free(menu->items[i]->title);
      menu->items[i]->title = NULL;
    }
    if (menu->items[i]->subtitle) {
      free(menu->items[i]->subtitle);  
      menu->items[i]->subtitle = NULL;
    }
    menu->items[i]->id = 0;
  }
  menu->size = 0; 
}

uint16_t menu_row_count(struct MenuLayer *menu_layer, uint16_t section_index, void *callback_context) {
  Menu* menu = (Menu*) callback_context;
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Getting menu row count: %p %d", menu, menu->size);
  return menu->size;
}

void menu_draw_row(GContext* ctx, const Layer *cell_layer, MenuIndex *cell_index, void *data) {
  Menu* menu = (Menu*) data;
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Drawing menu row: %p %d", menu, cell_index->row);
  MenuItem* item = menu->items[cell_index->row];
  menu_cell_basic_draw(ctx, cell_layer, item->title, item->subtitle, NULL);
}

void menu_select_click(MenuLayer* menu_layer, MenuIndex* index, void* data) {
   Menu* menu = (Menu*) data;
   APP_LOG(APP_LOG_LEVEL_DEBUG, "Menu select: %p", menu);
   menu->click(menu->items[index->row], false); 
}

void menu_select_long_click(MenuLayer* menu_layer, MenuIndex* index, void* data) {
   Menu* menu = (Menu*) data;
   APP_LOG(APP_LOG_LEVEL_DEBUG, "Menu long select: %p", menu);
   menu->click(menu->items[index->row], true); 
}

void menu_open(Menu* menu) {
  window_stack_push(menu->window, true);
}

void menu_close(Menu* menu) {
  window_stack_remove(menu->window, true);
}

MenuItem* menu_add_item(Menu* menu, MenuItem item) {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Menu adding item: %p", menu);
  
  if (!menu->items[menu->size]) {
    menu->items[menu->size] = malloc(sizeof(MenuItem));
  }

  MenuItem* copy = menu->items[menu->size];
  
  if (item.title) {
    int len = strlen(item.title);
    copy->title = malloc(sizeof(char)*len);
    strncpy(copy->title, item.title, len);
  } else {
    copy->title = NULL;
  }
  
  if (item.subtitle) {
    int len = strlen(item.subtitle);
    copy->subtitle = malloc(sizeof(char)*len);
    strncpy(copy->subtitle, item.subtitle, len);
  } else {
    copy->subtitle = NULL;
  }
  
  copy->id = item.id;

  menu->size++;
  menu_layer_reload_data(menu->layer);
  return copy;  
}

void menu_window_load(Window* window) {
  Menu* menu = (Menu*) window_get_user_data(window);
  //Do something
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Menu window loaded: %p, %p", menu, menu->parent);
}

void menu_window_unload(Window* window) {
  Menu* menu = (Menu*) window_get_user_data(window);
  //Do something
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Menu window unloaded: %p, %p", menu, menu->parent);
}

Menu* menu_create() {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Initializing menu");
    
  Menu* menu = (Menu*) malloc(sizeof(Menu));

    
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Setting menu window: %p", menu);
  menu->window = window_create();
  menu->parent = window_get_root_layer(menu->window);
  
  window_set_user_data(menu->window, menu);
  
  window_set_window_handlers(menu->window, (WindowHandlers){
    .load = menu_window_load,
    .unload = menu_window_unload,
  });
  
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Setting menu layer: %p", menu);
  GRect bounds = layer_get_frame(menu->parent);  
  menu->layer = menu_layer_create(bounds);
  layer_add_child(menu->parent,  menu_layer_get_layer(menu->layer));
  
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Setting menu callbacks: %p", menu);
  
  menu_layer_set_callbacks(menu->layer, menu, (MenuLayerCallbacks) {
    .get_num_rows = menu_row_count,
    .draw_row = menu_draw_row,
    .select_click = menu_select_click,
    .select_long_click = menu_select_long_click
  });
  
  menu_layer_set_click_config_onto_window(menu->layer, menu->window);
        
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Done initializing, menu: %p", menu); 
  
  return menu;  
}

void menu_destroy(Menu* menu) {
  menu_empty(menu);
  
  for (uint16_t i = 0; i < MAX_MENU_SIZE; i++) {
    if (menu->items[i] != NULL) {
      free(menu->items[i]);
    }
  }
  
  menu_layer_destroy(menu->layer);
  window_destroy(menu->window);
  free(menu);
}