#pragma once
#include <pebble.h>

char* strdup(char* src);
#define free_and_clear(var) free(var); var = NULL

typedef enum {
  HarvestKeyProject = 0,
  HarvestKeyTask,
  HarvestKeyTimer,
  HarvestKeyName,
  HarvestKeyActive,
  HarvestKeyCount,
} HarvestKey; 