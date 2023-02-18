const { width, marginL, marginR, left, right, maxWidth, borderR, borderL, contentBox, minFullHeight, autoHeight } = require("./constants");
const {
  /** 用于匹配字符串形如“数字px”中的“数字” */
  pxMatchReg,
} = require("./regexs");
const { round } = require("./logic-helper");

const postcss = require("postcss");
/** 居中最外层选择器，用 margin 居中，有 border */
function appendMarginCentreRootClassWithBorder(selector, disableDesktop, disableLandscape, {
  desktopViewAtRule,
  landScapeViewAtRule,
  sharedAtRult,
  desktopWidth,
  landscapeWidth,
  borderColor,
}) {
  if (disableDesktop && !disableLandscape) {
    // 仅移动端横屏
    landScapeViewAtRule.append(postcss.rule({ selector }).append(maxWidth(landscapeWidth), marginL, marginR, contentBox, borderL(borderColor), borderR(borderColor), minFullHeight, autoHeight));
  } else if (disableLandscape && !disableDesktop) {
    // 仅桌面
    desktopViewAtRule.append(postcss.rule({ selector }).append(maxWidth(desktopWidth), marginL, marginR, contentBox, borderL(borderColor), borderR(borderColor), minFullHeight, autoHeight));
  } else if (!disableDesktop && !disableLandscape) {
    // 桌面和移动端横屏
    desktopViewAtRule.append(postcss.rule({ selector }).append(maxWidth(desktopWidth)));
    landScapeViewAtRule.append(postcss.rule({ selector }).append(maxWidth(landscapeWidth)));
    sharedAtRult.append(postcss.rule({ selector }).append(marginL, marginR, contentBox, borderL(borderColor), borderR(borderColor), minFullHeight, autoHeight));
  }
}

/** fixed 的百分百宽度转换为居中的固定宽度（预期的桌面端和移动端横屏宽度） */
function appendFixedFullWidthCentre(selector, disableDesktop, disableLandscape, {
  desktopWidth,
  landscapeWidth,
  desktopViewAtRule,
  landScapeViewAtRule,
  sharedAtRult,
}) {
  if (!disableDesktop && !disableLandscape) {
    // 桌面端和移动端横屏
    desktopViewAtRule.append(postcss.rule({ selector }).append(width(desktopWidth)));
    landScapeViewAtRule.append(postcss.rule({ selector }).append(width(landscapeWidth)));
    sharedAtRult.append(postcss.rule({ selector }).append(marginL, marginR, left, right));
  } else if (disableDesktop && !disableLandscape) {
    // 仅移动端横屏
    landScapeViewAtRule.append(postcss.rule({ selector }).append(width(landscapeWidth), marginL, marginR, left, right));
  } else if (disableLandscape && !disableDesktop) {
    // 仅桌面端
    desktopViewAtRule.append(postcss.rule({ selector }).append(width(desktopWidth), marginL, marginR, left, right));
  }

}

/** 100vw 转换为固定宽度（预期的桌面端和移动端横屏宽度） */
function appendStaticWidthFromFullVwWidth(selector, disableDesktop, disableLandscape, {
  desktopWidth,
  landscapeWidth,
  desktopViewAtRule,
  landScapeViewAtRule,
}) {
  if (!disableDesktop) {
    desktopViewAtRule.append(postcss.rule({ selector }).append(width(desktopWidth)));
  }
  if (!disableLandscape) {
    landScapeViewAtRule.append(postcss.rule({ selector }).append(width(landscapeWidth)));
  }
}

