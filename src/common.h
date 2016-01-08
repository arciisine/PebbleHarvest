#pragma once
#include <pebble.h>

char* strdup(char* src);
#define free_and_clear(var) free(var); var = NULL

#define dict_key_str(ITR, KEY) dict_find(ITR, KEY)->value->cstring
#define dict_key_int(ITR, KEY) dict_find(ITR, KEY)->value->uint32
#define dict_key_bool(ITR, KEY) dict_key_int(ITR, KEY) == 1
#undef APP_LOG
#define APP_LOG(...) /**/