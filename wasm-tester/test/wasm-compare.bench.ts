import { bench, describe  } from 'vitest'
import * as funcParser from "../src/parser/ParserFunctionInjector"


await funcParser.WasmParser.instance.init();

describe.each([{size: 1}, {size: 10}, {size: 100}, {size: 1000}, {size: 10000}, {size: 100000}])
  ('dataParsing', ({size}) => {
  var testValue=funcParser.validInputGenerator(size).result;

  bench(`js-${size}`, () => {
    var val=Uint8Array.from(testValue.split('').map((c:string) => c.charCodeAt(0)))
    funcParser.JsParser.instance.delimitPipe(val);
  },{iterations: 10000})

  bench(`wasm-${size}`, () => {
    var val=Uint8Array.from(testValue.split('').map((c:string) => c.charCodeAt(0)))
    funcParser.WasmParser.instance.delimitPipe(val);
  },{iterations: 10000})
})