/**
 * Static mapping from lowercase HTML/SVG attribute names to their JSX equivalents.
 *
 * Only includes attributes whose JSX name cannot be derived mechanically:
 * - Concatenated words that need interior caps (e.g. `tabindex` → `tabIndex`),
 *   because there is no separator character for auto-camelCase to act on.
 * - Renamed attributes (e.g. `class` → `className`, `for` → `htmlFor`).
 * - Irregular casing (e.g. `classid` → `classID`, `videographic` → `vIdeographic`).
 *
 * NOT included (handled by other branches in `convertAttributeName`):
 * - Hyphenated attributes (`stroke-width`) - auto-camelCased at the separator.
 * - Colon-namespaced attributes (`xlink:href`) - auto-camelCased at the colon.
 * - Event handlers (`onclick`) - split into known words by `capitalizeEventBody`.
 * - Attributes that are already valid JSX (`viewBox`, `fill`, `d`).
 *
 * Exception: `ondblclick` is here because React renames it to `onDoubleClick`,
 * which cannot be derived from the original letters.
 *
 * Sourced from React's possibleStandardNames.js:
 * // https://github.com/facebook/react/blob/main/packages/react-dom-bindings/src/shared/possibleStandardNames.js
 */
export const ATTRIBUTE_MAPPING: Record<string, string> = {
  acceptcharset: "acceptCharset",
  accesskey: "accessKey",
  allowfullscreen: "allowFullScreen",
  autocapitalize: "autoCapitalize",
  autocomplete: "autoComplete",
  autocorrect: "autoCorrect",
  autofocus: "autoFocus",
  autoplay: "autoPlay",
  autosave: "autoSave",
  cellpadding: "cellPadding",
  cellspacing: "cellSpacing",
  charset: "charSet",
  class: "className",
  classid: "classID",
  classname: "className",
  colspan: "colSpan",
  contenteditable: "contentEditable",
  contextmenu: "contextMenu",
  controlslist: "controlsList",
  crossorigin: "crossOrigin",
  dangerouslysetinnerhtml: "dangerouslySetInnerHTML",
  datetime: "dateTime",
  defaultchecked: "defaultChecked",
  defaultvalue: "defaultValue",
  enctype: "encType",
  for: "htmlFor",
  formmethod: "formMethod",
  formaction: "formAction",
  formenctype: "formEncType",
  formnovalidate: "formNoValidate",
  formtarget: "formTarget",
  frameborder: "frameBorder",
  hreflang: "hrefLang",
  htmlfor: "htmlFor",
  httpequiv: "httpEquiv",
  innerhtml: "innerHTML",
  inputmode: "inputMode",
  itemid: "itemID",
  itemprop: "itemProp",
  itemref: "itemRef",
  itemscope: "itemScope",
  itemtype: "itemType",
  keyparams: "keyParams",
  keytype: "keyType",
  marginwidth: "marginWidth",
  marginheight: "marginHeight",
  maxlength: "maxLength",
  mediagroup: "mediaGroup",
  minlength: "minLength",
  nomodule: "noModule",
  novalidate: "noValidate",
  playsinline: "playsInline",
  radiogroup: "radioGroup",
  readonly: "readOnly",
  referrerpolicy: "referrerPolicy",
  rowspan: "rowSpan",
  spellcheck: "spellCheck",
  srcdoc: "srcDoc",
  srclang: "srcLang",
  srcset: "srcSet",
  tabindex: "tabIndex",
  usemap: "useMap",

  // Event handler special cases
  ondblclick: "onDoubleClick",

  // SVG-only entries that need transformation
  accentheight: "accentHeight",
  alignmentbaseline: "alignmentBaseline",
  allowreorder: "allowReorder",
  arabicform: "arabicForm",
  attributename: "attributeName",
  attributetype: "attributeType",
  autoreverse: "autoReverse",
  basefrequency: "baseFrequency",
  baselineshift: "baselineShift",
  baseprofile: "baseProfile",
  calcmode: "calcMode",
  capheight: "capHeight",
  clippath: "clipPath",
  clippathunits: "clipPathUnits",
  cliprule: "clipRule",
  colorinterpolation: "colorInterpolation",
  colorinterpolationfilters: "colorInterpolationFilters",
  colorprofile: "colorProfile",
  colorrendering: "colorRendering",
  contentscripttype: "contentScriptType",
  contentstyletype: "contentStyleType",
  diffuseconstant: "diffuseConstant",
  dominantbaseline: "dominantBaseline",
  edgemode: "edgeMode",
  enablebackground: "enableBackground",
  externalresourcesrequired: "externalResourcesRequired",
  fillopacity: "fillOpacity",
  fillrule: "fillRule",
  filterres: "filterRes",
  filterunits: "filterUnits",
  floodopacity: "floodOpacity",
  floodcolor: "floodColor",
  fontfamily: "fontFamily",
  fontsize: "fontSize",
  fontsizeadjust: "fontSizeAdjust",
  fontstretch: "fontStretch",
  fontstyle: "fontStyle",
  fontvariant: "fontVariant",
  fontweight: "fontWeight",
  glyphname: "glyphName",
  glyphorientationhorizontal: "glyphOrientationHorizontal",
  glyphorientationvertical: "glyphOrientationVertical",
  glyphref: "glyphRef",
  gradienttransform: "gradientTransform",
  gradientunits: "gradientUnits",
  horizadvx: "horizAdvX",
  horizoriginx: "horizOriginX",
  imagerendering: "imageRendering",
  kernelmatrix: "kernelMatrix",
  kernelunitlength: "kernelUnitLength",
  keypoints: "keyPoints",
  keysplines: "keySplines",
  keytimes: "keyTimes",
  lengthadjust: "lengthAdjust",
  letterspacing: "letterSpacing",
  lightingcolor: "lightingColor",
  limitingconeangle: "limitingConeAngle",
  markerend: "markerEnd",
  markerheight: "markerHeight",
  markermid: "markerMid",
  markerstart: "markerStart",
  markerunits: "markerUnits",
  markerwidth: "markerWidth",
  maskcontentunits: "maskContentUnits",
  maskunits: "maskUnits",
  numoctaves: "numOctaves",
  overlineposition: "overlinePosition",
  overlinethickness: "overlineThickness",
  paintorder: "paintOrder",
  panose1: "panose1",
  "panose-1": "panose1",
  pathlength: "pathLength",
  patterncontentunits: "patternContentUnits",
  patterntransform: "patternTransform",
  patternunits: "patternUnits",
  pointerevents: "pointerEvents",
  pointsatx: "pointsAtX",
  pointsaty: "pointsAtY",
  pointsatz: "pointsAtZ",
  preservealpha: "preserveAlpha",
  preserveaspectratio: "preserveAspectRatio",
  primitiveunits: "primitiveUnits",
  refx: "refX",
  refy: "refY",
  renderingintent: "renderingIntent",
  repeatcount: "repeatCount",
  repeatdur: "repeatDur",
  requiredextensions: "requiredExtensions",
  requiredfeatures: "requiredFeatures",
  shaperendering: "shapeRendering",
  specularconstant: "specularConstant",
  specularexponent: "specularExponent",
  spreadmethod: "spreadMethod",
  startoffset: "startOffset",
  stddeviation: "stdDeviation",
  stitchtiles: "stitchTiles",
  stopcolor: "stopColor",
  stopopacity: "stopOpacity",
  strikethroughposition: "strikethroughPosition",
  strikethroughthickness: "strikethroughThickness",
  strokedasharray: "strokeDasharray",
  strokedashoffset: "strokeDashoffset",
  strokelinecap: "strokeLinecap",
  strokelinejoin: "strokeLinejoin",
  strokemiterlimit: "strokeMiterlimit",
  strokewidth: "strokeWidth",
  strokeopacity: "strokeOpacity",
  suppresscontenteditablewarning: "suppressContentEditableWarning",
  suppresshydrationwarning: "suppressHydrationWarning",
  surfacescale: "surfaceScale",
  systemlanguage: "systemLanguage",
  tablevalues: "tableValues",
  targetx: "targetX",
  targety: "targetY",
  textanchor: "textAnchor",
  textdecoration: "textDecoration",
  textlength: "textLength",
  textrendering: "textRendering",
  underlineposition: "underlinePosition",
  underlinethickness: "underlineThickness",
  unicodebidi: "unicodeBidi",
  unicoderange: "unicodeRange",
  unitsperem: "unitsPerEm",
  valphabetic: "vAlphabetic",
  vectoreffect: "vectorEffect",
  vertadvy: "vertAdvY",
  vertoriginx: "vertOriginX",
  vertoriginy: "vertOriginY",
  vhanging: "vHanging",
  videographic: "vIdeographic",
  viewbox: "viewBox",
  viewtarget: "viewTarget",
  vmathematical: "vMathematical",
  wordspacing: "wordSpacing",
  writingmode: "writingMode",
  xchannelselector: "xChannelSelector",
  xheight: "xHeight",
  xlinkactuate: "xlinkActuate",
  xlinkarcrole: "xlinkArcrole",
  xlinkhref: "xlinkHref",
  xlinkrole: "xlinkRole",
  xlinkshow: "xlinkShow",
  xlinktitle: "xlinkTitle",
  xlinktype: "xlinkType",
  xmlbase: "xmlBase",
  xmllang: "xmlLang",
  xmlnsxlink: "xmlnsXlink",
  xmlspace: "xmlSpace",
  ychannelselector: "yChannelSelector",
  zoomandpan: "zoomAndPan",
};

