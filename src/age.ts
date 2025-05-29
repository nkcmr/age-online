import * as age from "age-encryption";

export type EncryptParams = {
  plaintext: string;
  recipients: string[];
};

export type DecryptParams = {
  ciphertext: string;
  privateKey: string;
};

export interface Age {
  encrypt(params: EncryptParams): Promise<string>;
  decrypt(params: DecryptParams): Promise<string>;
  generateIdentity(): Promise<[privateKey: string, publicKey: string]>;
}

export const typeageImplementation: Age = {
  async encrypt(params) {
    const encr = new age.Encrypter();
    for (const r of params.recipients) {
      encr.addRecipient(r);
    }
    const ciphertext = await encr.encrypt(params.plaintext);
    return age.armor.encode(ciphertext);
  },
  async decrypt(params) {
    const ciphertext = age.armor.decode(params.ciphertext);
    const decr = new age.Decrypter();
    decr.addIdentity(params.privateKey);
    return decr.decrypt(ciphertext, "text");
  },
  async generateIdentity() {
    const priv = await age.generateIdentity();
    const pub = await age.identityToRecipient(priv);
    return [priv, pub];
  },
};
