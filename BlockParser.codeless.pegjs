/* This is the grammar without any code. For sanity. This grammar is
 * derived from a Jison/Yacc grammar I wrote. Doing that helped greatly
 * in figuring out the basic rules.
 *
 * Note: This file was created manually. It may be out of date and it
 *       may contain mistakes. But you get the idea.
 */

script
  = nodeList ;

nodeList
  = node nodeList
  / text node nodeList
  / node
  / text node
  / text
  ;

node = block / commentB / commentL;

block
  = class
  / '{' nodeList '}'
  / '{' '}'
  ;

class
  = 'class' _+ identifier _* 'extends' _* namespace _* '{' nodeList '}'
  / 'class' _+ identifier _* '{' nodeList '}'
  / 'class' _+ identifier _* '{' '}'
  ;
namespace
  = identifier _* '.' _* namespace
  / identifier
  ;
identifier = $([A-Z_$]i [A-Z0-9_$]i*) ;
_ "whitespace" = [ \f\n\r\t\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff];

commentB
  = '/*' commentBText '*/'
  / '/**/'
  ;
commentBText = $( [^*] / '*' [^/] )+ ;

commentL
  = '//' commentLText lineEnding
  / '//' lineEnding
  ;
commentLText = $[^\n\r]+ ;

lineEnding = $([\r][\n]) / [\r] / [\n] ;

text = $( [^/{}] / '/' [^*])+ ;
