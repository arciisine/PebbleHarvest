#include "common.h"
#include "menu.h"

void menu_empty(Menu* menu) {
  for (int i = 0; i < menu->size; i++) {
    free(menu->items[i]->title);
    free(menu->items[i]->subtitle);
    menu->items[i]->title = NULL;
    menu->items[i]->subtitle = NULL;
    menu->items[i]->id = 0;
  }
  menu->size = 0; 
}

void menu_destroy(Menu* menu) {  
  menu_empty(menu);
  
  for (uint16_t i = 0; i < MAX_MENU_SIZE; i++) {
    if (menu->items[i] != NULL) {
      free(menu->items[i]);
    }
  }
  
  menu_layer_destroy(menu->layer);
  free(menu);
}

uint16_t menu_row_count(struct MenuLayer *menu_layer, uint16_t section_index, void *callback_context) {
  Menu* menu = (Menu*) callback_context;
  return menu->size;
}

uint16_t menu_section_count(struct MenuLayer *menu_layer, void *callback_context) {
  return 1;
}

int16_t menu_get_header_height(MenuLayer *menu_layer, uint16_t section_index, void *data) {
  // This is a define provided in pebble.h that you may use for the default height
  return MENU_CELL_BASIC_HEADER_HEIGHT;
}

void menu_draw_row(GContext* ctx, const Layer *cell_layer, MenuIndex *cell_index, void *data) {
  Menu* menu = (Menu*) data;
  MenuIndex row = menu_layer_get_selected_index(menu->layer);
  MenuItem* item = menu->items[row.row];
  menu_cell_basic_draw(ctx, cell_layer, item->title, item->subtitle, NULL);
}

void menu_select_click(MenuLayer* menu_layer, MenuIndex* index, void* data) {
   Menu* menu = (Menu*) data;
   menu->click(menu->items[index->row], false); 
}

void menu_select_long_click(MenuLayer* menu_layer, MenuIndex* index, void* data) {
   Menu* menu = (Menu*) data;
   menu->click(menu->items[index->row], true); 
}

void menu_open(Menu* menu) {
  layer_set_hidden((Layer*) menu->layer, false);
}

void menu_close(Menu* menu) {
  layer_set_hidden((Layer*) menu->layer, true);
}

void menu_add_item(Menu* menu, MenuItem* item) {
  menu->size++;
  if (!menu->items[menu->size]) {
    menu->items[menu->size] = malloc(sizeof(MenuItem));
  }
  MenuItem* copy = menu->items[menu->size];  
  copy->title = malloc(sizeof(char)*strlen(item->title));
  strcpy(copy->title, item->title);
  
  copy->subtitle = malloc(sizeof(char)*strlen(item->subtitle));
  strcpy(copy->subtitle, item->subtitle);
  
  copy->id = item->id;
}

Menu* menu_create(Window *window) {
  Menu* menu = (Menu*) malloc(sizeof(Menu));
  menu->parent = window_get_root_layer(window);
  GRect bounds = layer_get_frame(menu->parent);  
  menu->layer = menu_layer_create(bounds);

  layer_set_hidden((Layer*)menu->layer, true);

  menu_layer_set_callbacks(menu->layer, menu, (MenuLayerCallbacks) {
    .get_num_rows = menu_row_count,
    .get_header_height = menu_get_header_height,
    .get_num_sections = menu_section_count,
    .draw_row = menu_draw_row,
    .select_click = menu_select_click,
    .select_long_click = menu_select_long_click
  });
  
  return menu;  
}