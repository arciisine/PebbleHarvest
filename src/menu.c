#include "common.h"
#include "menu.h"

#define CELL_HEIGHT 30
#define BASIC_CELL_HEIGHT 48
#define CELL_PADDING 3
#define ICON_HEIGHT (CELL_HEIGHT - 5)
#define TITLE_HEIGHT 24
#define HEADER_HEIGHT 20
#define PROXY_HANDLER(M,PROP) if (M->window_handlers.PROP != NULL) { M->window_handlers.PROP (M->window); }

#define SCROLL_MENU_ITEM_WAIT_TIMER 1000
#define SCROLL_MENU_ITEM_TIMER 125

static void menu_scroll_callback(void* data) {
  Menu* menu = (Menu*)data;
  
  int w = layer_get_frame(menu->parent).size.w;
  
  MenuItem* item = menu_get_selected_item(menu);

  if ((((item->size.w - item->scroll_offset) - w) + 5) < 0) {
    item->scroll_offset = 0;
    menu->scroll_timer = NULL;  
    return;
  } else {  
    item->scroll_offset+=5;
  }
  
  
  // Redraw the menu with this scroll offset
  menu_layer_reload_data(menu->layer);
  menu->scroll_timer = app_timer_register(SCROLL_MENU_ITEM_TIMER, menu_scroll_callback, menu);
}

static void menu_initiate_scroll_timer(Menu* menu) {
  // If there is already a timer then reschedule it, otherwise create one
  
  bool need_to_create_timer = true;
  
  if (menu->scroll_timer) {
    APP_LOG(APP_LOG_LEVEL_DEBUG, "Rescheduling timer");
    need_to_create_timer = !app_timer_reschedule(menu->scroll_timer, SCROLL_MENU_ITEM_WAIT_TIMER);
  }
  if(need_to_create_timer) {
    APP_LOG(APP_LOG_LEVEL_DEBUG, "Creating timer");
    menu->scroll_timer = app_timer_register(SCROLL_MENU_ITEM_WAIT_TIMER, menu_scroll_callback, menu);
  }
}

void menu_empty_section(Menu* menu, uint16_t section_index) {
  MenuSection* section = menu->sections[section_index];
  
  for (int i = 0; i < section->item_count; i++) {
    MenuItem* item = section->items[i];
    free_and_clear(item->title);
    free_and_clear(item->subtitle);  
    item->id = 0;
  }
  
  section->item_count = 0;
}

