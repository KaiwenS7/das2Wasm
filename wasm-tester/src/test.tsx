import Module from '../../../out/build/x64-release/Das2Wasm/Das2Wasm.mjs';

  // Function to parse packet headers formatted |x|y|z|
  // Due to the dynamic size of x, y, and z, these have to found instead of assumed
function delimitPipe(valueStream:Uint8Array){
    let packetInfoFull;        

    // Finds all delimiters
    var pckIdx = -1, delimitingPoints = [0,0,0];
    for(var i = 1; i < valueStream.length; i++){
      if(valueStream[i] === 124){
        pckIdx++;
        if(pckIdx >= 3){
          break;
        }
        delimitingPoints[pckIdx] = i;
      }
    }

    // Converts to appropriate formats for parsing
    let stringMapper = (buffer:Uint8Array)=>{
        var strBuff = new Array(buffer.length);
        for(let a = 0; a < buffer.length; a++){
          strBuff[a] = String.fromCharCode(buffer[a]);
        }
        return strBuff.join('');
    }
    var stringified = stringMapper(valueStream.slice(0, delimitingPoints[2]+1));
    packetInfoFull = {pkgSize: parseInt(stringified.slice(delimitingPoints[1]+1, delimitingPoints[2])), 
      pkgType: stringified.slice(1, delimitingPoints[0]), 
      nextIdx: delimitingPoints[2]+1, 
      pkgId:  stringified.slice(delimitingPoints[0]+1, delimitingPoints[1])};

    return packetInfoFull;


}


Module()
        .then((wasmInstance) => {
            console.log('wasmInstance:',wasmInstance);


            // testing getting array from cpp
            const arrLen = 5;
            const cppOutputArrPointer = wasmInstance._getCPPArray(arrLen); 
            var js_output_array = new Uint32Array(wasmInstance.HEAP32.buffer, cppOutputArrPointer, arrLen);
            console.log('returned i32 array from cpp:',js_output_array);


            // testing passing array to cpp
            const TYPES = {
                i8: { array: Int8Array, heap: "HEAP8" },
                i16: { array: Int16Array, heap: "HEAP16" },
                i32: { array: Int32Array, heap: "HEAP32" },
                f32: { array: Float32Array, heap: "HEAPF32" },
                f64: { array: Float64Array, heap: "HEAPF64" },
                u8: { array: Uint8Array, heap: "HEAPU8" },
                u16: { array: Uint16Array, heap: "HEAPU16" },
                u32: { array: Uint32Array, heap: "HEAPU32" }
            };

            const jsInputArr = [3,4,5,6,7,8,9,10];
            const type = TYPES.i32;
            const typedArray = type.array.from(jsInputArr);
            // Allocate memory for the integer array
            const heapPointer = wasmInstance._malloc(typedArray.length * typedArray.BYTES_PER_ELEMENT);
            wasmInstance[type.heap].set(typedArray, heapPointer >> 2);

            // Call the WebAssembly function with the integer array
            const sum = wasmInstance._sumJSArray(heapPointer, jsInputArr.length);
            console.log("result of sum of",jsInputArr,'=',sum);

            // Free the allocated memory
            wasmInstance._free(heapPointer);


            // testing In Out with arrays

            // Allocate memory for the integer array
            const heapPointer2 = wasmInstance._malloc(typedArray.length * typedArray.BYTES_PER_ELEMENT);
            wasmInstance[type.heap].set(typedArray, heapPointer2 >> 2);

            // Call the WebAssembly function with the integer array
            const cppOutputArrPointer2 = wasmInstance._inOutArray(heapPointer2, jsInputArr.length); 
            const js_output_array2 = new Uint32Array(wasmInstance.HEAP32.buffer, cppOutputArrPointer2,  jsInputArr.length);
            console.log('returned i32 array from cpp:',js_output_array2);
            // Free the allocated memory
            wasmInstance._free(heapPointer2);


            // Testing strings
            const jsCharacterArray = "|Hx|10|1584|fkdslfjsdlfjsdljjljsdfljsd"
            const type2 = TYPES.u8;

            var sp = wasmInstance.stackSave();
            const charArray = type2.array.from(jsCharacterArray.split('').map(c => c.charCodeAt(0)));
            const heapPointer3 = wasmInstance._malloc(charArray.length);
            var jsonFromCpp = null;
            let test:DOMHighResTimeStamp = window.performance.now();
            try{

                wasmInstance[type2.heap].set(charArray, heapPointer3);
                console.log('jsCharacterArray:',jsCharacterArray);
                console.log('charArray:',charArray);
                const cppOutputArrPointer3 = wasmInstance._delimitPipe(heapPointer3, charArray.length); 
                console.log("Running _delimitPipe");
                const stringFromCpp = wasmInstance.UTF8ToString(cppOutputArrPointer3);
                console.log('returned string from cpp:',stringFromCpp);
                jsonFromCpp = JSON.parse(stringFromCpp);
                console.log('returned JSON from cpp:',jsonFromCpp);

            }catch(error){
                wasmInstance.stackRestore(sp);
                console.error(error)
            }
            wasmInstance._free(heapPointer3);
            let testEnd:DOMHighResTimeStamp = window.performance.now();
            console.log(testEnd - test);

            let test2:DOMHighResTimeStamp = window.performance.now();
            console.log(delimitPipe(charArray));
            let testEnd2:DOMHighResTimeStamp = window.performance.now();
            console.log(testEnd2 - test2);
            return jsonFromCpp;

});