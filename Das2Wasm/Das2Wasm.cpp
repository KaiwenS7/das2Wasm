#include "Das2Wasm.hpp"
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

        // Create a stream buffer from the char array    
        membuf sbuf(arr, arr + size);
        std::basic_istream<char> is(&sbuf);

        // Create a property tree from the XML stream
        boost::property_tree::ptree pt;
        boost::property_tree::read_xml(is, pt);

        boost::property_tree::write_json(std::cout, pt);
        
        return arr;
    }
}
