#include <pebble.h>

typedef struct Sections {
  uint16_t primary;
  uint16_t alternate;
  uint16_t status;
} Sections;

typedef struct TaskTimer {
  uint16_t id;
  char* project;
  uint32_t projectId;
  char* task;
  uint32_t taskId;
  bool active;
  int seconds;
} TaskTimer;

static int dict_key_int(DictionaryIterator*, uint16_t);
static char* dict_key_str(DictionaryIterator*, uint16_t);
static bool dict_key_bool(DictionaryIterator*, uint16_t);