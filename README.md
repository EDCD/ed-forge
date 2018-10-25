# ed-forge

This npm package will in future provide functionality to load and edit ship-builds from the game Elite: Dangerous.

Following features are planned:
 * Loading ships in the Journal style format
 * Adding/removing modules
 * Modifying modules with blueprints
 * Exporting ships in json or compressed format
 * Getting statistics like jump range, DPS profile from ships
 * Comparing ships

It meant to be used by other tools to provide functionality to players.
This module is meant to be a library to be used by sites like https://coriolis.io oder http://www.edshipyard.com.

**This library is under heavy development - expect git history rewrites.**
Right now this library is in it's early phase.
To keep the history clean it might get re-written quite a lot.
If you want to help developing this library, please get in touch with the developers at our [discord channel](https://discord.gg/x53jTR) because forks might get out of sync very quickly.

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
