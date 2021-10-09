var worker = new Worker("/sw.js");

type QueueItem<T> = {
  op: string;
  args: any[];
  resolve?: (value: T | PromiseLike<T>) => void;
  reject?: (reason?: any) => void;
};

const messageQueue = (() => {
  const queue: Array<QueueItem<any>> = [];
  let idleWakeup: (value: void | PromiseLike<void>) => void = () => {};
  function idle() {
    return new Promise<void>((resolve) => {
      idleWakeup = () => {
        idleWakeup = () => {};
        resolve();
      };
    });
  }
  const waitForMessage = (() => {
    let resolveResult: (value: string | PromiseLike<string>) => void = () => {};
    let rejectResult: (reason?: any) => void;
    worker.addEventListener("message", (e) => {
      if (e.data.error) {
        rejectResult(e.data.error);
      } else {
        resolveResult(e.data.result);
      }
    });
    return (): Promise<string> => {
      return new Promise((resolve, reject) => {
        resolveResult = resolve;
        rejectResult = reject;
      });
    };
  })();
  (async () => {
    for (;;) {
      if (queue.length === 0) {
        await idle();
        continue;
      }
      const item = queue.shift();
      if (!item) {
        continue;
      }
      const message = waitForMessage();
      worker.postMessage({
        op: item.op,
        args: item.args,
      });
      try {
        const reply = await message;
        if (item.resolve) {
          item.resolve(reply);
        }
      } catch (e) {
        if (item.reject) {
          item.reject(e);
        }
      }
    }
  })();
  return function enqueue<T>(item: QueueItem<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      queue.push({ ...item, resolve, reject });
      idleWakeup();
    });
  };
})();

export function ageGenerateX25519Identity(): Promise<[string, string]> {
  return messageQueue({
    op: "age_generate_x25519_identity",
    args: [],
  });
}

export function ageEncrypt(
  plaintext: string,
  recipients: string[]
): Promise<string> {
  return messageQueue({
    op: "age_encrypt",
    args: [plaintext, recipients],
  });
}

export function ageDecrypt(
  ciphertext: string,
  privateKey: string
): Promise<string> {
  return messageQueue({
    op: "age_decrypt",
    args: [ciphertext, privateKey],
  });
}
