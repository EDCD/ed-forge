# ed-forge

This npm package will in future provide functionality to load and edit ship-builds from the game Elite: Dangerous.

Following features are planned:

Feature                                             | Status
--------------------------------------------------- | ------
Loading ships in the Journal style format           | Implemented
Adding/removing modules from a ship                 | Implemented
Retrieving module/ship property values              | Implemented
Retrieving synthetic module/ship property values    |
Modifying modules                                   |
Import/export ships in json or compressed format    | Implemented
Comparing ships                                     |

It meant to be used by other tools to provide functionality to players.
This module is meant to be a library to be used by sites like https://coriolis.io oder http://www.edshipyard.com.

## Setting up a development environment with VS code

Visual studio code allows debugging of javascript code that gets transpiled.
If you create the following files, you can debug the code.
For now it is recommended to add testing code into the `src/index.js` file and place breakpoints accordingly.

When you start developing, run the `watch` task in VS code.
This will recompile the library when you make changes to it.
If you want to debug anything, add the test statements and hit `F5` and there you go - Bob's your uncle.

We recommend using the following configuration files:

`.vscode/task.json`
```
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
```
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
