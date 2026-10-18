import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const sourceRoot = new URL(".", import.meta.url).pathname.replace(/^\/(.:\/)/, "$1");

const tsxFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return tsxFiles(path);
    return entry.isFile() && entry.name.endsWith(".tsx") && !entry.name.endsWith(".test.tsx")
      ? [path]
      : [];
  });

const attributeNames = (node: ts.JsxOpeningLikeElement) =>
  new Set(
    node.attributes.properties.flatMap((attribute) =>
      ts.isJsxAttribute(attribute) ? [attribute.name.getText()] : [],
    ),
  );

describe("interactive control contracts", () => {
  it("does not render enabled buttons without an action", () => {
    const missingActions: string[] = [];

    for (const file of tsxFiles(sourceRoot)) {
      const source = ts.createSourceFile(
        file,
        readFileSync(file, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );

      const visit = (node: ts.Node) => {
        if (
          (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
          node.tagName.getText() === "button"
        ) {
          const names = attributeNames(node);
          const typeAttribute = node.attributes.properties.find(
            (attribute): attribute is ts.JsxAttribute =>
              ts.isJsxAttribute(attribute) && attribute.name.getText() === "type",
          );
          const isSubmit =
            typeAttribute?.initializer &&
            ts.isStringLiteral(typeAttribute.initializer) &&
            typeAttribute.initializer.text === "submit";

          if (!names.has("onClick") && !names.has("disabled") && !isSubmit) {
            const position = source.getLineAndCharacterOfPosition(node.getStart(source));
            missingActions.push(
              `${relative(sourceRoot, file)}:${position.line + 1}`,
            );
          }
        }
        ts.forEachChild(node, visit);
      };

      visit(source);
    }

    expect(missingActions).toEqual([]);
  }, 20_000);

  it("uses the in-app dialog system instead of native browser popups", () => {
    const nativeDialogs: string[] = [];

    for (const file of tsxFiles(sourceRoot)) {
      const contents = readFileSync(file, "utf8");
      if (/window\.(?:alert|confirm|prompt)\s*\(/.test(contents)) {
        nativeDialogs.push(relative(sourceRoot, file));
      }
    }

    expect(nativeDialogs).toEqual([]);
  });
});
