const babel = require('gulp-babel');

module.exports = function(){
  let classVars = {};

  function collectClassMethodsAndProperties(options){
    const typescript = Boolean(options.typescript);
    return function(babel){
      console.log('implicitThis.collectInfo.isTypeScript:', typescript);
      var t = babel.types;
      return {
        visitor: {
          Class(cPath){
            var cNode = cPath.node,
                superClass = cNode.superClass,
                theseClassVars = classVars[cNode.name] || {};
            console.log("Collecting: class " + cNode.id.name);
            classVars[cNode.name] = theseClassVars;
            if(superClass){
              classVars[superClass.name] = classVars[superClass.name] || {};
              Object.setPrototypeOf(theseClassVars, classVars[superClass.name]);

            }
            cPath.traverse({
              ClassMethod(path){
                let node = path.node;
                if(node.kind === 'method') { //not constructor, getter/setter
                  theseClassVars[node.key.name] = true;
                  //console.log("this." + node.key.name + " = function(){ ... }");
                }
              },
              ClassProperty(path){
                let node = path.node;
                theseClassVars[node.key.name] = true;
              },
              ThisExpression(path){ //can I remove this?
                let parentNode = path.parentPath.node;
                if(t.isMemberExpression(parentNode)){
                  theseClassVars[parentNode.property.name] = true;
                }
              }
            });
          }
        }
      };
    };
  }

  function transformImplicitThis(options){
    const typescript = Boolean(options.typescript);
    return function(babel){
      console.log('implicitThis.transform.isTypeScript:', typescript);
      var t = babel.types;
      return {
        visitor: {
          Class(cPath){
            var cNode = cPath.node,
                theseClassVars = classVars[cNode.name] || {};
            console.log("Transforming: class " + cNode.id.name);
            cPath.traverse({
              Identifier(path){
                let node = path.node,
                    name = node.name,
                    parentNode = path.parentPath.node;
                if(theseClassVars[name] && !path.scope.hasBinding(name)) {
                  if(parentNode.object && t.isThisExpression(parentNode.object)){
                    return; //don't transform this.x to this.this.x
                  }
                  if(!parentNode.computed && parentNode.property === node) {
                    return; //don't transform foo.x to foo.this.x, but DO transform foo[x] to foo[this.x]
                  }
                  if(t.isClassMethod(parentNode) || t.isClassProperty(parentNode)){
                    return;
                  }
                  if(t.isTSTypeReference(parentNode)) {
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
    };
  }
  return {
    collectInfo: function(options){ //default args are a useless ES6 feature
      options = options instanceof Object ? options : {};
      const addPlugin = options.typescript ? ["@babel/plugin-syntax-typescript"] : [];
      return babel({
        plugins: [collectClassMethodsAndProperties(options)].concat(addPlugin),
        presets: [
          ['@babel/preset-env', {
            targets: { "esmodules": true }
          }]
        ]
      });
    },
    transform: function(options){
      options = options instanceof Object ? options : {};
      const addPlugin = options.typescript ? ["@babel/plugin-syntax-typescript"] : [];
      return babel({
        plugins: [transformImplicitThis(options)].concat(addPlugin),
        presets: [
          ['@babel/preset-env', {
            targets: { "esmodules": true }
          }]
        ]
      });
    }
  };
};
