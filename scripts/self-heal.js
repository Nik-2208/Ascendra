// Self-healing build/dev cache script for Next.js 16 + Turbopack on Windows
const fs = require("fs");
const path = require("path");

const LOCK_FILE = path.join(__dirname, "../.build.lock");
const NEXT_DIR = path.join(__dirname, "../.next");

function log(msg) {
  console.log(`[Self-Heal] ${msg}`);
}

function logError(msg) {
  console.error(`[Self-Heal] [Error] ${msg}`);
}

/**
 * Prevents concurrent dev/build server executions on same directory
 */
function handleProcessLock() {
  if (fs.existsSync(LOCK_FILE)) {
    try {
      const lockContent = fs.readFileSync(LOCK_FILE, "utf8").trim();
      const pid = parseInt(lockContent, 10);
      if (pid) {
        // Check if process is still active
        try {
          process.kill(pid, 0); // throws error if process is dead
          log(`Active build/dev process detected (PID: ${pid}). Bypassing atomic clean to prevent write lock conflicts.`);
          return false;
        } catch (e) {
          log("Stale lock file found. Removing it.");
          fs.unlinkSync(LOCK_FILE);
        }
      }
    } catch (err) {
      log("Error reading lock file: " + err.message);
    }
  }

  // Create new lock
  try {
    fs.writeFileSync(LOCK_FILE, process.pid.toString(), "utf8");
    // Ensure lock is cleared on exit
    process.on("exit", () => {
      try {
        if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
      } catch (e) {}
    });
  } catch (err) {
    logError("Could not create lock file: " + err.message);
  }
  return true;
}

/**
 * Performs atomic cleanup of .next on Windows by rotating/renaming first
 */
function cleanNextDirectory() {
  if (!fs.existsSync(NEXT_DIR)) return;

  const trashName = path.join(__dirname, `../.next.trash-${Math.random().toString(36).substring(7)}`);
  try {
    // Atomic rename
    fs.renameSync(NEXT_DIR, trashName);
    log(`Atomic directory rotation successful: moved .next to ${path.basename(trashName)}`);
    
    // Asynchronous/non-blocking delete of the trash dir
    try {
      fs.rmSync(trashName, { recursive: true, force: true });
      log("Cleaned rotated trash directory.");
    } catch (rmErr) {
      log(`Rotated directory cleanup deferred: ${rmErr.message}`);
    }
  } catch (err) {
    log(`Direct .next directory locked (normal if hot-reload server is active). Repairing manifest integrity instead.`);
    repairManifests();
  }
}

/**
 * Repair/Remove corrupted or empty Next.js manifests to prevent server startup crashes
 */
function repairManifests() {
  if (!fs.existsSync(NEXT_DIR)) return;

  const manifestExtensions = [".json"];
  const walk = (dir) => {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walk(fullPath);
        } else if (manifestExtensions.includes(path.extname(file))) {
          if (file.includes("manifest")) {
            try {
              const content = fs.readFileSync(fullPath, "utf8").trim();
              if (!content) {
                log(`Removing empty manifest: ${file}`);
                fs.unlinkSync(fullPath);
              } else {
                JSON.parse(content); // Test JSON validity
              }
            } catch (jsonErr) {
              log(`Detected corrupted manifest file: ${file}. Removing to trigger clean regeneration.`);
              try {
                fs.unlinkSync(fullPath);
              } catch (e) {
                logError(`Failed to delete manifest ${file}: ${e.message}`);
              }
            }
          }
        }
      }
    } catch (e) {
      logError(`Error walking directory ${dir}: ${e.message}`);
    }
  };

  walk(NEXT_DIR);
}

function main() {
  log("Starting build environment self-heal...");
  const cleanAllowed = handleProcessLock();
  if (cleanAllowed) {
    cleanNextDirectory();
  }
  log("Self-heal check completed. Ready for compilation.");
}

main();
