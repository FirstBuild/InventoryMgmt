// Functions for manipulating grocery lists (not the items in them)

/* data is an object with the following attributes:
    parent: Firebase name of parent container (false for root container) [required]
      - appended to "/containers/" to find parent
    owner: string - Firebase uid of container owner [required]
      - appended to "/users/" to find owner
    name: string - the name of the container [required]
    description: string - a description of the container [optional]
*/
function newList(data) {
  if (typeof data !== 'object') {
    return { success: false, message: 'newList requires an object as input' }
  }
  var newChild = InventoryManager['imRef'].child('containers').push(data);
  if (data['parent'] !== false) {
    var parentRef = InventoryManager['imRef'].child('containers/' + data['parent'] + '/children');
    var update = {};
    update[newChild.name()] = true;
    parentRef.update(update);
  }
}
