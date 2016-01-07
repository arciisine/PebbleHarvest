#include "common.h"
#include "menu.h"

#define CELL_HEIGHT 30
#define BASIC_CELL_HEIGHT 48
#define CELL_PADDING 3
#define ICON_HEIGHT (CELL_HEIGHT - 5)
#define TITLE_HEIGHT 20

void menu_empty(Menu* menu) {
  for (int s = 0; s < menu->section_count; s++ ) {
    MenuSection* section = menu->sections[s];
    section->item_count = 0;
  }
  
  for (int i = 0; i < menu->item_count; i++) {
    MenuItem* item = menu->items[i];
    free_and_clear(item->title);
    free_and_clear(item->subtitle);  
    item->id = 0;
  }
  
  menu->item_count = 0;
}

uint16_t menu_row_count(struct MenuLayer *menu_layer, uint16_t section_index, void *callback_context) {
  Menu* menu = (Menu*) callback_context;
  int count = menu->sections[section_index]->item_count;
  //APP_LOG(APP_LOG_LEVEL_DEBUG, "Menu row count: %p, %d", menu, count);
  return count;
}

int16_t menu_header_height(struct MenuLayer *menu_layer, uint16_t section_index, void *callback_context) {
  Menu* menu = (Menu*) callback_context;
  MenuSection* section = menu->sections[section_index];
  return (section->title != NULL && section->item_count > 0) ? TITLE_HEIGHT : 0;
}

uint16_t menu_section_count(struct MenuLayer *menu_layer, void *callback_context) {
  Menu* menu = (Menu*) callback_context;
  //APP_LOG(APP_LOG_LEVEL_DEBUG, "Menu section count: %p, %d", menu, menu->section_count);
  return menu->section_count;
}

void menu_draw_header(GContext *ctx, const Layer *cell_layer, uint16_t section_index, void *callback_context) {
  Menu* menu = (Menu*) callback_context;
  MenuSection* section = menu->sections[section_index];
  GRect bounds = layer_get_frame(cell_layer);
  
  graphics_context_set_stroke_color(ctx, GColorFromHEX(0x000000));
  graphics_draw_line(ctx, (GPoint){0,1}, (GPoint){bounds.size.w,1});
  graphics_draw_line(ctx, (GPoint){0,bounds.size.h-1}, (GPoint){bounds.size.w,bounds.size.h-1});

  if (section->title) {
    //APP_LOG(APP_LOG_LEVEL_DEBUG, "Menu draw header: %p, %s", menu, section->title);    
    graphics_draw_text(ctx, section->title, 
      fonts_get_system_font(FONT_KEY_GOTHIC_14_BOLD), 
      (GRect) { .size = { bounds.size.w, TITLE_HEIGHT}, .origin = { 0, 0 } }, 
      GTextOverflowModeTrailingEllipsis, GTextAlignmentCenter, NULL);
  }
}

int16_t menu_cell_height(struct MenuLayer *menu_layer, MenuIndex *cell_index, void *callback_context) {
  Menu* menu = (Menu*) callback_context;
  return menu->basic_render ? BASIC_CELL_HEIGHT : CELL_HEIGHT;
}

void menu_draw_row(GContext* ctx, const Layer *cell_layer, MenuIndex *cell_index, void *data) {
  Menu* menu = (Menu*) data;
  MenuItem* item = menu->sections[cell_index->section]->items[cell_index->row];
  
  if (menu->basic_render) {
    menu_cell_basic_draw(ctx, cell_layer, item->title, item->subtitle, item->icon);
    return;
  }
  
  //APP_LOG(APP_LOG_LEVEL_DEBUG, "Menu draw row: %p, %p", menu, item);
  GRect bounds = layer_get_frame(cell_layer);
 
  int left_padding = (item->icon ? ICON_HEIGHT : 0) + CELL_PADDING;
  int right_padding = CELL_PADDING;
  int all_padding = left_padding + right_padding;
  bool small_text = strlen(item->title) > 10;
  char* font_key =  small_text ? FONT_KEY_GOTHIC_14_BOLD : FONT_KEY_GOTHIC_18_BOLD;
  int font_height = small_text ? 18 : 24;
  int vertical_padding = (CELL_HEIGHT - font_height) / 2;
  
  graphics_draw_text(ctx, item->title, 
    fonts_get_system_font(font_key), 
    (GRect) { .size = { bounds.size.w - all_padding, font_height}, .origin = { left_padding, vertical_padding } }, 
    GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);
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
  MenuSection* section = menu->sections[menu->section_count];
  if (section == NULL) {
    section = menu->sections[menu->section_count] = (MenuSection*)malloc(sizeof(MenuSection));
  }
  
  section->title = strdup(title);
  section->id = menu->section_count;
  menu->section_count += 1; 
  return section;
}

MenuItem* menu_add_item(Menu* menu, MenuItem item, uint16_t section_id) {
  //APP_LOG(APP_LOG_LEVEL_DEBUG, "Menu adding item: %p, %s", menu, item.title);
  
  MenuSection* section = menu->sections[section_id];
  
  //Don't require section if using basic list 
  if (section == NULL && section_id == 0) {
    section = menu_add_section(menu, NULL);
  }
  
  MenuItem* copy = menu->items[menu->item_count];
  
  if (copy == NULL) {
    copy = menu->items[menu->item_count] = malloc(sizeof(MenuItem));
  }

  copy->title = strdup(item.title);
  copy->subtitle = strdup(item.subtitle);
  copy->id = item.id;
  copy->icon = item.icon;
 
  section->items[section->item_count] = copy;
  
  section->item_count += 1;
  menu->item_count += 1;
  
  menu_layer_reload_data(menu->layer);
  return copy;  
}

void menu_window_load(Window* window) {
  Menu* menu = (Menu*) window_get_user_data(window);
  //Do something
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Menu window loaded: %p, %p", menu, menu->parent);
  
  if (menu->on_load) {
    menu->on_load(menu->window);
  }
}

void menu_window_unload(Window* window) {
  Menu* menu = (Menu*) window_get_user_data(window);
  //Do something
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Menu window unloaded: %p, %p", menu, menu->parent);
  if (menu->on_unload) {
    menu->on_unload(menu->window);
  }
}

MenuItem* menu_get_selected_item(Menu* menu) {
  MenuIndex index = menu_layer_get_selected_index(menu->layer);
  return menu->sections[index.section]->items[index.row];
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
    
    bounds.size.h -= TITLE_HEIGHT;
    bounds.origin.y += TITLE_HEIGHT;
    
    menu->title_layer = text_layer_create((GRect) { .origin = { 0, 0 }, .size = { bounds.size.w, TITLE_HEIGHT } });
    text_layer_set_background_color(menu->title_layer, GColorFromHEX(0x666666));
    text_layer_set_text_color(menu->title_layer, GColorFromHEX(0xFFFFFF));
    text_layer_set_text(menu->title_layer, menu->title);
    text_layer_set_text_alignment(menu->title_layer, GTextAlignmentCenter);
    layer_add_child(menu->parent, text_layer_get_layer(menu->title_layer));
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
    .get_cell_height = menu_cell_height,
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
    text_layer_destroy(menu->title_layer);
    free_and_clear(menu->title);
  }
  window_destroy(menu->window);
  free_and_clear(menu);
}