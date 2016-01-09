#include "common.h"

char* strdup(char* src) {
  if (src == NULL) {
    return NULL;
  }
  char* dest = malloc(strlen(src)*sizeof(char) + 1);
  strcpy(dest, src);
  return dest;
}

int isdigit2(char c) {
  return c >= '0' && c <= '9';
}

double atof2(char *s)
{
        double a = 0.0;
        int e = 0;
        int c;
        while ((c = *s++) != '\0' && isdigit2(c)) {
                a = a*10.0 + (c - '0');
        }
        if (c == '.') {
                while ((c = *s++) != '\0' && isdigit2(c)) {
                        a = a*10.0 + (c - '0');
                        e = e-1;
                }
        }
        if (c == 'e' || c == 'E') {
                int sign = 1;
                int i = 0;
                c = *s++;
                if (c == '+')
                        c = *s++;
                else if (c == '-') {
                        c = *s++;
                        sign = -1;
                }
                while (isdigit2 (c)) {
                        i = i*10 + (c - '0');
                        c = *s++;
                }
                e += i*sign;
        }
        while (e > 0) {
                a *= 10.0;
                e--;
        }
        while (e < 0) {
                a *= 0.1;
                e++;
        }
        return a;
}