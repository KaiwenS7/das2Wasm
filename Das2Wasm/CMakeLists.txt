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
	# Emscripten build for binary written into the JavaScript file
	set(EMCC_DEBUG 0)
	include_directories(${PROJECT_SOURCE_DIR}/include)
	add_executable (Das2Wasm "Das2Wasm.cpp" "Das2Wasm.hpp" "helpers.hpp" "schema.hpp")
	target_include_directories(Das2Wasm PRIVATE ${PROJECT_SOURCE_DIR}/include ${Boost_INCLUDE_DIR})

	target_link_libraries(Das2Wasm PUBLIC  
		Boost::property_tree
	)

	if (CMAKE_VERSION VERSION_GREATER 3.12)
	  set_property(TARGET Das2Wasm PROPERTY CXX_STANDARD 17)
	  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c++17")
	endif()

	set (CMAKE_CXX_STANDARD 17)

	set(CMAKE_EXECUTABLE_SUFFIX ".mjs")
	set_target_properties(Das2Wasm PROPERTIES COMPILE_FLAGS "-Os ")
	set_target_properties(Das2Wasm PROPERTIES LINK_FLAGS "-Os -s ASSERTIONS -sALLOW_MEMORY_GROWTH -s SINGLE_FILE=1 -s MODULARIZE -s EXPORTED_FUNCTIONS=['_free','_malloc'] -s EXPORTED_RUNTIME_METHODS=['ccall','cwrap','stackRestore','stackSave','UTF8ToString'] -sNO_DISABLE_EXCEPTION_CATCHING")

	set(targetfile "${PROJECT_SOURCE_DIR}/wasm-tester/src/parser/Das2Wasm.mjs")

	add_custom_command(TARGET Das2Wasm POST_BUILD
    	COMMAND ${CMAKE_COMMAND} -E copy $<TARGET_FILE:Das2Wasm> ${targetfile}
	)

	add_executable (Das2WasmEmbind "das2WasmEmbind.cpp" "das2WasmEmbind.hpp" "helpers.hpp")
	target_include_directories(Das2WasmEmbind PRIVATE ${PROJECT_SOURCE_DIR}/include ${Boost_INCLUDE_DIR})

	target_link_libraries(Das2WasmEmbind PUBLIC  
		Boost::property_tree
	)

	if (CMAKE_VERSION VERSION_GREATER 3.12)
	  set_property(TARGET Das2WasmEmbind PROPERTY CXX_STANDARD 17)
	endif()
	
	set_target_properties(Das2WasmEmbind PROPERTIES COMPILE_FLAGS "-Os")
	set_target_properties(Das2WasmEmbind PROPERTIES LINK_FLAGS "-Os -lembind -s ASSERTIONS -sALLOW_MEMORY_GROWTH -s SINGLE_FILE=1 -s MODULARIZE -s EXPORTED_FUNCTIONS=['_free','_malloc'] -s EXPORTED_RUNTIME_METHODS=['ccall','cwrap','stackRestore','stackSave','UTF8ToString'] -sNO_DISABLE_EXCEPTION_CATCHING -sWASM_BIGINT")
	
	set(targetfile "${PROJECT_SOURCE_DIR}/wasm-tester/src/parser/Das2WasmEmbind.mjs")

	add_custom_command(TARGET Das2WasmEmbind POST_BUILD
    	COMMAND ${CMAKE_COMMAND} -E copy $<TARGET_FILE:Das2WasmEmbind> ${targetfile}
	)
else()
	add_library(Das2Wasm SHARED "Das2Wasm.cpp")
	target_link_libraries(Das2Wasm PUBLIC  
		Boost::property_tree
	)
endif()