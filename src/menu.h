#pragma once
#include "common.h"

#define MAX_MENU_SIZE 200

typedef struct MenuItem {
  char* title;
  char* subtitle;
  int id;
} MenuItem;

typedef struct Menu {
  Layer* parent;
  uint16_t size;
  MenuItem* items[MAX_MENU_SIZE];
  MenuLayer* layer;
  void (*click)(MenuItem*, bool);
} Menu;

Menu* menu_create(Window* parent);
void menu_destroy(Menu* menu);

void menu_close(Menu* menu);
void menu_open(Menu* menu);
void menu_empty(Menu* menu);
void menu_add_item(Menu* menu, MenuItem* item);