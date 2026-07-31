const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const coreRoot = path.resolve(projectRoot, "..", "core");
const modules = path.resolve(projectRoot, "node_modules");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [coreRoot];
config.resolver.unstable_enableSymlinks = true;
config.resolver.nodeModulesPaths = [modules];
config.resolver.extraNodeModules = new Proxy(
  {},
  { get: (_target, name) => path.join(modules, String(name)) },
);

module.exports = config;
