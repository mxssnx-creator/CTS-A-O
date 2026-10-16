/* eslint-disable @typescript-eslint/no-require-imports -- this preload is intentionally CommonJS for Node preload hooks. */
// The preview sandbox can deny uv_interface_addresses even though binding 0.0.0.0 is allowed. Vite only uses this
// lookup to print interface URLs; let the all-interface listener start and keep real interface data when available.
const os = require("node:os");
const getNetworkInterfaces = os.networkInterfaces.bind(os);
os.networkInterfaces = function safeNetworkInterfaces() {
  try {
    return getNetworkInterfaces();
  } catch (error) {
    if (error?.code === "ERR_SYSTEM_ERROR" && error?.syscall === "uv_interface_addresses") return {};
    throw error;
  }
};
require("node:module").syncBuiltinESMExports();
