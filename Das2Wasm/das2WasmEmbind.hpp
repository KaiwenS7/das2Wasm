// Das2Wasm.h : Include file for standard system include files,
// or project specific include files.

#pragma once

#include <iostream>
#include <algorithm>
#include <vector>
#include <string>
#include <streambuf>
#include <regex>
#include <typeinfo>

#include "helpers.hpp"
#include "schema.hpp"
#include "include/json.hpp"
using json = nlohmann::json;
#include "include/pugixml.hpp"

#ifdef __EMSCRIPTEN__
#include <emscripten/bind.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

std::string delimitPipe(const char* arr, int size);
json delimitPipeJson(const char* arr, int size);
 
class DataParser{
    private:
        // Member Variables
        json schema;
        json streamHeader;
        json streams;
        json staticKeys;
        json coordsys;

        unsigned int step = 0;

        void recursiveBuild(json& schema, pugi::xml_node& xml, std::string packetId);

    public:
        DataParser(){};

        // Member Functions
        void parseData(std::string arr);
        void parseSchema(std::string arr);

        // In order to keep with the original JS code, this needs to send back
        // the current "step" and the remaining contents of the data blob
        std::string parseHeader(std::string arr, unsigned int step = 0);
        json addToHeader(std::string content, std::string valueStream, 
                        unsigned int currPacketSize, std::string currPacketType, 
                        std::string currPacketId, unsigned int step, 
                        int nextIdx, int currIdx);
        // Getters
        std::string getSchema() const;

};