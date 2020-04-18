const { src, dest, task, series } = require('gulp');
const del = require('del');
const rename = require('gulp-rename');
const babel = require('gulp-babel');
const gulp_replace = require('gulp-replace');
const include = require('gulp-include');
const through2 = require('through2');
const debug = require('gulp-debug');
let { parseBlock } = require('./naiveBlockParser.js')();
const { collectInfo: babelCollectInfo, transform: babelTransform } = require('./implicitThis.js')();
parseBlock = require('./BlockParser.js').parse;

function nodeToString(node) {
  var isEntryPoint = node.statement === "#entrypoint";
  if (isEntryPoint) {
      return node.blocks.map(nodeToString).join('');
  } else if (node.blocks) {
      return ( node.statement || '' ) + '{' + node.blocks.map(nodeToString).join('') + '}';
  } else if(node.type === "LineComment") {
    return '//' + node.comment;
  } else if(node.type === "BlockComment") {
    return '/*' + node.comment + '*/';
  } else {
    return node.statement || node.text;
  }
}

function synchronize(){ //slightly ugly, but hopefully super fast
  const array = [];
  function transform(file, enc, cb){ //process chunks
    this.push(file); //this === array, because of the .bind()
    return cb(null, null); //remove from stream
  }
  function flush(cb){
    for(let i = 0, arr = array, l = arr.length; i < l; i++) {
      this.push(arr[i]); //add back to stream
    }
    cb();
  }
  return through2.obj(transform.bind(array), flush);
}

Function.prototype.pipeTo = function(target){
  var source = this;
  return function(){
    return source.call().pipe(target.call());
  };
};

function clean(...array){
  return function(){
    return del(array.concat('!**/.eslintrc.js'));
  };
}

function copy(){
  return getAsFiles.pipeTo(toDist);
}

function getAsFiles(){
  return src('scripts-cmac/**/*.as');
}

function toDist(){
  return dest('dist');
}

/* For testing gulp_replace directives. Usage:
  >> es6.transformVarTyped(stringReplace("var a:Number = 1;"))
  << 'var a = 1;'
 */
function stringReplace(str){
  return String.prototype.replace.bind(str);
}

function escapeTokensInLineComments(replace){
  replace = replace || gulp_replace;
  return replace(/([^/])\/\/([^\n\r]*)/g, function(match, g1, g2){
    return g1 + "//" + g2.replace(/[{}]/g, encodeURIComponent);
  });
}

function escapeTokensInBlockComments(replace){
  replace = replace || gulp_replace;
  return replace(/[/][*]([^*/]|[*](?![/])|[/])*[*][/]/g, function(match){
    return match.replace(/[{}]/g, encodeURIComponent);
  });
}

function removeUnnecessaryDeletes(replace){
  /* eslint-disable no-useless-escape */
  replace = replace || gulp_replace;
  return replace(/(\r\n|\r|\n)?\s*delete\s+[^;\[\].]+;\s*(\r\n|\r|\n)?/g, function(match, g1, g2){
    return (!!g1 ^ !!g2) ? "" : g2 || g1 || "";
  });
  /* eslint-enable no-useless-escape */
}

function removeLocalImports(replace){
  replace = replace || gulp_replace;
  return replace(/(\r\n|\r|\n)?import[^;]*Scripts\.Classes\.[^;]*;(\r\n|\r|\n)?/g, function(match, g1, g2){
    return (!!g1 ^ !!g2) ? "" : g2 || g1 || "";
  });
}

function removeFlashImports(replace){
  replace = replace || gulp_replace;
  return replace(/import\s+(mx|flash)\.[^;]*;/g, '');
}

function shortenClassName(str){
  return str.replace(/^[\S\s]+[.]\s*(\S+)\s*$/, '$1');
}