void menu_empty(Menu* menu) {
  for (int s = 0; s < menu->section_count; s++ ) {
    menu_empty_section(menu, s);
  }  
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
  return (section->title != NULL && (section->item_count > 0 || section->always_show)) ? HEADER_HEIGHT : 0;
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
  
  graphics_context_set_fill_color(ctx, GColorFromHEX(0x666666));
  graphics_fill_rect(ctx, (GRect) {.size={bounds.size.w, HEADER_HEIGHT}, .origin={0,0}}, 0, GCornerNone);

  graphics_context_set_stroke_color(ctx, GColorFromHEX(0x000000));
  graphics_draw_line(ctx, (GPoint){0,0}, (GPoint){bounds.size.w,0});
  graphics_draw_line(ctx, (GPoint){0,bounds.size.h-1}, (GPoint){bounds.size.w,bounds.size.h-1});

  if (section->title) {
    graphics_context_set_text_color(ctx, GColorFromHEX(0xFFFFFF));
    
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
  int font_height = 24;
  int vertical_padding = (CELL_HEIGHT - font_height) / 2;
  int offset = item->scroll_offset;
  
  graphics_draw_text(ctx, item->title, 
    fonts_get_system_font(FONT_KEY_GOTHIC_18), 
    (GRect) { .size = { (bounds.size.w-all_padding) + offset, CELL_HEIGHT }, .origin = { left_padding - offset, vertical_padding } }, 
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
  
  MenuItem* copy = section->items[section->item_count];
  
  if (copy == NULL) {
    copy = section->items[section->item_count] = malloc(sizeof(MenuItem));
  }

  copy->title = strdup(item.title);
  copy->subtitle = strdup(item.subtitle);
  copy->id = item.id;
  copy->icon = item.icon;
  copy->scroll_offset = 0;
  
  //Update size
  copy->size = graphics_text_layout_get_content_size(
    copy->title, 
    fonts_get_system_font(FONT_KEY_GOTHIC_18), (GRect) { .size = { 500, 24}, .origin = {0, 0} },
    GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft);

  section->item_count += 1;
  
  menu_layer_reload_data(menu->layer);
  return copy;  
}

void menu_window_load(Window* window) {
  Menu* menu = (Menu*) window_get_user_data(window);
  int section_not_empty = -1;
  for (int i = 0; i < menu->section_count; i++) {
    if (menu->sections[i]->item_count > 0) {
      section_not_empty = i;
      break;
    }
  }
  
  if (section_not_empty >= 0) {
    menu_layer_set_selected_index(menu->layer, (MenuIndex){section_not_empty,0}, MenuRowAlignTop, false);
    scroll_layer_set_content_offset(menu_layer_get_scroll_layer(menu->layer), (GPoint){0,0}, false);
  }
  
  //Do something
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Menu window loaded: %p, %p", menu, menu->parent);
  PROXY_HANDLER(menu, load);
}

void menu_window_unload(Window* window) {
  Menu* menu = (Menu*) window_get_user_data(window);
  //Do something
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Menu window unloaded: %p, %p", menu, menu->parent);
  PROXY_HANDLER(menu, unload);
}

void menu_window_appear(Window* window) {
  Menu* menu = (Menu*) window_get_user_data(window);
  
  //Do something
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Menu window appear: %p, %p", menu, menu->parent);
  PROXY_HANDLER(menu, appear);
}

void menu_window_disappear(Window* window) {
  Menu* menu = (Menu*) window_get_user_data(window);
  //Do something
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Menu window disappear: %p, %p", menu, menu->parent);
  if (menu->scroll_timer != NULL) {
    menu_get_selected_item(menu)->scroll_offset = 0;
    app_timer_cancel(menu->scroll_timer);
  }
  
  PROXY_HANDLER(menu, disappear);
}

MenuItem* menu_get_selected_item(Menu* menu) {
  MenuIndex index = menu_layer_get_selected_index(menu->layer);
  return menu->sections[index.section]->items[index.row];
}

void menu_set_title(Menu* menu, char* title) {
  free_and_clear(menu->title);
  menu->title = strdup(title);
  text_layer_set_text(menu->title_layer, menu->title);
  layer_mark_dirty(text_layer_get_layer(menu->title_layer));
} 

void menu_selection_changed(struct MenuLayer *menu_layer, MenuIndex new_index, MenuIndex old_index, void *callback_context) {
  
}

void menu_selection_will_change(struct MenuLayer *menu_layer, MenuIndex* new_index, MenuIndex old_index, void *callback_context) {
  Menu* menu = (Menu*) callback_context;
  MenuItem* item = menu->sections[old_index.section]->items[old_index.row];
  item->scroll_offset = 0;
  
  item = menu->sections[new_index->section]->items[new_index->row];
  if (item->size.w > 100) {
    menu_initiate_scroll_timer(menu);
  } else if (menu->scroll_timer) {
    app_timer_cancel(menu->scroll_timer);
    menu->scroll_timer = NULL;
  }
}

MenuLayerCallbacks MENU_CALLBACKS = {
  .get_num_rows = menu_row_count,
  .get_num_sections = menu_section_count,
  .get_header_height = menu_header_height,
  .get_cell_height = menu_cell_height,
  .draw_row = menu_draw_row,
  .draw_header = menu_draw_header,
  .selection_changed = menu_selection_changed,
  .selection_will_change = menu_selection_will_change,
  .select_click = menu_select_click,
  .select_long_click = menu_select_long_click
};

void menu_open(Menu* menu) {
  menu_layer_set_callbacks(menu->layer, menu, MENU_CALLBACKS);  
  window_stack_push(menu->window, true);
}

void menu_close(Menu* menu) {
  window_stack_remove(menu->window, true);
}

void menu_force_selection_change_on_current(Menu* menu) {
  MenuIndex index = menu_layer_get_selected_index(menu->layer);
  menu_selection_will_change(menu->layer, &(MenuIndex) {index.section, index.row}, index,  menu);
} 

Menu* menu_create(char* title) {
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Initializing menu");
    
  Menu* menu = (Menu*) malloc(sizeof(Menu));
    
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Setting menu window: %p", menu);
  menu->window = window_create();
  menu->parent = window_get_root_layer(menu->window);
  
  window_set_user_data(menu->window, menu);
  
  window_set_window_handlers(menu->window, (WindowHandlers){
    .appear = menu_window_appear,
    .disappear = menu_window_disappear,
    .load = menu_window_load,
    .unload = menu_window_unload,
  });

  GRect bounds = layer_get_frame(menu->parent);

  APP_LOG(APP_LOG_LEVEL_DEBUG, "Setting menu titl: %p", menu);
  if (title != NULL) {
    menu->title = strdup(title);
    
    bounds.size.h -= TITLE_HEIGHT;
    bounds.origin.y += TITLE_HEIGHT;
    
    menu->title_layer = text_layer_create((GRect) { .origin = { 0, -2 }, .size = { bounds.size.w, TITLE_HEIGHT + 2 } });
    text_layer_set_font(menu->title_layer, fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD));
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
  
  APP_LOG(APP_LOG_LEVEL_DEBUG, "Done initializing, menu: %p", menu); 
  menu_layer_set_click_config_onto_window(menu->layer, menu->window);

  return menu;  
}

void menu_destroy(Menu* menu) {
  menu_empty(menu);
  for (uint16_t s = 0; s < menu->section_count; s++ ) {
    MenuSection* section = menu->sections[s];
    for (uint16_t i = 0; i < MAX_MENU_SIZE; i++) {
      if (section->items[i] != NULL) {
        free_and_clear(section->items[i]);
      }
    }
    free_and_clear(menu->sections[s]);
  }
    
  menu_layer_destroy(menu->layer);
  if (menu->title != NULL) {
    text_layer_destroy(menu->title_layer);
    free_and_clear(menu->title);
  }
  window_destroy(menu->window);
  free_and_clear(menu);
}