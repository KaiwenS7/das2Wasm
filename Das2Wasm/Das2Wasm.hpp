// Das2Wasm.h : Include file for standard system include files,
// or project specific include files.

#pragma once

#include <iostream>
#include <algorithm>
#include <vector>
#include <string>
#include "include/json.hpp"
#include <boost/property_tree/json_parser.hpp>
using json = nlohmann::json;

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif
// TODO: Reference additional headers your program requires here.
extern "C"
{
    int add(int a, int b);
    int sub(int a, int b);
    int sumJSArray(int* arr, int size);
    int* getCPPArray(int size);
    int* inOutArray(int* arr, int size);
    char* delimitPipe(char* arr, int size);
    char* parseHeader(char* arr, int size);
}