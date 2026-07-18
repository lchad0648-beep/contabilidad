import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // db/schema.sql se lee en tiempo de ejecución (src/lib/db.ts) para inicializar
  // Postgres; sin esto Vercel podría no incluirlo en el bundle de la función.
  outputFileTracingIncludes: {
    "/**": ["./db/schema.sql"],
  },
};

export default nextConfig;
