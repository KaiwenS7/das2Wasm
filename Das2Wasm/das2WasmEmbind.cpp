#include "das2WasmEmbind.hpp"
using namespace emscripten;
using namespace std;

std::string delimitPipe(const char* arr, int size){
    auto packetInfoFull = delimitPipeJson(arr, size);

    //printf("pkgSize: %s\npkgType: %s\nnextIdx: %d\npkgId: %s\n",pkgSize.c_str(), pkgType.c_str(), nextIdx, pkgId.c_str());
    auto dumpedString = packetInfoFull.dump(-1, ' ', true);

    return dumpedString;

}

json delimitPipeJson(const char* arr, int size){
    
    std::vector<int> delimittingPoints = {0,0,0,0};

    int pckIdx = -1;
    // Finds the delimiters within the array data to parse the information inbetween each.
    // Das3 will always have 4 delimiters pipes in the data
    for (int i = 0; i < size; ++i) {

        if((unsigned int)arr[i] == 124){
            pckIdx++;
            if(pckIdx >= 4){
                break;
            }
            delimittingPoints[pckIdx]=i;
        }
    }

    //pointer_func<int>(delimittingPoints.data(), delimittingPoints.size());

    // Converts to appropriate formats for parsing
    std::string pkgSize(arr+delimittingPoints[2]+1, arr+delimittingPoints[3]);
    std::string pkgType(arr+1, arr+delimittingPoints[1]);
    std::string pkgId(arr+delimittingPoints[1]+1, arr+delimittingPoints[2]);
    int nextIdx = delimittingPoints[3]+1;
    int pkgSizeInt=stoi(pkgSize);

    // Using initializer lists to create a json object that is in the correct format
    // Easier this way
    json packetInfoFull = {
        {"pkgSize", pkgSizeInt},
        {"pkgType", pkgType},
        {"nextIdx", nextIdx}, 
        {"pkgId",  pkgId},
    };


    return packetInfoFull;

}

void DataParser::parseSchema(std::string arr){
    schema = json::parse(arr);
}

std::string DataParser::parseHeader(std::string arr, unsigned int step){
    // Need the string to be represented as a uint8_t for parsing specific points in the data like delimiters
    // and XML tags
    auto const arrPtr = reinterpret_cast<const uint8_t*>(&arr[0]);
    uint8_t* currPtr;
    uint8_t* nextPtr;
    std::string currPacketType = "";
    int currPacketSize = (100 > arr.size())? arr.size() : 100;
    std::string currPacketId="0";
    currPtr = reinterpret_cast<uint8_t*>(&arr[0]);
    while(currPtr < arrPtr+arr.size()){
        nextPtr = currPtr + currPacketSize;
    
        auto valueStream = arr.substr(*currPtr, *nextPtr);
        // console.log(valueStream)

        json info = addToHeader(arr, valueStream, currPacketSize, currPacketType, currPacketId, step, nextPtr, currPtr);
        // Move to next split
        if(info["breakout"])
            break;
        currPacketType = info["currPacketType"];
        currPacketId = info["currPacketId"];
        currPacketSize = info["currPacketSize"];
        currPtr = currPtr+(int)info["nextIdx"];
        step = step + 1;
    }
}

