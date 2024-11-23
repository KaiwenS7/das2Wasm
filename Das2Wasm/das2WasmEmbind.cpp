#include "das2WasmEmbind.hpp"
using namespace emscripten;
using namespace std;
std::string delimitPipe(const char* arr, int size){
    
    std::vector<int> delimittingPoints = {0,0,0,0};

    int pckIdx = -1;
    // Populate the integer vec with some values
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
    // Using initializer lists
    json packetInfoFull = {
        {"pkgSize", pkgSizeInt},
        {"pkgType", pkgType},
        {"nextIdx", nextIdx}, 
        {"pkgId",  pkgId},
    };

    //printf("pkgSize: %s\npkgType: %s\nnextIdx: %d\npkgId: %s\n",pkgSize.c_str(), pkgType.c_str(), nextIdx, pkgId.c_str());
    auto dumpedString = packetInfoFull.dump(-1, ' ', true);

    return dumpedString;

}

EMSCRIPTEN_BINDINGS(das2WasmEmbind){
    emscripten::function("delimitPipe", optional_override(
                           [](const std::string s){
                                 return delimitPipe(s.c_str(), s.size());
                              }));
}