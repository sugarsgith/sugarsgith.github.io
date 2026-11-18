#!/usr/bin/env node
/**
 * メニューのリンク、Service Worker の事前キャッシュ、各 HTML の JS 構文を見る。
 * サイトのファイルは読まない限り変更しない。推測の正しさまでは見ない。
 *
 *   node scripts/check-site.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

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

if (errors.length) {
  console.error("NG " + errors.length + " 件");
  errors.forEach(function (e) { console.error("- " + e); });
  process.exit(1);
}

console.log("OK メニュー " + hrefs.length + " 件、機種 " + machineIds.length + " 件の履歴名、JS 構文を確認しました");
