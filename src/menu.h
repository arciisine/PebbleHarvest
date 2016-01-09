#pragma once
#include <pebble.h>
#include "common.h"

#define MAX_MENU_SIZE 200

typedef struct MenuItem {
  char* title;
  char* subtitle;
  int scroll_offset;
  int id;
  GSize size;
  GBitmap* icon;
  void* data;
} MenuItem;

typedef struct MenuSection {
  char* title;
  int id;
  bool always_show;
  uint16_t item_count;
  MenuItem* items[MAX_MENU_SIZE];
} MenuSection;

typedef struct Menu {
  bool basic_render;
  AppTimer* scroll_timer;
  Window* window;
  char* title;
  TextLayer* title_layer;
  Layer* parent;
  MenuSection* sections[20];
  int section_count;
  MenuLayer* layer;
  void (*click)(MenuItem*, bool);
  WindowHandlers window_handlers;
} Menu;

Menu* menu_create(char* title);
MenuItem* menu_get_selected_item(Menu* menu);
void menu_force_selection_change_on_current(Menu* menu);
void menu_destroy(Menu* menu);
void menu_close(Menu* menu);
void menu_open(Menu* menu);
void menu_empty(Menu* menu);
void menu_empty_section(Menu* menu, uint16_t section_id);
void menu_set_title(Menu* menu, char* title);
MenuSection* menu_add_section(Menu* menu, char* title);
MenuItem* menu_add_item(Menu* menu, MenuItem item, uint16_t section_id);