{
  function Node(node){
    return node;
  }
  //yes, this is a cop-out, to keep the grammar dead simple
  function splitStatement(node, text){
      var m = text.match(/(class|function)\s+\w+.*$/),
      	  t;
      if(m) {
        node.statement = m[0];
        t = text.slice(0, -m[0].length-1);
      } else {
        t = text;
      }
      if(t) {
        return [Node({ type: 'Text', text: t}), node];
      } else {
        return [node];
      }
  }
}

script
 = nl:nodeList {
   return { statement: '#entrypoint', blocks: nl };
 }

nodeList
  = n:node nl:nodeList {
      return [n].concat(nl);
    }
  / t:text n:node nl:nodeList {
      if(!n.type || n.type !== 'Block'){
        return [Node({ type: 'Text', text: t }), n].concat(nl);
      }
      return splitStatement(n, t).concat(nl);
    }
  / n:node {
      return [n];
    }
  / t:text n:node {
      if(!n.type || n.type !== 'Block'){
        return [Node({ type: 'Text', text: t }), n];
      }
      return splitStatement(n, t);
    }
  / t:text {
    return [Node({ type: 'Text', text: t})];
  }
  ;

node = block / commentB / commentL;

block
  = class
  / '{' nl:nodeList '}' {
      return { type: 'Block', blocks: nl };
    }
  / '{' '}' {
      return { type: 'Block' };
    }
  ;

class
  = 'class' _+ name:identifier _* 'extends' _* sup:namespace _* '{' nl:nodeList '}' {
  	  return { type: 'Class', statement: 'class ' + name + ' extends ' + sup, blocks: nl };
    }
  / 'class' _+ name:identifier _* '{' nl:nodeList '}' {
  	  return { type: 'Class', statement: 'class ' + name, blocks: nl };
    }
  / 'class' _+ name:identifier _* '{' '}' {
  	  return { type: 'Class', statement: 'class ' + name };
    }
  ;
namespace
  = identifier _* '.' _* namespace
  / identifier
  ;
identifier = $([A-Z_$]i [A-Z0-9_$]i*) ;
_ "whitespace" = [ \f\n\r\t\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff];

commentB
  = '/*' c:commentBText '*/' {
      return Node({ type: 'BlockComment', comment: c });
    }
  / '/**/' {
      return Node({ type: 'BlockComment', comment: '' });
    }
  ;
commentBText = $( [^*] / '*' [^/] )+ ;

commentL
  = '//' c:commentLText lineEnding {
      return Node({ type: 'LineComment', comment: c });
    }
  / '//' lineEnding {
      return Node({ type: 'LineComment', comment: '' });
    }
  ;
commentLText = $[^\n\r]+ ;

lineEnding = $([\r][\n]) / [\r] / [\n] ;

text = $( [^/{}] / '/' [^*])+ ;
