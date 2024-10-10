import { bench, describe, beforeAll } from 'vitest'
import * as funcParser from "../src/parser/ParserFunctionInjector"
// worker.ts


describe('pipeDelimiting', () => {

  beforeAll(async ()=>{
    await funcParser.WasmParser.instance.init();
  })

  bench('js', () => {
    let testValue = "Hx|10|1584|fkdslfjsdlfjsdljjljsdfljsd"
    var val=Uint8Array.from(testValue.split('').map((c:string) => c.charCodeAt(0)))
    funcParser.JsParser.instance.delimitPipe(val);
  })

  bench('wasm', () => {
    let testValue = "Hx|10|1584|fkdslfjsdlfjsdljjljsdfljsd"
    var val=Uint8Array.from(testValue.split('').map((c:string) => c.charCodeAt(0)))
    funcParser.WasmParser.instance.delimitPipe(val);
  })
})