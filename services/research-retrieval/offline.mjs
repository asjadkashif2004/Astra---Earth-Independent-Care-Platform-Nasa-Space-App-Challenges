import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import { syncBuiltinESMExports } from 'node:module';

// Defense in depth; the measured run also has a kernel network namespace with
// no external interfaces. No content-controlled URLs, tools or downloads exist.
export function denyNetworking(){
  const attempts=[];const deny=name=>(..._args)=>{attempts.push({api:name,timestamp:new Date().toISOString()});throw Error('Offline network attempt blocked: '+name);};
  globalThis.fetch=deny('fetch');for(const [name,module,methods]of [['http',http,['get','request']],['https',https,['get','request']],['net',net,['connect','createConnection']],['tls',tls,['connect']]])for(const method of methods)module[method]=deny(name+'.'+method);
  net.Socket.prototype.connect=deny('Socket.connect');syncBuiltinESMExports();return attempts;
}
