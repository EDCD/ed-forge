# ed-forge

This npm package will in future provide functionality to load and edit ship-builds from the game Elite: Dangerous.

Following features are planned:

Feature                                             | Status
--------------------------------------------------- | ------
Loading ships in the Journal style format           | Implemented
Adding/removing modules from a ship                 | Implemented
Retrieving module/ship property values              | Implemented
Retrieving synthetic module/ship property values    | Implemented
Modifying modules                                   | Implemented
Import/export ships in json or compressed format    | Implemented
Comparing ships                                     |

It is meant to be used by other tools to provide functionality to players.
This module is meant to be a library to be used by sites like https://coriolis.io or http://www.edshipyard.com.

Here is a working code example:
```js
import { Factory } from 'ed-forge';

let ana = Factory.newShip('anaconda');
let alloys = ana.getAlloys();
alloys.setItem('Anaconda_Armour_Grade3');
alloys.setBlueprint('Armour_HeavyDuty', 5, 1, 'special_armour_chunky');
```

## API notice - strings

Elite: Dangerous has a lot of string keys.
Be it ship names (e.g. `'anaconda'`), event keys (e.g. `loadout_event.Modules[0].Slot`) or property names (e.g. `'mass'`).
It is important to note how ed-forge handles such strings.
In general it is true that:

> 1. String arguments to public API functions are always handled case-insensitive
> 2. String values are always handled in lower-case
> 3. String object keys are always handled case-sensitive

If you import non-public parts of the API and pass string-arguments to it, they better be in lower-case.
ed-forge will not handle this and you might get unexpected results if arguments are not provided in lowercase.

Public API is considered anything that can be accessed from importing ed-forge itself.
For exmaple, in context of the initial code example, all the following statements have the same effect:
```js
alloys.setItem('Anaconda_Armour_Grade3');
alloys.setItem('anaconda_armour_grade3');
alloys.setItem('ANACONDA_ARMOUR_GRADE3');
alloys.setItem('AnAcoNDa_ARMOUR_grade3');  // (but please don't do this)
```

To always handle string values in lowercase means that all values of a journal-style loadout event will be in lowercase if you for example perform `anaconda.toJSON()`.

The actual keys of such an loadout event will always be handled case-sensitive, though.
This includes keys such as `Modules` or `Slot` of the actual loadout event, e.g. this will always work for any build: `anaconda.toJSON().Modules[0].Slot`.

## Setting up a development environment with VS code

Visual studio code allows debugging of javascript code that gets transpiled.
If you create the following files, you can debug the code.
For now it is recommended to add testing code into the `src/index.js` file and place breakpoints accordingly.

When you start developing, run the `watch` task in VS code.
This will recompile the library when you make changes to it.
If you want to debug anything, add the test statements and hit `F5` and there you go - Bob's your uncle.

We recommend using the following configuration files:

`.vscode/task.json`
```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "type": "shell",
            "label": "build",
            "command": "npm",
            "args": [ "run", "build" ],
            "group": {
                "kind": "build",
                "isDefault": true
            }
        },
        {
            "type": "shell",
            "label": "watch",
            "command": "npm",
            "args": [ "run", "watch" ],
            "group": "build",
            "problemMatcher": []
        }
    ]
}
```

`.vscode/launch.json`
```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Launch",
            "type": "node",
            "request": "launch",
            "program": "${workspaceFolder}/src/index.js",
            "outFiles": [ "${workspaceFolder}/lib/**/*.js" ]
        }
    ]
}
```
