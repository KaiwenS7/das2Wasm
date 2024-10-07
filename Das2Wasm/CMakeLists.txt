# CMakeList.txt : CMake project for Das2Wasm, include source and define
# project specific logic here.
#

# Add source to this project's executable.


# TODO: Add tests and install targets if needed.

#
# Trying usual cmake project compiler execution
#


if (DEFINED EMSCRIPTEN)
	add_executable (Das2Wasm "Das2Wasm.cpp" "Das2Wasm.hpp")
	if (CMAKE_VERSION VERSION_GREATER 3.12)
	  set_property(TARGET Das2Wasm PROPERTY CXX_STANDARD 20)
	endif()
	#add_definitions(-std=c++17)
	#set (CMAKE_CXX_STANDARD 17)
	
	set(CMAKE_EXECUTABLE_SUFFIX ".html")
	set_target_properties(Das2Wasm PROPERTIES LINK_FLAGS "-Os -s EXPORTED_FUNCTIONS=['_free','_malloc']")

	#set(CMAKE_EXECUTABLE_SUFFIX ".js")
	#set_target_properties(Das2Wasm PROPERTIES LINK_FLAGS "-Os -s MODULARIZE -s EXPORTED_FUNCTIONS=['_free','_malloc']")
	
	#set(CMAKE_EXECUTABLE_SUFFIX ".wasm")

	#set_target_properties(Das2Wasm PROPERTIES COMPILE_FLAGS "-Os -s SIDE_MODULE=1 ")
	#set_target_properties(Das2Wasm PROPERTIES LINK_FLAGS    "-Os -s WASM=1 -s SIDE_MODULE=1 -s STANDALONE_WASM --no-entry")
else()
	add_library(Das2Wasm SHARED "Das2Wasm.cpp")
endif()