/** px 值，转换为媒体查询中比例计算的 px，替换为移动端竖屏视口单位 */
function appendMediaRadioPxOrReplaceMobileVwFromPx(selector, prop, val, disableDesktop, disableLandscape, enableMobile, {
  viewportWidth,
  desktopRadio,
  landscapeRadio,
  desktopViewAtRule,
  landScapeViewAtRule,
  important,
  pass1px,
  decl,
  unitPrecision,
  satisfiedMobilePropList,
  fontViewportUnit,
}) {
  const enabledDesktop = !disableDesktop;
  const enabledLandscape = !disableLandscape;
  const enabledMobile = enableMobile;

  if (enabledDesktop || enabledLandscape || enabledMobile) {
    let mobileVal = '';
    let desktopVal = '';
    let landscapeVal = '';

    let mached = null;
    let lastIndex = 0;
    let book = false; // 标记
    while(mached = pxMatchReg.exec(val)) {
      const pxContent = mached[2];
      if (pxContent == null || pxContent === "0px") continue;
      book = true;
      const beforePxContent = mached[1] || '';
      const chunk = val.slice(lastIndex, mached.index + beforePxContent.length); // 当前匹配和上一次匹配之间的字符串
      const pxNum = Number(pxContent.slice(0, -2)); // 数字
      const pxUnit = pxContent.slice(-2); // 单位
      const is1px = pass1px && pxNum === 1;
      const mobileUnit = is1px ? pxUnit : prop.includes("font") ? fontViewportUnit : "vw";

      if (enabledMobile && satisfiedMobilePropList)
        mobileVal = mobileVal.concat(chunk, is1px ? 1 : round(Number(pxNum * 100 / viewportWidth), unitPrecision), mobileUnit);
      if (enabledDesktop)
        desktopVal = desktopVal.concat(chunk, is1px ? 1 : round(Number(pxNum * desktopRadio), unitPrecision), "px");
      if (enabledLandscape)
        landscapeVal = landscapeVal.concat(chunk, is1px ? 1 : round(Number(pxNum * landscapeRadio), unitPrecision), "px");

      lastIndex = pxMatchReg.lastIndex;
    }

    const tailChunk = val.slice(lastIndex, val.length); // 最后一次匹配到结尾的字符串
    if (enabledMobile && book && satisfiedMobilePropList) {
      mobileVal = mobileVal.concat(tailChunk);
      decl.value = mobileVal;
    }
    if (enabledDesktop && book) {
      desktopVal = desktopVal.concat(tailChunk);
      if (val !== desktopVal) {
        desktopViewAtRule.append(postcss.rule({ selector }).append({
          prop: prop, // 属性
          value: desktopVal, // 替换 px 比例计算后的值
          important, // 值的尾部有 important 则添加
        }));
      }
    }
    if (enabledLandscape && book) {
      landscapeVal = landscapeVal.concat(tailChunk);
      if (val !== landscapeVal) {
        landScapeViewAtRule.append(postcss.rule({ selector }).append({
          prop,
          value: landscapeVal,
          important,
        }));
      }
    }
  }
}

/** 居中最外层选择器，margin 居中，无 border */
function appendMarginCentreRootClassNoBorder(selector, disableDesktop, disableLandscape, {
  desktopViewAtRule,
  landScapeViewAtRule,
  sharedAtRult,
  desktopWidth,
  landscapeWidth
}) {
  if (disableDesktop && !disableLandscape) {
    // 仅移动端横屏
    landScapeViewAtRule.append(postcss.rule({ selector }).append(maxWidth(landscapeWidth), marginL, marginR));
  } else if (disableLandscape && !disableDesktop) {
    // 仅桌面
    desktopViewAtRule.append(postcss.rule({ selector }).append(maxWidth(desktopWidth), marginL, marginR));
  } else if (!disableDesktop && !disableLandscape) {
    // 桌面和移动端横屏
    desktopViewAtRule.append(postcss.rule({ selector }).append(maxWidth(desktopWidth)));
    landScapeViewAtRule.append(postcss.rule({ selector }).append(maxWidth(landscapeWidth)));
    sharedAtRult.append(postcss.rule({ selector }).append(marginL, marginR));
  }
}


module.exports = {
  appendMarginCentreRootClassWithBorder,
  appendFixedFullWidthCentre,
  appendStaticWidthFromFullVwWidth,
  appendMediaRadioPxOrReplaceMobileVwFromPx,
  appendMarginCentreRootClassNoBorder,
};