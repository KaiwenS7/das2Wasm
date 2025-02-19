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

val DataParser::parseHeader(val jsObj, unsigned int step){
    // cout << "Entering Parse Header WASM" << endl;
    // Need the string to be represented as a uint8_t for parsing specific points in the data like delimiters
    // and XML tags
    vector<unsigned char> tArray = emscripten::vecFromJSArray<unsigned char>(jsObj);
    std::string arr;

    int currIdx;
    int nextIdx;
    std::string currPacketType = "";
    int currPacketSize = (100 > tArray.size())? tArray.size() : 100;
    std::string currPacketId="0";
    currIdx = 0;
    
    // C++ Strings have a newline considered that doesn't actually get considered in generating the number of bytes
    // in each of the packets. As such, they are removed in order to correctly line up the byte count
    // For some reason, this only applied to test data, meaning real data will not have to deal with this
    //arr.erase(std::remove(arr.begin(), arr.end(), '\n'), arr.cend());

    while(currIdx < tArray.size()){
        nextIdx = currIdx + currPacketSize;
        // cout << "Next Index: " << nextIdx << endl;

        arr.assign(tArray.begin() + currIdx, tArray.begin() + nextIdx);
        json info = parseAndAssign(tArray, arr, currPacketSize, currPacketType, currPacketId, step, nextIdx, currIdx);
        // Move to next split
        if(info.contains("breakout"))
        {
            break;
        }

        //cout << info << endl;
        currPacketType = info["currPacketType"];
        currPacketId = info["currPacketId"];
        currPacketSize = info["currPacketSize"];
        currIdx = (int)info["nextIdx"];
        // cout << "Current Index: " << currIdx << endl;
        // cout << "Packet Size: " << currPacketSize << endl;
        // cout << "Packet Type: " << currPacketType << endl;
        // cout << "Packet Id: " << currPacketId << endl;
        step = step + 1;


    }
    schema["stream"].update(streamHeader);
    schema["dataset"].update(streams);

    this->step = step;
    vector<unsigned char> remainingData(tArray.begin() + currIdx, tArray.end());
    return emscripten::val(emscripten::typed_memory_view(remainingData.size(), remainingData.data()));
}

