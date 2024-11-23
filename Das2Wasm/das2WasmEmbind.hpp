// Das2Wasm.h : Include file for standard system include files,
// or project specific include files.

#pragma once

#include <iostream>
#include <algorithm>
#include <vector>
#include <string>
#include <streambuf>

#include "helpers.hpp"
#include "schema.hpp"
#include "include/json.hpp"
using json = nlohmann::json;

#ifdef __EMSCRIPTEN__
#include <emscripten/bind.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

std::string delimitPipe(const char* arr, int size);


