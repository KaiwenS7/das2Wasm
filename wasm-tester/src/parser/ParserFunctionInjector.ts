import WasmModule from "./Das2Wasm.mjs";

abstract class FunctionFactory{
    // Function to parse packet headers formatted |x|y|z|
    // Due to the dynamic size of x, y, and z, these have to found instead of assumed
    public abstract delimitPipe(valueStream:Uint8Array):parser.packetInfo;
    protected constructor(){}
    protected static _instance:FunctionFactory;
    public static get instance():FunctionFactory{
        return this._instance;
    }
    // testing passing array to cpp
    public static readonly TYPES = {
        i8: { array: Int8Array, heap: "HEAP8" },
        i16: { array: Int16Array, heap: "HEAP16" },
        i32: { array: Int32Array, heap: "HEAP32" },
        f32: { array: Float32Array, heap: "HEAPF32" },
        f64: { array: Float64Array, heap: "HEAPF64" },
        u8: { array: Uint8Array, heap: "HEAPU8" },
        u16: { array: Uint16Array, heap: "HEAPU16" },
        u32: { array: Uint32Array, heap: "HEAPU32" }
    };
    async init(){}; // Initialize function for wasm
 
}

class JsParser extends FunctionFactory{
    private constructor(){super();}

    // Function to parse packet headers formatted |x|y|z|
    // Due to the dynamic size of x, y, and z, these have to found instead of assumed
    delimitPipe(valueStream:Uint8Array):parser.packetInfo{
        let packetInfoFull: parser.packetInfo;        

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

        let stringMapper = (buffer:Uint8Array):string=>{
            var strBuff = new Array(buffer.length);
            for(let a = 0; a < buffer.length; a++){
              strBuff[a] = String.fromCharCode(buffer[a]);
            }
            return strBuff.join('');
        };

        // Converts to appropriate formats for parsing
        var stringified = stringMapper(valueStream.slice(0, delimitingPoints[2]+1));
        packetInfoFull = {pkgSize: parseInt(stringified.slice(delimitingPoints[1]+1, delimitingPoints[2])), 
            pkgType: stringified.slice(1, delimitingPoints[0]), 
            nextIdx: delimitingPoints[2]+1, 
            pkgId:  stringified.slice(delimitingPoints[0]+1, delimitingPoints[1])
        };

        return packetInfoFull;
    }

    public static override get instance():FunctionFactory{
        return this._instance || (this._instance = new JsParser());
    }
}

class WasmParser extends FunctionFactory{
    private wasmInstance: any;
    private constructor(){super();}

    delimitPipe(charArray: Uint8Array):parser.packetInfo {
        // Check if wasmInstance is initialized
        if(!this.wasmInstance)
            return {        
                pkgSize: -1,
                pkgType: "", 
                nextIdx: -1, 
                pkgId:  "",
            };

        // use WASM function to delimit pipe
        const type = WasmParser.TYPES.u8;
        var sp = this.wasmInstance.stackSave();
        const heapPointer = this.wasmInstance._malloc(charArray.length);
        var jsonFromCpp:any = null;
        try{

            this.wasmInstance[type.heap].set(charArray, heapPointer);
            const cppOutputArrPointer3 = this.wasmInstance._delimitPipe(heapPointer, charArray.length); 
            const stringFromCpp = this.wasmInstance.UTF8ToString(cppOutputArrPointer3);
            jsonFromCpp = JSON.parse(stringFromCpp);

        }catch(error){
        this.wasmInstance.stackRestore(sp);
            console.error(error)
        }
        this.wasmInstance._free(heapPointer);
        return jsonFromCpp;
    }

    override async init(){
        if(!this.wasmInstance) this.wasmInstance = await WasmModule();
    }

    public static override get instance():FunctionFactory{
        return this._instance || (this._instance = new WasmParser());
    }
}

export {FunctionFactory, JsParser, WasmParser};