#pragma once
#include <pebble.h>

char* strdup(char* src);
double atof2(char *s);
#define free_and_clear(var) free(var); var = NULL