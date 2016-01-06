#include "common.h"
#include "menu.h"

#define MAX_MENU_SIZE 200

static MenuLayer *menu_layer;
static MenuItem *menu_items[MAX_MENU_SIZE];
static MenuSelectHandler *menu_select_handler;
static int menu_size = 0;

void menu_window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_frame(window_layer);  
  menu_layer = menu_layer_create(bounds);
}

void menu_window_unload(Window *window) {
  menu_layer_destroy(menu_layer);
}

void menu_close() {
  for (int i = 0; i < menu_size; i++) {
    free(menu_items[i]->title);
    free(menu_items[i]->subtitle);
    menu_items[i]->title = NULL;
    menu_items[i]->subtitle = NULL;
    menu_items[i]->id = 0;
  }
  menu_size = 0; 
  menu_layer_destroy(menu_layer);
}

void menu_cleanup() {
  for (uint16_t i = 0; i < MAX_MENU_SIZE; i++) {
    if (menu_items[i]) {
      free(menu_items[i]);
    }
  }
  free(menu_select_handler);
  menu_size = 0;
}

uint16_t menu_row_count(struct MenuLayer *menu_layer, uint16_t section_index, void *callback_context) {
  return menu_size;
}

uint16_t menu_section_count(struct MenuLayer *menu_layer, void *callback_context) {
  return 1;
}

int16_t menu_get_header_height(MenuLayer *menu_layer, uint16_t section_index, void *data) {
  // This is a define provided in pebble.h that you may use for the default height
  return MENU_CELL_BASIC_HEADER_HEIGHT;
}

void menu_draw_row(GContext* ctx, const Layer *cell_layer, MenuIndex *cell_index, void *data) {
  MenuIndex row = menu_layer_get_selected_index(menu_layer);
  MenuItem* item = menu_items[row.row];
  menu_cell_basic_draw(ctx, cell_layer, item->title, item->subtitle, NULL);
}

void menu_select_click(MenuLayer* menu_layer, MenuIndex* index, void* data) {
   menu_select_handler->click(menu_items[index->row]); 
}

void menu_select_long_click(MenuLayer* menu_layer, MenuIndex* index, void* data) {
   menu_select_handler->long_click(menu_items[index->row]); 
}

void menu_open(MenuSelectHandler menuSelect) {
  if (menu_size > 0) {
    menu_close();
  }
  if (menu_select_handler == NULL) {
    menu_select_handler = malloc(sizeof(MenuSelectHandler));
  }
  
  menu_select_handler->click = menuSelect.click;  
  menu_select_handler->long_click = menuSelect.long_click;
  
  menu_layer_set_callbacks(menu_layer, NULL, (MenuLayerCallbacks) {
    .get_num_rows = menu_row_count,
    .get_header_height = menu_get_header_height,
    .get_num_sections = menu_section_count,
    .draw_row = menu_draw_row,
    .select_click = menu_select_click,
    .select_long_click = menu_select_long_click
  });
}

void menu_add_item(MenuItem* item) {
  menu_size++;
  if (!menu_items[menu_size]) {
    menu_items[menu_size] = malloc(sizeof(MenuItem));
  }
  MenuItem* copy = menu_items[menu_size];  
  copy->title = malloc(sizeof(char)*strlen(item->title));
  strcpy(copy->title, item->title);
  
  copy->subtitle = malloc(sizeof(char)*strlen(item->subtitle));
  strcpy(copy->subtitle, item->subtitle);
  
  copy->id = item->id;
}