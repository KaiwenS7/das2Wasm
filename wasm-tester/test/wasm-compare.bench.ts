import { bench, describe  } from 'vitest'
import * as funcParser from "../src/parser/ParserFunctionInjector"
import streamHeader from './data/fullHeaderLarge.xml?raw'
import schema from './data/schema.txt?raw'


await funcParser.WasmParser.instance.init();

describe.skip.each([{size: 1}, {size: 10}, {size: 100}, {size: 1000}, {size: 10000}, {size: 100000}])
  ('pipeDelimiting', ({size}) => {
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

describe('headerParsing', () => {

  bench(`js-Header`, () => {
    var val=Uint8Array.from(schema.split('').map((c:string) => c.charCodeAt(0)))
    funcParser.JsParser.instance.parseSchema(val);
    val=Uint8Array.from(streamHeader.split('').map((c:string) => c.charCodeAt(0)))
    funcParser.JsParser.instance.parseHeader(val);
  },{iterations: 10})

  bench(`wasm-Header`, () => {
    var val=Uint8Array.from(schema.split('').map((c:string) => c.charCodeAt(0)))
    funcParser.WasmParser.instance.parseSchema(val);
    val=Uint8Array.from(streamHeader.split('').map((c:string) => c.charCodeAt(0)))
    funcParser.WasmParser.instance.parseHeader(val);
  },{iterations: 10})
})