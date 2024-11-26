// sum.test.js
import {  test,  expectTypeOf, expect } from 'vitest'
import * as funcParser from "../src/parser/ParserFunctionInjector"
import streamHeader from './data/fullHeader.xml?raw'
import schema from './data/schema.txt?raw'


//import Module from '../src/Das2Wasm.mjs';

test('Test setting up module for general use', async () => {
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

test('Test parsing JSON object schema' , async () => {
  var instance = funcParser.WasmParser.instance
  await instance.init();

  var val=Uint8Array.from(schema.split('').map((c:string) => c.charCodeAt(0)))

  var schem = instance.parseSchema(val);
  expect(schem).toEqual(JSON.parse(schema));
})

test('Test parsing of an xml header strea' , async () => {
  var instance = funcParser.WasmParser.instance
  await instance.init();
  var val=Uint8Array.from(schema.split('').map((c:string) => c.charCodeAt(0)))

  instance.parseSchema(val);
  val=Uint8Array.from(streamHeader.split('').map((c:string) => c.charCodeAt(0)))
  var schem = instance.parseHeader(val);
  console.log("Schema attributes: ", schem.stream.attributes);
  expect(schem.stream.attributes.version).toEqual("3.0");
  console.log("Schema stream: ", schem.stream.elements.properties.elements[0].p.value);
})
