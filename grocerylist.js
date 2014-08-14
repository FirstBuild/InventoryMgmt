var appURI = "https://flickering-fire-3648.firebaseio.com/";

var imRef = new Firebase(appURI);
var uid = null;

function initAuth(ref) {
  return new FirebaseSimpleLogin(ref, function(error, user) {
    if (error) {
      switch(error.code) {
        case "INVALID_USER":
          // error handler here
        case "INVALID_EMAIL":
          // error handler here
        case "INVALID_PASSWORD":
          // error handler here
        default:
      }
    }
    else if(user) {
      // user logged in
      uid = user.uid;
      userRef = ref.child('users').child(user.uid);
      userRef.once('value', function(snap) {
        if (snap.val() === null) {
          // create a user profile if it doesn't already exist
          // we can't do this on user creation because you have to be authenticated
          // in order to write to the /users node
          userRef.set({displayName: user.email, provider: user.provider, provider_id: user.id});
        }
      });
    }
    else {
      // user logged out
    }
  });
}

function addGroceryListItem(containerRef, data) {
  // contstruct the item to be added to the /objects tree
  var glItem = {
    container: containerRef.name(),
    data: data
  };
  // add it to the tree, and capture a ref to it
  var newObj = containerRef.root().child('objects').push(glItem);
  if (newObj.name().length > 0) {
    // create an object to add to the objects index for the container
    // if we successfully created the new object
    var containerIndexValue = {};
    containerIndexValue[newObj.name()] = true;
    // update() here so we don't overwrite other items in the index
    containerRef.child('objects').update(containerIndexValue);
  }
}

function removeGroceryListItem(ref) {
  // get the value of our item ref
  ref.once('value', function(v) {
    // find the container so we can update its /objects index
    var c = v.val()['container'];
    ref.root().child('containers/'+ c + '/objects/' + ref.name()).remove();
    ref.remove();
  });
}
