#include "common.h"

 char* strdup(char* src) {
  if (src == NULL) {
    return NULL;
  }
  char* dest = malloc(strlen(src)*sizeof(char) + 1);
  strcpy(dest, src);
  return dest;
}