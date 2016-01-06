#pragma once
#include "common.h"

typedef struct MenuItem {
  char* title;
  char* subtitle;
  int id;
} MenuItem;

typedef struct MenuSelectHandler {
   void (*click)(MenuItem*);
   void (*long_click)(MenuItem*);
} MenuSelectHandler;

void menu_close();
void menu_cleanup();
void menu_open(MenuSelectHandler menuSelect);
void menu_add_item(MenuItem* item);
void menu_window_load(Window *window);
void menu_window_unload(Window *window);