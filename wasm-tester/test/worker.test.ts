// worker.test.ts
import '@vitest/web-worker'
import {  test,  expectTypeOf, expect } from 'vitest'
import { validInputGenerator } from '../src/parser/ParserFunctionInjector';

test('worker', async () => {
    
    // new Worker is also supported
    let worker = new Worker(new URL('../src/worker.ts', import.meta.url))
    var promiseResolve, promiseReject;

    var testValue=validInputGenerator();


    var promise = new Promise(function(resolve, reject){
        promiseResolve = resolve;
        promiseReject = reject;
    });
    worker.postMessage(testValue.result)
    worker.onmessage = (e) => {
        // e.data equals to 'hello world'
        expectTypeOf(e.data).toMatchTypeOf<{
            pkgSize: number;
            pkgType: string; 
            nextIdx: number; 
            pkgId:  string;
        }>();
        try {
            expect(e.data.pkgId).toBe(testValue.pckinfo.pkgId)
            expect(e.data.pkgType).toBe(testValue.pckinfo.pkgType)
            expect(e.data.pkgSize).toBe(testValue.pckinfo.pkgSize)
            expect(e.data.nextIdx).toBe(testValue.pckinfo.nextIdx)
            promiseResolve();
        } catch (error) {
            promiseReject(error);    
        }
    }
    worker.onerror = (e) => {
        promiseReject(e);
    }
    
    await promise;
    

})