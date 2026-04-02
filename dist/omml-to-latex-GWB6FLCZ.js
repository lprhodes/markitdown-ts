import {
  SAFE_XML_OPTIONS
} from "./chunk-DBWGSGT6.js";

// src/utils/docx-math/omml-to-latex.ts
import { XMLParser } from "fast-xml-parser";

// src/utils/docx-math/latex-dict.ts
var CHARS = /* @__PURE__ */ new Set([
  "{",
  "}",
  "_",
  "^",
  "#",
  "&",
  "$",
  "%",
  "~"
]);
var BLANK = "";
var BACKSLASH = "\\";
var ALN = "&";
var BRK = "\\\\";
var FUNC_PLACE = "{fe}";
var CHR = {
  // Top accents
  "\u0300": "\\grave{{{0}}}",
  "\u0301": "\\acute{{{0}}}",
  "\u0302": "\\hat{{{0}}}",
  "\u0303": "\\tilde{{{0}}}",
  "\u0304": "\\bar{{{0}}}",
  "\u0305": "\\overbar{{{0}}}",
  "\u0306": "\\breve{{{0}}}",
  "\u0307": "\\dot{{{0}}}",
  "\u0308": "\\ddot{{{0}}}",
  "\u0309": "\\ovhook{{{0}}}",
  "\u030A": "\\ocirc{{{0}}}}",
  "\u030C": "\\check{{{0}}}}",
  "\u0310": "\\candra{{{0}}}",
  "\u0312": "\\oturnedcomma{{{0}}}",
  "\u0315": "\\ocommatopright{{{0}}}",
  "\u031A": "\\droang{{{0}}}",
  "\u0338": "\\not{{{0}}}",
  "\u20D0": "\\leftharpoonaccent{{{0}}}",
  "\u20D1": "\\rightharpoonaccent{{{0}}}",
  "\u20D2": "\\vertoverlay{{{0}}}",
  "\u20D6": "\\overleftarrow{{{0}}}",
  "\u20D7": "\\vec{{{0}}}",
  "\u20DB": "\\dddot{{{0}}}",
  "\u20DC": "\\ddddot{{{0}}}",
  "\u20E1": "\\overleftrightarrow{{{0}}}",
  "\u20E7": "\\annuity{{{0}}}",
  "\u20E9": "\\widebridgeabove{{{0}}}",
  "\u20F0": "\\asteraccent{{{0}}}",
  // Bottom accents
  "\u0330": "\\wideutilde{{{0}}}",
  "\u0331": "\\underbar{{{0}}}",
  "\u20E8": "\\threeunderdot{{{0}}}",
  "\u20EC": "\\underrightharpoondown{{{0}}}",
  "\u20ED": "\\underleftharpoondown{{{0}}}",
  "\u20EE": "\\underledtarrow{{{0}}}",
  "\u20EF": "\\underrightarrow{{{0}}}",
  // Over | group
  "\u23B4": "\\overbracket{{{0}}}",
  "\u23DC": "\\overparen{{{0}}}",
  "\u23DE": "\\overbrace{{{0}}}",
  // Under | group
  "\u23B5": "\\underbracket{{{0}}}",
  "\u23DD": "\\underparen{{{0}}}",
  "\u23DF": "\\underbrace{{{0}}}"
};
var CHR_BO = {
  "\u2140": "\\Bbbsum",
  "\u220F": "\\prod",
  "\u2210": "\\coprod",
  "\u2211": "\\sum",
  "\u222B": "\\int",
  "\u22C0": "\\bigwedge",
  "\u22C1": "\\bigvee",
  "\u22C2": "\\bigcap",
  "\u22C3": "\\bigcup",
  "\u2A00": "\\bigodot",
  "\u2A01": "\\bigoplus",
  "\u2A02": "\\bigotimes"
};
var T = {
  "\u2192": "\\rightarrow ",
  // Greek letters
  "\u{1D6FC}": "\\alpha ",
  "\u{1D6FD}": "\\beta ",
  "\u{1D6FE}": "\\gamma ",
  "\u{1D6FF}": "\\theta ",
  "\u{1D700}": "\\epsilon ",
  "\u{1D701}": "\\zeta ",
  "\u{1D702}": "\\eta ",
  "\u{1D703}": "\\theta ",
  "\u{1D704}": "\\iota ",
  "\u{1D705}": "\\kappa ",
  "\u{1D706}": "\\lambda ",
  "\u{1D707}": "\\m ",
  "\u{1D708}": "\\n ",
  "\u{1D709}": "\\xi ",
  "\u{1D70A}": "\\omicron ",
  "\u{1D70B}": "\\pi ",
  "\u{1D70C}": "\\rho ",
  "\u{1D70D}": "\\varsigma ",
  "\u{1D70E}": "\\sigma ",
  "\u{1D70F}": "\\ta ",
  "\u{1D710}": "\\upsilon ",
  "\u{1D711}": "\\phi ",
  "\u{1D712}": "\\chi ",
  "\u{1D713}": "\\psi ",
  "\u{1D714}": "\\omega ",
  "\u{1D715}": "\\partial ",
  "\u{1D716}": "\\varepsilon ",
  "\u{1D717}": "\\vartheta ",
  "\u{1D718}": "\\varkappa ",
  "\u{1D719}": "\\varphi ",
  "\u{1D71A}": "\\varrho ",
  "\u{1D71B}": "\\varpi ",
  // Relation symbols
  "\u2190": "\\leftarrow ",
  "\u2191": "\\uparrow ",
  // '\u2192' already defined above
  "\u2193": "\\downright ",
  "\u2194": "\\leftrightarrow ",
  "\u2195": "\\updownarrow ",
  "\u2196": "\\nwarrow ",
  "\u2197": "\\nearrow ",
  "\u2198": "\\searrow ",
  "\u2199": "\\swarrow ",
  "\u22EE": "\\vdots ",
  "\u22EF": "\\cdots ",
  "\u22F0": "\\adots ",
  "\u22F1": "\\ddots ",
  "\u2260": "\\ne ",
  "\u2264": "\\leq ",
  "\u2265": "\\geq ",
  "\u2266": "\\leqq ",
  "\u2267": "\\geqq ",
  "\u2268": "\\lneqq ",
  "\u2269": "\\gneqq ",
  "\u226A": "\\ll ",
  "\u226B": "\\gg ",
  "\u2208": "\\in ",
  "\u2209": "\\notin ",
  "\u220B": "\\ni ",
  "\u220C": "\\nni ",
  // Ordinary symbols
  "\u221E": "\\infty ",
  // Binary relations
  "\xB1": "\\pm ",
  "\u2213": "\\mp ",
  // Italic, Latin, uppercase
  "\u{1D434}": "A",
  "\u{1D435}": "B",
  "\u{1D436}": "C",
  "\u{1D437}": "D",
  "\u{1D438}": "E",
  "\u{1D439}": "F",
  "\u{1D43A}": "G",
  "\u{1D43B}": "H",
  "\u{1D43C}": "I",
  "\u{1D43D}": "J",
  "\u{1D43E}": "K",
  "\u{1D43F}": "L",
  "\u{1D440}": "M",
  "\u{1D441}": "N",
  "\u{1D442}": "O",
  "\u{1D443}": "P",
  "\u{1D444}": "Q",
  "\u{1D445}": "R",
  "\u{1D446}": "S",
  "\u{1D447}": "T",
  "\u{1D448}": "U",
  "\u{1D449}": "V",
  "\u{1D44A}": "W",
  "\u{1D44B}": "X",
  "\u{1D44C}": "Y",
  "\u{1D44D}": "Z",
  // Italic, Latin, lowercase
  "\u{1D44E}": "a",
  "\u{1D44F}": "b",
  "\u{1D450}": "c",
  "\u{1D451}": "d",
  "\u{1D452}": "e",
  "\u{1D453}": "f",
  "\u{1D454}": "g",
  "\u{1D456}": "i",
  "\u{1D457}": "j",
  "\u{1D458}": "k",
  "\u{1D459}": "l",
  "\u{1D45A}": "m",
  "\u{1D45B}": "n",
  "\u{1D45C}": "o",
  "\u{1D45D}": "p",
  "\u{1D45E}": "q",
  "\u{1D45F}": "r",
  "\u{1D460}": "s",
  "\u{1D461}": "t",
  "\u{1D462}": "u",
  "\u{1D463}": "v",
  "\u{1D464}": "w",
  "\u{1D465}": "x",
  "\u{1D466}": "y",
  "\u{1D467}": "z"
};
var FUNC = {
  sin: "\\sin({fe})",
  cos: "\\cos({fe})",
  tan: "\\tan({fe})",
  arcsin: "\\arcsin({fe})",
  arccos: "\\arccos({fe})",
  arctan: "\\arctan({fe})",
  arccot: "\\arccot({fe})",
  sinh: "\\sinh({fe})",
  cosh: "\\cosh({fe})",
  tanh: "\\tanh({fe})",
  coth: "\\coth({fe})",
  sec: "\\sec({fe})",
  csc: "\\csc({fe})"
};
var CHR_DEFAULT = {
  ACC_VAL: "\\hat{{{0}}}"
};
var POS = {
  top: "\\overline{{{0}}}",
  bot: "\\underline{{{0}}}"
};
var POS_DEFAULT = {
  BAR_VAL: "\\overline{{{0}}}"
};
var SUB = "_{{{0}}}";
var SUP = "^{{{0}}}";
var F = {
  bar: "\\frac{{{num}}}{{{den}}}",
  skw: "^{{{num}}}/_{{{den}}}",
  noBar: "\\genfrac{{}}{{}}{0pt}{{}}{{{num}}}{{{den}}}",
  lin: "{{{num}}}/{{{den}}}"
};
var F_DEFAULT = "\\frac{{{num}}}{{{den}}}";
var D = "\\left{left}{text}\\right{right}";
var D_DEFAULT = {
  left: "(",
  right: ")",
  null: "."
};
var RAD = "\\sqrt[{deg}]{{{text}}}";
var RAD_DEFAULT = "\\sqrt{{{text}}}";
var ARR = "\\begin{{array}}{{c}}{text}\\end{{array}}";
var LIM_FUNC = {
  lim: "\\lim_{{{lim}}}",
  max: "\\max_{{{lim}}}",
  min: "\\min_{{{lim}}}"
};
var LIM_TO = ["\\rightarrow", "\\to"];
var LIM_UPP = "\\overset{{{lim}}}{{{text}}}";
var M = "\\begin{{matrix}}{text}\\end{{matrix}}";

