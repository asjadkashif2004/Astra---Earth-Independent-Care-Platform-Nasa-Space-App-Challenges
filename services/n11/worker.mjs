import { parentPort,workerData } from 'node:worker_threads';
import { execute } from './experiment.mjs';
try{const result=await execute(workerData.config,workerData.known_at,stage=>parentPort.postMessage({type:'phase',stage}));parentPort.postMessage({type:'result',result});}
catch(error){parentPort.postMessage({type:'failed',code:error.code??'N11_COMPUTE_FAILED'});process.exitCode=1;}
