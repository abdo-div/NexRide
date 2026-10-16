import { mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import sharp from "sharp";

const safeFilename = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

const renameWithRetry = async (source, destination) => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await rename(source, destination);
      return;
    } catch (error) {
      const transient = error?.code === "EPERM" || error?.code === "EBUSY";
      if (!transient || attempt >= 4) throw error;
      await delay(10 * 2 ** attempt);
    }
  }
};

/**
 * Process an uploaded image into a temporary file in the destination directory,
 * then atomically rename it into place. Generated media is therefore either
 * complete or absent when a concurrent HTTP request tries to read it.
 */
export const saveProcessedImage = async ({
  buffer,
  directory,
  filename,
  process,
}) => {
  if (!safeFilename.test(filename) || path.basename(filename) !== filename) {
    throw new Error("Generated media filename is unsafe.");
  }

  await mkdir(directory, { recursive: true });
  const destination = path.join(directory, filename);
  const temporary = path.join(directory, `.${filename}.${randomUUID()}.tmp`);

  try {
    await process(sharp(buffer)).toFile(temporary);
    await renameWithRetry(temporary, destination);
  } finally {
    await rm(temporary, { force: true });
  }

  return filename;
};

