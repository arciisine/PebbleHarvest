#include "common.h"
#include "menu.h"

void menu_empty(Menu* menu) {
  for (int s = 0; s < menu->section_count; s++ ) {
    MenuSection* section = menu->sections[s];
    section->item_count = 0;
    free_and_clear(section);
  }
  
  for (int i = 0; i < menu->item_count; i++) {
    MenuItem* item = menu->items[i];
    free_and_clear(item->title);
    free_and_clear(item->subtitle);  
    item->id = 0;
  }
  
  menu->section_count = 0;  
  menu->item_count = 0;
}

uint16_t menu_row_count(struct MenuLayer *menu_layer, uint16_t section_index, void *callback_context) {
  Menu* menu = (Menu*) callback_context;
  return menu->sections[section_index]->item_count;
}

int16_t menu_header_height(struct MenuLayer *menu_layer, uint16_t section_index, void *callback_context) {
  Menu* menu = (Menu*) callback_context;
  MenuSection* section = menu->sections[section_index];
  return (section->title != NULL) ? 20 : 0;
}

uint16_t menu_section_count(struct MenuLayer *menu_layer, void *callback_context) {
  Menu* menu = (Menu*) callback_context;
  return menu->section_count;
}

void menu_draw_header(GContext *ctx, const Layer *cell_layer, uint16_t section_index, void *callback_context) {
  Menu* menu = (Menu*) callback_context;
  MenuSection* section = menu->sections[section_index];
  GRect bounds = layer_get_frame(cell_layer);
  
  if (section->title) {
    graphics_draw_text(ctx, section->title, 
    fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD), 
    (GRect) { .size = { bounds.size.w, 20}, .origin = { 0, 0 } }, 
    GTextOverflowModeTrailingEllipsis, GTextAlignmentCenter, NULL);
  }
}

void menu_draw_row(GContext* ctx, const Layer *cell_layer, MenuIndex *cell_index, void *data) {
  Menu* menu = (Menu*) data;
  MenuItem* item = menu->sections[cell_index->section]->items[cell_index->row];
  menu_cell_basic_draw(ctx, cell_layer, item->title, item->subtitle, NULL);
}

void menu_select_click(MenuLayer* menu_layer, MenuIndex* index, void* data) {
   Menu* menu = (Menu*) data;
   APP_LOG(APP_LOG_LEVEL_DEBUG, "Menu select: %p", menu);
   menu->click(menu->sections[index->section]->items[index->row], false); 
}

void menu_select_long_click(MenuLayer* menu_layer, MenuIndex* index, void* data) {
   Menu* menu = (Menu*) data;
   APP_LOG(APP_LOG_LEVEL_DEBUG, "Menu long select: %p", menu);
   menu->click(menu->sections[index->section]->items[index->row], true); 
}

void menu_open(Menu* menu) {
  window_stack_push(menu->window, true);
}

void menu_close(Menu* menu) {
  window_stack_remove(menu->window, true);
}

MenuSection* menu_add_section(Menu* menu, char* title) {
  MenuSection* section = (MenuSection*)malloc(sizeof(MenuSection));
  menu->sections[menu->section_count++] = section;
  section->title = strdup(title);
  section->id = menu->section_count-1; 
  return section;
}

MenuItem* menu_add_item(Menu* menu, MenuItem item, uint16_t sectionId) {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Menu adding item: %p, %s", menu, item.title);
  
  MenuSection* section = menu->sections[sectionId];
  
  //Don't require section if using basic list 
  if (!section && sectionId == 0) {
    menu_add_section(menu, NULL);
    section = menu->sections[sectionId];
  }
  
  if (!menu->items[menu->item_count]) {
    menu->items[menu->item_count] = malloc(sizeof(MenuItem));
  }

  MenuItem* copy = menu->items[menu->item_count++];
  copy->title = strdup(item.title);
  copy->subtitle = strdup(item.subtitle);
  copy->id = item.id;
  copy->icon = item.icon;
 
  section->items[section->item_count++] = copy;
  
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

Menu* menu_create(char* title) {
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

  GRect bounds = layer_get_frame(menu->parent);

  APP_LOG(APP_LOG_LEVEL_DEBUG, "Setting menu titl: %p", menu);
  if (title != NULL) {
    menu->title = strdup(title);
    
    bounds.size.h -= 20;
    bounds.origin.y += 20;
    
    menu->titleLayer = text_layer_create((GRect) { .origin = { 0, 0 }, .size = { bounds.size.w, 20 } });
    text_layer_set_background_color(menu->titleLayer, GColorFromHEX(0x666666));
    text_layer_set_text_color(menu->titleLayer, GColorFromHEX(0xFFFFFF));
    text_layer_set_text(menu->titleLayer, menu->title);
    text_layer_set_text_alignment(menu->titleLayer, GTextAlignmentCenter);
    layer_add_child(menu->parent, text_layer_get_layer(menu->titleLayer));
  }

  APP_LOG(APP_LOG_LEVEL_DEBUG, "Setting menu layer: %p", menu);
  menu->layer = menu_layer_create(bounds);
  
  layer_add_child(menu->parent,  menu_layer_get_layer(menu->layer));
  menu_layer_pad_bottom_enable(menu->layer, false);
  
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Setting menu callbacks: %p", menu);
  
  menu_layer_set_callbacks(menu->layer, menu, (MenuLayerCallbacks) {
    .get_num_rows = menu_row_count,
    .get_num_sections = menu_section_count,
    .get_header_height = menu_header_height,
    .draw_row = menu_draw_row,
    .draw_header = menu_draw_header,
    .select_click = menu_select_click,
    .select_long_click = menu_select_long_click
  });
  
  menu_layer_set_click_config_onto_window(menu->layer, menu->window);
        
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Done initializing, menu: %p", menu); 
  
  return menu;  
}

void menu_destroy(Menu* menu) {
  menu_empty(menu);
  for (uint16_t s = 0; s < MAX_MENU_SIZE; s++ ) {
    if (menu->sections[s] != NULL ) {
      free_and_clear(menu->sections[s]);
    }
  }
  
  for (uint16_t i = 0; i < MAX_MENU_SIZE; i++) {
    if (menu->items[i] != NULL) {
      free_and_clear(menu->items[i]);
    }
  }
  
  menu_layer_destroy(menu->layer);
  if (menu->title != NULL) {
    text_layer_destroy(menu->titleLayer);
    free_and_clear(menu->title);
  }
  window_destroy(menu->window);
  free_and_clear(menu);
}