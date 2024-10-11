//import { bench, describe, beforeAll, beforeEach, afterEach, suite  } from 'vitest'
import * as funcParser from "../src/parser/ParserFunctionInjector"
import { Bench } from 'tinybench'

const bench = new Bench({iterations: 1000})
await funcParser.WasmParser.instance.init();
bench
  .add('js', () => {
    
    var testValue = "|Hx|10|1584|fkdslfjsdlfjsdljjljsdfljsd"

    var val=Uint8Array.from(testValue.split('').map((c:string) => c.charCodeAt(0)))
    funcParser.JsParser.instance.delimitPipe(val);
  })

  .add('wasm', () => {
    var testValue = "|Hx|10|1584|fdslfjsdlfjsdljjljsdfljsd"

    var val=Uint8Array.from(testValue.split('').map((c:string) => c.charCodeAt(0)))
    funcParser.WasmParser.instance.delimitPipe(val);
  })


await bench.run();

console.table(bench.table());