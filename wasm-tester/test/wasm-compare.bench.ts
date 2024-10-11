import { bench, describe, beforeAll, beforeEach, afterEach, suite  } from 'vitest'
import * as funcParser from "../src/parser/ParserFunctionInjector"
//import { Bench } from 'tinybench'

//const bench = new Bench({iterations: 1000})

describe('pipeDelimiting', () => {
  var testinfo = "Starting"
  beforeEach(async ()=>{
    testinfo = "beforeEach";
    
  })

  beforeAll(async ()=>{
    await funcParser.WasmParser.instance.init();
  })

  afterEach(async () => {
    suite.
  })


  bench('js', () => {
    
    var testValue = "|Hx|10|1584|fkdslfjsdlfjsdljjljsdfljsd"

    var val=Uint8Array.from(testValue.split('').map((c:string) => c.charCodeAt(0)))
    funcParser.JsParser.instance.delimitPipe(val);
  })

  bench('wasm', () => {
    var testValue = "|Hx|10|1584|fdslfjsdlfjsdljjljsdfljsd"

    var val=Uint8Array.from(testValue.split('').map((c:string) => c.charCodeAt(0)))
    funcParser.WasmParser.instance.delimitPipe(val);
  })
})

