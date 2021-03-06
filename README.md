FirstBuild Inventory Management Platform
=============
A datastore for managing household inventory. Track this project at
https://firstbuild.com/firstbuild/inventory-management-platform/.

We have reserved this repository to store code and documentation that applies to Inventory Management across the board. Our intention is for individual components to create their own repository with a naming standard of **InventoryMgmt-\<component name\>** that will host the code for that specific *component*.


## Overview
Our initial focus was on delivering the shared infrastructure components that would support and facilitate a grand concept of Inventory Management for the home. Our plan was to deliver a first pass offering for this shared infrastructure with the intention of the community developing the true functionality around Inventory Management. We have called these community developed functionalities **components**. These components leverage the centralized infrastructure to build an Inventory Management ecosystem driven by the community. Below is a high-level diagram of our vision:


![Output Map](https://raw.githubusercontent.com/FirstBuild/InventoryMgmt/master/images/Inventory-Management-High-Level.jpg)

## Infrastructure

As our first responsibility was to deliver the infrastructure to support Inventory Management, we reviewed both hosted solutions as well as opensource / developing our own. To be successful, we knew our infrastructure had to meet the following:

##### Community
    1. Facilitate the community to contribute new components without changes to the underlying infrastructure
    2. Allow developers to focus on end-user functionality
    3. Provide the ability to rapidly proto-type
##### Data
    1. Provide a schema-less data model to facilitate the creation of components that remain unknown to us
    2. Provide data at scale
##### API
    1. Provide a wealth of APIs to allow the community to develop components in a language most familiar to them
    2. Ability to scale to hundreds of thousands of concurrent connections
    3. Real time data access for the components that require it
    4. Excellent documentation and tutorials to help developers get started


###### Note
> We have designed the infrastructure to push the intelligence to the components. We designed it this way in order to provide infrastructure that could support a very broad use case of Inventory Management that hopefully in the future will extend into areas that we can’t predict today. We debated on whether we should provide an intelligent API that allowed the clients to stay fairly dumb, but kept coming back to the need for the infrastructure to stay very general to support the broad use case and adapt to any component.

### Firebase

After reviewing several technologies, we landed on [Firebase](https://www.firebase.com/) as the technology to support the Inventory Management ecosystem. We felt Firebase best fit our requirements. A few of the things we really liked:

   1. [Open Datasets](https://www.firebase.com/docs/open-data/) that developers could leverage in their components
   2. Built in security model including hooks into [OAuth providers](https://www.firebase.com/docs/web/guide/user-auth.html)
   3. [Libraries/APIs](https://www.firebase.com/docs/) in almost every modern language
   4. Extensive [documentation](https://www.firebase.com/docs/) and tutorials
   5. Schema-less JSON based data-store
   6. Client-focused, putting the power in the hands of the developer (you!)
   7. Supports free hacker accounts that will allow developers to prototype new ideas

The remainder of this document is not intended to teach the specifics of Firebase or the Firebase API. We will be digging into some of the logical constructs we have formulated on top of Firebase, but it does assume some working knowledge of Firebase. We found their [tutorials](https://www.firebase.com/docs/web/quickstart.html) as the best place to begin learning Firebase.

### Data model  
Our data model is broken into *users*, *containers* and *objects*. The *users* node of the Firebase tree is for storing user profile information. *Containers* may contain other *containers* and or *objects*. Note that *container* nesting is logical, not literal. All *container* instances will exist directly under the *containers* node in Firebase. Each user will have one *rootContainer* created at user registration time. This is the entry point for that user into the *containers* logical tree. *Objects* must exist in one, and only one, *container*.

#### Users
The *users* node of the Firebase tree holds user profile information. At present this is limited to things like *displayName*, *provider*, and *email*. It also contains a *rootContainer* attribute which points to a single container in the *containers* node. This *rootContainer* must be created before the *users* node, as we validate that the *rootContainer* node exists before allowing the *users* node to be written. The *users* node may only be read or written by the logged-in user. Here are the security rules for a *users* node:
```json
{
  "users": {
    "$userId": {
      ".read": "$userId === auth.uid",
      // grants write access to the owner of this user account
      // whose uid must exactly match the key ($user_id)
      ".write": "$userId === auth.uid",
      ".validate": "newData.hasChildren(['provider', 'displayName', 'rootContainer'])",
      "displayName": {
        ".validate": "newData.isString()"
      },
      "email": {
        ".validate": "newData.val() === auth.email"
      },
      "provider": {
        ".validate": "newData.val() == 'password'"
      },
      "rootContainer": {
          ".validate": "root.child('containers/' + newData.val()).exists()"
      }
    }
  }
}
```

#### Containers
The *containers* node of the Firebase tree holds data about all *container* instances in the Inventory Management system. Each instance will exist directly below the *containers* node in the tree, regardless of whether it's a top-level container (a *rootContainer* referenced from a user's profile) or a child of another container. The Firebase security rules for a container are as follows:
```json
{
  "containers": {
    ".read": "auth !== null",
    // haven't locked down writes yet, but you do need to be authenticated
    ".write": "auth !== null",
    "$containerId": {
      // a valid container must have attributes "owners", "parent", and "name"
      ".validate": "newData.hasChildren(['owners', 'parent', 'name'])",
      "owner": {
        // allow creation of a root container without a valid owner entry
        // as each user requires a root container and it would create a
        // circular dependency if each required the other
        ".validate": "(newData.parent().child('parent').val() === false) ||root.child('/users/' + newData.val()).exists()"
      },
      "name": {
        ".validate": "newData.isString()"
      },
      "parent": {
        ".validate": "newData.val() === false || root.child('containers/' + newData.val()).exists()"
      },
      // optional attributes below
      "children": {
        "$childId": {
          ".validate": "root.child('containers/' + $childId).exists()"
        }
      },
      "description": {
        ".validate": "newData.isString() || newData.val() === null"
      },
      "objects": {
        "$objectId": {
          ".validate": "root.child('objects/' + $objectId).exists() && newData.val() === true"
        }
      }
    }
  }
}
```

As you can see from the above, each *containers* instance must have children (attributes) of `owner`, `parent`, and `name`. Optional attributes include `description`, which must be a string if present, `children`, which must point to valid *container* instances if specified, and *objects*, which contains an index of contained objects (each of which must exist). At present we do not limit other attributes from being added to a *containers* instance.

An example of a *containter* may be a grocery list, which has a parent *container* of a refrigerator, which has a parent *container* of a home. This would be represented as follows:
```json
{
  "containers" : {
    "-JUApyasdkfj34r90da4" : {  
      "name" : "Ryan's Home",
      "owner" : "simplelogin:2",
      "parent" : false,
      "children" : {
        "-JUApygasdfasdasdfda" : true
      }
    },
    "-JUApygasdfasdasdfda" : {  
      "name" : "Ryan's Refrigerator",
      "owner" : "simplelogin:2",
      "parent" : "-JUApyasdkfj34r90da4",
      "children" : {
        "-JUApygMasdbiSlvV-0b" : true
      }
    },
    "-JUApygMasdbiSlvV-0b" : {  
      "name" : "Ryan's Grocery List",
      "owner" : "simplelogin:2",
      "parent" : "-JUApygasdfasdasdfda",
      "objects" : {
        "-JUAwerASDvas-1g12j" : true,
        "-JUG7T_C4iVFZMMPjCB0" : true
      }
    }
  }
}
```

#### Objects
The *objects* tree contains Inventory objects. These may be items in a refrigerator or pantry, or items on a grocery list. The current validation rules for *objects* instances are as follows:
```json
{
  "objects": {
    ".read": "auth !== null",
    // haven't locked down writes yet, but you do need to be authenticated
    ".write": "auth !== null",
    "$object_id": {
      // a valid container must have attributes "container" and "data"
      ".validate": "newData.hasChildren(['container', 'data'])",
      "container": {
        ".validate": "root.child('containers/' + newData.val()).exists()"
      },
      "data": {
        ".validate": "newData.exists()"
      }
    }
  }
}
```
As *objects* instances are simpler than *containers* instances, they only have two required attributes, the parent *container* (which must exist), and some data. The data can whatever you'd like it to be, though simple string data is best. Additional attributes (such as the `checked` attribute for grocery list items in the example below) may be created, too.

The Firebase URI for this datastore is
https://flickering-fire-3648.firebaseio.com/. Please contact jburks725 if you
need developer access to this Firebase app.

### Example Data
If you have your own Firebase account and would like to upload example data representing our data model, you can import this [json](https://github.com/FirstBuild/InventoryMgmt/blob/master/example/example_data_firebase.json) into your firebase app. You will likely want to change the user json:
```json
{
  "users" : {
    "simplelogin:1" : {
      "displayName" : "User",
      "email" : "email@example.com",
      "provider" : "password",
      "provider_id" : "1",
      "rootContainer" : "-JUApWC5RZF-LgQmoUxd"
    }
  }
}
```
to reflect your account information

## Components
The components are what get developed by the community to build up the true functionality around Inventory Management. A component should be a self-contained piece of functionality that plugs into the larger inventory management ecosystem by leveraging Firebase as the data store. Below, we will look to provide some example components:

### Example 1 - Web Based Grocery List
If you were to create a web based grocery list, this would be a *component* in the Inventory Management System. The application will handle adding/removing items to the grocery list using the Firebase API. Using the outlined data model, Firebase would store data that looks similar to the following:

```json
{
  "containers" : {
    "-JUApygMzgusoiSlvV-0" : {  # unique key generated by a firebase Push
      "name" : "simplelogin:1_root",
      "owner" : "simplelogin:1", # owner of this container. this is a reference to a child in the /users node
      "parent" : false, # If this container has a parent container, this will be the unique ID of that parent container
      "description" : "root container",
      "children" : {
        "-JUApygMasdbiSlvV-0b" : true
      }
    },
    "-JUApygMasdbiSlvV-0b" : {
      "name" : "Ryan's Grocery List",
      "owner" : "simplelogin:1",
      "parent" : "-JUApygMzgusoiSlvV-0",
      "objects" : {
        # keys in this node act as a reference to the actual object data
        "-JUAwerASDvas-1g12j" : true,
        "-JUG7T_C4iVFZMMPjCB0" : true
      }
    }
  },
  "objects" : {
    "-JUAwerASDvas-1g12j" : { # unique key generated by a firebase Push
      "checked" : false, # data representing the completion of an item
      "container" : "-JUApygMasdbiSlvV-0b", # the container that references this object
      "data" : { # item data as an object
        "description" : "Eggs",
        "quantity": 12
      }
    },
    "-JUG7T_C4iVFZMMPjCB0" : {
      "checked" : false,
      "container" : "-JUApygMasdbiSlvV-0b",
      "data" : "Milk" # data can be a scalar, too - the client would need to recognize the difference
    }
  },
  "users" : { # a node representing a user
    "simplelogin:1" : {
      "displayName" : "person@example.com",
      "provider" : "password",
      "providerId" : "1",
      "rootContainer" : "-JUApygMasdbiSlvV-0b" # this user's root container
    }
  }
}
```

In order to add a new item to the Grocery List for user person@example.com, Grocery List *component* would first add a new object to the objects node. Using a Firebase `push()`, the object will have a unique key generated and it will store the supplied data. After this new operation, the *objects* node may look like this:

```json
{
  "objects" : {
    "-JUAwerASDvas-1g12j" : { # unique key generated by a firebase Push
      "checked" : false, # data representing the completion of an item
      "container" : "-JUApygMasdbiSlvV-0b", # the container that references this object
      "data" : "One Dozen Eggs" # item data
    },
    "-JUG7T_C4iVFZMMPjCB0" : {
      "checked" : false,
      "container" : "-JUApygMasdbiSlvV-0b",
      "data" : "Milk"
    },
    "-JUG7T_SDFGDFSFGTTT" : {
      "checked" : false,
      "container" : "-JUApygMasdbiSlvV-0b",
      "data" : "Soup"
    }
  }
}
```

After adding a new node to the *objects* tree, the *component* needs to update the *objects* index in the parent *container* node. This would be done by obtaining the name of the newly generated *objects* node (returned as a `ref` by the `Firebase.push()` operation), creating a new object with that name as the key and `true` as the value, then updating the container's *object* index. That would look something like this:

```json
{
  "containers" : {
    "-JUApygMasdbiSlvV-0b" : {
      "name" : "sample container",
      "parent": "-JUApygMzgusoiSlvV-0",
      "owner" : "simplelogin:2",
      "objects" : {
        "-JUAwerASDvas-1g12j" : true,
        "-JUG7T_C4iVFZMMPjCB0" : true,
        "-JUG7T_SDFGDFSFGTTT" : true
      }
    }
  }
}
```

This allows us to easily find the objects that are part of a container without having to scan the entire *objects* node of the tree.

Keeping in mind that this is a schema-less data structure, Grocery List component could have added additional fields as needed. Perhaps the new item should contain a Brand, the object could contain the brand and happily co-exist with the format of the other data, so long as the required attributes are present.

```json
{
  "objects" : {
    "-JUAwerASDvas-1g12j" : { # unique key generated by a firebase Push
      "checked" : false, # data representing the completion of an item
      "container" : "-JUApygMasdbiSlvV-0b", # the container that references this object
      "data" : "One Dozen Eggs" # item data
    },
    "-JUG7T_C4iVFZMMPjCB0" : {
      "checked" : false,
      "container" : "-JUApygMasdbiSlvV-0b",
      "data" : "Milk"
    },
    "-JUG7T_SDFGDFSFGTTT" : {
      "checked" : false,
      "container" : "-JUApygMasdbiSlvV-0b",
      "brand" : "Campbells",
      "data" : "Soup"
    }
  }
}  
```

After the item was inserted as an object, Grocery List would then need to reference the object in the Users grocery list by executing an `update()` to the objects node in the grocery list container. The new container data would look like the following:

```json
{
  "containers" : {
    "-JUApygMasdbiSlvV-0b" : {  # unique key generated by a firebase Push
      "name" : "Ryan's Grocery List",
      "owners" : "simplelogin:1",
      "parent" : "-JUApygMzgusoiSlvV-0",
      "objects" : { # objects in this container act as a reference to the actual object data
        "-JUAwerASDvas-1g12j" : true,
        "-JUG7T_C4iVFZMMPjCB0" : true,
        "-JUG7T_SDFGDFSFGTTT" : true
      }
    }
  }
}
```
Alternately, these additional fields could be part of a `data` object instead of additional children of the *objects* child (nesting them one level deeper). This is at the discretion of the *component* developer, but the developer will need to handle validation of these objects as the Inventory Management platform only requires that the `data` child exist.
```json
{
  "objects" : {
    "-JUAwerASDvas-1g12j" : { # unique key generated by a firebase Push
      "checked" : false, # data representing the completion of an item
      "container" : "-JUApygMasdbiSlvV-0b", # the container that references this object
      "data" : {
        "description" : "Eggs",
        "quantity" : 12,
        "brand" : "Mary's Cage-Free Organic"
      }
    }
    // ...
  }
}
```

To remove an item from the Grocery List, the *component* would need to remove the object from the objects node and remove the reference from the User's Grocery List Container
