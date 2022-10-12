var worker = new Worker("/sw.js");

type Request = GenerateX25519IdentityRequest | EncryptRequest | DecryptRequest;

function unreachable(x: never): void {}

function encodeRequest(r: Request): any {
  switch (r.op) {
    case "age_decrypt":
      return { op: r.op, args: [r.ciphertext, r.privateKey] };
    case "age_encrypt":
      return { op: r.op, args: [r.plaintext, r.recipients] };
    case "age_generate_x25519_identity":
      return { op: r.op, args: [] };
  }
  unreachable(r);
}

type QueueItem<R extends Request, T> = {
  request: R;
  resolve?: (value: T | PromiseLike<T>) => void;
  reject?: (reason?: any) => void;
};

const messageQueue = (() => {
  const queue: Array<QueueItem<Request, any>> = [];
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
      worker.postMessage(encodeRequest(item.request));
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
  return function enqueue<Req extends Request, Res>(
    request: Req
  ): Promise<Res> {
    return new Promise((resolve, reject) => {
      queue.push({ request, resolve, reject });
      idleWakeup();
    });
  };
})();

type GenerateX25519IdentityRequest = {
  op: "age_generate_x25519_identity";
};

export function ageGenerateX25519Identity(): Promise<[string, string]> {
  return messageQueue<GenerateX25519IdentityRequest, [string, string]>({
    op: "age_generate_x25519_identity",
  });
}

type EncryptRequest = {
  op: "age_encrypt";
  plaintext: string;
  recipients: string[];
};

export function ageEncrypt(req: Omit<EncryptRequest, "op">): Promise<string> {
  return messageQueue({
    op: "age_encrypt",
    plaintext: req.plaintext,
    recipients: req.recipients,
  });
}

type DecryptRequest = {
  op: "age_decrypt";
  ciphertext: string;
  privateKey: string;
};

export function ageDecrypt(req: Omit<DecryptRequest, "op">): Promise<string> {
  return messageQueue({
    op: "age_decrypt",
    ciphertext: req.ciphertext,
    privateKey: req.privateKey,
  });
}
