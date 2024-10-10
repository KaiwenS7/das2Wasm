// sum.test.js
import { expect, test } from 'vitest'
var Module;



//import Module from '../src/Das2Wasm.mjs';

test('Test setting up module for general use', async () => {
  //var instance = await Module();
  process.nextTick(async () => {
    var instance = Module;
    console.log("Instance: ", instance);
    expect(instance).not.toBe(null);
  });
  const{default: mod} = await import('../src/parser/Das2Wasm.mjs');
  console.log(mod());
  Module = await mod();
  //expect(instance).not.toBe(undefined);
})
