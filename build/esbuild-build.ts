import { execSync } from "child_process";
import { config } from "dotenv";
import esbuild from "esbuild";
import extraRpcs from "../lib/chainlist/constants/extraRpcs";

console.log('===Build start===');
console.log(process.env.CYPRESS_RECORD_KEY);

const typescriptEntries = ["static/scripts/onboarding/onboarding.ts"];
const cssEntries = ["static/styles/rewards/rewards.css", "static/styles/audit-report/audit.css", "static/styles/onboarding/onboarding.css"];
export const entries = [...typescriptEntries, ...cssEntries];

const allNetworkUrls: Record<string, string[]> = {};
// this flattens all the rpcs into a single object, with key names that match the networkIds. The arrays are just of URLs per network ID.

Object.keys(extraRpcs).forEach((networkId) => {
  const officialUrls = extraRpcs[networkId].rpcs.filter((rpc) => typeof rpc === "string");
  const extraUrls: string[] = extraRpcs[networkId].rpcs.filter((rpc) => rpc.url !== undefined).map((rpc) => rpc.url);
  allNetworkUrls[networkId] = [...officialUrls, ...extraUrls];
});

export const esBuildContext: esbuild.BuildOptions = {
  sourcemap: true,
  entryPoints: entries,
  bundle: true,
  minify: false,
  loader: {
    ".png": "dataurl",
    ".woff": "dataurl",
    ".woff2": "dataurl",
    ".eot": "dataurl",
    ".ttf": "dataurl",
    ".svg": "dataurl",
  },
  outdir: "static/out",
  define: createEnvDefines(["SUPABASE_URL", "SUPABASE_ANON_KEY", "FRONTEND_URL"], {
    extraRpcs: allNetworkUrls,
    commitHash: execSync(`git rev-parse --short HEAD`).toString().trim(),
  }),
};

esbuild
  .build(esBuildContext)
  .then(() => {
    console.log("\tesbuild complete");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

function createEnvDefines(environmentVariables: string[], generatedAtBuild: Record<string, unknown>): Record<string, string> {
  const defines: Record<string, string> = {};
  config();
  for (const name of environmentVariables) {
    const envVar = process.env[name];
    if (envVar !== undefined) {
      defines[name] = JSON.stringify(envVar);
    } else {
      throw new Error(`Missing environment variable: ${name}`);
    }
  }
  Object.keys(generatedAtBuild).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(generatedAtBuild, key)) {
      defines[key] = JSON.stringify(generatedAtBuild[key]);
    }
  });
  return defines;
}
