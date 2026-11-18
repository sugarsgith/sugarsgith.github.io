#!/usr/bin/env node
/**
 * メニューのリンク、Service Worker の事前キャッシュ、各 HTML の JS 構文を見る。
 * 体調ログは、本番のマニフェストと、テストブランチの JS も見る。
 * サイトのファイルは読まない限り変更しない。推測や記録の正しさまでは見ない。
 *
 *   node scripts/check-site.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const errors = [];

function rel(p) {
  return path.relative(root, p) || p;
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function fail(message) {
  errors.push(message);
}

function existsFile(urlPath) {
  const clean = urlPath.split("#")[0].split("?")[0];
  if (clean === "/" || clean === "") return path.join(root, "index.html");
  const stripped = clean.replace(/^\//, "");
  if (clean.endsWith("/")) return path.join(root, stripped, "index.html");
  return path.join(root, stripped);
}

function checkSyntax(filename, code) {
  try {
    new vm.Script(code, { filename: filename });
  } catch (e) {
    fail(filename + ": " + (e && e.message ? e.message : e));
  }
}

function extractScripts(html) {
  const out = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) out.push({ attrs: m[1] || "", code: m[2] || "" });
  return out;
}

function attr(attrs, name) {
  const m = new RegExp("\\b" + name + "\\s*=\\s*([\"'])([\\s\\S]*?)\\1", "i").exec(attrs);
  return m ? m[2] : "";
}

function localScriptsIn(htmlFile) {
  const html = read(htmlFile);
  const dir = path.dirname(htmlFile);
  extractScripts(html).forEach(function (s, i) {
    const src = attr(s.attrs, "src");
    if (!src) {
      if (s.code.trim()) checkSyntax(rel(htmlFile) + " script#" + (i + 1), s.code);
      return;
    }
    if (/^(https?:)?\/\//i.test(src)) {
      fail(rel(htmlFile) + ": 外部スクリプトは想定していません: " + src);
      return;
    }
    const target = src.startsWith("/")
      ? path.join(root, src.replace(/^\//, ""))
      : path.resolve(dir, src);
    if (!fs.existsSync(target)) {
      fail(rel(htmlFile) + ": 参照先がありません: " + src);
      return;
    }
    checkSyntax(rel(target), read(target));
  });
}

function quoted(block) {
  const urls = [];
  const re = /["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(block))) urls.push(m[1]);
  return urls;
}

function checkPrecache(swFile) {
  const src = read(swFile);
  const cache = /const\s+CACHE\s*=\s*["']([^"']+)["']/.exec(src);
  if (!cache) {
    fail(rel(swFile) + ": CACHE が見つかりません");
    return;
  }
  const name = cache[1];
  const expect = swFile.endsWith(path.join("taicho", "sw.js")) ? /^taicho-v\d+$/ : /^slotsense-v\d+$/;
  if (!expect.test(name)) fail(rel(swFile) + ": キャッシュ名が想定外です: " + name);
  const block = /const\s+PRECACHE\s*=\s*\[([\s\S]*?)\]/.exec(src);
  if (!block) {
    fail(rel(swFile) + ": PRECACHE が見つかりません");
    return;
  }
  quoted(block[1]).forEach(function (url) {
    const file = existsFile(url);
    if (!fs.existsSync(file)) fail(rel(swFile) + ": 事前キャッシュの実体がありません: " + url + " → " + rel(file));
  });
}

function menuHrefs(html) {
  const hrefs = [];
  const re = /<a\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    if (!/\bclass\s*=\s*["'][^"']*\bm\b/.test(tag)) continue;
    const href = attr(tag, "href");
    if (!href) fail("index.html: class=m のリンクに href がありません: " + tag);
    else hrefs.push(href);
  }
  return hrefs;
}

function machineIdFromHref(href) {
  const clean = href.split("#")[0].split("?")[0];
  if (!clean || clean === "/" || /^(https?:)?\/\//i.test(clean)) return "";
  return clean.replace(/^\.\//, "").replace(/\/$/, "").split("/")[0];
}

const indexPath = path.join(root, "index.html");
if (!fs.existsSync(indexPath)) fail("index.html がありません");

const indexHtml = fs.existsSync(indexPath) ? read(indexPath) : "";
const hrefs = menuHrefs(indexHtml);
if (!hrefs.length) fail("index.html: メニューの a.m が見つかりません");

const machineIds = [];
hrefs.forEach(function (href) {
  if (/^(https?:)?\/\//i.test(href)) {
    fail("index.html: メニューが外部 URL です: " + href);
    return;
  }
  const resolved = href.startsWith("/")
    ? existsFile(href)
    : path.resolve(root, href.endsWith("/") ? path.join(href, "index.html") : href);
  if (!fs.existsSync(resolved)) fail("index.html: メニューの先がありません: " + href + " → " + rel(resolved));
  const id = machineIdFromHref(href);
  if (id && id !== "history" && id !== "hyena") machineIds.push(id);
});

const historyPath = path.join(root, "history", "index.html");
if (fs.existsSync(historyPath)) {
  const history = read(historyPath);
  const block = /MACHINE_TITLES\s*=\s*\{([\s\S]*?)\}/.exec(history);
  const body = block ? block[1] : "";
  machineIds.forEach(function (id) {
    const re = new RegExp("\\b" + id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*:");
    if (!re.test(body)) fail("history/index.html: MACHINE_TITLES に " + id + " がありません");
  });
} else {
  fail("history/index.html がありません");
}

["sw.js", path.join("taicho", "sw.js")].forEach(function (p) {
  const file = path.join(root, p);
  if (!fs.existsSync(file)) fail(p + " がありません");
  else checkPrecache(file);
});

function walkHtml(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (ent) {
    if (ent.name === "node_modules" || ent.name === ".git") return;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkHtml(full);
    else if (ent.name.endsWith(".html")) localScriptsIn(full);
  });
}
walkHtml(root);

["sw.js", "topbar.js", path.join("taicho", "sw.js")].forEach(function (p) {
  const file = path.join(root, p);
  if (fs.existsSync(file)) checkSyntax(rel(file), read(file));
});

function gitOk(args) {
  try {
    execFileSync("git", args, { cwd: root, stdio: "ignore" });
    return true;
  } catch (e) {
    return false;
  }
}

function gitShow(rev, file) {
  try {
    return execFileSync("git", ["show", rev + ":" + file], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 8 * 1024 * 1024
    });
  } catch (e) {
    return null;
  }
}

function checkTaichoManifest(label, text, fileExists) {
  let manifest;
  try {
    manifest = JSON.parse(text);
  } catch (e) {
    fail(label + ": manifest が JSON として読めません");
    return;
  }
  if (manifest.scope !== "/taicho/") fail(label + ": scope が /taicho/ ではありません: " + manifest.scope);
  if (manifest.start_url !== "/taicho/") fail(label + ": start_url が /taicho/ ではありません: " + manifest.start_url);
  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  if (!icons.length) fail(label + ": icons がありません");
  icons.forEach(function (icon) {
    if (!icon || !icon.src) {
      fail(label + ": icon.src がありません");
      return;
    }
    if (!fileExists(icon.src)) fail(label + ": アイコンの実体がありません: " + icon.src);
  });
}

function checkTaichoSw(label, text, fileExists) {
  checkSyntax(label, text);
  const cache = /const\s+CACHE\s*=\s*["']([^"']+)["']/.exec(text);
  if (!cache) fail(label + ": CACHE が見つかりません");
  else if (!/^taicho-v\d+$/.test(cache[1])) fail(label + ": キャッシュ名が想定外です: " + cache[1]);
  const block = /const\s+PRECACHE\s*=\s*\[([\s\S]*?)\]/.exec(text);
  if (!block) {
    fail(label + ": PRECACHE が見つかりません");
    return;
  }
  quoted(block[1]).forEach(function (url) {
    if (url.indexOf("/taicho/") !== 0) fail(label + ": 事前キャッシュが /taicho/ の外です: " + url);
    if (!fileExists(url)) fail(label + ": 事前キャッシュの実体がありません: " + url);
  });
}

function checkTaichoRegistration(label, html) {
  if (html.indexOf("/taicho/manifest.webmanifest") < 0) fail(label + ": マニフェスト参照がありません");
  if (html.indexOf("register('/taicho/sw.js'") < 0 && html.indexOf('register("/taicho/sw.js"') < 0) {
    fail(label + ": /taicho/sw.js の登録がありません");
  }
  if (html.indexOf("scope:'/taicho/'") < 0 && html.indexOf('scope:"/taicho/"') < 0 && html.indexOf("scope: '/taicho/'") < 0 && html.indexOf('scope: "/taicho/"') < 0) {
    fail(label + ": Service Worker の scope が /taicho/ ではありません");
  }
}

function checkTaichoInline(label, html) {
  extractScripts(html).forEach(function (s, i) {
    const src = attr(s.attrs, "src");
    if (src) {
      fail(label + ": 外部スクリプトは想定していません: " + src);
      return;
    }
    if (s.code.trim()) checkSyntax(label + " script#" + (i + 1), s.code);
  });
}

function diskExists(urlPath) {
  return fs.existsSync(existsFile(urlPath));
}

const taichoHtmlPath = path.join(root, "taicho", "index.html");
const taichoManifestPath = path.join(root, "taicho", "manifest.webmanifest");
const taichoSwPath = path.join(root, "taicho", "sw.js");
if (!fs.existsSync(taichoHtmlPath)) fail("taicho/index.html がありません");
else checkTaichoRegistration("taicho/index.html", read(taichoHtmlPath));
if (!fs.existsSync(taichoManifestPath)) fail("taicho/manifest.webmanifest がありません");
else checkTaichoManifest("taicho/manifest.webmanifest", read(taichoManifestPath), diskExists);
if (fs.existsSync(taichoSwPath)) checkTaichoSw("taicho/sw.js", read(taichoSwPath), diskExists);

hrefs.forEach(function (href) {
  if (href.indexOf("taicho") !== -1) fail("index.html: メニューが体調ログを指しています: " + href);
});

const slotsenseSw = path.join(root, "sw.js");
if (fs.existsSync(slotsenseSw)) {
  const block = /const\s+PRECACHE\s*=\s*\[([\s\S]*?)\]/.exec(read(slotsenseSw));
  if (block) {
    quoted(block[1]).forEach(function (url) {
      if (url.indexOf("/taicho") === 0) fail("sw.js: SLOTSENSE の事前キャッシュに体調ログがあります: " + url);
    });
  }
}

const testRefs = ["origin/fix/taicho-data-protection", "fix/taicho-data-protection"];
let testRev = "";
testRefs.forEach(function (name) {
  if (!testRev && gitOk(["rev-parse", "--verify", "--quiet", name])) testRev = name;
});

if (!testRev) {
  fail("体調ログのテストブランチが見つかりません（origin/fix/taicho-data-protection）");
} else {
  const testLabel = testRev + ":taicho";
  function testExists(urlPath) {
    const clean = urlPath.split("#")[0].split("?")[0];
    const relPath = clean === "/taicho/" || clean === "/taicho" ? "taicho/index.html" : clean.replace(/^\//, "");
    return gitOk(["cat-file", "-e", testRev + ":" + relPath]);
  }
  const testHtml = gitShow(testRev, "taicho/index.html");
  const testSw = gitShow(testRev, "taicho/sw.js");
  const testManifest = gitShow(testRev, "taicho/manifest.webmanifest");
  const testBuild = gitShow(testRev, "taicho/build-preview.cjs");
  if (testHtml === null) fail(testLabel + "/index.html を読めません");
  else {
    checkTaichoRegistration(testLabel + "/index.html", testHtml);
    checkTaichoInline(testLabel + "/index.html", testHtml);
  }
  if (testSw === null) fail(testLabel + "/sw.js を読めません");
  else checkTaichoSw(testLabel + "/sw.js", testSw, testExists);
  if (testManifest === null) fail(testLabel + "/manifest.webmanifest を読めません");
  else checkTaichoManifest(testLabel + "/manifest.webmanifest", testManifest, testExists);
  if (testBuild === null) fail(testLabel + "/build-preview.cjs を読めません");
  else {
    checkSyntax(testLabel + "/build-preview.cjs", testBuild);
    if (testBuild.indexOf("taicho-preview-dist") < 0) fail(testLabel + "/build-preview.cjs: 出力先 taicho-preview-dist がありません");
    if (testBuild.indexOf("体調ログ テスト") < 0) fail(testLabel + "/build-preview.cjs: テスト用の表示名がありません");
    ["index.html", "manifest.webmanifest", "sw.js",
      "icons/apple-touch-icon.png", "icons/icon-192.png",
      "icons/icon-512.png", "icons/icon-512-maskable.png"].forEach(function (file) {
      if (!gitOk(["cat-file", "-e", testRev + ":taicho/" + file])) {
        fail(testLabel + "/build-preview.cjs: コピー元がありません: taicho/" + file);
      }
    });
  }
}

if (errors.length) {
  console.error("NG " + errors.length + " 件");
  errors.forEach(function (e) { console.error("- " + e); });
  process.exit(1);
}

console.log("OK メニュー " + hrefs.length + " 件、機種 " + machineIds.length + " 件の履歴名、体調ログ（本番と " + testRev + "）の JS とマニフェストを確認しました");
