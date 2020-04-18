
module.exports = function(api) {
  api.cache(true);

  return {
    sourceType: "script",
    parserOpts: {
      allowReturnOutsideFunction: true,
      //might be useful later
      plugins: ["classProperties", "classPrivateProperties"],
      errorRecovery: true
    },
    //retainLines: true,
    plugins: [
      // ["@babel/plugin-proposal-class-properties", {
      //   loose: true
      // }]
    ],
    presets: [
      ["@babel/preset-env", {
        loose: true,
        targets: { //ignored when compiling to es6/typescript
          electron: "8"
        },
        corejs: {
          version: 3,
          proposals: true
        }
      }]
    ],
  };
};
