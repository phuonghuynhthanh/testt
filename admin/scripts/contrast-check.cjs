const assert = require('node:assert/strict');

// Check rendered text and placeholders against their composited CSS backgrounds without extra dependencies.
async function checkContrast(page, label) {
  // Wait for toast entry/exit animation so transient opacity is not treated as a color defect.
  await page.locator('.Toastify__toast').evaluateAll(async (toasts) => {
    await Promise.allSettled(toasts.flatMap((toast) => toast.getAnimations().map((animation) => animation.finished)));
  });
  const failures = await page.evaluate(() => {
    // Parse browser-computed sRGB colors, including transparent backgrounds.
    const parse = (value) => {
      const channels = value.match(/[\d.]+/g)?.map(Number) || [0, 0, 0, 0];
      return [...channels.slice(0, 3), channels[3] ?? 1];
    };
    // Composite a foreground layer over its underlying surface.
    const blend = (front, back) => front.slice(0, 3).map((channel, index) => channel * front[3] + back[index] * (1 - front[3]));
    // Calculate relative luminance using the WCAG sRGB transfer function.
    const luminance = (color) => color.map((channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const failures = [];
    // Inspect active text only; inactive controls and decorative graphics are intentionally excluded.
    const inspect = (element, text, pseudo) => {
      if (!text.trim() || element.closest('svg, script, style, [aria-hidden="true"], :disabled')) return;
      const bounds = element.getBoundingClientRect();
      const style = getComputedStyle(element, pseudo);
      if (!bounds.width || !bounds.height || style.visibility !== 'visible') return;
      const ancestors = [];
      for (let current = element; current; current = current.parentElement) ancestors.unshift(current);
      let background = [255, 255, 255];
      let opacity = 1;
      for (const ancestor of ancestors) {
        const css = getComputedStyle(ancestor);
        // Gradient and image-backed text needs visual review rather than a misleading flat-color score.
        if (css.backgroundImage !== 'none') return;
        background = blend(parse(css.backgroundColor), background);
        opacity *= Number(css.opacity);
      }
      if (opacity === 0) return;
      const foreground = parse(style.color);
      foreground[3] *= opacity * (pseudo ? Number(style.opacity) : 1);
      const textLuminance = luminance(blend(foreground, background));
      const bgLuminance = luminance(background);
      const ratio = (Math.max(textLuminance, bgLuminance) + 0.05) / (Math.min(textLuminance, bgLuminance) + 0.05);
      if (ratio < 4.5) failures.push({ text: text.trim().slice(0, 70), ratio: Number(ratio.toFixed(2)), color: style.color, background, className: element.className,
        ancestors: ancestors.slice(-4).map((ancestor) => ({ tag: ancestor.tagName, className: ancestor.className, role: ancestor.getAttribute('role'), background: getComputedStyle(ancestor).backgroundColor })) });
    };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) inspect(walker.currentNode.parentElement, walker.currentNode.textContent);
    document.querySelectorAll('input:not([type=hidden]), textarea').forEach((element) => {
      inspect(element, element.value || element.placeholder, element.value ? undefined : '::placeholder');
    });
    return failures;
  });
  if (process.env.CONTRAST_REPORT_ONLY) console.log(label, JSON.stringify(failures));
  else assert.deepEqual(failures, [], `Text contrast below 4.5:1 on ${label}: ${JSON.stringify(failures, null, 2)}`);
}

module.exports = { checkContrast };
