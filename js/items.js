// functions for manipulating grocery list items

function addGroceryListItem(container, item) {
  var ref = InventoryManager['imRef'];
  // construct the item to be added to the /objects tree
  var glItem = {
    container: container,
    data: item,
    checked: false
  };
  // add it to the tree, and capture a ref to it
  var newObj = ref.child('objects').push(glItem);
  if (newObj.name().length > 0) {
    // create an object to add to the objects index for the container
    // if we successfully created the new object
    var containerIndexValue = {};
    containerIndexValue[newObj.name()] = true;
    // update() here so we don't overwrite other items in the index
    var containerRef = ref.child('containers/' + container);
    containerRef.child('objects').update(containerIndexValue);
  }
}

function toggleGroceryListItemStatus(name) {
  var ref = InventoryManager['imRef'].child('objects/' + name + '/checked');
  ref.once('value', function(v) {
    // if the checked value does not exist, assume it's currently not checked
    var current = v.val() === null ? false : v.val();
    ref.set(!current);
  });
}

function removeGroceryListItem(name) {
  var ref = InventoryManager['imRef'].child('objects/' + name);
  // get the value of our item ref
  ref.once('value', function(v) {
    // find the container so we can update its /objects index
    var c = v.val()['container'];
    ref.root().child('containers/'+ c + '/objects/' + ref.name()).remove();
    ref.remove();
  });
}

function displayGroceryList(element, name) {
  element.show();
  var ref = InventoryManager['imRef'].child('containers/' + name);
  ref.once('value', function(v) {
    if (v.val() === null) {
      element.html('<h2>The container was not found</h2>');
    }
    else {
      element.prepend('<h2>' + v.val()['name'] + '</h2>');
      if(v.val()['description'] != null) {
        element.append('<h4>' + v.val()['description'] + '</h4>');
      }
      element.append("<table id='list_table'></table>")
      // call function to setup events for dynamically updating the list
      displayGroceryListItems(ref, $('#list_table'));
    }
  });
}

function displayGroceryListItems(list, element) {
  var groceryItems = list.child('objects/')

  groceryItems.on('child_added', function(snap) {
    InventoryManager['imRef'].child('objects/' + snap.name()).once('value', function(dataSnapshot) {
      element.append("<tr id='" + dataSnapshot.val()['container'] + "'><td>" + dataSnapshot.val()['data'] + '</td></tr>');
    });
  });

  groceryItems.on('child_removed', function(snap) {
    console.log(snap);
  });

}
