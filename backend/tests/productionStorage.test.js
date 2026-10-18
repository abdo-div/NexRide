import assert from "node:assert/strict";
import fs from "node:fs";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { saveProcessedImage } from "../utils/imageStorage.js";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryDir = path.resolve(backendDir, "..");
const readBackend = (...parts) =>
  fs.readFileSync(path.join(backendDir, ...parts), "utf8");
const readRepository = (...parts) =>
  fs.readFileSync(path.join(repositoryDir, ...parts), "utf8");

test("all generated image pipelines use the configured persistent root", () => {
  const vehicleImages = readBackend("utils", "vehicleImages.js");
  const companyImages = readBackend("utils", "companyImages.js");
  const userImages = readBackend("utils", "userImages.js");
  const userController = readBackend("controllers", "userController.js");

  for (const source of [vehicleImages, companyImages, userImages]) {
    assert.match(source, /saveProcessedImage/);
    assert.doesNotMatch(source, /["'`]public[\\/]/);
  }
  assert.match(userController, /saveUserPhoto/);
  assert.doesNotMatch(userController, /\.toFile\(["'`]public[\\/]/);
});

test("generated images are atomically promoted and unsafe filenames are refused", () => {
  const storage = readBackend("utils", "imageStorage.js");

  assert.match(storage, /safeFilename\.test\(filename\)/);
  assert.match(storage, /randomUUID\(\)/);
  assert.match(storage, /await renameWithRetry\(temporary, destination\)/);
  assert.match(storage, /await rm\(temporary, \{ force: true \}\)/);
});

test("an image write leaves one complete final file and no temporary artifact", async () => {
  const directory = await mkdtemp(path.join(backendDir, ".storage-test-"));
  try {
    const buffer = await sharp({
      create: {
        width: 2,
        height: 2,
        channels: 3,
        background: "#2563eb",
      },
    })
      .png()
      .toBuffer();

    const storedName = await saveProcessedImage({
      buffer,
      directory,
      filename: "vehicle-safe.jpeg",
      process: (image) => image.resize(4, 4).jpeg({ quality: 80 }),
    });

    assert.equal(storedName, "vehicle-safe.jpeg");
    assert.deepEqual(await readdir(directory), ["vehicle-safe.jpeg"]);
    assert.equal(
      (await sharp(path.join(directory, storedName)).metadata()).format,
      "jpeg",
    );
    await assert.rejects(
      saveProcessedImage({
        buffer,
        directory,
        filename: "../escape.jpeg",
        process: (image) => image.jpeg(),
      }),
      /filename is unsafe/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("the API serves only the configured generated-media directories", () => {
  const app = readBackend("app.js");

  assert.match(app, /vehicleImagesDirectory/);
  assert.match(app, /userImagesDirectory/);
  assert.match(app, /companyImagesDirectory/);
  assert.match(app, /dotfiles: "deny"/);
  assert.match(app, /app\.use\(`\/public\$\{route\}`/);
});

test("the Node service can write storage but not the release checkout", () => {
  const unit = readRepository("deploy", "systemd", "nexride.service");

  assert.match(unit, /^ProtectSystem=strict$/m);
  assert.match(
    unit,
    /^ReadWritePaths=\/var\/lib\/nexride\/public \/var\/lib\/nexride\/private$/m,
  );
  assert.doesNotMatch(unit, /ReadWritePaths=.*\/srv\/nexride/);
});

test("nightly file backups are checksummed, retained, and restored in isolation", () => {
  const backup = readRepository("deploy", "storage", "backup.sh");
  const verify = readRepository("deploy", "storage", "verify-backup.sh");
  const service = readRepository(
    "deploy",
    "systemd",
    "nexride-files-backup.service",
  );
  const timer = readRepository(
    "deploy",
    "systemd",
    "nexride-files-backup.timer",
  );

  assert.match(backup, /tar[\s\S]*public private/);
  assert.match(backup, /gzip -t "\$partial"/);
  assert.match(backup, /sha256sum/);
  assert.match(backup, /RETENTION_DAYS/);
  assert.match(verify, /sha256sum -c/);
  assert.match(verify, /mktemp -d \/var\/tmp\/nexride-files-restore/);
  assert.doesNotMatch(verify, /--directory \/var\/lib\/nexride/);
  assert.match(service, /\/usr\/bin\/flock/);
  assert.match(timer, /^OnCalendar=/m);
  assert.match(timer, /^Persistent=true$/m);
});
