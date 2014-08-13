var appURI = "https://flickering-fire-3648.firebaseio.com/";

var imRef = new Firebase(appURI);
var uid = null;

function initAuth(ref) {
  return new FirebaseSimpleLogin(ref, function(error, user) {
    if (error) {
      switch(error.code) {
        case "INVALID_USER":

        case "INVALID_EMAIL":

        case "INVALID_PASSWORD":

        default:
      }
    }
    else if(user) {
      // user logged in
      uid = user.uid;
      userRef = imRef.child('users').child(user.uid);
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

/* example for adding an item to the grocery list (assumes you've already looked up the grocery list id)
var newObj = imRef.child('objects').push({container: '-JUApygMasdbiSlvV-0b', data: 'Loaf of wheat bread'});
// you'd probably already have the value for container, given that you just used it,
// but this shows how to read the data just written
newObj.once('value', function(snap) { container = snap.val()['container'] });
contRef = imRef.child('containers/' + container + '/objects');
var val = {};
val[newObj.name()] = true;
contRef.update(val);
*/
