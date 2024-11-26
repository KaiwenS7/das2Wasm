#include <iostream>
#include <algorithm>
#include <vector>
#include <string>
#include <streambuf>
#include <boost/property_tree/json_parser.hpp>
#include <boost/property_tree/xml_parser.hpp>
#include "include/pugixml.hpp"
#include "include/json.hpp"

using json = nlohmann::json;
using namespace std;
namespace pt = boost::property_tree;


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

// Function to print the property tree in a JSON format
void printTree(pt::ptree &ptObject, int level)
{
    if (ptObject.empty())
    {
        std::cout << "\"" << ptObject.data() << "\"";
    }

    else
    {
        if (level) std::cout << std::endl;

        std::cout << indent(level) << "{" << std::endl;

        for (pt::ptree::iterator pos = ptObject.begin(); pos != ptObject.end();)
        {
            std::cout << indent(level + 1) << "\"" << pos->first << "\": ";

            printTree(pos->second, level + 1);
            ++pos;
            if (pos != ptObject.end())
            {
                std::cout << ",";
            }
            std::cout << std::endl;
        }

        std::cout << indent(level) << " }";
    }
    std::cout << std::endl;
    return;
}

json& findElement(json& schema, std::string name){

}

void fillElement(json& element, pugi::xml_node& xml){

}