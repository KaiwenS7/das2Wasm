// sum.test.js
import {  test,  expectTypeOf, expect } from 'vitest'
import * as funcParser from "../src/parser/ParserFunctionInjector"
import streamHeader from './data/fullHeader.xml?raw'
import schema from './data/schema.txt?raw'
import data from './data/data.d3b?raw'
import fullTest from './data/tr-pre_ql_msc-sim_bac_2017-09-25.d3b?raw'

//import Module from '../src/Das2Wasm.mjs';

test.skip('Test setting up module for general use', async () => {
  //var instance = await Module();
  var instance = funcParser.WasmParser.instance
  await instance.init();
  expectTypeOf(instance).toMatchTypeOf<funcParser.FunctionFactory>();
  var testString = "|Hx|10|1584|fkdslfjsdlfjsdljjljsdfljsd";
  var val=Uint8Array.from(testString.split('').map((c:string) => c.charCodeAt(0)))

  let result = instance.delimitPipe(val);
  expectTypeOf(result).toMatchTypeOf<{
      pkgSize: number;
      pkgType: string; 
      nextIdx: number; 
      pkgId:  string;
  }>();
  expect(result.pkgType).toBe("Hx");
  expect(result.pkgSize).toBe(1584);
  expect(result.pkgId).toBe("10");

})

test.skip('Test parsing JSON object schema' , async () => {
  var instance = funcParser.WasmParser.instance
  await instance.init();

  var val=Uint8Array.from(schema.split('').map((c:string) => c.charCodeAt(0)))

  var schem = instance.parseSchema(val);
  expect(schem).toEqual(JSON.parse(schema));
})

test.skip('Test parsing of an xml header strea' , async () => {
  var instance = funcParser.WasmParser.instance
  await instance.init();
  var val=Uint8Array.from(schema.split('').map((c:string) => c.charCodeAt(0)))

  instance.parseSchema(val);
  val=Uint8Array.from(streamHeader.split('').map((c:string) => c.charCodeAt(0)))
  var schem = instance.parseHeader(val);
  //console.log("Schema attributes: ", schem.stream.attributes);
  expect(schem.stream.attributes.version).toEqual("3.0");
  
  // Right now, p.value has a bunch of duplicates for each element
  // TODO: Fix by looking at C++ code for fillElement and updateElement potentially
  // causing an overlap of functionality due to using reference values
  //console.log("Schema stream: ", schem.stream.elements.properties.elements[0].p.value);
  expect(schem.stream.elements.properties.elements[0].p.value[0]).not.toEqual(schem.stream.elements.properties.elements[0].p.value[1]);

})

test.skip('Test parsing the data out' , async () => {
  var instance = funcParser.WasmParser.instance
  await instance.init();
  var val=Uint8Array.from(schema.split('').map((c:string) => c.charCodeAt(0)))

  var parsedSchema = instance.parseSchema(val);

  val=Uint8Array.from(fullTest.split('').map((c:string) => c.charCodeAt(0)))
  var remainingData:Uint8Array = instance.parseHeader(val);

  var dataTesting = await fetch('http://localhost:8080/');
  var buffer= await dataTesting.arrayBuffer();
  var data = new Uint8Array(buffer);
  instance.parseData(data, {});
});

test('Test parsing the data out' , async () => {
  var instance = funcParser.WasmParser.instance
  await instance.init();  
  var val=Uint8Array.from(schema.split('').map((c:string) => c.charCodeAt(0)))

  instance.parseSchema(val);

  val=Uint8Array.from(fullTest.split('').map((c:string) => c.charCodeAt(0)))
  instance.parseHeader(val);

  var dataTesting = await fetch('http://localhost:8080/');
  var buffer= await dataTesting.arrayBuffer();
  var data = new Uint8Array(buffer);
  console.log(instance.getInfo());

  funcParser.JsParser.instance.parseData(data, {step: 4});
});