json DataParser::parseAndAssign(vector<unsigned char> & content, std::string & valueStream, 
                        unsigned int currPacketSize, std::string currPacketType, 
                        std::string currPacketId, unsigned int step, 
                        int nextIdx, int currIdx){
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
    // cout << "step: " << step << endl;
    // cout << "valueStream Size: " << valueStream.size() << endl;
    if(step%2 == 0){
        json packetInfo = delimitPipeJson(reinterpret_cast<const char*>(&valueStream[0]), valueStream.size());

        currPacketSize = packetInfo["pkgSize"];
        currPacketType = packetInfo["pkgType"];
        currPacketId = packetInfo["pkgId"];
        
        if(std::regex_match(currPacketType, baseMatch, streamRegex)){
            streamHeader = {{"stream", schema["stream"]}};
        }
        else if(std::regex_match(currPacketType, baseMatch, datasetRegex))
        {
            streams[currPacketId]= {{"dataset", schema["dataset"]}};
            staticKeys[currPacketId]=vector<string>();
            coordsys[currPacketId] = json::object();
        }
        else if(std::regex_match(currPacketType, baseMatch, commentRegex)){
            streams[currPacketId]= {{"comment", schema["comment"]}};
            coordsys[currPacketId] = json::object();
        }
        else if(std::regex_match(currPacketType, baseMatch, exceptionRegex)){
            streams[currPacketId] = {{"exception", schema["exception"]}};
            coordsys[currPacketId] = json::object();
        }
        else if(std::regex_match(currPacketType, baseMatch, dataRegex)){
            return {
                {"currPacketSize", currPacketSize},
                {"currPacketId", currPacketId}, 
                {"currPacketType", currPacketType}, 
                {"nextIdx", (int)nextIdx},
                {"breakout", true},
            };
        }
        else{
            return {
                {"currPacketSize", currPacketSize},
                {"currPacketId", currPacketId}, 
                {"currPacketType", currPacketType}, 
                {"nextIdx", (int)nextIdx},
                {"breakout", true},
            };
        }
        nextIdx = (int)packetInfo["nextIdx"]+currIdx;
        
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

        // cout << "XML Parse Result: " << result.description() << endl;

        if(std::regex_match(currPacketType, baseMatch, streamRegex)){
            recursiveBuild(streamHeader, contextXML, currPacketId);
        }else if(std::regex_match(currPacketType, baseMatch, datasetRegex)){
            recursiveBuild(streams[currPacketId], contextXML, currPacketId);
        }else if(std::regex_match(currPacketType, baseMatch, commentRegex)){
            recursiveBuild(streams[currPacketId], contextXML, currPacketId);
        }else if(std::regex_match(currPacketType, baseMatch, exceptionRegex)){
            recursiveBuild(streams[currPacketId], contextXML, currPacketId);
        }
        
        currPacketSize = (100 > (content.size() - (int)nextIdx))? content.size() : 100;
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
    // if(numberOfChildren == 0){
    //     return;
    // }else if(numberOfChildren > 0){
    //     cout << "Number of Children: " << numberOfChildren << endl;
    //     for(pugi::xml_node child = xml.first_child(); child; child = child.next_sibling()){
    //         cout << "Child Name: " << child.name() << endl;
    //         cout << "Child Attribute: " << child.attribute("name").value() << endl;
    //         cout << "Child Value: " << child.child_value() << endl;
    //         cout << "Child Type: " << printNodeType(child) << endl;

    //     }

    // }
    
    for(pugi::xml_node child = xml.first_child(); child; child = child.next_sibling()){
        
        if(child.type() == pugi::node_pcdata)
        {
            continue;
        }

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
            
            if(coordsys[packetId][childName].is_null())
                coordsys[packetId][childName] = json::object();


            // Wanted to just do some inline !empty(), but it fails probably due to the const
            // Just gonna let the compiler optimize it
            bool isVector = (child.children("vector").empty())? false : true;
            if(coordsys[packetId][childName][currentName].is_null()){
                coordsys[packetId][childName][currentName] = isVector;
            }else{
                coordsys[packetId][childName][currentName] = isVector || coordsys[packetId][childName][currentName];
            }
        }

        // Build out choice elements  if possible
        if(schemaChildElement.contains("choice")){
            if(schemaChildElement["choice"].is_array()){
                if(schemaChildElement["choice"].size() < numberOfChildren - std::distance(xml.children("properties").begin(), xml.children("properties").end())){
                    schemaChildElement["choice"].push_back(schemaChildElement["choice"][idx]);
                }
                recursiveBuild(schemaChildElement["choice"][idx], child, packetId);
                idx = idx + 1;
            } 
            else {
                recursiveBuild(schemaChildElement["choice"], child, packetId);
            }
        }else if(schemaChildElement.contains("elements")){
            // build out sibling elements or single elements if not an array
            if(schemaChildElement["elements"].is_array()) {
                recursiveBuild(schemaChildElement["elements"][(int)((int)schemaChildElement["occurs"]-1)], child, packetId);
            }
            else {
                recursiveBuild(schemaChildElement["elements"], child, packetId);
            }
        }
        
        updateSchema(schema, schemaChildElement, childName);

    }
    
}


