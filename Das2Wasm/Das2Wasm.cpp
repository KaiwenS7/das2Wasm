#include "Das2Wasm.hpp"
using namespace std;
namespace pt = boost::property_tree;

extern "C"
{
    EMSCRIPTEN_KEEPALIVE int add(int a, int b)
    {
        return a + b;
    }
    EMSCRIPTEN_KEEPALIVE int sub(int a, int b)
    {
        return a - b;
    }

    EMSCRIPTEN_KEEPALIVE
    int sumJSArray(int* arr, int size) {
      int sum = 0;
      for (size_t i = 0; i < size; i++)
      {
        sum = sum + arr[i];
      }
      return sum;
    }

    EMSCRIPTEN_KEEPALIVE
    int* getCPPArray(int size) {
      std::vector<int> vec(size);
      // Populate the integer vec with some values
      for (int i = 0; i < size; ++i) {
          vec[i] = i; // Fill the array with values 1, 2, 3, ..., size
      }

      int* array = new int[vec.size()]; // Allocate memory for the array
      std::copy(vec.begin(), vec.end(), array); // Copy vector elements to the array
      return array;
    }


    EMSCRIPTEN_KEEPALIVE
    int* inOutArray(int* arr, int size) {
      std::vector<int> vec(size);
      // Populate the integer vec with some values
      for (int i = 0; i < size; ++i) {
          vec[i] = arr[i] + 10; // Fill the array with values 1, 2, 3, ..., size
      }

      int* array = new int[vec.size()]; // Allocate memory for the array
      std::copy(vec.begin(), vec.end(), array); // Copy vector elements to the array
      return array;
    }

    EMSCRIPTEN_KEEPALIVE
    char* delimitPipe(char* arr, int size){
        
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

        char* array = new char[dumpedString.length()]; // Allocate memory for the array
        std::copy(dumpedString.begin(), dumpedString.end(), array); // Copy vector elements to the array
        if(array[dumpedString.length()-1]=='}'){
            array[dumpedString.length()] = '\0';
        }
        else{
            array[dumpedString.length()-1] = '\0';
        }
        //printf("dumpedString: %s\n", array);
        return array;

    }
    
    // Function that takes the original XML header and returns a JSON object with all the necessary information
    EMSCRIPTEN_KEEPALIVE
    char* parseHeader(char* arr, int size){
        cout << size << std::endl;
        // Create a stream buffer from the char array    
        membuf sbuf(arr, arr + size);
        std::basic_istream<char> is(&sbuf);

        // Create a property tree from the XML stream
        pt::ptree ptObj;
        pt::read_xml(is, ptObj, pt::xml_parser::no_concat_text | pt::xml_parser::trim_whitespace);

        // boost::property_tree::write_xml(std::cout, pt);
        printTree(ptObj, 10);
        cout << std::endl;
        // for (pt::ptree::iterator pos = ptObj.begin(); pos != ptObj.end();){
        //     pos->second.get("name", "default");
        // }

        return arr;
    }

    // Function that takes the schema JSON and fills it with info from the XML header
    EMSCRIPTEN_KEEPALIVE
    char* parseSchema(char* arr, int size){
        cout << "Parsing Schema" << std::endl;
        cout << size << std::endl;
        // Create a stream buffer from the char array    
        membuf sbuf(arr, arr + size);
        std::basic_istream<char> is(&sbuf);
        //std::cout << is.rdbuf() << std::endl;

        // Create a property tree from the XML stream
        pt::ptree ptObj;
        json packetInfoFull= json::parse(is);
        // pt::read_json(is, ptObj);

        packetInfoFull["altprop"] = "hi";
        // boost::property_tree::write_xml(std::cout, pt);
        // printTree(ptObj, 0);
        // cout << std::endl;
        auto dumpedString = packetInfoFull.dump(-1, ' ', true);

        char* array = new char[dumpedString.length()]; // Allocate memory for the array
        std::copy(dumpedString.begin(), dumpedString.end(), array); // Copy vector elements to the array
        if(array[dumpedString.length()-1]=='}'){
            array[dumpedString.length()] = '\0';
        }
        else{
            array[dumpedString.length()-1] = '\0';
        }
        printf("dumpedString: %s\n", array);
        return array;
    }

    // Function that uses passed in JSON schema to format the data for use in the application
    EMSCRIPTEN_KEEPALIVE
    char* parseData(char* arr, int size){
        cout << size << std::endl;
        // Create a stream buffer from the char array    
        membuf sbuf(arr, arr + size);
        std::basic_istream<char> is(&sbuf);

        // Create a property tree from the XML stream
        pt::ptree ptObj;
        pt::read_json(is, ptObj);

        // boost::property_tree::write_xml(std::cout, pt);
        printTree(ptObj, 10);
        cout << std::endl;

        return arr;
    }
}
