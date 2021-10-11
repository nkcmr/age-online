if (!WebAssembly.instantiateStreaming) {
  // polyfill
  WebAssembly.instantiateStreaming = function (respPromise, importObject) {
    return new Promise(function (resolve, reject) {
      Promise.resolve(respPromise)
        .then(function (resp) {
          return resp.arrayBuffer();
        })
        .then(function (source) {
          return WebAssembly.instantiate(source, importObject);
        })
        .then(function (wasmExports) {
          resolve(wasmExports);
        })
        .catch(reject);
    });
  };
}

global.wasmResolve = false;
let wasmReady = new Promise(function (resolve) {
  wasmResolve = () => {
    console.log("go has signaled it is ready");
    resolve();
    delete global.wasmResolve;
  };
});

const go = new Go();
console.log("loading wasm...");
WebAssembly.instantiateStreaming(fetch("/age.wasm"), go.importObject).then(
  function (result) {
    console.log("wasm loaded! starting go runtime...");
    go.run(result.instance);
  }
);

self.addEventListener("message", function (event) {
  switch (event.data.op) {
    case "age_generate_x25519_identity":
      wasmReady
        .then(function () {
          return age.generate_x25519_identity();
        })
        .then(function (id) {
          self.postMessage({ result: id });
        })
        .catch((err) => {
          self.postMessage({ error: new Error(`${err}`) });
        });
      break;
    case "age_encrypt":
      wasmReady
        .then(function () {
          return age.encrypt(event.data.args[0], event.data.args[1]);
        })
        .then(function (cipherText) {
          self.postMessage({ result: cipherText });
        })
        .catch((err) => {
          self.postMessage({ error: new Error(`${err}`) });
        });
      break;
    case "age_decrypt":
      wasmReady
        .then(function () {
          return age.decrypt(event.data.args[0], event.data.args[1]);
        })
        .then(function (plainText) {
          self.postMessage({ result: plainText });
        })
        .catch((err) => {
          self.postMessage({ error: new Error(`${err}`) });
        });
      break;
    default:
      self.postMessage({
        error: new Error(`unknown operation: ${event.data.op}`),
      });
  }
});
