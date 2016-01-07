#pragma once
#include "common.h"

#define MAX_MENU_SIZE 200

typedef struct MenuItem {
  char* title;
  char* subtitle;
  int id;
  GBitmap* icon;
} MenuItem;

typedef struct MenuSection {
  char* title;
  int id;
  uint16_t item_count;
  MenuItem* items[MAX_MENU_SIZE];
} MenuSection;

typedef struct Menu {
  bool basic_render;
  Window* window;
  char* title;
  TextLayer* title_layer;
  Layer* parent;
  MenuSection* sections[MAX_MENU_SIZE];
  MenuItem* items[MAX_MENU_SIZE];
  int section_count;
  int item_count;
  MenuLayer* layer;
  void (*click)(MenuItem*, bool);
} Menu;

Menu* menu_create(char* title);
MenuItem* menu_get_selected_item(Menu* menu);
void menu_destroy(Menu* menu);
void menu_close(Menu* menu);
void menu_open(Menu* menu);
void menu_empty(Menu* menu);
MenuSection* menu_add_section(Menu* menu, char* title);
MenuItem* menu_add_item(Menu* menu, MenuItem item, uint16_t section_id);