#include <iostream>
#include <algorithm>
#include <vector>
#include <string>
#include <streambuf>
#include "include/pugixml.hpp"
#include "include/json.hpp"

#ifdef __EMSCRIPTEN__
#include <emscripten/bind.h>
using namespace emscripten;

#else
#define EMSCRIPTEN_KEEPALIVE
#endif

using json = nlohmann::json;
using namespace std;

// Function that takes a pointer to a template array and its size to print the elements
template <typename T>
void pointer_func(const T* p, std::size_t size)
{
    std::cout << "data = ";
    for (std::size_t i = 0; i < size; ++i)
        std::cout << p[i] << ' ';
    std::cout << '\n';
}

// Struct to create a stream buffer from a char array
struct membuf : std::streambuf
{
    membuf(char* begin, char* end) {
        this->setg(begin, begin, end);
    }
};

// Function for printTree to add indentation based on the level indicated
std::string indent(int level)
{
    std::string s;
    for (int i = 0; i<level; i++) s += "  ";
    return s;
}

json& findElement(json& schema, std::string name){
    if(schema.is_array()) schema = schema[0];

    bool found = !schema[name].is_null();
    if(found){
        return schema[name];
    }
    for(auto& element : schema.items()){
        if(!element.value()[name].is_null()){
            return element.value()[name];
        }
        else if(element.value()["elements"].is_array()){
            return findElement(element.value()["elements"][0], name);
        }
        else if(element.value()["choice"].is_array()){
            return findElement(element.value()["choice"][0], name);
        }
    }
    return schema;
}

void fillElement(json& element, pugi::xml_node& xml){
    bool occurs = !element["occurs"].is_null();
    if(element.contains("elements") && occurs){
        json newElement = json::object();
        newElement.update(element["elements"][element["elements"].size()-1]);
        element["elements"].push_back(newElement);
    }
    if(element.contains("attributes")){
        for(auto& attribute : element["attributes"].items()){
            if(!occurs){
                element["attributes"][attribute.key()] = xml.attribute(attribute.key().c_str()).value();
            }else{
                element["attributes"][attribute.key()].push_back(xml.attribute(attribute.key().c_str()).value());
            }
        }
    }

    string refName(xml.name());
    if(element.contains("value")){
        if(!occurs){
            element["value"] = xml.child_value();
        }else{
            element["value"].push_back(xml.child_value());
        }
    }
    else if(refName.find("values") > 0){
        if(!occurs){
            element["value"] = xml.child_value();
        }else{
            if(!element.contains("value")){
                element["value"] = json::array();
            }
            element["value"].push_back(xml.child_value());
        }
    }
    if(occurs){
        element["occurs"] = (int)element["occurs"] + 1;
    }
}

void updateSchema(json& root, json& elementToUpdate, std::string name){
    bool found = !root[name].is_null();
    if(found){
        root[name].update(elementToUpdate);
        return;
    }

    for(auto& element : root.items()){
        if(!element.value()[name].is_null()){
            element.value()[name].update(elementToUpdate);
            return;
        }
        else if(element.value()["elements"].is_array()){
            for(auto& deepElement: element.value()["elements"]){
                if(!element.value()[name].is_null()){
                    element.value()[name].update(elementToUpdate);
                    return;
                }

            }
        }
        else if(element.value()["choice"].is_array()){
            for(auto& deepElement: element.value()["choice"]){
                if(!element.value()[name].is_null()){
                    element.value()[name].update(elementToUpdate);
                    return;
                }

            }
        }
    }
}

std::string printNodeType(pugi::xml_node& node){
    switch(node.type()){
        case pugi::node_null: return "null";
        case pugi::node_document: return "document";
        case pugi::node_element: return "element";
        case pugi::node_pcdata: return "pcdata";
        case pugi::node_cdata: return "cdata";
        case pugi::node_comment: return "comment";
        case pugi::node_pi: return "pi";
        case pugi::node_declaration: return "declaration";
        case pugi::node_doctype: return "doctype";
        default: return "unknown";
    }
}

#ifdef __EMSCRIPTEN__

template<typename T>
void copyToVector(const val &typedArray, vector<T> &vec)
{
    unsigned int length = typedArray["length"].as<unsigned int>();
    /*
    Potential Changes needed to work with modern versions of emscripten

    val heap = val::module_property("HEAPU8");
    val memory = heap["buffer"];"

    */

    val heap = val::module_property("HEAPU8");
    val memory = heap["buffer"];
    //val memory = val::module_property("buffer");

    // Apparently this is redundant since the memory is already reserved when you construct the vector
    vec.reserve(length);
    val memoryView = typedArray["constructor"].new_(memory, reinterpret_cast<uintptr_t>(vec.data()), length);
    memoryView.call<void>("set", typedArray);
}

template <typename T> std::vector<T> vecFromJSArray(const emscripten::val &v)
{
    std::vector<T> rv;

    const auto l = v["length"].as<unsigned>();
    rv.resize(l);

    emscripten::val memoryView{emscripten::typed_memory_view(l, rv.data())};
    memoryView.call<void>("set", v);

    return rv;
}

#endif