void DataParser::parseData(val jsObj){
    // C++ Strings have a newline considered that doesn't actually get considered in generating the number of bytes
    // in each of the packets. As such, they are removed in order to correctly line up the byte count
    vector<unsigned char> tArray = emscripten::vecFromJSArray<unsigned char>(jsObj);
    // Need the string to be represented as a uint8_t for parsing specific points in the data like delimiters
    // and XML tags
    int currIdx;
    int nextIdx;
    std::string currPacketType = "";
    int currPacketSize = (100 > tArray.size())? tArray.size() : 100;
    std::string currPacketId="0";
    currIdx = 0;


    json info;
    data = {{"time_ref", vector<uint64_t>()}, {"data_center", vector<float>()}};
    while(currIdx < tArray.size()){
        nextIdx = currIdx + currPacketSize;

        // Use the stream information to parse the data.
        // Information should still be contained within the WASM class via stream[id].
        if(step%2 == 0){
            info = delimitPipeJson(reinterpret_cast<const char*>(&tArray[currIdx]), currPacketSize);
            currPacketType = info["pkgType"];
            currPacketId = info["pkgId"];
            currPacketSize = info["pkgSize"];
            // Since the delimiter function gets the info assuming it starts from the 0 index,
            // the real current index is needed to be added as an offset
            currIdx = (int)info["nextIdx"] + currIdx;
        }else{
            // TODO: Parse data by putting the data into formatted data structures
            data["time_ref"].push_back( (uint64_t)tArray[currIdx] << 8*7 | 
                                        (uint64_t)tArray[currIdx+1] << 8*6 | 
                                        (uint64_t)tArray[currIdx+2] << 8*5 | 
                                        (uint64_t)tArray[currIdx+3] << 8*4 | 
                                        (uint64_t)tArray[currIdx+4] << 8*3 | 
                                        (uint64_t)tArray[currIdx+5] << 8*2 | 
                                        (uint64_t)tArray[currIdx+6] << 8 | 
                                        (uint64_t)tArray[currIdx+7]);            
            for(int i = 8; i < currPacketSize; i+=4){
                data["data_center"].push_back(tArray[currIdx+i] << 3*8 | 
                                              tArray[currIdx+i+1] << 2*8 | 
                                              tArray[currIdx+i+2] << 8 | 
                                              tArray[currIdx+i+3]);

            }


            currIdx = nextIdx;
            currPacketSize = (100 > (tArray.size() - (int)nextIdx))? tArray.size() : 100;
        }

        // Step causes a memory leak in the case of infinite loops
        // Yeah that makes sense oops.
        step = step + 1;
    }
}



std::string DataParser::getSchema() const {
    return schema.dump(-1, ' ', true);
}
std::string DataParser::getHeader() const {
    return streamHeader.dump(-1, ' ', true);
}
std::string DataParser::getStreams() const {
    return streams.dump(-1, ' ', true);
}
std::string DataParser::getCoordsys() const {
    return coordsys.dump(-1, ' ', true);
}
std::string DataParser::getStaticKeys() const{
    return staticKeys.dump(-1, ' ', true);
}

val DataParser::getData(std::string id) const {
    if(id.find("data") != std::string::npos){
        vector<float> dataCenter = data["data_center"];
        
        return emscripten::val(emscripten::typed_memory_view(dataCenter.size(), dataCenter.data()));
    }else if(id.find("time_ref") != std::string::npos){
        vector<uint64_t> timeRef = data["time_ref"];
        
        return emscripten::val(emscripten::typed_memory_view(timeRef.size(), timeRef.data()));
    }

    return emscripten::val();
    
}

EMSCRIPTEN_BINDINGS(das2WasmEmbind){
    emscripten::function("delimitPipe", optional_override(
                           [](const std::string s){
                                 return delimitPipe(s.c_str(), s.size());
                              }));

    emscripten::function("test", &test_fftw);

    emscripten::function("fftw", optional_override(
                           [](val x, val y, val z, unsigned int sampleRate){
                                vector<double> xType = emscripten::vecFromJSArray<double>(x);
                                vector<double> yType = emscripten::vecFromJSArray<double>(y);
                                vector<double> zType = emscripten::vecFromJSArray<double>(z);
                                vector<double> result = vector3dFft(xType, yType, zType, sampleRate);
                                return  emscripten::val(emscripten::typed_memory_view(result.size(), result.data()));
                            }));

    emscripten::class_<DataParser>("DataParser")
        .constructor<>()
        .function("parseSchema", &DataParser::parseSchema)
        .function("parseHeader", &DataParser::parseHeader)
        .function("parseData", &DataParser::parseData)
        .property("schema_readonly", &DataParser::getSchema)
        .property("streams_readonly", &DataParser::getStreams)
        .property("header_readonly", &DataParser::getHeader)
        .property("coordsys_readonly", &DataParser::getCoordsys)
        .property("staticKeys_readonly", &DataParser::getStaticKeys)
        .function("getData", &DataParser::getData);

}