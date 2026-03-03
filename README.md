# age-online

A fully in-browser tool to encrypt and decrypt data with [age](https://age-encryption.org/).

All cryptography runs client-side via [typage](https://github.com/FiloSottile/typage/). No data leaves your browser.

## TODO

- [x] MVP: encrypting data
- [x] decrypting data
- [x] make it pretty
- [ ] encrypt/decrypt files
- [ ] use github keys (supported by `age`)

## Tech stack

- [Preact](https://preactjs.com/) + TypeScript
- [Vite](https://vitejs.dev/) (bundler)
- Deployed on [Cloudflare Pages](https://pages.cloudflare.com/)

## Development

```sh
pnpm install
pnpm dev
```

The dev server runs at `http://localhost:5173` by default. If local TLS certificates (`*.pem`) are present in the project root, the server will use HTTPS automatically.

## Build

```sh
pnpm build
```

Output goes to `dist/`.