// src/utils/docx-math/omml-to-latex.ts
var M_PREFIX = "m:";
function stripNs(tag) {
  if (tag.startsWith(M_PREFIX)) {
    return tag.slice(M_PREFIX.length);
  }
  return tag;
}
function jsonToElement(node) {
  const attrs = {};
  const attrObj = node[":@"];
  if (attrObj) {
    for (const [k, v] of Object.entries(attrObj)) {
      const cleanKey = k.startsWith("@_") ? k.slice(2) : k;
      attrs[cleanKey] = String(v);
    }
  }
  let tagName;
  let childrenRaw;
  for (const key of Object.keys(node)) {
    if (key === ":@") continue;
    tagName = key;
    childrenRaw = node[key];
    break;
  }
  if (!tagName) return null;
  const localTag = stripNs(tagName);
  const children = [];
  let text;
  if (Array.isArray(childrenRaw)) {
    for (const child of childrenRaw) {
      if (typeof child === "object" && child !== null) {
        const childObj = child;
        if ("#text" in childObj) {
          const tVal = childObj["#text"];
          text = tVal !== void 0 && tVal !== null ? String(tVal) : void 0;
        } else {
          const el = jsonToElement(childObj);
          if (el) {
            children.push(el);
          }
        }
      }
    }
  } else if (typeof childrenRaw === "string" || typeof childrenRaw === "number") {
    text = String(childrenRaw);
  }
  return { tag: localTag, attrs, children, text };
}
var OMML_PARSER_OPTIONS = {
  ...SAFE_XML_OPTIONS,
  preserveOrder: true,
  // We do NOT strip namespace prefixes — we handle them ourselves via stripNs
  removeNSPrefix: false
};
function parseOmml(xml) {
  const parser = new XMLParser(OMML_PARSER_OPTIONS);
  const result = parser.parse(xml);
  if (!Array.isArray(result) || result.length === 0) return null;
  const children = [];
  for (const node of result) {
    const el = jsonToElement(node);
    if (el) children.push(el);
  }
  if (children.length === 1) return children[0];
  return { tag: "__root__", attrs: {}, children, text: void 0 };
}
function escapeLatex(strs) {
  let last = null;
  const newChr = [];
  strs = strs.replace(/\\\\/g, "\\");
  for (const c of strs) {
    if (CHARS.has(c) && last !== BACKSLASH) {
      newChr.push(BACKSLASH + c);
    } else {
      newChr.push(c);
    }
    last = c;
  }
  return newChr.join(BLANK);
}
function getVal(key, defaultVal = void 0, store = CHR) {
  if (key != null) {
    return !store ? key : store[key] ?? key;
  }
  return defaultVal;
}
function formatNamed(template, values) {
  let result = template;
  for (const [key, val] of Object.entries(values)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), val ?? "");
  }
  result = result.replace(/\{\{/g, "{").replace(/\}\}/g, "}");
  return result;
}
function formatPositional(template, ...args) {
  let result = template;
  for (let i = 0; i < args.length; i++) {
    result = result.replace(new RegExp(`\\{${i}\\}`, "g"), args[i]);
  }
  result = result.replace(/\{\{/g, "{").replace(/\}\}/g, "}");
  return result;
}
function findText(elm, localTag) {
  for (const child of elm.children) {
    if (child.tag === localTag) {
      if (child.text !== void 0) return child.text;
      return void 0;
    }
  }
  return void 0;
}
function getAttr(elm, localName) {
  return elm.attrs[`m:${localName}`] ?? elm.attrs[localName];
}
var PR_VAL_TAGS = /* @__PURE__ */ new Set(["chr", "pos", "begChr", "endChr", "type"]);
var PR_TAG_METHODS = {
  brk: "brk",
  chr: "common",
  pos: "common",
  begChr: "common",
  endChr: "common",
  type: "common"
};
function processPr(elm) {
  const result = { text: "" };
  const textParts = [];
  for (const child of elm.children) {
    const stag = child.tag;
    const methodName = PR_TAG_METHODS[stag];
    if (methodName === "brk") {
      result.brk = BRK;
      textParts.push(BRK);
    } else if (methodName === "common") {
      if (PR_VAL_TAGS.has(stag)) {
        const val = getAttr(child, "val");
        result[stag] = val ?? null;
      }
    }
  }
  result.text = textParts.join(BLANK);
  return result;
}
var DIRECT_TAGS = /* @__PURE__ */ new Set([
  "box",
  "sSub",
  "sSup",
  "sSubSup",
  "num",
  "den",
  "deg",
  "e"
]);
function* processChildrenList(elm, include) {
  for (const child of elm.children) {
    const stag = child.tag;
    if (include && !include.has(stag)) {
      continue;
    }
    let t = callMethod(child, stag);
    if (t === null) {
      t = processUnknown(child, stag);
      if (t === null) {
        continue;
      }
    }
    yield [stag, t, child];
  }
}
function processChildrenDict(elm, include) {
  const result = {};
  for (const [stag, t] of processChildrenList(elm, include)) {
    result[stag] = t;
  }
  return result;
}
function processChildren(elm, include) {
  const parts = [];
  for (const [, t] of processChildrenList(elm, include)) {
    if (typeof t === "string") {
      parts.push(t);
    } else {
      parts.push(t.text);
    }
  }
  return parts.join(BLANK);
}
function processUnknown(elm, stag) {
  if (DIRECT_TAGS.has(stag)) {
    return processChildren(elm);
  }
  if (stag.length >= 2 && stag.slice(-2) === "Pr") {
    return processPr(elm);
  }
  return null;
}
function doAcc(elm) {
  const cDict = processChildrenDict(elm);
  const pr = cDict["accPr"];
  const latexS = getVal(
    pr?.chr,
    CHR_DEFAULT["ACC_VAL"],
    CHR
  );
  return formatPositional(latexS, cDict["e"] ?? "");
}
function doBar(elm) {
  const cDict = processChildrenDict(elm);
  const pr = cDict["barPr"];
  const latexS = getVal(
    pr?.pos,
    POS_DEFAULT["BAR_VAL"],
    POS
  );
  return (pr?.text ?? "") + formatPositional(latexS, cDict["e"] ?? "");
}
function doD(elm) {
  const cDict = processChildrenDict(elm);
  const pr = cDict["dPr"];
  const nullChar = D_DEFAULT["null"];
  const sVal = getVal(pr?.begChr, D_DEFAULT["left"], T);
  const eVal = getVal(pr?.endChr, D_DEFAULT["right"], T);
  return (pr?.text ?? "") + formatNamed(D, {
    left: !sVal ? nullChar : escapeLatex(sVal),
    text: cDict["e"] ?? "",
    right: !eVal ? nullChar : escapeLatex(eVal)
  });
}
function doSub(elm) {
  const text = processChildren(elm);
  return formatPositional(SUB, text);
}
function doSup(elm) {
  const text = processChildren(elm);
  return formatPositional(SUP, text);
}
function doF(elm) {
  const cDict = processChildrenDict(elm);
  const pr = cDict["fPr"];
  const latexS = getVal(pr?.type, F_DEFAULT, F) ?? F_DEFAULT;
  return (pr?.text ?? "") + formatNamed(latexS, {
    num: cDict["num"] ?? "",
    den: cDict["den"] ?? ""
  });
}
function doFunc(elm) {
  const cDict = processChildrenDict(elm);
  const funcName = cDict["fName"] ?? "";
  return funcName.replace(FUNC_PLACE, cDict["e"] ?? "");
}
function doFName(elm) {
  const latexChars = [];
  for (const [stag, t] of processChildrenList(elm)) {
    if (stag === "r") {
      const tStr = t;
      const funcTemplate = FUNC[tStr];
      if (funcTemplate) {
        latexChars.push(funcTemplate);
      } else {
        latexChars.push(tStr);
      }
    } else {
      latexChars.push(typeof t === "string" ? t : t.text);
    }
  }
  const result = latexChars.join(BLANK);
  return result.includes(FUNC_PLACE) ? result : result + FUNC_PLACE;
}
function doGroupChr(elm) {
  const cDict = processChildrenDict(elm);
  const pr = cDict["groupChrPr"];
  const latexS = getVal(pr?.chr);
  return (pr?.text ?? "") + formatPositional(latexS, cDict["e"] ?? "");
}
function doRad(elm) {
  const cDict = processChildrenDict(elm);
  const text = cDict["e"] ?? "";
  const degText = cDict["deg"] ?? "";
  if (degText) {
    return formatNamed(RAD, { deg: degText, text });
  }
  return formatNamed(RAD_DEFAULT, { text });
}
function doEqArr(elm) {
  const includeSet = /* @__PURE__ */ new Set(["e"]);
  const rows = [];
  for (const [, t] of processChildrenList(elm, includeSet)) {
    rows.push(typeof t === "string" ? t : t.text);
  }
  return formatNamed(ARR, { text: rows.join(BRK) });
}
function doLimLow(elm) {
  const includeSet = /* @__PURE__ */ new Set(["e", "lim"]);
  const tDict = processChildrenDict(elm, includeSet);
  const eText = tDict["e"];
  const latexS = LIM_FUNC[eText];
  if (!latexS) {
    return eText ?? "";
  }
  return formatNamed(latexS, { lim: tDict["lim"] ?? "" });
}
function doLimUpp(elm) {
  const includeSet = /* @__PURE__ */ new Set(["e", "lim"]);
  const tDict = processChildrenDict(elm, includeSet);
  return formatNamed(LIM_UPP, {
    lim: tDict["lim"] ?? "",
    text: tDict["e"] ?? ""
  });
}
function doLim(elm) {
  return processChildren(elm).replace(LIM_TO[0], LIM_TO[1]);
}
function doM(elm) {
  const rows = [];
  for (const [stag, t] of processChildrenList(elm)) {
    if (stag === "mPr") {
    } else if (stag === "mr") {
      rows.push(typeof t === "string" ? t : t.text);
    }
  }
  return formatNamed(M, { text: rows.join(BRK) });
}
function doMr(elm) {
  const includeSet = /* @__PURE__ */ new Set(["e"]);
  const cols = [];
  for (const [, t] of processChildrenList(elm, includeSet)) {
    cols.push(typeof t === "string" ? t : t.text);
  }
  return cols.join(ALN);
}
function doNary(elm) {
  const res = [];
  let bo = "";
  for (const [stag, t] of processChildrenList(elm)) {
    if (stag === "naryPr") {
      const pr = t;
      bo = getVal(pr.chr, void 0, CHR_BO) ?? "";
    } else {
      res.push(typeof t === "string" ? t : t.text);
    }
  }
  return bo + res.join(BLANK);
}
function doR(elm) {
  const tText = findText(elm, "t");
  if (!tText) return "";
  const parts = [];
  for (const c of tText) {
    parts.push(T[c] ?? c);
  }
  return escapeLatex(parts.join(BLANK));
}
var TAG_METHODS = {
  acc: doAcc,
  r: doR,
  bar: doBar,
  sub: doSub,
  sup: doSup,
  f: doF,
  func: doFunc,
  fName: doFName,
  groupChr: doGroupChr,
  d: doD,
  rad: doRad,
  eqArr: doEqArr,
  limLow: doLimLow,
  limUpp: doLimUpp,
  lim: doLim,
  m: doM,
  mr: doMr,
  nary: doNary
};
function callMethod(elm, stag) {
  const tag = stag ?? elm.tag;
  const method = TAG_METHODS[tag];
  if (method) {
    return method(elm);
  }
  return null;
}
function ommlToLatex(ommlXml) {
  const root = parseOmml(ommlXml);
  if (!root) return "";
  if (root.tag === "oMath") {
    return processChildren(root);
  }
  if (root.tag === "oMathPara") {
    const results2 = [];
    for (const child of root.children) {
      if (child.tag === "oMath") {
        results2.push(processChildren(child));
      }
    }
    return results2.join(" ");
  }
  const results = [];
  for (const child of root.children) {
    if (child.tag === "oMath") {
      results.push(processChildren(child));
    } else if (child.tag === "oMathPara") {
      for (const grandchild of child.children) {
        if (grandchild.tag === "oMath") {
          results.push(processChildren(grandchild));
        }
      }
    }
  }
  return results.join(" ");
}
function processOmmlInXml(xml) {
  let result = xml;
  result = result.replace(
    /<m:oMathPara[\s>][\s\S]*?<\/m:oMathPara>/g,
    (match) => {
      try {
        const latex = ommlToLatex(match);
        if (!latex) return match;
        return `<w:p><w:r><w:t>$$${latex}$$</w:t></w:r></w:p>`;
      } catch {
        return match;
      }
    }
  );
  result = result.replace(
    /<m:oMath[\s>][\s\S]*?<\/m:oMath>/g,
    (match) => {
      try {
        const latex = ommlToLatex(match);
        if (!latex) return match;
        return `<w:r><w:t>$${latex}$</w:t></w:r>`;
      } catch {
        return match;
      }
    }
  );
  return result;
}
export {
  ommlToLatex,
  processOmmlInXml
};
//# sourceMappingURL=omml-to-latex-GWB6FLCZ.js.map