/**
 * Known word segments for splitting lowercase event handler bodies into
 * PascalCase words. e.g. `gotpointercapture` → `Got` + `Pointer` + `Capture`.
 *
 * Sorted longest-first so greedy prefix matching picks `cancel` before `can`,
 * `composition` before shorter prefixes, etc. The final (or only) segment is
 * capitalized by the fallback branch, so single-word events like `click` or
 * `blur` don't need entries here.
 *
 * Only words that appear as non-final segments of multi-word DOM `on*` handlers
 * need to be listed. Derived from all `on*` properties in `lib.dom.d.ts`.
 */
export const EVENT_PREFIXES = [
  "composition",
  "transition",
  "animation",
  "duration",
  "fullscreen",
  "context",
  "pointer",
  "webkit",
  "loaded",
  "before",
  "cancel",
  "scroll",
  "select",
  "volume",
  "mouse",
  "touch",
  "drag",
  "lost",
  "play",
  "rate",
  "time",
  "load",
  "aux",
  "can",
  "got",
  "key",
];

/**
 * Should this attribute be dropped entirely when converting SVG to JSX?
 *
 * Namespace declarations never survive the trip: React owns the SVG namespace,
 * and a prefix binding like `xmlns:sodipodi` has no React prop name — emitting
 * it would only produce a mangled attribute. Inkscape and friends write one of
 * these per prefix, so the check is a prefix test rather than a fixed list.
 */
