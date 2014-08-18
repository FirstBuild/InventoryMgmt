/*
  main.js - Javascript functions for managing the web interface and setting up
  the Firebase auth service
*/

// create a namespace for our globals
var InventoryManager = {
  appURI: "https://flickering-fire-3648.firebaseio.com/"
};

function initAuth(ref) {
  return new FirebaseSimpleLogin(ref, function(error, user) {
    if (error) {
      switch(error.code) {
        case "INVALID_USER":
          flash('warning', 'That user does not exist. Please register a new account.');
          $('input[type="email"]').focus();
          return false;
        case "INVALID_PASSWORD":
          flash('danger','Invalid password entered! Please correct your password.');
          $('input:password').focus();
          return false;
        default:
          flash('danger', 'An unknown authentication error occured.');
          return false;
      }
    }
    else if(user) {
      // user logged in
      InventoryManager['uid'] = user.uid;
      userRef = ref.child('users').child(user.uid);
      userRef.once('value', function(snap) {
        if (snap.val() === null) {
          // create a user profile if it doesn't already exist
          // we can't do this on user creation because you have to be authenticated
          // in order to write to the /users node
          userRef.set({displayName: user.email, provider: user.provider, provider_id: user.id});
        }
      });
      $("#signin-form").hide();
      $("#profile-link").html('<a href="#">' + user.email + '</a>');
      $("ul.masthead-nav").append('<li id="logout"><a href="#">Logout</a></ul>');
    }
    else {
      // user logged out
      $('li').remove('#logout');
      $("#signin-form").show();
      $("#profile-link").html('<a href="#">Not Logged In</a>');
    }
  });
}

function flash(sev, msg) {
  // see if we know what severity level this should be
  if ($.inArray(sev, ["success", "warning", "danger", "info"]) < 0) {
    // default to info
    sev = "info";
  }
  html = '<div class="alert alert-' + sev + ' alert-dismissible" role="alert">';
  html += '<button type="button" class="close" data-dismiss="alert"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>';
  html += msg + '</div>';

  // now flash the message
  $('#container').prepend(html);
}

// signin form submit handler
$('#signin-form').submit(function(e) {
  e.preventDefault();
  InventoryManager['auth'].login('password', { email: $('input[type="email"]').val(), password: $('input:password').val() });
});

// logout link handler
$('ul.masthead-nav').on('click', 'li#logout', function() {
  InventoryManager['auth'].logout();
});

// initialize the master Firebase ref and the auth service once the document
// is loaded
$(document).ready(function() {
  InventoryManager['imRef'] = new Firebase(InventoryManager['appURI']);
  InventoryManager['auth'] = initAuth(InventoryManager['imRef']);
});
