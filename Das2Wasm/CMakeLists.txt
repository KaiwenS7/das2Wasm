# CMakeList.txt : CMake project for Das2Wasm, include source and define
# project specific logic here.
#

# Add source to this project's executable.


# TODO: Add tests and install targets if needed.

#
# Trying usual cmake project compiler execution
#
cmake_policy(SET CMP0167 NEW)

find_package(Boost 1.85.0 REQUIRED COMPONENTS property_tree)
INCLUDE_DIRECTORIES( ${Boost_INCLUDE_DIR} )

if (DEFINED EMSCRIPTEN)
	set(EMCC_DEBUG 0)

	include_directories(${PROJECT_SOURCE_DIR}/include)
	
	add_executable (Das2Wasm "Das2Wasm.cpp" "Das2Wasm.hpp")
	target_include_directories(Das2Wasm PRIVATE ${PROJECT_SOURCE_DIR}/include ${Boost_INCLUDE_DIR})

	target_link_libraries(Das2Wasm PUBLIC  
		Boost::property_tree
	)

	if (CMAKE_VERSION VERSION_GREATER 3.12)
	  set_property(TARGET Das2Wasm PROPERTY CXX_STANDARD 17)
	  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++17")
	endif()
	#add_definitions(-std=c++17)
	set (CMAKE_CXX_STANDARD 17)
	
	#set(CMAKE_EXECUTABLE_SUFFIX ".html")
	#set_target_properties(Das2Wasm PROPERTIES LINK_FLAGS "-Os -s EXPORTED_FUNCTIONS=['_free','_malloc']")

	set(CMAKE_EXECUTABLE_SUFFIX ".mjs")
	set_target_properties(Das2Wasm PROPERTIES COMPILE_FLAGS "-Os ")
	set_target_properties(Das2Wasm PROPERTIES LINK_FLAGS "-Os -s ASSERTIONS -sALLOW_MEMORY_GROWTH -s SINGLE_FILE=1 -s MODULARIZE -s EXPORTED_FUNCTIONS=['_free','_malloc'] -s EXPORTED_RUNTIME_METHODS=['ccall','cwrap','stackRestore','stackSave','UTF8ToString'] -sNO_DISABLE_EXCEPTION_CATCHING")
	
	#set(CMAKE_EXECUTABLE_SUFFIX ".wasm")

	#set_target_properties(Das2Wasm PROPERTIES COMPILE_FLAGS "-Os -s SIDE_MODULE=1 ")
	#set_target_properties(Das2Wasm PROPERTIES LINK_FLAGS    "-Os -s WASM=1 -s SIDE_MODULE=1 -s STANDALONE_WASM --no-entry")
	set(targetfile "${PROJECT_SOURCE_DIR}/wasm-tester/src/parser/Das2Wasm.mjs")

	add_custom_command(TARGET Das2Wasm POST_BUILD
    	COMMAND ${CMAKE_COMMAND} -E copy $<TARGET_FILE:Das2Wasm> ${targetfile}
	)
else()
	add_library(Das2Wasm SHARED "Das2Wasm.cpp")
	target_link_libraries(Das2Wasm PUBLIC  
		Boost::property_tree
	)
endif()