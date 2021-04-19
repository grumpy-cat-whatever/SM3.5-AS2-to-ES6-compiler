
module.exports = function(api) {
  api.cache(true);

  return {
    sourceType: "script",
    parserOpts: {
      allowReturnOutsideFunction: true,
      plugins: ["classProperties", "classPrivateProperties"],
      errorRecovery: true
    },
    //retainLines: true, //can probably be enabled now
    plugins: [],
    presets: [
      ["@babel/preset-env", {
        loose: true,
        targets: { //ignored when compiling to es6/typescript
          electron: "8",
          ie: "11"
        },
      }]
    ],
  };
};
