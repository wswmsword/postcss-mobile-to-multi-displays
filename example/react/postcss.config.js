module.exports = {
  plugins: [
    ["postcss-mobile-to-multi-displays", {
      viewportWidth: 750,
      desktopWidth: 600,
      landscapeWidth: 450,
      border: true,
      rootClass: "root-class",
    }],
    ["postcss-px-to-viewport", {
      viewportWidth: 750,
      viewportUnit: "vw",
      mediaQuery: false,
    }],
  ],
};