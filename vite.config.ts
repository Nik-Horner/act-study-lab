import { defineConfig, loadEnv } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(({ mode }) => {
  const publicEnv = loadEnv(mode, process.cwd(), "NEXT_PUBLIC_");
  for (const key of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ])
    if (!(process.env[key] ?? publicEnv[key])?.trim())
      throw new Error(`${key} is required at build time for browser sign-in.`);
  return {
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: {
          name: "rsc",
          childEnvironments: ["ssr"],
        },
      }),
    ],
  };
});
