var filterLibrary = [];

function matchCustom(params, data) {

    // If there are no search terms, return all of the data
    if ($.trim(params.term) === '') {
      // clear library terms filter
      filterLibrary = [];
      // make sure all library items are visible (if some were previously filtered out)
      $("#library").children().show();
      return data;
    }

// Do not display the item if there is no 'text' property
    if (typeof data.text === 'undefined') {
      filterLibrary = [];
      // make sure all library items are visible (if some were previously filtered out)
      $("#library").children().show();
      return null;
    }

  // filter out library items that match tags generated/selected by user
  if (!data.text.includes(params.term)) { filterLibrary.push(data.text)
                                         
  // trim duplicate terms in the library -- really just making up for my lazy code in the filter section of the matchCustom function
  function unique(arr) {
    let unique_array = arr.filter(function(elem, index, self) {
      return index == self.indexOf(elem);
    });
    return unique_array;
  }
  // filter out repetitions in the array
  filterLibrary = unique(filterLibrary);                                  
  }
  // `data.text` is the text that is displayed for the data object
    if (data.text.indexOf(params.term) > -1) {
      var modifiedData = $.extend({}, data, true);
      //console.log(modifiedData)
      // TODO: use this to add what file this function is from...:
      // modifiedData.text += ' //from Filename';

      // You can return modified objects from here
      // This includes matching the `children` how you want in nested data sets
      return modifiedData;
    }
    // Return `null` if the term should not be displayed
    return null;
}

// build the library search UI
function libSearch(operators){
  
  // restructure library data for select2 format
  select2 = operators.map(value => value.label)

  // TODO: use this to search through comments (but it does cause a bug in the browser)
  select3 = operators.map(value => value.comments)
  var librarySearch = [];

   for (var i = 0; i < select2.length; i++) {
    // searchText = select2[i] + ' ' + select3[i]
      var entry = {
        "id": i,
        "text": select2[i]
      }; 
    librarySearch.push(entry); 
  }   
  
  $('.libsearch').select2({
    width: '100%',
    data: librarySearch,
    matcher: matchCustom,
    placeholder: "customize...",
    tags: true
  });

  $('.libsearch').on('select2:opening', function( event ) {
      var $searchfield = $(this).parent().find('.select2-search__field');
      $searchfield.prop('disabled', false);
  });
  
  $('.libsearch').on('select2:closing', function( event ) {

    var $searchfield = $(this).parent().find('.select2-search__field');
    $searchfield.prop('disabled', false);

    for (var i = 0; i < filterLibrary.length; i++) {
      var removeTerm = mangler(filterLibrary[i])
      x = document.getElementById(removeTerm)
      x.style.display = "none";
    }   
  });
}