export function shouldStripAttribute(name: string): boolean {
  return name === "xmlns" || name.startsWith("xmlns:");
}

/** The five predefined XML entity references */
export const PREDEFINED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  apos: "'",
  quot: '"',
};

// ── XML Name character ranges (XML 1.0 §2.3) ────────────────────────
// Each entry is [codePoint] for a single char or [low, high] for a range.

/** Code-point ranges for NameStartChar (XML 1.0 §2.3). */
export const NAME_START_CHAR_RANGES: readonly (
  | readonly [number]
  | readonly [number, number]
)[] = [
  [0x3a], // :
  [0x5f], // _
  [0x41, 0x5a], // A-Z
  [0x61, 0x7a], // a-z
  [0xc0, 0xd6], // Latin-1 supplement (À-Ö)
  [0xd8, 0xf6], // Latin-1 supplement (Ø-ö)
  [0xf8, 0x2ff], // Latin extended + IPA extensions
  [0x370, 0x37d], // Greek (Ͱ-ͽ)
  [0x37f, 0x1fff], // Greek extended through misc symbols
  [0x200c, 0x200d], // zero-width non-joiner/joiner
  [0x2070, 0x218f], // superscripts, letterlike symbols
  [0x2c00, 0x2fef], // Glagolitic, CJK radicals
  [0x3001, 0xd7ff], // CJK punctuation through Hangul
  [0xf900, 0xfdcf], // CJK compatibility + Arabic presentation
  [0xfdf0, 0xfffd], // Arabic presentation + specials
  [0x10000, 0xeffff], // supplementary planes
];

/** Additional code-point ranges for NameChar beyond NameStartChar. */
export const NAME_CHAR_EXTRA_RANGES: readonly (
  | readonly [number]
  | readonly [number, number]
)[] = [
  [0x2d], // -
  [0x2e], // .
  [0x30, 0x39], // 0-9
  [0xb7], // middle dot (·)
  [0x300, 0x36f], // combining diacritical marks
  [0x203f, 0x2040], // undertie, character tie (‿ ⁀)
];
