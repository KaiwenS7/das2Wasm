import WasmModule from "./Das2Wasm.mjs";
import EmbindModule from "./Das2WasmEmbind.mjs";

const useEmbind = true;
abstract class FunctionFactory{
    // Function to parse packet headers formatted |x|y|z|
    // Due to the dynamic size of x, y, and z, these have to found instead of assumed
    public abstract delimitPipe(valueStream:Uint8Array):parser.packetInfo;
    public abstract parseHeader(valueStream:Uint8Array):void;
    public abstract parseSchema(valueStream:Uint8Array):void;

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

    parseHeader(valueStream: Uint8Array): void {
        throw new Error("Method not implemented.");
    }

    parseSchema(valueStream: Uint8Array): void {
        throw new Error("Method not implemented.");
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
        if(useEmbind){
            return JSON.parse(this.wasmInstance.delimitPipe(new TextDecoder().decode(charArray)));
        }

        
        // use WASM function to delimit pipe
        const type = WasmParser.TYPES.u8;
        //var sp = this.wasmInstance.stackSave();
        const heapPointer = this.wasmInstance._malloc(charArray.length);
        var jsonFromCpp:any = null;
        try{

            this.wasmInstance[type.heap].set(charArray, heapPointer);
            const cppOutputArrPointer3 = this.wasmInstance._delimitPipe(heapPointer, charArray.length); 
            var stringFromCpp = this.wasmInstance.UTF8ToString(cppOutputArrPointer3);
            if(stringFromCpp[stringFromCpp.length-1] !== '}'){
                jsonFromCpp = JSON.parse(stringFromCpp.substring(0, stringFromCpp.lastIndexOf('}')+1));
            }else{
                jsonFromCpp = JSON.parse(stringFromCpp);

            }
            this.wasmInstance._free(heapPointer);
        }catch(error){
            //this.wasmInstance.stackRestore(sp);
            console.log(stringFromCpp);

            console.error(error)
            this.wasmInstance._free(heapPointer);
            throw error;
        }
        return jsonFromCpp;
    }

    parseHeader(charArray: Uint8Array): void {
        if(!this.wasmInstance){
            return;
        }

        // use WASM function to delimit pipe
        const type = WasmParser.TYPES.u8;
        //var sp = this.wasmInstance.stackSave();
        const heapPointer = this.wasmInstance._malloc(charArray.length);
        try{

            this.wasmInstance[type.heap].set(charArray, heapPointer);
            const cppOutputArrPointer3 = this.wasmInstance._parseHeader(heapPointer, charArray.length); 
            this.wasmInstance.UTF8ToString(cppOutputArrPointer3);
            this.wasmInstance._free(heapPointer);
        }catch(error){
            //this.wasmInstance.stackRestore(sp);
            console.error(error)
            this.wasmInstance._free(heapPointer);
            throw error;
        }
    }

    parseSchema(charArray: Uint8Array): void {
        if(!this.wasmInstance){
            return;
        }

        // use WASM function to delimit pipe
        const type = WasmParser.TYPES.u8;
        //var sp = this.wasmInstance.stackSave();
        const heapPointer = this.wasmInstance._malloc(charArray.length);
        try{

            this.wasmInstance[type.heap].set(charArray, heapPointer);
            const cppOutputArrPointer3 = this.wasmInstance._parseSchema(heapPointer, charArray.length); 
            this.wasmInstance.UTF8ToString(cppOutputArrPointer3);
            this.wasmInstance._free(heapPointer);
        }catch(error){
            //this.wasmInstance.stackRestore(sp);
            console.error(error)
            this.wasmInstance._free(heapPointer);
            throw error;
        }

    }

    override async init(){
        if(!this.wasmInstance) {
            if(useEmbind)
                this.wasmInstance = await EmbindModule();
            else
                this.wasmInstance = await WasmModule();
        }
    }

    public static override get instance():FunctionFactory{
        return this._instance || (this._instance = new WasmParser());
    }
}

const validInputGenerator = (override=0) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '123456789';

    let tempStreamType = uppercase.charAt(Math.floor(Math.random() * uppercase.length))
                        + lowercase.charAt(Math.floor(Math.random() * lowercase.length))

    if(override){
        for(let i = 0; i < override; i++){
            tempStreamType += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
        }
    }
    
    var result = '|'
      + tempStreamType
      + "|";
  
    let counter = 0;
    let triggerPipe = false;
    let lengthOfPkgId = Math.floor(Math.random() * 4) + 1;
    let lengthOfPkgSize = Math.floor(Math.random() * (8)) + 1;
    let randomExtra = Math.floor(Math.random() * 70) + 5;
    var pkgId = "";
    var pkgSize = 0;

    var tempSize = "";
    while (counter < lengthOfPkgId + lengthOfPkgSize + randomExtra + 2+1) {
        if(lengthOfPkgId === counter || lengthOfPkgSize + lengthOfPkgId + 1 === counter){
            result += "|";
            triggerPipe = true;
        }else if(counter >=( lengthOfPkgId + lengthOfPkgSize + 2)){
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }else{
            if(triggerPipe && pkgId === ""){
                pkgId = structuredClone(tempSize);
                tempSize = "";
                triggerPipe = false;
            }
            var temp = numbers.charAt(Math.floor(Math.random() * numbers.length));
            tempSize += structuredClone(temp);
            result += structuredClone(temp);
        }
        counter += 1;
    }
    pkgSize = parseInt(tempSize);

    var pckinfo: parser.packetInfo = {
        pkgSize: pkgSize, 
        pkgType: tempStreamType, 
        nextIdx: lengthOfPkgId + lengthOfPkgSize + 4 + tempStreamType.length, 
        pkgId: pkgId};

    //console.log(result);
    //console.log(pckinfo);
    return {result: result, pckinfo: pckinfo};
  
}
  

export {FunctionFactory, JsParser, WasmParser, validInputGenerator};