json DataParser::addToHeader(std::string content, std::string valueStream, 
                        unsigned int currPacketSize, std::string currPacketType, 
                        std::string currPacketId, unsigned int step, 
                        uint8_t* nextIdx, uint8_t* currIdx){
    // This is the function that will be called to add the current packet to the header

    // Regex setup to not have inline regex
    std::regex streamRegex("Sx");
    std::regex datasetRegex("Hx");
    std::regex commentRegex("Cx");
    std::regex exceptionRegex("Ex");
    std::regex dataRegex("d");

    std::smatch baseMatch;

    // Even steps are where the pipe delimited stream information is parsed
    // Odd steps are where the XML data is parsed. Similar parsing rules are
    // used in the actual data stream
    if(step%2 == 0){
        json packetInfo = delimitPipeJson(reinterpret_cast<const char*>(&valueStream[0]), valueStream.size());
        currPacketSize = packetInfo["pkgSize"];
        currPacketType = packetInfo["pkgType"];
        currPacketId = packetInfo["pkgId"];
        if(std::regex_match(currPacketType, baseMatch, streamRegex)){
            streamHeader = {"stream", schema["stream"]};
        }
        else if(std::regex_match(currPacketType, baseMatch, datasetRegex))
        {
            streams[currPacketId]= {"dataset", schema["dataset"]};
            staticKeys[currPacketId]=vector<string>();
            coordsys[currPacketId] = {};
        }
        else if(std::regex_match(currPacketType, baseMatch, commentRegex)){
            streams[currPacketId]= {"comment", schema["comment"]};
            coordsys[currPacketId] = {};
        }
        else if(std::regex_match(currPacketType, baseMatch, exceptionRegex)){
            streams[currPacketId] = {"exception", schema["exception"]};
            coordsys[currPacketId] = {};
        }
        else if(std::regex_match(currPacketType, baseMatch, dataRegex))
            return {
                {"currPacketSize", currPacketSize},
                {"currPacketId", currPacketId}, 
                {"currPacketType", currPacketType}, 
                {"nextIdx", (int)nextIdx},
                {"breakout", true},
            };

        nextIdx = packetInfo["nextIdx"]+currIdx;
    }else {
        if(std::regex_match(currPacketType, baseMatch, dataRegex))
            return {
                {"currPacketSize", currPacketSize},
                {"currPacketId", currPacketId}, 
                {"currPacketType", currPacketType}, 
                {"nextIdx", (int)nextIdx},
                {"breakout", true},
            };
        

        // Create a stream buffer from the string to
        // allow pugi to parse the XML
        char* buffer = new char[valueStream.size()];
        memcpy(buffer, valueStream.c_str(), valueStream.size());

        // Create a property tree from the XML stream
        pugi::xml_document contextXML;
        pugi::xml_parse_result result = contextXML.load_buffer_inplace(buffer, valueStream.size());
        pugi::xml_node root = contextXML.document_element();
        std::string name(root.name());
        auto schemaChildElement = findElement(schema, name);
        fillElement(schemaChildElement, root);
        if(std::regex_match(currPacketType, baseMatch, streamRegex)){
            recursiveBuild(streamHeader, contextXML, currPacketId);
        }else if(std::regex_match(currPacketType, baseMatch, datasetRegex)){
            recursiveBuild(streams[currPacketId], contextXML, currPacketId);
        }else if(std::regex_match(currPacketType, baseMatch, commentRegex)){
            recursiveBuild(streams[currPacketId], contextXML, currPacketId);
        }else if(std::regex_match(currPacketType, baseMatch, exceptionRegex)){
            recursiveBuild(streams[currPacketId], contextXML, currPacketId);
        }
        
        currPacketSize = (100 > content.size() - (int)nextIdx)? content.size() : 100;
    }
    
    json output = {
        {"currPacketSize", currPacketSize},
        {"currPacketId", currPacketId}, 
        {"currPacketType", currPacketType}, 
        {"nextIdx", (int)nextIdx},
    };
    return output;
}  

void DataParser::recursiveBuild(json& schema, pugi::xml_node& xml, std::string packetId){
    auto idx = 0;
    size_t numberOfChildren = std::distance(xml.children().begin(), xml.children().end());

    for(pugi::xml_node child = xml.first_child(); child; child = child.next_sibling()){

        if(!child.name()) continue;
        std::string childName(child.name());
        auto schemaChildElement = findElement(schema, childName);
        fillElement(schemaChildElement, child);
        if(childName.find("coord") != std::string::npos || (childName == "data")){
            // Extended to maintain different coordsys for each stream
            auto currentName = "";
            
            std::regex attributeRegex("[nN]ame");
            for (pugi::xml_attribute attr = child.first_attribute(); attr; attr = attr.next_attribute())
            {
                std::string attributeName(attr.name());
                if(std::regex_match(attributeName, attributeRegex)){
                    currentName = attr.value();
                    break;
                }
            }

            if(!coordsys[packetId][childName])
                coordsys[packetId][childName] = {};

            coordsys[packetId][childName][currentName] = child.children("vector").empty() || coordsys[packetId][childName][currentName];
        }
        // Build out choice elements  if possible
        if(schemaChildElement["choice"]){
            if(typeid(schemaChildElement["choice"]) == typeid(json::array_t)){
                if(schemaChildElement["choice"].size() < numberOfChildren - std::distance(xml.children("properties").begin(), xml.children("properties").end())){
                    schemaChildElement["choice"].push_back(schemaChildElement["choice"][idx]);
                }
                recursiveBuild(schemaChildElement["choice"][idx], child, packetId);
                idx = idx + 1;
            } 
            else {
                recursiveBuild(schemaChildElement["choice"], child, packetId);
            }
        }else{
            // build out sibling elements or single elements if not an array
            if(typeid(schemaChildElement["elements"]) == typeid(json::array_t)) 
                recursiveBuild(schemaChildElement['elements'][schemaChildElement["occurs"]-1], child, packetId);
            else 
                recursiveBuild(schemaChildElement['elements'], child, packetId);
        }

    }
    
}

std::string DataParser::getSchema() const {
    return schema.dump(-1, ' ', true);
}

EMSCRIPTEN_BINDINGS(das2WasmEmbind){
    emscripten::function("delimitPipe", optional_override(
                           [](const std::string s){
                                 return delimitPipe(s.c_str(), s.size());
                              }));

    emscripten::class_<DataParser>("DataParser")
        .constructor<>()
        .function("parseSchema", &DataParser::parseSchema)
        .function("parseHeader", &DataParser::parseHeader)
        .property("schema_readonly", &DataParser::getSchema);
}