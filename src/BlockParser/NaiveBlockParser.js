module.exports = (function(){
  function parseBlock(string) {
      return parseBlockRec({
        statement: "#entrypoint",
        level: 0,
        parent: null,
        blocks: []
    }, string);
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

  function findBlockStatement(code) {
      /* eslint-disable no-cond-assign */
      var match;
      if (match = /([\S\s]*)(class\s+\w+\s*)$/.exec(code)) {
          return match;
      }
      if (match = /([\S\s]*)(function(\s+\w+)?\s*\([^)]*\)\s*(:\s*\S+|\s*)\s*)$/.exec(code)) {
          return match;
      }
      return [code, code];
      /* eslint-enable no-cond-assign */
  }

  return {
    parseBlock: parseBlock,
  };
})();
