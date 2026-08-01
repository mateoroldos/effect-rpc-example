import adapter from "@sveltejs/adapter-node";

const pathSeparator = /[/\\]/u;

/** @type {import("@sveltejs/kit").Config} */
const config = {
  compilerOptions: {
    experimental: { async: true },
    runes: ({ filename }) =>
      filename.split(pathSeparator).includes("node_modules") ? undefined : true,
  },
  kit: {
    adapter: adapter(),
    experimental: {
      explicitEnvironmentVariables: true,
      remoteFunctions: true,
    },
  },
};

export default config;
