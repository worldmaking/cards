// mangler
function mangler(id){
  // replace all non-alphanumeric characters with an underscore
    var id = id.replace(/[\W_]+/g,"_");
    return id;
  }