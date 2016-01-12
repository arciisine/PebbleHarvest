typedef struct Sections {
  uint16_t primary;
  uint16_t alternate;
  uint16_t status;
} Sections;

typedef struct TaskTimer {
  uint16_t id;
  char* project;
  char* task;
  bool active;
  int seconds;
} TaskTimer;

#define dict_key_int(ITER, key) dict_find(ITER, key)->value->uint32
#define dict_key_str(ITER, key) dict_find(ITER, key)->value->cstring
#define dict_key_bool(ITER, key) dict_find(ITER, key)->value->uint8 == 1