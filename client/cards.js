function ast2html(ast, parent) {
  let kind = ast.ast;
  let name = ast.name || kind;
  let loc = ast.loc;
  let locstr = `${loc.filepath}@${loc.begin.line}:${loc.begin.col}-${loc.end.line}:${loc.end.col}`;
  let summary = `${name} ${locstr}`
  let code = ast.text || "";
  let div = $('<div class="ast '+kind.toLowerCase()+'" />')
    .text(summary)
    .on('click', function(e) {
        // hide/show on click
        div.children().toggle();
        e.stopPropagation();
    })
    .appendTo(parent);
  
  if (ast.nodes) {
    for (node of ast.nodes) {
      ast2html(node, div);
    }
  }
  
  $('<pre />').text(code).appendTo(div);
 
  
  // hide or show this?
  //div.children().hide();
}

let ast = JSON.parse(document.getElementById("astjson").innerHTML)
ast2html(ast, $("#tree"));