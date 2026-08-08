const REQUIRED = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY",
];

const REQUIRED_ANY_OF = [
  ["EXPO_PUBLIC_API_URL", "EXPO_PUBLIC_API_BASE_URL"],
];

const FORBIDDEN = [
  "EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
  "EXPO_PUBLIC_JWT_SECRET_KEY",
];

function isMissing(name) {
  const value = process.env[name];
  return typeof value !== "string" || value.trim() === "";
}

const missing = REQUIRED.filter(isMissing);

const missingGroups = REQUIRED_ANY_OF.filter((group) =>
  group.every(isMissing),
);

const leaked = FORBIDDEN.filter((name) => !isMissing(name));

let exitCode = 0;

if (missing.length > 0) {
  console.error("Missing required public environment variables:");
  for (const name of missing) console.error("  -", name);
  exitCode = 1;
}

for (const group of missingGroups) {
  console.error(
    "Missing required public environment variable, set one of: " +
      group.join(" | "),
  );
  exitCode = 1;
}

if (leaked.length > 0) {
  console.error("Server-only secrets must never be exposed as EXPO_PUBLIC_:");
  for (const name of leaked) console.error("  -", name);
  exitCode = 1;
}

if (exitCode === 0) {
  console.log("Mobile public environment variables OK.");
} else {
  console.error(
    "Configure these values as GitHub Actions secrets and as EAS environment variables before building.",
  );
}

process.exit(exitCode);
