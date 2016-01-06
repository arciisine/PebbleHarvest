#pragma once
#include "common.h"

#define MAX_MENU_SIZE 200

typedef struct MenuItem {
  char* title;
  char* subtitle;
  int id;
} MenuItem;

typedef struct Menu {
  Window* window;
  Layer* parent;
  uint16_t size;
  MenuItem* items[MAX_MENU_SIZE];
  MenuLayer* layer;
  void (*click)(MenuItem*, bool);
} Menu;

Menu* menu_create();
void menu_destroy(Menu* menu);
void menu_close(Menu* menu);
void menu_open(Menu* menu);
void menu_empty(Menu* menu);
MenuItem* menu_add_item(Menu* menu, MenuItem item);