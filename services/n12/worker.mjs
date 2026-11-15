import { parentPort,workerData } from 'node:worker_threads';
import { execute } from './experiment.mjs';
try{const result=await execute(workerData.config,stage=>parentPort.postMessage({type:'phase',stage}));parentPort.postMessage({type:'result',result});}catch(e){parentPort.postMessage({type:'error',code:e.code??'N12_WORKER_FAILED'});process.exitCode=1;}
