import adapter from "@sveltejs/adapter-node";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const pathSeparator = /[/\\]/u;

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit({
      adapter: adapter(),
      compilerOptions: {
        experimental: { async: true },
        runes: ({ filename }) =>
          filename.split(pathSeparator).includes("node_modules")
            ? undefined
            : true,
      },
      experimental: {
        explicitEnvironmentVariables: true,
        remoteFunctions: true,
      },
    }),
  ],
});
