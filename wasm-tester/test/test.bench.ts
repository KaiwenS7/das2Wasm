import { bench, describe, beforeAll } from 'vitest'
import * as funcParser from "../src/parser/ParserFunctionInjector"
import DataParser from "../src/parser/DataParser"
import SchemaParser from "../src/parser/SchemaParser"
import binData from "./data/2023-08-27_2024-08-14_bin-60s-tip.d3b?raw"

var sp: SchemaParser;
var dataBuffer: ArrayBuffer;
beforeAll(async ()=>{
  try {
    sp = new SchemaParser();
    await funcParser.WasmParser.instance.init();
    const byteArray = new TextEncoder().encode(binData);
    dataBuffer= byteArray.buffer;

  } catch (error) {
    console.error(error)
  }
})

describe.skip('dataParsing', () => {
  bench('js', () => {
    var dataParser = new DataParser(sp.schema, SchemaParser.xsdCoord, {}, {}, {}, null, funcParser.JsParser);
    parsingData(dataParser, dataBuffer);
  })

  bench('wasm', () => {
    var dataParser = new DataParser(sp.schema, SchemaParser.xsdCoord, {}, {}, {}, null, funcParser.WasmParser);
    parsingData(dataParser, dataBuffer);
  })
})

function parsingData(dataParser:DataParser, data:ArrayBuffer){
  let step = 0;

  let temp = dataParser.parseStreamHeader(data, step);
  // console.log(temp)

  step = temp.step;
  data = temp.content;

  var val;
  var it = dataParser.byteParser(data, step)

  var dataInfo = {}
  while(true){
    try {
      val = it.next();
        if(val.done){
            break;
        }
        
        if(!dataInfo[val.value.currPacketId]){
          dataInfo[val.value.currPacketId] = {};
            for(let key of Object.keys(val.value.dataProps)){
              dataInfo[val.value.currPacketId][key] = [];
            }            
        }
        // Go through all values to update current data state
        for(let [key, value] of Object.entries(val.value.dataProps)){
            if(dataParser.staticKeys[val.value.currPacketId].includes(key) && (!dataParser.staticKeys[val.value.currPacketId].includes(key) || dataInfo[val.value.currPacketId][key].length <= 0))
              dataInfo[val.value.currPacketId][key] = value;
                
            else if(!dataParser.staticKeys[val.value.currPacketId].includes(key))
              dataInfo[val.value.currPacketId][key] = dataInfo[val.value.currPacketId][key].concat(value);
        }
        
    } catch (error) {
        // Passes error to on-error handler for main thread
        throw error;
    }
  }
}
