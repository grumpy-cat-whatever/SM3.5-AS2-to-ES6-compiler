const { src, dest, task, series } = require('gulp');
const del = require('del');
const ren = require('gulp-rename');
const babel = require('gulp-babel');
const gulp_replace = require('gulp-replace');

Function.prototype.pipeTo = function(target){
  var source = this;
  return function(){
    return source.call().pipe(target.call());
  };
};

function clean(){
  return del(['dist/**', '!dist']);
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

function rename(){
  return ren({ extname: '.js' });
}

function lift(str){
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
  return replace(/\/\*([^*/]|\*[^/]|[^*]\/)*\*\//g, function(match){
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

const js = {
  transformClassExtend: function jsTransformClassExtend(replace){
    replace = replace || gulp_replace;
    return replace(/class\s+([^{\s]*)\s+extends\s+([^{\s]*)\s+\{([\S\s]*)\}\s*$/g, function(match, g1, g2, g3){
      var s1 = shortenClassName(g1),
          s2 = shortenClassName(g2),
          s3 = g3;
      //     s3 = transformFunctionTyped(lift(g3));
      // s3 = transformVarTyped(lift(s3));
      return 'function ' + s1 + '(){}\n' + s1 + '.prototype = Object.assign(Object.create(' + s2 + '.prototype), {'
              + s3
             + '});';
    });
  },
  transformClassSimple: function jsTransformClassSimple(replace){
    replace = replace || gulp_replace;
    return replace(/class\s+([A-Z][^\s{]*)\s*\{([\S\s]*)\}\s*$/, function(match, g1, g2){
      var s1 = shortenClassName(g1),
          s2 = g2;
      //     s2 = transformFunctionTyped(lift(g2));
      // s2 = transformVarTyped(lift(s2));
      return 'function ' + s1 + '(){}\n' + s1 + '.prototype = {' + s2 + '}';
    });
  },
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
  }
};

const es6 = {
  transformClassExtend: function es6TransformClassExtend(replace){
    replace = replace || gulp_replace;
    return replace(/class\s+([^{\s]*)\s+extends\s+([^{\s]*)\s+\{([\S\s]*)\}\s*$/g, function(match, g1, g2, g3){
      var s1 = shortenClassName(g1),
          s2 = shortenClassName(g2),
          ast, s3;
      try {
        ast = parseBlock(match.trim());
        s3 = ast.blocks.map(function(node){
          if(!node.blocks) {
            return node.statement.replace(/(?<!\w)(var|const|let)\s/g, '');
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
        s3 = g3;
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
        ast = parseBlock(match.trim());
        s2 = ast.blocks.map(function(node){
          if(!node.blocks) {
            return node.statement.replace(/(var|const|let)\s*/g, '');
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
        s2 = g2;
      }
      return 'class ' + s1 + ' {' + s2 + '}';
    });
  },
};

function parseBlock(string) {
    const parsedEntrypoint = parseBlockRec({
        statement: "#entrypoint",
        level: 0,
        parent: null,
        blocks: []
    }, string);
    return parsedEntrypoint.blocks.length === 1 ? parsedEntrypoint.blocks[0]: parsedEntrypoint;
}

function logProblemClass(startNode, node){
  var logStr = startNode.blocks[0].statement + startNode.blocks[1].statement;
  logStr = logStr.replace(/\n|\r/g, '');
  console.log('Problem Class: ', logStr);
}

function parseBlockRec(startNode, string) {
    var node = startNode,
        parent = startNode.parent,
        counter = node.level,
        tknzr = /([\S\s]*?)([{}])/g,
        match,
        code,
        token;
    /* eslint-disable no-cond-assign */
    while (match = tknzr.exec(string)) {
    /* eslint-enable no-cond-assign */
        token = match[2];
        code = match[1];
        if (token === '{') {
            code = findBlockStatement(code);
            if (!code[2]) {
                if (!node.blocks) {
                    node.statement += code;
                } else {
                    counter++;
                    parent = node;
                    node = {
                        statement: code[1],
                        level: counter,
                        parent: parent,
                        blocks: []
                    };
                    parent.blocks.push(node);
                }
            } else if (code[2]) { //block statements open a block
                counter++;
                parent = node;
                if (code[1]) { //code between the last block and the current
                    node = {
                        statement: code[1],
                        level: counter,
                        parent: parent,
                        blocks: null
                    };
                    parent.blocks.push(node);
                }
                node = { //block statement itself, with empty child array
                    statement: code[2],
                    level: counter,
                    parent: parent,
                    blocks: [],
                    recognized: true
                };
                parent.blocks.push(node);
            }
        } else if (token === '}') {
            node.blocks.push({
                statement: code,
                level: counter + 1,
                parent: node,
                blocks: null
            });
            counter--;
            node = parent;
            parent = parent.parent;
        }
    }
    return startNode;
}

var isWhiteSpace = RegExp.prototype.test.bind(/^\s*$/);

function findBlockStatement(code) {
    /* eslint-disable no-cond-assign */
    var match;
    if (match = /([\S\s]*)(class\s+\w+\s*)$/.exec(code)) {
        return match;
    }
    if (match = /([\S\s]*)(function(\s+\w+)?\s*\([^)]*\)\s*)$/.exec(code)) {
        return match;
    }
    return [code, code];
    /* eslint-enable no-cond-assign */
}

function nodeToString(node) {
    var isEntryPoint = node.statement === "#entrypoint";
    if (isEntryPoint) {
        return node.blocks.map(nodeToString).join('');
    } else if (node.blocks) {
        return node.statement + '{' + node.blocks.map(nodeToString).join('') + '}';
    } else {
        return node.statement;
    }
}

function transformJs(){
  return getAsFiles()
          .pipe(rename())
          .pipe(removeLocalImports())
          .pipe(removeFlashImports())
          .pipe(js.transformPublicPrivate())
          .pipe(js.transformStaticFunctions())
          .pipe(js.transformVarTyped())
          .pipe(js.transformFunctionTyped())
          .pipe(js.transformClassExtend())
          .pipe(js.transformClassSimple())
          .pipe(js.removeLocalNamespace())
          .pipe(toDist());
}

var [babelCollectInfo, babelTransform] = (function(){
  function collectInfo(b){
    var t = b.types;
    return {
      visitor: {
        Class(cPath){
          var cNode = cPath.node,
              superClass = cNode.superClass,
              theseClassVars = classVars[cNode.name] || {};
          console.log("Visiting: class " + cNode.id.name);
          classVars[cNode.name] = theseClassVars;
          if(superClass){
            classVars[superClass.name] = classVars[superClass.name] || {};
            Object.setPrototypeOf(theseClassVars, classVars[superClass.name]);

          }
          cPath.traverse({
            ClassMethod(path){
              let node = path.node;
              if(node.kind === 'method') {
                theseClassVars[node.key.name] = true;
                //console.log("this." + node.key.name + " = function(){ ... }");
              }
            },
            ThisExpression(path){
              let parentNode = path.parentPath.node;
              if(t.isMemberExpression(parentNode)){
                theseClassVars[parentNode.property.name] = true;
              }
            }
          });
        }
      }
    };
  }
  function transformImplicitThis(b){
    var t = b.types;
    return {
      visitor: {
        Class(cPath){
          var cNode = cPath.node,
              theseClassVars = classVars[cNode.name] || {};
          // console.log(theseClassVars);
          cPath.traverse({
            Identifier(path){
              let node = path.node,
                  name = node.name,
                  parentNode = path.parentPath.node;
              if(!path.scope.hasBinding(name) && theseClassVars[name]) {
                if(parentNode.object && t.isThisExpression(parentNode.object)){
                  return; //don't transform this.x to this.this.x
                }
                if(!parentNode.computed && parentNode.property === node) {
                  return; //don't transform foo.x to foo.this.x, but DO transform foo[x] to foo[this.x]
                }
                if(t.isClassMethod(parentNode)){
                  return;
                }

                //console.log('class var ' + name + ' has no binding');
                path.replaceWith(t.memberExpression(t.thisExpression(), node));
              }
            }
          });
        }
      }
    };
  }
  var classVars = {};
  return [function() {
    return babel({
      plugins: [collectInfo]
    });
  }, function(){
    return babel({
      plugins: [transformImplicitThis]
    });
  }];
})();

function transformTs(){
  return getAsFiles()
          .pipe(ren({ extname: '.js' }))
          .pipe(removeLocalImports())
          .pipe(removeFlashImports())
          .pipe(gulp_replace(/enum/g, '_enum'))
          .pipe(gulp_replace(/(\w+) class/g, 'class $1'))
          .pipe(removeUnnecessaryDeletes())
          .pipe(js.transformPublicPrivate())
          // .pipe(js.transformStaticFunctions())
          .pipe(js.transformVarTyped())
          .pipe(js.transformFunctionTyped())
          .pipe(escapeTokensInLineComments())
          .pipe(escapeTokensInBlockComments())
          .pipe(es6.transformClassExtend())
          .pipe(es6.transformClassSimple())
          .pipe(js.removeLocalNamespace())
          .pipe(babelCollectInfo())
          .pipe(gulp_replace(/^"use strict";\s+/, ''))
          .pipe(toDist());
}

function transformBabel(){
  return src("dist/**/*.js")
    .pipe(babelTransform())
    .pipe(gulp_replace(/^"use strict";\s+/, ''))
    .pipe(dest('dist'));
}

task('clean', clean);
task('copy', copy);
task('transformJs', transformJs);
task('transformTs', transformTs);
task('transformBabel', transformBabel);

exports.default = series(
                      clean
                    , transformTs
                    , transformBabel
                  );
