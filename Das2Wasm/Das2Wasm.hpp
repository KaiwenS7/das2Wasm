// Das2Wasm.h : Include file for standard system include files,
// or project specific include files.

#pragma once

#include <iostream>
#include <algorithm>
#include <vector>

// TODO: Reference additional headers your program requires here.
extern "C"
{
    int add(int a, int b);
    int sub(int a, int b);
}