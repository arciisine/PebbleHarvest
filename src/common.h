#pragma once
#include <pebble.h>

char* strdup(char* src);
#define free_and_clear(var) free(var); var = NULL

typedef enum {
  HarvestKeyAction = 0,
  HarvestKeyProject,
  HarvestKeyTask,
  HarvestKeyTimer,
  HarvestKeyName,
  HarvestKeyActive,
  HarvestKeyCount,
} HarvestKey;