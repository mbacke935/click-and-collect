const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Support web d'expo-sqlite (wa-sqlite) : le module wasm doit être reconnu comme un
// asset Metro, et les en-têtes COOP/COEP sont requis pour le worker multi-thread
// (SharedArrayBuffer) — voir https://docs.expo.dev/versions/latest/sdk/sqlite/#web-support
config.resolver.assetExts.push('wasm');

config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  return middleware(req, res, next);
};

module.exports = config;