//I had planned to write a TypeScript version also
const es6 = {
  removeLocalNamespace(replace){
    replace = replace || gulp_replace;
    return replace(/Scripts\s*\.\s*Classes\s*\.\s*(\S+)/, '$1');
  },
  transformPublicPrivate(replace){
    replace = replace || gulp_replace;
    return replace(/(public|private)\s+(var|function|static)/g, '$2');
  },
  transformStaticFunctions(replace){
    replace = replace || gulp_replace;
    return replace(/static\s+function/g, 'function');
  },
  transformVarTyped(replace){
    replace = replace || gulp_replace;
    return replace(/(?<!\w)var\s+([^:\s]+)\s*:\s*[A-Z][A-Za-z.]*/g, 'var $1');
  },
  transformFunctionTyped(replace){
    replace = replace || gulp_replace;
    return replace(/function\s*(\w+|\s*)\s*\(([^)]+|\s*)\)\s*(:?\s*\S+|\s*)\s*\{/g, function(match, g1, g2, g3){
      var argList = g2.replace(/(\w+)\s*:\s*\w+/g, '$1');
      return "function " + g1 + "(" + argList + ") {";
    });
  },
  transformClassExtend: function es6TransformClassExtend(replace){
    replace = replace || gulp_replace;
    return replace(/class\s+([^{\s]*)\s+extends\s+([^{\s]*)\s+\{([\S\s]*)\}\s*$/g, function(match, g1, g2, g3){
      var s1 = shortenClassName(g1),
          s2 = shortenClassName(g2),
          ast, s3;
      try {
        ast = parseBlock(match.trim()).blocks[0];
        s3 = ast.blocks.map(function(node){
          if(!node.blocks) {
            return (node.statement || node.text || '').replace(/(?<!\w)(var|const|let)\s/g, '');
          } else {
            return nodeToString(Object.assign({}, node, {
              statement: node.statement.replace(/function\s+(\S+)\s*\(/, function(match_1, g1_1){
                return (g1_1 === g1 ? 'constructor' : g1_1) + '(';
              })
            }));
          }
        }).join('');
      } catch(e) {
        console.log('Parser failure: ', s1);
        console.log(ast);
        s3 = g3;
        throw e;
      }
      return 'class ' + s1 + ' extends ' + s2 + ' {' + s3 + '}';
    });
  },
  transformClassSimple: function es6TransformClassSimple(replace){
    replace = replace || gulp_replace;
    return replace(/class\s+([A-Z][^\s{]*)\s*\{([\S\s]*)\}\s*$/, function(match, g1, g2){
      var s1 = shortenClassName(g1),
          ast, s2;
      try {
        ast = parseBlock(match.trim()).blocks[0];
        s2 = ast.blocks.map(function(node){
          if(!node.blocks) {
            return (node.statement || node.text || '').replace(/(var|const|let)\s/g, '');
          } else {
            return nodeToString(Object.assign({}, node, {
              statement: node.statement.replace(/function\s+(\S+)\s*\(/, function(match_1, g1_1){
                return (g1_1 === g1 ? 'constructor' : g1_1) + '(';
              })
            }));
          }
        }).join('');
      } catch(e) {
        console.log('Parser failure: ', s1);
        console.log(ast);
        s2 = g2;
        throw e;
      }
      return 'class ' + s1 + ' {' + s2 + '}';
    });
  },
};

function transformAsToES6(){
  return getAsFiles()
    .pipe(gulp_replace(/#include\s+["']([^"']*)\.as["']/ig, '//=require $1.js'))
    .pipe(rename({ extname: '.js' }))
    .pipe(removeLocalImports())
    .pipe(removeFlashImports())
    .pipe(gulp_replace(/enum(?=\W)/g, '_enum')) //AS2 apparently allowed enum as an argument name
    .pipe(gulp_replace(/(\w+) class/g, 'class $1'))
    .pipe(removeUnnecessaryDeletes())
    .pipe(es6.transformPublicPrivate())
    // .pipe(es6.transformStaticFunctions())
    .pipe(es6.transformVarTyped())
    .pipe(es6.transformFunctionTyped())
    .pipe(escapeTokensInLineComments())
    .pipe(escapeTokensInBlockComments())
    .pipe(es6.transformClassExtend())
    .pipe(es6.transformClassSimple())
    .pipe(es6.removeLocalNamespace())
    .pipe(babelCollectInfo())
    .pipe(synchronize()) //ensures collection completes before transform begins
    .pipe(babelTransform())
    .pipe(moveIncludesToNewLine())
    .pipe(dest('dist/es6'));
}
task('asToES6', series(clean('dist/es6/**', '!dist/es6'), transformAsToES6));

function replaceNativeTsTypes(str){
  return str.replace(/Boolean|Number|String/g, function(match){
    return match.toLowerCase();
  });
}
const ts = {
  transformStaticKeyword(replace){
    replace = replace || gulp_replace;
    return replace(/static\s+(public|private)/g, '$1 static');
  },
  transformVarTyped(replace){
    replace = replace || gulp_replace;
    return replace(/(?<!\w)var\s+([^:\s]+)\s*:\s*([A-Z][A-Za-z.]*)/g, function(match, g1, g2){
      return 'var ' + g1 + ': ' + replaceNativeTsTypes(g2);
    });
  },
  transformFunctionTyped(replace){
    replace = replace || gulp_replace;
    return replace(/function\s*(\w+|\s*)\s*\(([^)]+|\s*)\)\s*(:\s*\S+|\s*)\s*\{/g, function(match, g1, g2, g3){
      var argList = g2.replace(/(\w+)\s*:\s*\w+/g, '$1');
      return "function " + g1 + "(" + argList + ")" + replaceNativeTsTypes(g3) + " {";
    });
  }
};

function transformAsToTs(){
  return getAsFiles()
    .pipe(gulp_replace(/#include\s+["']([^"']*)\.as["']/ig, '//=require $1.ts'))
    .pipe(removeLocalImports())
    .pipe(removeFlashImports())
    .pipe(gulp_replace(/enum(?=\W)/g, '_enum')) //AS2 apparently allowed enum as an argument name
    .pipe(gulp_replace(/(\w+) class/g, 'class $1'))
    .pipe(removeUnnecessaryDeletes())
    .pipe(ts.transformStaticKeyword())
    .pipe(es6.transformPublicPrivate())
    .pipe(ts.transformVarTyped())
    .pipe(ts.transformFunctionTyped())
    .pipe(escapeTokensInLineComments())
    .pipe(escapeTokensInBlockComments())
    .pipe(es6.transformClassExtend())
    .pipe(es6.transformClassSimple())
    .pipe(es6.removeLocalNamespace())
    .pipe(rename({ extname: '.ts' })) //makes babel recognize TypeScript code
    .pipe(babelCollectInfo({ typescript: true }))
    .pipe(synchronize()) //ensures collection completes before transform begins
    .pipe(babelTransform({ typescript: true }))
    .pipe(rename({ extname: '.ts' })) //override babel changes to file extension
    .pipe(moveIncludesToNewLine())
    .pipe(dest('dist/ts'));
}
task('asToTs', series(clean('dist/ts/**', '!dist/ts'), transformAsToTs));

function moveIncludesToNewLine(replace){ //babel moves line comments from their own line onto the previous one
  replace = replace || gulp_replace;     //retainLines fixes this, but causes other issues
  return replace(/((?:\r\n|\r|\n).*\S+.*)\/\/=(include|require)/g, function(match, g1, g2){
    return g1 + '\n//=' + g2;
  });
}
function transformES6ToES5(){
  return src("dist/es6/**/*.js")
    .pipe(include())
    .pipe(dest('dist/js'));
}
task('asToJs', series(
  clean('dist/(es6|js)/**', '!dist/(es6|js)')
  , transformAsToES6
  , transformES6ToES5
));
task('include', function(){
  return src("dist/**/*")
         .pipe(include())
         .pipe(dest('dist'));
});
task('clean', clean('dist/*/**', '!dist/*'));
task('copy', copy);

exports.default = series(
                      'clean'
                    , transformAsToES6
                    , transformES6ToES5
                    , transformAsToTs
                  );
