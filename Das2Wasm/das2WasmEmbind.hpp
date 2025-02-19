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
#include "fftwInterface.hpp"

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

        json data;

        unsigned int step = 0;

        void recursiveBuild(json& schema, pugi::xml_node& xml, std::string packetId);

    public:
        DataParser(){};

        // Member Functions
        void parseData(emscripten::val arr);
        void parseSchema(std::string arr);

        // In order to keep with the original JS code, this needs to send back
        // the current "step" and the remaining contents of the data blob
        val parseHeader(val arr, unsigned int step = 0);
        json parseAndAssign(vector<unsigned char> & content, std::string & valueStream, 
                        unsigned int currPacketSize, std::string currPacketType, 
                        std::string currPacketId, unsigned int step, 
                        int nextIdx, int currIdx);
        // Getters
        std::string getSchema() const;
        std::string getHeader() const;
        std::string getStreams() const;
        std::string getCoordsys() const;
        std::string getStaticKeys() const;
        
        emscripten::val getData(std::string id) const;

};