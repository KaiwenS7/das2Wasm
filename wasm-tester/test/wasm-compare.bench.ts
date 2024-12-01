import { bench, describe  } from 'vitest'
import * as funcParser from "../src/parser/ParserFunctionInjector"
import streamHeaderLarge from './data/fullHeaderLarge.xml?raw'
import streamHeader from './data/fullHeader.xml?raw'

import schema from './data/schema.txt?raw'
import fullTest from './data/tr-pre_ql_msc-sim_bac_2017-09-25.d3b?raw'


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

describe.skip('headerParsing', () => {

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

describe('dataParsing', async () => {
  var dataTesting = await fetch('http://localhost:8080/');
  var buffer= await dataTesting.arrayBuffer();
  var instance = funcParser.WasmParser.instance
  await instance.init();
  var val=Uint8Array.from(schema.split('').map((c:string) => c.charCodeAt(0)))
  var parsedSchema = instance.parseSchema(val);
  val=Uint8Array.from(fullTest.split('').map((c:string) => c.charCodeAt(0)))
  var remainingData:Uint8Array = instance.parseHeader(val);

  bench('wasm-data' , async () => {
    var data = instance.parseData(buffer, {});
  }, {iterations: 100});
  
  bench('js-data' , async () => {
    var data = funcParser.JsParser.instance.parseData(buffer, {...instance.getInfo(), step: 4});
  }, {iterations: 100});
  
})