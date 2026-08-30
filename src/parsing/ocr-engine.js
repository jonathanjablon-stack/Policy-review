(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.StopLossOcrEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const VERSION = "1.0.0";
  const TESSERACT_VERSION = "7.0.0";
  const DEFAULT_TARGET_DPI = 220;
  const DEFAULT_MAX_PIXELS = 12000000;
  let tesseractScriptPromise = null;

  function normalizeForQuality(value) {
    return String(value == null ? "" : value)
      .replace(/\u0000/g, "")
      .replace(/\r\n?/g, "\n")
      .replace(/[\t\u00a0]+/g, " ")
      .replace(/[ ]{2,}/g, " ")
      .trim();
  }

  function assessTextQuality(value) {
    const text = normalizeForQuality(value);
    const characters = text.length;
    const letters = (text.match(/[A-Za-z]/g) || []).length;
    const digits = (text.match(/[0-9]/g) || []).length;
    const words = text.match(/[A-Za-z][A-Za-z'-]{1,}/g) || [];
    const replacementCharacters = (text.match(/\ufffd/g) || []).length;
    const visible = (text.match(/\S/g) || []).length;
    const alphanumericRatio = visible ? (letters + digits) / visible : 0;
    const suspiciousTokens = text.split(/\s+/).filter(token => token.length >= 4 && !/[A-Za-z0-9]/.test(token)).length;
    const suspiciousRatio = words.length ? suspiciousTokens / words.length : suspiciousTokens ? 1 : 0;
    const reasons = [];
    if (characters < 140) reasons.push("fewer than 140 extracted characters");
    if (letters < 70) reasons.push("fewer than 70 extracted letters");
    if (words.length < 12) reasons.push("fewer than 12 extracted words");
    if (replacementCharacters > 2) reasons.push("multiple encoding-replacement characters");
    if (visible > 20 && alphanumericRatio < 0.45) reasons.push("low alphanumeric content");
    if (suspiciousRatio > 0.35) reasons.push("high symbol-noise ratio");
    const needsOCR = reasons.length > 0;
    const score = Math.max(0, Math.min(100,
      Math.min(35, letters / 4) +
      Math.min(30, words.length * 1.5) +
      Math.min(20, alphanumericRatio * 25) +
      Math.min(15, characters / 40) -
      replacementCharacters * 5 - suspiciousRatio * 20
    ));
    return {
      characters,
      letters,
      words: words.length,
      replacementCharacters,
      alphanumericRatio: Number(alphanumericRatio.toFixed(3)),
      suspiciousRatio: Number(suspiciousRatio.toFixed(3)),
      score: Number(score.toFixed(1)),
      needsOCR,
      reason: needsOCR ? reasons.join("; ") : "native extraction passed the text-quality threshold"
    };
  }

  function shouldOcrPage(nativeText, options) {
    const quality = assessTextQuality(nativeText);
    const force = Boolean(options && options.forceAllPages);
    return { shouldOCR: force || quality.needsOCR, reason: force ? "reviewer requested OCR for every PDF page" : quality.reason, nativeQuality: quality };
  }

  function selectPageText(nativeText, ocrResult) {
    const nativeValue = normalizeForQuality(nativeText);
    const ocrValue = normalizeForQuality(ocrResult && ocrResult.text);
    const nativeQuality = assessTextQuality(nativeValue);
    const ocrQuality = assessTextQuality(ocrValue);
    const confidence = Number.isFinite(ocrResult && ocrResult.confidence) ? Number(ocrResult.confidence) : null;
    const ocrUsable = ocrValue.length > 0 && (ocrQuality.score > nativeQuality.score + 3 || nativeQuality.needsOCR && ocrQuality.letters > nativeQuality.letters);
    return {
      text: ocrUsable ? ocrValue : nativeValue,
      method: ocrUsable ? "ocr" : "native",
      ocrUsed: ocrUsable,
      nativeText: nativeValue,
      ocrText: ocrValue,
      nativeQuality,
      ocrQuality,
      ocrConfidence: confidence,
      selectionReason: ocrUsable
        ? "OCR produced materially stronger page text than native PDF extraction."
        : ocrValue
          ? "Native PDF extraction remained stronger than the OCR result."
          : "OCR returned no usable text."
    };
  }

  function loadScript(url) {
    if (!root.document) return Promise.reject(new Error("OCR script loading requires a browser document."));
    if (root.Tesseract) return Promise.resolve(root.Tesseract);
    if (tesseractScriptPromise) return tesseractScriptPromise;
    tesseractScriptPromise = new Promise((resolve, reject) => {
      const script = root.document.createElement("script");
      script.src = url;
      script.async = true;
      script.onload = () => root.Tesseract ? resolve(root.Tesseract) : reject(new Error("The local OCR API loaded without exposing Tesseract."));
      script.onerror = () => reject(new Error(`Could not load the local OCR API at ${url}.`));
      root.document.head.append(script);
    });
    return tesseractScriptPromise;
  }

  async function renderPdfPage(page, options) {
    if (!root.document) throw new Error("PDF page rendering requires a browser document.");
    const targetDpi = options && options.targetDpi || DEFAULT_TARGET_DPI;
    const maxPixels = options && options.maxPixels || DEFAULT_MAX_PIXELS;
    const initial = page.getViewport({ scale: 1 });
    let scale = Math.max(1.5, targetDpi / 72);
    const projectedPixels = initial.width * scale * initial.height * scale;
    if (projectedPixels > maxPixels) scale *= Math.sqrt(maxPixels / projectedPixels);
    const viewport = page.getViewport({ scale });
    const canvas = root.document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(viewport.width));
    canvas.height = Math.max(1, Math.ceil(viewport.height));
    const context = canvas.getContext("2d", { alpha: false, willReadFrequently: false });
    context.save();
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();
    await page.render({ canvasContext: context, viewport, background: "rgb(255,255,255)" }).promise;
    return { canvas, width: canvas.width, height: canvas.height, scale: Number(scale.toFixed(3)), targetDpi: Math.round(scale * 72) };
  }

  function createSession(options) {
    const resolveAssetUrl = options && options.resolveAssetUrl;
    const onProgress = options && options.onProgress || (() => {});
    if (typeof resolveAssetUrl !== "function") throw new Error("OCR session requires an asset URL resolver.");
    let workerPromise = null;
    let worker = null;
    let activeContext = null;

    async function getWorker() {
      if (workerPromise) return workerPromise;
      workerPromise = (async () => {
        const Tesseract = await loadScript(resolveAssetUrl("tesseract/tesseract.min.js"));
        const created = await Tesseract.createWorker("eng", Tesseract.OEM && Tesseract.OEM.LSTM_ONLY || 1, {
          workerPath: resolveAssetUrl("tesseract/worker.min.js"),
          corePath: resolveAssetUrl("tesseract/core"),
          langPath: resolveAssetUrl("tesseract/lang"),
          gzip: true,
          cacheMethod: "write",
          logger(message) {
            const progress = Number.isFinite(message.progress) ? Math.round(message.progress * 100) : null;
            onProgress({
              status: message.status || "working",
              progress,
              documentName: activeContext && activeContext.documentName,
              pageNumber: activeContext && activeContext.pageNumber,
              pageCount: activeContext && activeContext.pageCount
            });
          }
        });
        await created.setParameters({ preserve_interword_spaces: "1", tessedit_pageseg_mode: "3" });
        worker = created;
        return created;
      })();
      return workerPromise;
    }

    async function recognizePage(page, context) {
      const startedAt = Date.now();
      activeContext = context || null;
      const rendered = await renderPdfPage(page, options);
      try {
        onProgress({ status: "recognizing text", progress: 0, documentName: context && context.documentName, pageNumber: context && context.pageNumber, pageCount: context && context.pageCount });
        const engine = await getWorker();
        const result = await engine.recognize(rendered.canvas, { rotateAuto: true }, { text: true });
        const text = normalizeForQuality(result && result.data && result.data.text);
        const confidence = Number(result && result.data && result.data.confidence);
        return {
          text,
          confidence: Number.isFinite(confidence) ? Number(confidence.toFixed(1)) : null,
          engine: `Tesseract.js ${TESSERACT_VERSION}`,
          elapsedMs: Date.now() - startedAt,
          renderedWidth: rendered.width,
          renderedHeight: rendered.height,
          renderedDpi: rendered.targetDpi
        };
      } finally {
        rendered.canvas.width = 1;
        rendered.canvas.height = 1;
        activeContext = null;
      }
    }

    async function terminate() {
      try {
        const active = worker || workerPromise && await workerPromise;
        if (active) await active.terminate();
      } finally {
        worker = null;
        workerPromise = null;
        activeContext = null;
      }
    }

    return { recognizePage, terminate, isInitialized: () => Boolean(workerPromise) };
  }

  return {
    VERSION,
    TESSERACT_VERSION,
    DEFAULT_TARGET_DPI,
    DEFAULT_MAX_PIXELS,
    assessTextQuality,
    shouldOcrPage,
    selectPageText,
    renderPdfPage,
    createSession
  };
});
